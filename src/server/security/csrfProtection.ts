/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — CSRF & STRICT ORIGIN INTEGRITY PROTECTION
 * ============================================================================
 * Middleware de validação estrita de integridade de Origem (Origin/Referer)
 * com Allowlist explícita (sem wildcards genéricos) para proteção contra
 * ataques Cross-Site Request Forgery (CSRF).
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from './safeLogger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Normaliza uma URL ou string de origem para o formato protocol://hostname[:port]
 */
export function normalizeOrigin(rawOrigin?: string | null): string | null {
  if (!rawOrigin || typeof rawOrigin !== 'string') return null;
  const trimmed = rawOrigin.trim();
  if (!trimmed || trimmed === 'null') return null;

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    // If not a full URL, strip trailing slashes
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Obtém o conjunto de origens explicitamente permitidas com base no ambiente e na requisição.
 */
export function getAllowedOrigins(req?: Request): Set<string> {
  const allowed = new Set<string>();

  // 1. Host atual da requisição e cabeçalho de proxy (Same-Origin)
  if (req) {
    const host = req.get('host');
    if (host) {
      allowed.add(`http://${host}`.toLowerCase());
      allowed.add(`https://${host}`.toLowerCase());
    }
    const forwardedHost = req.get('x-forwarded-host');
    if (forwardedHost) {
      const fHosts = forwardedHost.split(',');
      for (const fh of fHosts) {
        const cleanFh = fh.trim();
        if (cleanFh) {
          allowed.add(`http://${cleanFh}`.toLowerCase());
          allowed.add(`https://${cleanFh}`.toLowerCase());
        }
      }
    }
  }

  // 2. Variáveis de ambiente configuradas explicitamente
  const envOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ALLOWED_ORIGINS,
  ];

  for (const envVal of envOrigins) {
    if (envVal && typeof envVal === 'string') {
      const parts = envVal.split(',');
      for (const part of parts) {
        const norm = normalizeOrigin(part);
        if (norm) allowed.add(norm);
      }
    }
  }

  // 3. AI Studio preview específico
  allowed.add('https://ai.studio');
  allowed.add('https://aistudio.google.com');

  // 4. Desenvolvimento local (portas autorizadas do ecossistema)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    allowed.add('http://0.0.0.0:3000');
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    allowed.add('http://localhost:4173');
    allowed.add('http://127.0.0.1:4173');
  }

  return allowed;
}

/**
 * Verifica se uma origem específica é autorizada de forma estrita (sem wildcards permissivos).
 */
export function isOriginAllowed(origin: string | null | undefined, req?: Request): boolean {
  if (!origin) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;

  const allowed = getAllowedOrigins(req);
  if (allowed.has(norm)) return true;

  // Suporte estrito a subdomínios do preview do AI Studio (ex: https://xxx.aistudio.google.com ou https://xxx.ai.studio)
  try {
    const parsed = new URL(norm);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'ai.studio' ||
      hostname.endsWith('.ai.studio') ||
      hostname === 'aistudio.google.com' ||
      hostname.endsWith('.aistudio.google.com') ||
      hostname.endsWith('.run.app') ||
      hostname.endsWith('.googleusercontent.com') ||
      hostname.endsWith('.google.com')
    ) {
      return true;
    }

    // Em modo não-produção, permitir portas em localhost
    if (process.env.NODE_ENV !== 'production') {
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Middleware express para proteção CSRF e validação de integridade de origem.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Métodos seguros (GET, HEAD, OPTIONS) são idempotentes
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const originHeader = req.get('origin');
  const refererHeader = req.get('referer');
  const secFetchSite = req.get('sec-fetch-site');

  // 1. Se Origin header estiver presente (comportamento padrão de fetch/XHR moderno)
  if (originHeader) {
    if (isOriginAllowed(originHeader, req)) {
      return next();
    }

    safeLogger.warn('Bloqueio CSRF: Origem não autorizada', {
      method: req.method,
      path: req.path,
      origin: originHeader,
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      error: 'Origem da requisição não autorizada (CSRF Protection).',
      code: 'CSRF_ORIGIN_INVALID',
    });
  }

  // 2. Se Origin ausente, verificar Referer
  if (refererHeader) {
    const refererOrigin = normalizeOrigin(refererHeader);
    if (isOriginAllowed(refererOrigin, req)) {
      return next();
    }

    safeLogger.warn('Bloqueio CSRF: Referer não autorizado', {
      method: req.method,
      path: req.path,
      referer: refererHeader,
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      error: 'Referer da requisição não autorizado (CSRF Protection).',
      code: 'CSRF_REFERER_INVALID',
    });
  }

  // 3. Se nem Origin nem Referer estiverem presentes:
  // Se for uma requisição cross-site de navegador, bloquear
  if (secFetchSite === 'cross-site') {
    safeLogger.warn('Bloqueio CSRF: Requisição cross-site sem Origin/Referer', {
      method: req.method,
      path: req.path,
      secFetchSite,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      error: 'Requisição cross-site bloqueada por política CSRF.',
      code: 'CSRF_CROSS_SITE_BLOCKED',
    });
  }

  // 4. Se for chamada programática CLI/Server com Bearer token e sem cabeçalhos de browser
  const authHeader = req.headers.authorization;
  const isBrowserRequest = Boolean(
    req.headers['sec-fetch-mode'] ||
    req.headers['sec-fetch-site'] ||
    (req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla'))
  );

  if (authHeader && authHeader.startsWith('Bearer ') && !isBrowserRequest) {
    return next();
  }

  // Requisições diretas same-site / servidor local sem Origin explícito
  return next();
}
