/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — SECURITY HEADERS & STRICT CORS MIDDLEWARE
 * ============================================================================
 * Cabeçalhos de segurança HTTP e controle de acesso CORS estrito para produção.
 * - Allowlist explícita (sem wildcard * com credenciais)
 * - Headers defensivos (CSP, HSTS, X-Content-Type-Options, Referrer-Policy)
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { isOriginAllowed } from './csrfProtection';

/**
 * Middleware para aplicação de Security Headers essenciais.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Previne MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Política de Referrer segura
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Previne XSS em navegadores legados
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Proteção contra Clickjacking e controle de frames
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://ai.studio;");
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Permissões de hardware controladas
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');

  // HSTS (Strict-Transport-Security) com max-age de 1 ano
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  next();
}

/**
 * Middleware para controle estrito de CORS em APIs web.
 */
export function strictCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');

  if (origin) {
    const isAllowed = isOriginAllowed(origin, req);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For'
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After'
      );
    } else if (req.method === 'OPTIONS') {
      // Rejeitar preflight para origens não autorizadas
      return res.status(403).json({
        success: false,
        error: 'CORS Preflight rejeitado: Origem não autorizada.',
        code: 'CORS_FORBIDDEN',
      });
    }
  }

  // Tratamento de requisições preflight OPTIONS válidas
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
