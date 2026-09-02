import { Router, Response, Request } from 'express';
import { hashPassword, verifyPassword } from './passwordUtils';
import { createSessionToken, invalidateSessionToken } from './sessionUtils';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  sanitizeUser,
  getAllUsers,
  StoredUser,
} from './userStore';
import { requireAuth, requirePermission, extractToken, AuthenticatedRequest } from './authMiddleware';
import { getPermissionsForRole, canManageRole } from './rbac';
import { getCompanyRepository, getUserRepository } from './repositoryFactory';
import { withTransaction } from '../db/postgresClient';
import { loginRateLimiter, registerRateLimiter, demoRateLimiter } from '../security/rateLimiter';

export const authRouter = Router();

const COOKIE_NAME = 'moutryx_session_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to set hardened secure HttpOnly cookie (compatible with iframe and cross-site embedding)
function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * POST /api/auth/register
 * Register a new user with strict server-enforced role and tenant protection.
 * In the SaaS model: 1 subscription = 1 company = 1 tenant = 1 user environment.
 * PUBLIC REGISTRATION RULE:
 * 1. ALWAYS provision a brand new, exclusive company/tenant for the registering user.
 * 2. NEVER associate a public registration to an existing company (ignore any client-sent companyId/tenantId).
 * 3. NEVER use hardcoded 'comp-1' or default fallbacks.
 * 4. The user always receives role 'proprietario' (owner/administrator of their new tenant).
 * 5. ATOMIC: Company + User creation executed in an ACID transaction.
 */
authRouter.post('/register', registerRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, companyName, tradeName, cnpj, document, city, state } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome completo é obrigatório (mínimo 2 caracteres).' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve conter no mínimo 6 caracteres.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    /**
     * SECURITY RULE: SERVER-CONTROLLED IDENTITY & PERMISSIONS
     * Public registrations always receive role 'proprietario' (owner of their new exclusive tenant).
     * Any client-sent 'role', 'roleName', or 'permissions' are strictly ignored.
     */
    const assignedRole: StoredUser['role'] = 'proprietario';

    /**
     * TENANT PROVISIONING:
     * ALWAYS create a brand new exclusive company/tenant for this registration.
     * Client-sent companyId/tenantId is strictly ignored for public registrations to prevent cross-tenant hijacking.
     */
    const trimmedCompanyName = typeof companyName === 'string' && companyName.trim().length >= 2
      ? companyName.trim()
      : `Empresa ${name.trim()}`;

    const trimmedTradeName = typeof tradeName === 'string' && tradeName.trim().length >= 2
      ? tradeName.trim()
      : trimmedCompanyName;

    const trimmedDoc = typeof cnpj === 'string' && cnpj.trim()
      ? cnpj.trim()
      : (typeof document === 'string' ? document.trim() : '');

    const companyRepo = getCompanyRepository();
    const userRepo = getUserRepository();

    // ATOMIC TRANSACTION: Both company and user are created within a single transaction
    // The email existence check is performed inside the transaction with the same transactional executor `tx`
    // to prevent race conditions and eliminate orphan tenant creation.
    const { newUser, createdCompany } = await withTransaction(async (tx) => {
      // 1. Check if user already exists within the current transaction
      const existingInTx = await userRepo.findByEmail(normalizedEmail, tx);
      if (existingInTx) {
        throw new Error(`Este e-mail (${normalizedEmail}) já está cadastrado no sistema.`);
      }

      // 2. Create Company within the transaction
      const comp = await companyRepo.create({
        name: trimmedCompanyName,
        tradeName: trimmedTradeName,
        cnpj: trimmedDoc,
        document: trimmedDoc,
        city: typeof city === 'string' && city.trim() ? city.trim() : 'Sinop',
        state: typeof state === 'string' && state.trim() ? state.trim() : 'MT',
        email: normalizedEmail,
        phone: typeof phone === 'string' ? phone.trim() : '',
      }, tx);

      if (!comp || !comp.id) {
        throw new Error('Falha ao provisionar organização/tenant para o novo usuário.');
      }

      // 3. Create User within the transaction linked to the newly created company
      const user = await userRepo.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        companyId: comp.id,
        phone: typeof phone === 'string' ? phone.trim() : '',
      }, tx);

      return { newUser: user, createdCompany: comp };
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      companyId: newUser.companyId,
    }, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : undefined),
    });

    setSessionCookie(res, token);

    return res.status(201).json({
      success: true,
      user: sanitizeUser(newUser),
      company: createdCompany,
      permissions: getPermissionsForRole(newUser.role),
      message: 'Conta e ambiente exclusivo MOUTRYX criados com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/register:', err);
    if (
      err.message && (
        err.message.includes('já está cadastrado') ||
        err.message.includes('duplicate key') ||
        err.message.includes('idx_users_lower_email') ||
        err.code === '23505'
      )
    ) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.', code: 'DUPLICATE_RESOURCE' });
    }
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user with email and password
 * Uses HttpOnly session cookies exclusively for web clients
 */
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.', code: 'INVALID_CREDENTIALS' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.', code: 'INVALID_CREDENTIALS' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Esta conta de usuário está inativa. Contate o administrador.', code: 'ACCOUNT_INACTIVE' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.', code: 'INVALID_CREDENTIALS' });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    }, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : undefined),
    });

    setSessionCookie(res, token);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      permissions: getPermissionsForRole(user.role),
      message: 'Login realizado com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/login:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar autenticação.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/**
 * POST /api/auth/demo
 * Creates a safe, isolated, temporary demonstration session.
 * - Requires no email, password, or registration.
 * - Bound exclusively to the demonstration tenant (comp-1) with mock operational data.
 * - Role is restricted to operational/view mode ('gestor_operacional') with zero administrative privileges.
 * - Prevents access to other tenants, secret keys, or real production actions.
 * - Sets the secure HttpOnly cookie for session persistence.
 */
authRouter.post('/demo', demoRateLimiter, async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo@moutryx.com';
    let demoUser = await findUserByEmail(demoEmail);

    if (!demoUser) {
      // Auto-provision safe demo user if not already in store
      const passwordHash = await hashPassword('demo-safe-session-' + Date.now());
      demoUser = await createUser({
        name: 'Visitante Demonstração',
        email: demoEmail,
        passwordHash,
        role: 'gestor_operacional',
        companyId: 'comp-1',
        phone: '(66) 99999-0000',
      });
    }

    const token = await createSessionToken({
      userId: demoUser.id,
      email: demoUser.email,
      role: demoUser.role,
      companyId: demoUser.companyId,
    }, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : undefined),
    });

    setSessionCookie(res, token);

    return res.json({
      success: true,
      user: sanitizeUser(demoUser),
      permissions: getPermissionsForRole(demoUser.role),
      isDemo: true,
      message: 'Ambiente de demonstração iniciado com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/demo:', err);
    return res.status(500).json({ error: 'Erro ao iniciar modo demonstração.', code: 'DEMO_INITIALIZATION_ERROR' });
  }
});

/**
 * POST /api/auth/token
 * Programmatic / CLI / Server-to-Server Authentication Flow
 * Strictly isolated from browser contexts.
 */
authRouter.post('/token', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.', code: 'INVALID_CREDENTIALS' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.', code: 'INVALID_CREDENTIALS' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    }, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : undefined),
    });

    return res.json({
      success: true,
      tokenType: 'Bearer',
      token,
      expiresIn: 7 * 24 * 60 * 60,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar token programático.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie and invalidate token in persistent storage (Fail-Closed)
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  const currentToken = extractToken(req);
  if (currentToken) {
    try {
      await invalidateSessionToken(currentToken);
    } catch (err: any) {
      console.error('[MOUTRYX AUTH] Falha ao revogar sessão no banco durante logout (Fail-Closed):', err?.message);
      return res.status(503).json({
        success: false,
        error: 'Falha ao revogar a sessão no servidor. O serviço de persistência de autenticação está temporariamente indisponível.',
        code: 'REVOCATION_FAILED',
      });
    }
  }

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
  });

  return res.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user details determined exclusively by server session
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Não autenticado.', authenticated: false, code: 'UNAUTHORIZED' });
  }

  return res.json({
    authenticated: true,
    user: req.user,
    permissions: getPermissionsForRole(req.user.role),
  });
});

/**
 * ============================================================================
 * USER MANAGEMENT RBAC ENDPOINTS (/api/auth/users)
 * ============================================================================
 */

/**
 * GET /api/auth/users
 * List users. Protected by 'users.read' permission.
 * Strictly scopes response to the caller's tenant (unless super_admin).
 */
authRouter.get('/users', requireAuth, requirePermission('users.read'), async (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  const allUsers = await getAllUsers();

  // Multi-tenant isolation: non-super_admins only see users in their own company
  const filtered = caller.role === 'super_admin'
    ? allUsers
    : allUsers.filter((u) => u.companyId === caller.companyId);

  return res.json({
    users: filtered,
  });
});

/**
 * POST /api/auth/users
 * Create a new user. Protected by 'users.create' permission.
 * Strictly prevents privilege escalation, hierarchy violation, and cross-tenant user creation.
 */
authRouter.post('/users', requireAuth, requirePermission('users.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const { name, email, password, role, companyId, phone } = req.body;
    const requestedRole: StoredUser['role'] = role || 'piloto';

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve conter no mínimo 6 caracteres.' });
    }

    // ANTI-PRIVILEGE ESCALATION & ROLE HIERARCHY CHECK:
    // Caller cannot assign a role unless caller has sufficient role hierarchy authority
    if (!canManageRole(caller.role, requestedRole)) {
      return res.status(403).json({
        error: `Acesso negado. O perfil ${caller.role} não tem permissão para atribuir o perfil ${requestedRole}.`,
      });
    }

    // MULTI-TENANT ISOLATION: Non-super_admin cannot create users for other tenants
    let targetCompanyId = caller.companyId;
    if (companyId && typeof companyId === 'string') {
      if (caller.role !== 'super_admin' && companyId !== caller.companyId) {
        return res.status(403).json({
          error: 'Acesso proibido. Não é permitido criar usuários em outra organização/tenant.',
        });
      }
      targetCompanyId = companyId;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: requestedRole,
      companyId: targetCompanyId,
      phone: typeof phone === 'string' ? phone.trim() : '',
    });

    return res.status(201).json({
      success: true,
      user: sanitizeUser(newUser),
      message: 'Usuário cadastrado com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

/**
 * PUT /api/auth/users/:id
 * Update an existing user. Protected by 'users.update' permission.
 * Strictly prevents privilege escalation, hierarchy violation, and cross-tenant manipulation.
 */
authRouter.put('/users/:id', requireAuth, requirePermission('users.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const targetUserId = req.params.id;
    const { name, phone, role, companyId, active, password } = req.body;

    const existingUser = await findUserById(targetUserId);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // MULTI-TENANT ISOLATION: Non-super_admin cannot edit users from other tenants
    if (caller.role !== 'super_admin' && existingUser.companyId !== caller.companyId) {
      return res.status(403).json({
        error: 'Acesso proibido. Não é permitido alterar usuários de outra organização/tenant.',
      });
    }

    // ANTI-PRIVILEGE ESCALATION / HIERARCHY CHECK:
    // 1. Caller must have hierarchy authority to manage the target user's current role (unless editing self without role change)
    if (!canManageRole(caller.role, existingUser.role) && caller.id !== targetUserId) {
      return res.status(403).json({
        error: `Acesso negado. O perfil ${caller.role} não possui autoridade para gerenciar contas de perfil ${existingUser.role}.`,
      });
    }

    // 2. If attempting to change role, validate that caller has authority to assign the target role
    if (role && typeof role === 'string' && role !== existingUser.role) {
      if (!canManageRole(caller.role, role as StoredUser['role'])) {
        return res.status(403).json({
          error: `Acesso negado. O perfil ${caller.role} não tem permissão para atribuir o perfil ${role}.`,
        });
      }
    }

    // 3. Super admin accounts cannot be modified by non-super_admin
    if (existingUser.role === 'super_admin' && caller.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas super_admin pode alterar contas de super_admin.',
      });
    }

    // TENANT LOCK: Non-super_admin cannot change companyId
    if (companyId && companyId !== existingUser.companyId && caller.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso proibido. Não é permitido transferir usuários para outra organização/tenant.',
      });
    }

    const updates: any = {};
    if (name && typeof name === 'string') updates.name = name.trim();
    if (phone !== undefined) updates.phone = typeof phone === 'string' ? phone.trim() : '';
    if (role && typeof role === 'string') updates.role = role;
    if (caller.role === 'super_admin' && companyId) updates.companyId = companyId;
    if (typeof active === 'boolean') updates.active = active;

    if (password && typeof password === 'string' && password.length >= 6) {
      // If changing password, hash it
      const passwordHash = await hashPassword(password);
      // userStore update handles storedUser fields
      (updates as any).passwordHash = passwordHash;
    }

    const updated = await updateUser(targetUserId, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Falha ao atualizar usuário.' });
    }

    return res.json({
      success: true,
      user: sanitizeUser(updated),
      message: 'Usuário atualizado com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Delete/Deactivate user. Protected by 'users.delete' permission.
 * Prevents self-deletion, cross-tenant deletion, and hierarchy violation.
 */
authRouter.delete('/users/:id', requireAuth, requirePermission('users.delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const targetUserId = req.params.id;

    if (caller.id === targetUserId) {
      return res.status(400).json({
        error: 'Operação inválida. Não é permitido excluir o próprio usuário logado.',
      });
    }

    const existingUser = await findUserById(targetUserId);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // MULTI-TENANT ISOLATION
    if (caller.role !== 'super_admin' && existingUser.companyId !== caller.companyId) {
      return res.status(403).json({
        error: 'Acesso proibido. Não é permitido excluir usuários de outra organização/tenant.',
      });
    }

    // ROLE HIERARCHY CHECK: Caller must have authority to manage/delete the target user's role
    if (!canManageRole(caller.role, existingUser.role)) {
      return res.status(403).json({
        error: `Acesso negado. O perfil ${caller.role} não tem permissão para excluir usuários com perfil ${existingUser.role}.`,
      });
    }

    // Super admin accounts cannot be deleted by non-super_admin
    if (existingUser.role === 'super_admin' && caller.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas super_admin pode gerenciar contas super_admin.',
      });
    }

    const deleted = await deleteUser(targetUserId);
    if (!deleted) {
      return res.status(500).json({ error: 'Falha ao excluir usuário.' });
    }

    return res.json({
      success: true,
      message: 'Usuário excluído com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro ao excluir usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
  }
});

/**
 * ============================================================================
 * COMPANY / TENANT SAAS RBAC ENDPOINTS (/api/auth/companies)
 * ============================================================================
 * Strict SaaS isolation rules:
 * - Regular clients can ONLY view or update their single linked company.
 * - Regular clients CANNOT list other companies, switch companies, or create new companies.
 * - Only MOUTRYX super_admin can view all companies or provision new companies.
 */

/**
 * GET /api/auth/companies
 * List companies.
 * - Non-super_admin: returns ONLY their single associated tenant.
 * - Super admin: returns all tenants.
 */
authRouter.get('/companies', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const companyRepo = getCompanyRepository();

    if (caller.role === 'super_admin') {
      const all = await companyRepo.getAll();
      return res.json({ success: true, companies: all, isSuperAdmin: true });
    }

    const singleComp = await companyRepo.findById(caller.companyId);
    return res.json({
      success: true,
      companies: singleComp ? [singleComp] : [],
      isSuperAdmin: false,
    });
  } catch (err: any) {
    console.error('Erro ao listar empresas/tenants:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados da empresa.' });
  }
});

/**
 * GET /api/auth/companies/:id
 * Get details of a single company.
 * Non-super_admin can only fetch their own company.
 */
authRouter.get('/companies/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const targetId = req.params.id;

    if (caller.role !== 'super_admin' && caller.companyId !== targetId) {
      return res.status(403).json({
        error: 'Acesso proibido. Você só tem permissão para acessar os dados da sua própria empresa.',
      });
    }

    const companyRepo = getCompanyRepository();
    const comp = await companyRepo.findById(targetId);
    if (!comp) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    return res.json({ success: true, company: comp });
  } catch (err: any) {
    console.error('Erro ao obter dados da empresa:', err);
    return res.status(500).json({ error: 'Erro ao carregar empresa.' });
  }
});

/**
 * POST /api/auth/companies
 * Create a new company.
 * Strictly forbidden for regular clients (1 user = 1 company = 1 tenant).
 * Allowed ONLY for MOUTRYX super_admin.
 */
authRouter.post('/companies', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;

    if (caller.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores MOUTRYX podem criar novas empresas/tenants no sistema.',
      });
    }

    const { name, tradeName, document, cnpj, city, state, plan, email, phone } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome/Razão Social da empresa é obrigatório.' });
    }

    const companyRepo = getCompanyRepository();
    const created = await companyRepo.create({
      name: name.trim(),
      tradeName: tradeName?.trim(),
      document: document || cnpj,
      cnpj: cnpj || document,
      city: city?.trim(),
      state: state?.trim(),
      plan: plan?.trim() || 'Profissional',
      email: email?.trim(),
      phone: phone?.trim(),
    });

    return res.status(201).json({
      success: true,
      company: created,
      message: 'Nova empresa/tenant criada com sucesso no sistema.',
    });
  } catch (err: any) {
    console.error('Erro ao criar empresa:', err);
    return res.status(500).json({ error: 'Erro interno ao criar empresa.' });
  }
});

/**
 * PUT /api/auth/companies/:id
 * Update company business details.
 * Allowed for super_admin or for the company's owner/administrator.
 */
authRouter.put('/companies/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caller = req.user!;
    const targetId = req.params.id;

    if (caller.role !== 'super_admin' && caller.companyId !== targetId) {
      return res.status(403).json({
        error: 'Acesso proibido. Não é permitido alterar dados de outra empresa.',
      });
    }

    // Role check: Only owner, admin or super_admin can update company registration
    if (caller.role !== 'super_admin' && !['proprietario', 'administrador'].includes(caller.role)) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas o Proprietário ou Administrador pode atualizar os dados da empresa.',
      });
    }

    const companyRepo = getCompanyRepository();
    const updated = await companyRepo.update(targetId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    return res.json({
      success: true,
      company: updated,
      message: 'Dados da empresa atualizados com sucesso.',
    });
  } catch (err: any) {
    console.error('Erro ao atualizar empresa:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar dados da empresa.' });
  }
});

