import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from './sessionUtils';
import { hashToken } from './sessionStore';
import { getSessionRepository } from './repositoryFactory';
import { findUserById, sanitizeUser, SafeUser } from './userStore';
import { Permission, hasPermission, ROLE_PERMISSIONS } from './rbac';
import { UserRole } from '../../types';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  authenticatedUser?: SafeUser;
  effectiveCompanyId?: string;
}

const COOKIE_NAME = 'moutryx_session_token';

/**
 * Extracts session token with strict context isolation:
 * 1. Web SaaS Browser Flow: Strictly extracts token from secure HttpOnly Cookie (`moutryx_session_token`).
 * 2. Programmatic CLI / Server-to-Server Flow: Permitted strictly for headless non-browser environments.
 *    Any browser request (with Origin/Referer/Sec-Fetch headers) attempting to use Bearer is disallowed.
 */
export function extractToken(req: Request): string | null {
  // 1. Check cookies via cookie-parser middleware (Primary Web SaaS Authentication)
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  // 2. Fallback: Parse raw Cookie header if cookie-parser was bypassed
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  // 3. Programmatic CLI / Server-to-Server integration fallback:
  // Disallowed for browser requests to ensure web clients never rely on or inject Bearer headers.
  const isBrowserRequest = Boolean(
    req.headers['sec-fetch-mode'] ||
    req.headers['sec-fetch-site'] ||
    (req.headers.origin && req.headers['user-agent'] && !req.headers['user-agent'].includes('node-fetch'))
  );

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    if (isBrowserRequest) {
      // Reject Bearer for browser web flows: Web SaaS requires HttpOnly cookies
      return null;
    }
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Internal Fail-Closed Core Session Authenticator:
 * Guarantees that:
 * 1. Token exists and has valid cryptographic signature and expiration.
 * 2. Token corresponds to an active, persistent session in ISessionRepository.
 * 3. Session is NOT revoked in the persistent repository.
 * 4. User exists and is active.
 * 
 * FAIL-CLOSED: If the session repository throws an error or is unreachable,
 * it NEVER falls back to findUserById() or unverified JWT. It returns status 503 / authenticated: false.
 */
export async function authenticateSession(req: AuthenticatedRequest): Promise<{
  authenticated: boolean;
  user?: SafeUser;
  error?: string;
  status?: number;
  code?: string;
}> {
  const token = extractToken(req);
  if (!token) {
    return {
      authenticated: false,
      error: 'Não autenticado. Sessão ausente.',
      status: 401,
      code: 'UNAUTHORIZED',
    };
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return {
      authenticated: false,
      error: 'Sessão inválida ou expirada. Faça login novamente.',
      status: 401,
      code: 'UNAUTHORIZED',
    };
  }

  // Persistent storage session verification (Fail-Closed)
  try {
    const sessionRepo = getSessionRepository();
    const tokenHash = hashToken(token);
    const session = await sessionRepo.findByTokenHash(tokenHash);

    if (!session || session.revokedAt) {
      return {
        authenticated: false,
        error: 'Sessão revogada ou inexistente. Faça login novamente.',
        status: 401,
        code: 'UNAUTHORIZED',
      };
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return {
        authenticated: false,
        error: 'Sessão expirada. Faça login novamente.',
        status: 401,
        code: 'UNAUTHORIZED',
      };
    }
  } catch (err: any) {
    console.error('[MOUTRYX AUTH] Falha ao consultar repositório de sessão persistente (Fail-Closed):', err?.message);
    return {
      authenticated: false,
      error: 'Serviço de autenticação temporariamente indisponível. Falha ao verificar integridade da sessão.',
      status: 503,
      code: 'AUTH_SERVICE_UNAVAILABLE',
    };
  }

  const user = await findUserById(payload.userId);
  if (!user || !user.active) {
    return {
      authenticated: false,
      error: 'Usuário inativo ou inexistente.',
      status: 401,
      code: 'UNAUTHORIZED',
    };
  }

  const sanitized = sanitizeUser(user);
  return {
    authenticated: true,
    user: sanitized,
  };
}

/**
 * Middleware: Strictly requires valid server-authenticated session.
 * Returns HTTP 401 or 503 if missing, invalid, expired, or database down (Fail-Closed).
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user) {
    return next();
  }

  const result = await authenticateSession(req);
  if (!result.authenticated || !result.user) {
    return res.status(result.status || 401).json({
      success: false,
      error: result.error || 'Não autenticado.',
      authenticated: false,
      code: result.code || 'UNAUTHORIZED',
    });
  }

  req.user = result.user;
  req.authenticatedUser = result.user;
  req.effectiveCompanyId = result.user.companyId;
  next();
}

/**
 * Middleware: Optional authentication (attaches req.user & req.authenticatedUser ONLY IF session is fully validated)
 * FAIL-CLOSED: If sessionRepo fails or is unreachable, req.user remains undefined and authentication is NOT granted.
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const result = await authenticateSession(req);
    if (result.authenticated && result.user) {
      req.user = result.user;
      req.authenticatedUser = result.user;
      req.effectiveCompanyId = result.user.companyId;
    } else {
      // FAIL-CLOSED: Zero fallback to user lookup on repo error
      req.user = undefined;
      req.authenticatedUser = undefined;
      req.effectiveCompanyId = undefined;
    }
  }
  next();
}

/**
 * Middleware: Server-Side Granular Permission Enforcement (RBAC)
 * - If not authenticated: returns HTTP 401 / 503
 * - If authenticated but role lacks the required permission(s): returns HTTP 403 Forbidden
 */
export function requirePermission(permissionOrList: Permission | Permission[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const result = await authenticateSession(req);
      if (!result.authenticated || !result.user) {
        return res.status(result.status || 401).json({
          success: false,
          error: result.error || 'Não autenticado.',
          authenticated: false,
          code: result.code || 'UNAUTHORIZED',
        });
      }

      req.user = result.user;
      req.authenticatedUser = result.user;
      req.effectiveCompanyId = result.user.companyId;
    }

    const userRole = req.user.role;
    const required = Array.isArray(permissionOrList) ? permissionOrList : [permissionOrList];

    // Check if user's role has all required permissions
    const hasAll = required.every((perm) => hasPermission(userRole, perm));

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Permissão insuficiente.',
        code: 'FORBIDDEN',
        requiredPermissions: required,
        userRole: userRole,
        companyId: req.user.companyId,
      });
    }

    next();
  };
}

/**
 * Middleware: Server-Side Role Enforcement
 * - If not authenticated: returns HTTP 401 / 503
 * - If authenticated but role is not in the allowed list: returns HTTP 403 Forbidden
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const result = await authenticateSession(req);
      if (!result.authenticated || !result.user) {
        return res.status(result.status || 401).json({
          success: false,
          error: result.error || 'Não autenticado.',
          authenticated: false,
          code: result.code || 'UNAUTHORIZED',
        });
      }

      req.user = result.user;
      req.authenticatedUser = result.user;
      req.effectiveCompanyId = result.user.companyId;
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (userRole !== 'super_admin' && !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Perfil de usuário não autorizado para esta ação.',
        allowedRoles: roles,
        userRole: userRole,
      });
    }

    next();
  };
}

/**
 * Middleware: Enforces Multi-Tenant Isolation
 * - Prevents non-super_admin users from querying, mutating or passing a companyId different from their authenticated session.
 * - If a non-super_admin user specifies a target companyId that does not match req.user.companyId, returns HTTP 403.
 * - Forces req.effectiveCompanyId = req.user.companyId for regular users.
 */
export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Não autenticado. Sessão ausente.',
      authenticated: false,
    });
  }

  // Check header or query parameter spoofing
  const headerOrQueryCompanyId =
    req.query?.companyId ||
    req.query?.tenantId ||
    req.headers['x-company-id'] ||
    req.headers['x-tenant-id'];

  if (headerOrQueryCompanyId && typeof headerOrQueryCompanyId === 'string') {
    if (req.user.role !== 'super_admin' && headerOrQueryCompanyId !== req.user.companyId) {
      return res.status(403).json({
        error: 'Acesso proibido a dados de outra organização/tenant.',
        userCompanyId: req.user.companyId,
        attemptedCompanyId: headerOrQueryCompanyId,
      });
    }
  }

  // Non-super_admin always operates strictly in their own tenant
  if (req.user.role !== 'super_admin') {
    req.effectiveCompanyId = req.user.companyId;
    if (req.body && typeof req.body === 'object') {
      if ('companyId' in req.body) {
        req.body.companyId = req.user.companyId;
      }
      if ('tenantId' in req.body) {
        req.body.tenantId = req.user.companyId;
      }
    }
  } else {
    const requestedCompanyId =
      req.body?.companyId ||
      req.body?.tenantId ||
      headerOrQueryCompanyId ||
      req.params?.companyId ||
      req.params?.tenantId;
    req.effectiveCompanyId = typeof requestedCompanyId === 'string' ? requestedCompanyId : req.user.companyId;
  }

  next();
}
