/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — DISTRIBUTED AI SECURITY, QUOTA & CONCURRENCY
 * ============================================================================
 * Camada de defesa em profundidade para as APIs de Inteligência Artificial:
 * 1. Isolamento estrito de chaves (Zero acesso direto pelo Browser)
 * 2. Controle de concorrência distribuído por Usuário e por Tenant (PostgreSQL Leases)
 * 3. Quotas distribuídas granulares (Chamadas/minuto, chamadas/dia por IP, Usuário e Tenant)
 * 4. Validação estrita de tamanho de payload, prompts e imagens (Defesa contra custo abusivo)
 * 5. Timeouts estritos com AbortController e retentativas limitadas com backoff exponencial
 * 6. Proteção contra ausência de GEMINI_API_KEY (Fail-Safe controlado com AI_NOT_CONFIGURED)
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { safeLogger } from './safeLogger';
import { AuthenticatedRequest } from '../auth/authMiddleware';
import {
  checkAndIncrementAiQuota,
  acquireConcurrencyLock,
  releaseConcurrencyLock,
  resetDistributedSecurityStateForTesting,
} from './distributedSecurityStore';

// ----------------------------------------------------------------------------
// CONFIGURAÇÕES DE LIMITES E QUOTAS DE IA (DISTRIBUÍDAS)
// ----------------------------------------------------------------------------
export const AI_SECURITY_CONFIG = {
  // Limites de Concorrência Simultânea
  MAX_CONCURRENT_PER_USER: 3,
  MAX_CONCURRENT_PER_TENANT: 10,

  // Quotas de Requisições por Minuto
  MAX_PER_MINUTE_USER: 30,
  MAX_PER_MINUTE_TENANT: 80,
  MAX_PER_MINUTE_IP: 30,

  // Quotas Diárias
  MAX_PER_DAY_USER: 500,
  MAX_PER_DAY_TENANT: 2500,
  MAX_PER_DAY_IP: 500,

  // Limites de Payload
  MAX_PROMPT_CHARS: 15000,
  MAX_TOTAL_PAYLOAD_BYTES: 12 * 1024 * 1024, // 12 MB
  MAX_IMAGE_BASE64_BYTES: 10 * 1024 * 1024,  // 10 MB

  // Timeout e Resiliência
  REQUEST_TIMEOUT_MS: 25000, // 25s
  MAX_RETRIES: 1, // Limite estrito de retentativas para evitar custos descontrolados
  INITIAL_BACKOFF_MS: 1000,
};

/**
 * Reseta os contadores de quota e concorrência (útil para suítes de teste).
 */
export async function resetAiSecurityState(): Promise<void> {
  await resetDistributedSecurityStateForTesting();
}

/**
 * Extrai o IP confiável da requisição considerando proxies reversos.
 */
function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Middleware de Validação Distribuída de Quotas e Concorrência de IA.
 * Aplica limites distribuídos em IP, Usuário e Tenant antes de chamar qualquer modelo.
 */
export async function aiQuotaAndConcurrencyGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const ip = extractClientIp(req);
  const userId = req.user?.id || 'anonymous_user';
  const tenantId = req.effectiveCompanyId || req.user?.companyId || 'anonymous_tenant';
  const requestId = crypto.randomUUID();

  // 1. Verificação de Payload e Tamanho de Texto
  const body = req.body;
  if (body) {
    if (typeof body.message === 'string' && body.message.length > AI_SECURITY_CONFIG.MAX_PROMPT_CHARS) {
      return res.status(400).json({
        success: false,
        error: `O texto da mensagem excede o limite máximo permitido de ${AI_SECURITY_CONFIG.MAX_PROMPT_CHARS} caracteres.`,
        code: 'AI_PAYLOAD_TOO_LARGE',
      });
    }

    if (typeof body.imageBase64 === 'string' && body.imageBase64.length > AI_SECURITY_CONFIG.MAX_IMAGE_BASE64_BYTES) {
      return res.status(400).json({
        success: false,
        error: 'A imagem fornecida excede o tamanho máximo permitido de 10 MB.',
        code: 'AI_IMAGE_TOO_LARGE',
      });
    }
  }

  try {
    // 2. Verificação de Concorrência Distribuída (Usuário)
    const userLockKey = `lock:ai_user:${userId}:${requestId}`;
    const userLock = await acquireConcurrencyLock({
      lockKey: userLockKey,
      ownerId: userId,
      category: 'ai_user_concurrency',
      maxConcurrent: AI_SECURITY_CONFIG.MAX_CONCURRENT_PER_USER,
      leaseTtlSeconds: 45,
    });

    if (!userLock.acquired) {
      safeLogger.warn('Limite de concorrência distribuída de IA por usuário atingido', {
        userId,
        currentCount: userLock.currentCount,
      });
      return res.status(429).json({
        success: false,
        error: 'Muitas requisições de Inteligência Artificial em andamento simultaneamente para o seu usuário. Aguarde a conclusão da consulta atual.',
        code: 'AI_CONCURRENCY_LIMIT_USER',
      });
    }

    // 3. Verificação de Concorrência Distribuída (Tenant)
    const tenantLockKey = `lock:ai_tenant:${tenantId}:${requestId}`;
    const tenantLock = await acquireConcurrencyLock({
      lockKey: tenantLockKey,
      ownerId: tenantId,
      category: 'ai_tenant_concurrency',
      maxConcurrent: AI_SECURITY_CONFIG.MAX_CONCURRENT_PER_TENANT,
      leaseTtlSeconds: 45,
    });

    if (!tenantLock.acquired) {
      await releaseConcurrencyLock(userLockKey);
      safeLogger.warn('Limite de concorrência distribuída de IA por empresa atingido', {
        tenantId,
        currentCount: tenantLock.currentCount,
      });
      return res.status(429).json({
        success: false,
        error: 'Limite de consultas simultâneas à Inteligência Artificial da organização atingido. Aguarde alguns instantes.',
        code: 'AI_CONCURRENCY_LIMIT_TENANT',
      });
    }

    // 4. Verificação de Quota Distribuída por IP
    const ipQuota = await checkAndIncrementAiQuota({
      dimension: 'ip',
      targetId: ip,
      maxPerMinute: AI_SECURITY_CONFIG.MAX_PER_MINUTE_IP,
      maxPerDay: AI_SECURITY_CONFIG.MAX_PER_DAY_IP,
    });

    if (!ipQuota.allowed) {
      await releaseConcurrencyLock(userLockKey);
      await releaseConcurrencyLock(tenantLockKey);

      const isMin = ipQuota.reason === 'MINUTE_LIMIT_EXCEEDED';
      return res.status(429).json({
        success: false,
        error: isMin
          ? 'Limite de requisições de IA por minuto atingido para este endereço.'
          : 'Limite diário de requisições de IA atingido para este endereço.',
        code: isMin ? 'AI_RATE_LIMIT_IP' : 'AI_DAILY_QUOTA_IP',
        retryAfter: isMin ? Math.ceil((ipQuota.resetTimeMinute - Date.now()) / 1000) : undefined,
      });
    }

    // 5. Verificação de Quota Distribuída por Usuário
    const userQuota = await checkAndIncrementAiQuota({
      dimension: 'user',
      targetId: userId,
      maxPerMinute: AI_SECURITY_CONFIG.MAX_PER_MINUTE_USER,
      maxPerDay: AI_SECURITY_CONFIG.MAX_PER_DAY_USER,
    });

    if (!userQuota.allowed) {
      await releaseConcurrencyLock(userLockKey);
      await releaseConcurrencyLock(tenantLockKey);

      const isMin = userQuota.reason === 'MINUTE_LIMIT_EXCEEDED';
      return res.status(429).json({
        success: false,
        error: isMin
          ? 'Limite de consultas à IA por minuto excedido para o seu usuário.'
          : 'Limite diário de consultas à IA atingido para a sua conta.',
        code: isMin ? 'AI_RATE_LIMIT_USER' : 'AI_DAILY_QUOTA_USER',
        retryAfter: isMin ? Math.ceil((userQuota.resetTimeMinute - Date.now()) / 1000) : undefined,
      });
    }

    // 6. Verificação de Quota Distribuída por Tenant
    const tenantQuota = await checkAndIncrementAiQuota({
      dimension: 'tenant',
      targetId: tenantId,
      maxPerMinute: AI_SECURITY_CONFIG.MAX_PER_MINUTE_TENANT,
      maxPerDay: AI_SECURITY_CONFIG.MAX_PER_DAY_TENANT,
    });

    if (!tenantQuota.allowed) {
      await releaseConcurrencyLock(userLockKey);
      await releaseConcurrencyLock(tenantLockKey);

      const isMin = tenantQuota.reason === 'MINUTE_LIMIT_EXCEEDED';
      return res.status(429).json({
        success: false,
        error: isMin
          ? 'Limite de consultas à IA por minuto atingido para a sua empresa.'
          : 'Limite diário de requisições de IA atingido para o plano da empresa.',
        code: isMin ? 'AI_RATE_LIMIT_TENANT' : 'AI_DAILY_QUOTA_TENANT',
        retryAfter: isMin ? Math.ceil((tenantQuota.resetTimeMinute - Date.now()) / 1000) : undefined,
      });
    }

    // Liberação segura dos locks de concorrência ao concluir a resposta
    let released = false;
    const releaseAll = async () => {
      if (!released) {
        released = true;
        await Promise.allSettled([
          releaseConcurrencyLock(userLockKey),
          releaseConcurrencyLock(tenantLockKey),
        ]);
      }
    };

    res.on('finish', releaseAll);
    res.on('close', releaseAll);

    return next();
  } catch (err: any) {
    safeLogger.error('Erro na validação de segurança de IA distribuída', { error: err?.message });
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'Serviço de validação de quotas temporariamente indisponível.',
        code: 'AI_GUARD_UNAVAILABLE',
      });
    }
    return next();
  }
}

/**
 * Executa uma chamada à API do Gemini com timeout estrito e retry com backoff exponencial.
 */
export async function executeAiCallWithResilience<T>(
  action: (abortSignal?: AbortSignal) => Promise<T>,
  options?: {
    timeoutMs?: number;
    maxRetries?: number;
    description?: string;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs || AI_SECURITY_CONFIG.REQUEST_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? AI_SECURITY_CONFIG.MAX_RETRIES;
  const desc = options?.description || 'Gemini AI Call';

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        action(controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`AI_TIMEOUT: ${desc} excedeu o tempo limite de ${timeoutMs}ms.`));
          });
        }),
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isRateLimitOrTransient =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('ETIMEDOUT') ||
        err?.message?.includes('ECONNRESET');

      if (attempt <= maxRetries && isRateLimitOrTransient) {
        const backoffMs = AI_SECURITY_CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        safeLogger.warn(`${desc} falhou na tentativa ${attempt}. Retentando em ${backoffMs}ms...`, {
          error: err.message,
          attempt,
          maxRetries,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        break;
      }
    }
  }

  throw lastError;
}
