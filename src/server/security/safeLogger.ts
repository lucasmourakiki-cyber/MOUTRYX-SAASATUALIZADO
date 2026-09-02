/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — SAFE INTERNAL LOGGER
 * ============================================================================
 * Logger com mascaramento automático de segredos, senhas, tokens, cookies e
 * connection strings para evitar vazamento acidental em logs e stdout/stderr.
 */

import { sanitizeDatabaseUrl } from '../db/postgresClient';

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'senha',
  'token',
  'session_token',
  'moutryx_session_token',
  'sessiontoken',
  'secret',
  'session_secret',
  'gemini_api_key',
  'apikey',
  'api_key',
  'cookie',
  'authorization',
  'database_url',
  'postgres_url',
];

/**
 * Sanitiza recursivamente objetos e strings para mascarar valores sensíveis.
 */
export function sanitizeLogData(data: any, depth = 0): any {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let sanitized = data;
    // Mask postgres URLs
    if (sanitized.includes('postgres://') || sanitized.includes('postgresql://')) {
      sanitized = sanitized.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.+)/gi, '$1***$3');
    }
    // Mask tokens / keys
    if (sanitized.length > 50 && /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(sanitized)) {
      return sanitized.substring(0, 6) + '***' + sanitized.substring(sanitized.length - 4);
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    // If it's an Error instance
    if (data instanceof Error) {
      return {
        name: data.name,
        message: sanitizeLogData(data.message, depth + 1),
        stack: sanitizeLogData(data.stack, depth + 1),
        code: (data as any).code,
      };
    }

    const sanitizedObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((k) => lowerKey.includes(k));
      if (isSensitive && typeof val === 'string' && val.length > 0) {
        sanitizedObj[key] = '***REDACTED***';
      } else {
        sanitizedObj[key] = sanitizeLogData(val, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  companyId?: string;
  userId?: string;
  statusCode?: number;
  [key: string]: any;
}

export const safeLogger = {
  info(message: string, context?: LogContext, data?: any) {
    const ts = new Date().toISOString();
    const cleanCtx = context ? sanitizeLogData(context) : undefined;
    const cleanData = data !== undefined ? sanitizeLogData(data) : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[MOUTRYX INFO] [${ts}] ${cleanCtx?.requestId ? `[${cleanCtx.requestId}] ` : ''}${message}`,
        cleanCtx ? JSON.stringify(cleanCtx) : '',
        cleanData ? JSON.stringify(cleanData) : ''
      );
    }
  },

  warn(message: string, context?: LogContext, data?: any) {
    const ts = new Date().toISOString();
    const cleanCtx = context ? sanitizeLogData(context) : undefined;
    const cleanData = data !== undefined ? sanitizeLogData(data) : undefined;
    console.warn(
      `[MOUTRYX WARN] [${ts}] ${cleanCtx?.requestId ? `[${cleanCtx.requestId}] ` : ''}${message}`,
      cleanCtx ? JSON.stringify(cleanCtx) : '',
      cleanData ? JSON.stringify(cleanData) : ''
    );
  },

  error(message: string, context?: LogContext, error?: any) {
    const ts = new Date().toISOString();
    const cleanCtx = context ? sanitizeLogData(context) : undefined;
    const cleanError = error ? sanitizeLogData(error) : undefined;
    console.error(
      `[MOUTRYX ERROR] [${ts}] ${cleanCtx?.requestId ? `[${cleanCtx.requestId}] ` : ''}${message}`,
      cleanCtx ? JSON.stringify(cleanCtx) : '',
      cleanError ? JSON.stringify(cleanError) : ''
    );
  },
};
