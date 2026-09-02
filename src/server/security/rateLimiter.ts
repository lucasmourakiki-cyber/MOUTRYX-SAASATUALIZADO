/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — DISTRIBUTED RISK-BASED RATE LIMITER
 * ============================================================================
 * Sistema de limitação de taxa distribuído (PostgreSQL / Multi-instância)
 * por categoria de risco para proteção contra:
 * - Ataques de força bruta em login / registro
 * - Abuso de custos computacionais / financeiros em IA e OCR
 * - Sobrecarga de upload e negação de serviço (DoS)
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from './safeLogger';
import {
  checkAndIncrementRateLimit,
  resetDistributedSecurityStateForTesting,
} from './distributedSecurityStore';

export interface RateLimitOptions {
  windowMs: number; // Janela de tempo em milissegundos
  max: number; // Número máximo de requisições na janela
  message?: string;
  category: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Reseta todos os contadores de rate limit (útil para suítes de teste).
 */
export async function resetRateLimits(): Promise<void> {
  await resetDistributedSecurityStateForTesting();
}

/**
 * Cria um middleware de rate limit distribuído para uma categoria específica.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Limite de requisições excedido. Tente novamente mais tarde.',
    category,
    keyGenerator = (req: Request) => {
      // Suporte a X-Forwarded-For em proxies reversos (Cloud Run / Nginx)
      const xForwardedFor = req.headers['x-forwarded-for'];
      const rawIp = typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : (req.ip || req.socket.remoteAddress || '127.0.0.1');
      return rawIp;
    },
    skip = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next();
    }

    try {
      const rawKey = keyGenerator(req);
      const compositeKey = `${category}:${rawKey}`;

      const result = await checkAndIncrementRateLimit({
        key: compositeKey,
        category,
        windowMs,
        max,
      });

      const now = Date.now();
      const resetTimeSeconds = Math.max(1, Math.ceil((result.resetTime - now) / 1000));

      // Definir cabeçalhos padrão RFC de RateLimit
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', result.remaining);
      res.setHeader('RateLimit-Reset', resetTimeSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

      if (!result.allowed) {
        res.setHeader('Retry-After', resetTimeSeconds);

        safeLogger.warn(`Rate limit distribuído excedido na categoria [${category}]`, {
          category,
          key: rawKey,
          totalHits: result.totalHits,
          max,
          retryAfter: resetTimeSeconds,
          path: req.path,
          method: req.method,
        });

        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          category,
          retryAfter: resetTimeSeconds,
        });
      }

      return next();
    } catch (err: any) {
      safeLogger.error('Erro no middleware de rate limit distribuído', {
        category,
        error: err?.message,
      });
      // Em caso de falha em produção, fail closed
      if (process.env.NODE_ENV === 'production') {
        return res.status(429).json({
          success: false,
          error: 'Limite de requisições excedido. Tente novamente mais tarde.',
          code: 'RATE_LIMIT_EXCEEDED',
          category,
        });
      }
      return next();
    }
  };
}

/**
 * ----------------------------------------------------------------------------
 * LIMITADORES DE TAXA PRÉ-CONFIGURADOS POR RISCO
 * ----------------------------------------------------------------------------
 */

// 1. Login: Proteção contra força bruta (10 tentativas por 15 minutos por IP)
export const loginRateLimiter = createRateLimiter({
  category: 'auth_login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login a partir deste endereço IP. Aguarde alguns minutos antes de tentar novamente.',
});

// 1.1 Demo: Inicialização do modo de demonstração (60 tentativas por 15 minutos por IP)
export const demoRateLimiter = createRateLimiter({
  category: 'auth_demo',
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Limite de inicialização do modo de demonstração atingido. Aguarde alguns minutos antes de tentar novamente.',
});

// 2. Registro: Proteção contra spam de cadastro (5 registros por 1 hora por IP)
export const registerRateLimiter = createRateLimiter({
  category: 'auth_register',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Limite de criação de novas contas excedido para este endereço IP. Tente novamente mais tarde.',
});

// 3. IA / Copiloto / Chat: Proteção de custos e capacidade (30 requisições por minuto)
export const aiIntelligenceRateLimiter = createRateLimiter({
  category: 'ai_intelligence',
  windowMs: 60 * 1000,
  max: 30,
  message: 'Limite de chamadas à Inteligência Artificial excedido para este período. Aguarde alguns segundos.',
});

// 4. OCR / Scanner de Notinhas / Comprovantes: Proteção de processamento visual (20 requisições por minuto)
export const ocrRateLimiter = createRateLimiter({
  category: 'ocr_vision',
  windowMs: 60 * 1000,
  max: 20,
  message: 'Limite de processamento visual de comprovantes excedido. Aguarde alguns segundos.',
});

// 5. Uploads de Arquivos e Fotos: Proteção de armazenamento e bandwidth (25 uploads por minuto)
export const uploadRateLimiter = createRateLimiter({
  category: 'file_upload',
  windowMs: 60 * 1000,
  max: 25,
  message: 'Limite de envio de arquivos excedido. Aguarde um momento.',
});

// 6. API Geral: Proteção global generosa (300 requisições por minuto por IP)
export const generalApiRateLimiter = createRateLimiter({
  category: 'general_api',
  windowMs: 60 * 1000,
  max: 300,
  message: 'Muitas requisições enviadas ao servidor. Diminua a frequência das operações.',
});
