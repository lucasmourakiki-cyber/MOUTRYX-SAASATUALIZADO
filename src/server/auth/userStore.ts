import fs from 'fs';
import path from 'path';
import { hashPassword } from './passwordUtils';
import { ProductionInfrastructureError } from '../db/errors';
import { DbExecutor } from '../db/postgresClient';
import { getUserRepository } from './repositoryFactory';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'proprietario' | 'administrador' | 'gestor_operacional' | 'piloto' | 'financeiro' | 'consultor';
  companyId: string;
  phone?: string;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const VALID_USER_ROLES: StoredUser['role'][] = [
  'super_admin',
  'proprietario',
  'administrador',
  'gestor_operacional',
  'piloto',
  'financeiro',
  'consultor',
];

export function normalizeUserRole(role?: string | null): StoredUser['role'] {
  if (!role) return 'proprietario';
  const clean = role.toLowerCase().trim();
  if (VALID_USER_ROLES.includes(clean as StoredUser['role'])) {
    return clean as StoredUser['role'];
  }
  if (clean === 'gerente_operacional' || clean === 'gerente' || clean === 'operacional') {
    return 'gestor_operacional';
  }
  if (clean === 'admin' || clean === 'adm') {
    return 'administrador';
  }
  if (clean === 'owner' || clean === 'produtor' || clean === 'cliente') {
    return 'proprietario';
  }
  if (clean === 'pilot' || clean === 'operador') {
    return 'piloto';
  }
  if (clean === 'finance' || clean === 'financeira') {
    return 'financeiro';
  }
  if (clean === 'agronomo' || clean === 'consultant') {
    return 'consultor';
  }
  return 'proprietario';
}

export type SafeUser = Omit<StoredUser, 'passwordHash'>;

// Strip sensitive fields before returning to client or attaching to session responses
export function sanitizeUser(user: StoredUser): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * ============================================================================
 * USER REPOSITORY CONTRACT (IUserRepository)
 * ============================================================================
 * Contract for user persistence. Guarantees that database adapters can be
 * plugged in without changing authentication routing, session, or business logic.
 */
export interface IUserRepository {
  initialize(): Promise<void>;
  findById(id: string, executor?: DbExecutor): Promise<StoredUser | null>;
  findByEmail(email: string, executor?: DbExecutor): Promise<StoredUser | null>;
  findByCompany(companyId: string, executor?: DbExecutor): Promise<StoredUser[]>;
  create(data: {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: StoredUser['role'];
    companyId?: string;
    phone?: string;
  }, executor?: DbExecutor): Promise<StoredUser>;
  getAll(executor?: DbExecutor): Promise<SafeUser[]>;
  update(id: string, updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string }, executor?: DbExecutor): Promise<StoredUser | null>;
  delete(id: string, executor?: DbExecutor): Promise<boolean>;
}

/**
 * ============================================================================
 * PERSISTENT JSON FILE USER REPOSITORY ADAPTER
 * ============================================================================
 * Enterprise-grade persistent adapter storing user credentials and profiles
 * in durable JSON storage (data/users.json).
 * 
 * Features:
 * - Survives backend/Node process restarts, container redeployments and reloads.
 * - Atomic write operations using temporary file rename (fs.rename) preventing corruption.
 * - Mutex synchronization preventing race conditions during concurrent mutations.
 * - Strict email normalization and uniqueness enforcement.
 * - Auto-seeding default demo accounts if database file is not yet initialized.
 * - Zero plain-text passwords stored (scrypt hash + salt only).
 */
export class JsonFileUserRepositoryAdapter implements IUserRepository {
  private filePath: string;
  private writeMutex: Promise<any> = Promise.resolve();
  private isInitialized: boolean = false;

  constructor(customPath?: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ProductionInfrastructureError('[FAIL_CLOSED] Instanciação de JsonFileUserRepositoryAdapter é estritamente proibida em ambiente de produção.');
    }
    this.filePath = customPath || process.env.USERS_DB_PATH || path.join(process.cwd(), 'data', 'users.json');
  }

  private async executeWithLock<T>(action: () => Promise<T>): Promise<T> {
    const nextPromise = this.writeMutex.then(async () => {
      return action();
    });
    this.writeMutex = nextPromise.catch(() => {});
    return nextPromise;
  }

  private async readUsersFromFile(): Promise<StoredUser[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf-8');
      if (!raw || raw.trim().length === 0) {
        return [];
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.users)) {
        return data.users;
      }
      return [];
    } catch (err) {
      console.warn(`[MOUTRYX STORE] Error reading from ${this.filePath}, returning empty array:`, err);
      return [];
    }
  }

  private async writeUsersToFile(users: StoredUser[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    const payload = {
      schemaVersion: 1,
      lastPersistedAt: new Date().toISOString(),
      userCount: users.length,
      users,
    };

    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(payload, null, 2);

    await fs.promises.writeFile(tmpFile, jsonStr, 'utf-8');
    await fs.promises.rename(tmpFile, this.filePath);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.executeWithLock(async () => {
      const existing = await this.readUsersFromFile();
      if (existing.length > 0) {
        this.isInitialized = true;
        return;
      }

      // Seed initial enterprise users if database file does not exist or is empty
      const defaultUsers: Array<Omit<StoredUser, 'passwordHash'> & { plainPassword: string }> = [
        {
          id: 'usr-lucas-01',
          name: 'Lucas Moura',
          email: 'lucas@moutryx.com',
          plainPassword: 'senha123',
          role: 'proprietario',
          companyId: 'comp-1',
          phone: '(66) 99655-2244',
          active: true,
          createdAt: '2026-01-10 08:00:00',
          updatedAt: '2026-01-10 08:00:00',
        },
        {
          id: 'usr-mariana-02',
          name: 'Mariana Costa',
          email: 'admin@moutryx.com',
          plainPassword: 'admin123',
          role: 'administrador',
          companyId: 'comp-1',
          phone: '(66) 99712-3344',
          active: true,
          createdAt: '2026-01-10 08:00:00',
          updatedAt: '2026-01-10 08:00:00',
        },
        {
          id: 'usr-rodrigo-03',
          name: 'Rodrigo Toledo',
          email: 'gestor@moutryx.com',
          plainPassword: 'gestor123',
          role: 'gestor_operacional',
          companyId: 'comp-1',
          phone: '(66) 99823-4455',
          active: true,
          createdAt: '2026-01-10 08:00:00',
          updatedAt: '2026-01-10 08:00:00',
        },
        {
          id: 'usr-joao-04',
          name: 'João Pedro Silveira',
          email: 'piloto@moutryx.com',
          plainPassword: 'piloto123',
          role: 'piloto',
          companyId: 'comp-1',
          phone: '(66) 99911-2233',
          active: true,
          createdAt: '2026-01-10 08:00:00',
          updatedAt: '2026-01-10 08:00:00',
        },
        {
          id: 'usr-patricia-05',
          name: 'Patrícia Nogueira',
          email: 'financeiro@moutryx.com',
          plainPassword: 'financeiro123',
          role: 'financeiro',
          companyId: 'comp-1',
          phone: '(66) 99633-8899',
          active: true,
          createdAt: '2026-01-10 08:00:00',
          updatedAt: '2026-01-10 08:00:00',
        },
        {
          id: 'usr-super-00',
          name: 'Super Administrador MOUTRYX',
          email: 'superadmin@moutryx.com',
          plainPassword: 'super123',
          role: 'super_admin',
          companyId: 'comp-1',
          phone: '(11) 99999-0000',
          active: true,
          createdAt: '2026-01-01 00:00:00',
          updatedAt: '2026-01-01 00:00:00',
        },
        {
          id: 'usr-agrofly-01',
          name: 'Diretor AgroFly',
          email: 'agrofly@moutryx.com',
          plainPassword: 'senha123',
          role: 'proprietario',
          companyId: 'comp-2',
          phone: '(66) 98877-6655',
          active: true,
          createdAt: '2026-01-15 10:00:00',
          updatedAt: '2026-01-15 10:00:00',
        },
      ];

      const seededUsers: StoredUser[] = [];
      for (const u of defaultUsers) {
        const hash = await hashPassword(u.plainPassword);
        seededUsers.push({
          id: u.id,
          name: u.name,
          email: u.email.toLowerCase().trim(),
          passwordHash: hash,
          role: u.role,
          companyId: u.companyId,
          phone: u.phone,
          active: u.active,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        });
      }

      await this.writeUsersToFile(seededUsers);
      this.isInitialized = true;
    });
  }

  async findById(id: string): Promise<StoredUser | null> {
    await this.initialize();
    const users = await this.readUsersFromFile();
    return users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    await this.initialize();
    const normalized = (email || '').toLowerCase().trim();
    const users = await this.readUsersFromFile();
    return users.find((u) => u.email.toLowerCase().trim() === normalized) || null;
  }

  async findByCompany(companyId: string): Promise<StoredUser[]> {
    await this.initialize();
    const users = await this.readUsersFromFile();
    return users.filter((u) => u.companyId === companyId);
  }

  async create(data: {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: StoredUser['role'];
    companyId?: string;
    phone?: string;
  }): Promise<StoredUser> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const users = await this.readUsersFromFile();
      const normalizedEmail = (data.email || '').toLowerCase().trim();

      // Enforce email uniqueness strictly in repository
      const duplicate = users.find((u) => u.email.toLowerCase().trim() === normalizedEmail);
      if (duplicate) {
        throw new Error(`Este e-mail (${normalizedEmail}) já está cadastrado no sistema.`);
      }

      const id = data.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const companyId = data.companyId?.trim();
      if (!companyId) {
        throw new Error('companyId é obrigatório para cadastrar usuário.');
      }

      const newUser: StoredUser = {
        id,
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        role: normalizeUserRole(data.role),
        companyId,
        phone: data.phone || '',
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      users.push(newUser);
      await this.writeUsersToFile(users);
      return newUser;
    });
  }

  async getAll(): Promise<SafeUser[]> {
    await this.initialize();
    const users = await this.readUsersFromFile();
    return users.map(sanitizeUser);
  }

  async update(
    id: string,
    updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string }
  ): Promise<StoredUser | null> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const users = await this.readUsersFromFile();
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return null;

      const existing = users[index];

      // If email is being updated, verify uniqueness
      if (updates.email) {
        const normalizedNewEmail = updates.email.toLowerCase().trim();
        const conflict = users.find(
          (u) => u.id !== id && u.email.toLowerCase().trim() === normalizedNewEmail
        );
        if (conflict) {
          throw new Error(`Este e-mail (${normalizedNewEmail}) já está cadastrado para outro usuário.`);
        }
      }

      const updatedUser: StoredUser = {
        ...existing,
        ...updates,
        email: updates.email ? updates.email.toLowerCase().trim() : existing.email,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      users[index] = updatedUser;
      await this.writeUsersToFile(users);
      return updatedUser;
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const users = await this.readUsersFromFile();
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return false;

      users.splice(index, 1);
      await this.writeUsersToFile(users);
      return true;
    });
  }
}

/**
 * In-Memory Adapter preserved for legacy unit testing if needed
 */
export class InMemoryUserRepositoryAdapter implements IUserRepository {
  private users: Map<string, StoredUser> = new Map();
  private isSeeded: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isSeeded) return;
    this.isSeeded = true;
  }

  async findById(id: string): Promise<StoredUser | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const normalized = (email || '').toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  async findByCompany(companyId: string): Promise<StoredUser[]> {
    return Array.from(this.users.values()).filter((u) => u.companyId === companyId);
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: StoredUser['role'];
    companyId?: string;
    phone?: string;
  }): Promise<StoredUser> {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const companyId = data.companyId?.trim();
    if (!companyId) {
      throw new Error('companyId é obrigatório para cadastrar usuário.');
    }
    const user: StoredUser = {
      id,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role || 'proprietario',
      companyId,
      phone: data.phone || '',
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async getAll(): Promise<SafeUser[]> {
    return Array.from(this.users.values()).map(sanitizeUser);
  }

  async update(id: string, updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string }): Promise<StoredUser | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

// Active singleton persistent repository instance (resolved via repository factory)
class DynamicUserRepositoryProxy implements IUserRepository {
  private get repo(): IUserRepository {
    return getUserRepository();
  }

  async initialize(): Promise<void> {
    return this.repo.initialize();
  }

  async findById(id: string, executor?: DbExecutor): Promise<StoredUser | null> {
    return this.repo.findById(id, executor);
  }

  async findByEmail(email: string, executor?: DbExecutor): Promise<StoredUser | null> {
    return this.repo.findByEmail(email, executor);
  }

  async findByCompany(companyId: string, executor?: DbExecutor): Promise<StoredUser[]> {
    return this.repo.findByCompany(companyId, executor);
  }

  async create(data: {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: StoredUser['role'];
    companyId?: string;
    phone?: string;
  }, executor?: DbExecutor): Promise<StoredUser> {
    return this.repo.create(data, executor);
  }

  async getAll(executor?: DbExecutor): Promise<SafeUser[]> {
    return this.repo.getAll(executor);
  }

  async update(id: string, updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string }, executor?: DbExecutor): Promise<StoredUser | null> {
    return this.repo.update(id, updates, executor);
  }

  async delete(id: string, executor?: DbExecutor): Promise<boolean> {
    return this.repo.delete(id, executor);
  }
}

export const userRepository: IUserRepository = new DynamicUserRepositoryProxy();

// Forwarding helper functions maintaining clean API compatibility
export async function initializeUserStore(): Promise<void> {
  await userRepository.initialize();
}

export async function findUserByEmail(email: string, executor?: DbExecutor): Promise<StoredUser | null> {
  return userRepository.findByEmail(email, executor);
}

export async function findUserById(id: string, executor?: DbExecutor): Promise<StoredUser | null> {
  return userRepository.findById(id, executor);
}

export async function createUser(data: {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: StoredUser['role'];
  companyId?: string;
  phone?: string;
}, executor?: DbExecutor): Promise<StoredUser> {
  return userRepository.create(data, executor);
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string },
  executor?: DbExecutor
): Promise<StoredUser | null> {
  return userRepository.update(id, updates, executor);
}

export async function deleteUser(id: string, executor?: DbExecutor): Promise<boolean> {
  return userRepository.delete(id, executor);
}

export async function getAllUsers(executor?: DbExecutor): Promise<SafeUser[]> {
  return userRepository.getAll(executor);
}


