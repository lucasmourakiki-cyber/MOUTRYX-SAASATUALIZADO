/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — CENTRALIZED SECURE ERROR HANDLER
 * ============================================================================
 * Camada centralizada de tratamento seguro de erros para produção.
 * Garante que:
 * - NENHUM detalhe interno (SQL, schema, stack trace, paths, segredos) vaze para o cliente HTTP
 * - Erros legítimos de validação de usuário permaneçam claros e amigáveis
 * - Diagnósticos técnicos completos sejam preservados exclusivamente nos logs do servidor
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from './safeLogger';
import { ConcurrencyConflictError } from '../db/errors';

const SQL_AND_INTERNAL_PATTERNS = [
  /relation .* does not exist/i,
  /syntax error at or near/i,
  /column .* does not exist/i,
  /violates foreign key constraint/i,
  /violates not-null constraint/i,
  /violates check constraint/i,
  /duplicate key value violates unique constraint/i,
  /select .* from/i,
  /insert into/i,
  /update .* set/i,
  /delete from/i,
  /table .* not found/i,
  /pg_catalog/i,
  /node_modules/i,
  /\/home\//i,
  /\/usr\//i,
  /\/var\//i,
  /\/src\//i,
  /\/app\//i,
  /\\src\\/i,
  /postgresql:\/\//i,
  /postgres:\/\//i,
  /database_url/i,
  /gemini_api_key/i,
  /session_secret/i,
  /at (?:async )?[a-zA-Z0-9_\.]+\s*\(/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOENT/i,
  /EACCES/i,
  /GoogleGenAI/i,
  /GenerativeLanguage/i,
  /GoogleGenerativeAI/i,
];

/**
 * Determina se uma mensagem de erro contém detalhes técnicos, de banco, filesystem ou infraestrutura que devem ser ocultados.
 */
export function isInternalOrSensitiveMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return false;
  return SQL_AND_INTERNAL_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Sanitiza a mensagem de erro para o cliente HTTP, garantindo zero vazamento de informações internas.
 */
export function sanitizeClientErrorMessage(err: any, statusCode: number): { error: string; code: string } {
  // 1. Concurrency Conflict
  if (
    err instanceof ConcurrencyConflictError ||
    err?.code === 'CONCURRENCY_CONFLICT' ||
    err?.name === 'ConcurrencyConflictError' ||
    (typeof err?.message === 'string' && (err.message.includes('modificado por outro usuário') || err.message.includes('Concurrency conflict')))
  ) {
    return {
      error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.',
      code: 'CONCURRENCY_CONFLICT',
    };
  }

  // 2. Violação de chave duplicada (ex: e-mail já cadastrado)
  if (err?.code === '23505' || (err?.message && (err.message.includes('idx_users_lower_email') || err.message.includes('já está cadastrado')))) {
    return {
      error: 'Este e-mail já está cadastrado no sistema.',
      code: 'DUPLICATE_RESOURCE',
    };
  }

  const rawMessage = typeof err === 'string' ? err : (err?.message || '');

  // 3. Erros internos do servidor (HTTP 500+) ou mensagens com SQL/caminhos internos/stack
  if (statusCode >= 500 || isInternalOrSensitiveMessage(rawMessage)) {
    return {
      error: 'Não foi possível concluir a operação.',
      code: 'INTERNAL_SERVER_ERROR',
    };
  }

  // 4. Mensagens de validação amigáveis para o usuário em erros 4xx (sem dados sensíveis)
  if (statusCode >= 400 && statusCode < 500 && rawMessage.trim().length > 0) {
    return {
      error: rawMessage.trim(),
      code: err.code || 'BAD_REQUEST',
    };
  }

  return {
    error: 'Não foi possível concluir a operação.',
    code: 'INTERNAL_SERVER_ERROR',
  };
}

/**
 * Middleware de erro centralizado para todas as rotas Express (/api/*).
 */
export function centralizedErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;

  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  } else if (typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (err instanceof ConcurrencyConflictError || err?.code === 'CONCURRENCY_CONFLICT') {
    statusCode = 409;
  } else if (err?.code === '23505') {
    statusCode = 409;
  }

  // Log técnico detalhado e seguro no servidor (redigido pelo safeLogger)
  safeLogger.error(`Erro na requisição ${req.method} ${req.originalUrl || req.path}`, {
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    ip: req.ip,
    companyId: (req as any).effectiveCompanyId || (req as any).user?.companyId,
    userId: (req as any).user?.id,
  }, err);

  const sanitized = sanitizeClientErrorMessage(err, statusCode);

  return res.status(statusCode).json({
    success: false,
    error: sanitized.error,
    code: sanitized.code,
  });
}
