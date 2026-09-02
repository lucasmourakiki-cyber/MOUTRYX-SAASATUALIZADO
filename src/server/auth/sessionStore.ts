import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '../db/postgresClient';
import { ProductionInfrastructureError } from '../db/errors';

export interface StoredSession {
  id: string; // JTI unique identifier
  userId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export interface ISessionRepository {
  initialize(): Promise<void>;
  create(data: {
    id?: string;
    userId: string;
    token?: string;
    tokenHash?: string;
    expiresAt: Date | string;
    userAgent?: string;
    ipAddress?: string;
    companyId?: string;
    userRole?: string;
  }): Promise<StoredSession>;
  findById(id: string): Promise<StoredSession | null>;
  findByToken(token: string): Promise<StoredSession | null>;
  findByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  revoke(idOrTokenOrHash: string): Promise<boolean>;
  isRevoked(idOrTokenOrHash: string): Promise<boolean>;
  isValid(idOrTokenOrHash: string): Promise<boolean>;
  cleanupExpired(): Promise<number>;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * ============================================================================
 * JSON FILE SESSION REPOSITORY ADAPTER (DEVELOPMENT / LOCAL PERSISTENCE)
 * ============================================================================
 */
export class JsonFileSessionRepositoryAdapter implements ISessionRepository {
  private filePath: string;
  private writeMutex: Promise<any> = Promise.resolve();
  private isInitialized: boolean = false;

  constructor(customPath?: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ProductionInfrastructureError('[FAIL_CLOSED] Instanciação de JsonFileSessionRepositoryAdapter é estritamente proibida em ambiente de produção.');
    }
    this.filePath = customPath || path.join(process.cwd(), 'data', 'sessions.json');
  }

  private async executeWithLock<T>(action: () => Promise<T>): Promise<T> {
    const nextPromise = this.writeMutex.then(async () => {
      return action();
    });
    this.writeMutex = nextPromise.catch(() => {});
    return nextPromise;
  }

  private async readSessionsFromFile(): Promise<StoredSession[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf-8');
      if (!raw || raw.trim().length === 0) return [];
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.sessions)) return data.sessions;
      return [];
    } catch {
      return [];
    }
  }

  private async writeSessionsToFile(sessions: StoredSession[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const payload = {
      schemaVersion: 1,
      lastPersistedAt: new Date().toISOString(),
      sessionCount: sessions.length,
      sessions,
    };
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.promises.rename(tmpFile, this.filePath);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.executeWithLock(async () => {
      const existing = await this.readSessionsFromFile();
      if (!fs.existsSync(this.filePath)) {
        await this.writeSessionsToFile(existing);
      }
      this.isInitialized = true;
    });
  }

  async create(data: {
    id?: string;
    userId: string;
    token?: string;
    tokenHash?: string;
    expiresAt: Date | string;
    userAgent?: string;
    ipAddress?: string;
    companyId?: string;
    userRole?: string;
  }): Promise<StoredSession> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const sessions = await this.readSessionsFromFile();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const exp =
        data.expiresAt instanceof Date
          ? data.expiresAt.toISOString().replace('T', ' ').substring(0, 19)
          : data.expiresAt;

      const tokenHash = data.tokenHash || (data.token ? hashToken(data.token) : '');
      const id = data.id || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const newSession: StoredSession = {
        id,
        userId: data.userId,
        tokenHash,
        userAgent: data.userAgent || '',
        ipAddress: data.ipAddress || '',
        createdAt: now,
        expiresAt: exp,
        revokedAt: null,
      };

      sessions.push(newSession);
      await this.writeSessionsToFile(sessions);
      return newSession;
    });
  }

  async findById(id: string): Promise<StoredSession | null> {
    await this.initialize();
    const sessions = await this.readSessionsFromFile();
    return sessions.find((s) => s.id === id) || null;
  }

  async findByToken(token: string): Promise<StoredSession | null> {
    await this.initialize();
    const sessions = await this.readSessionsFromFile();
    const hashed = hashToken(token);
    return sessions.find((s) => s.tokenHash === token || s.tokenHash === hashed) || null;
  }

  async findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    await this.initialize();
    const sessions = await this.readSessionsFromFile();
    return sessions.find((s) => s.tokenHash === tokenHash) || null;
  }

  async revoke(idOrTokenOrHash: string): Promise<boolean> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const sessions = await this.readSessionsFromFile();
      const hashed = hashToken(idOrTokenOrHash);
      const session = sessions.find(
        (s) => s.id === idOrTokenOrHash || s.tokenHash === idOrTokenOrHash || s.tokenHash === hashed
      );
      if (!session) return false;

      session.revokedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.writeSessionsToFile(sessions);
      return true;
    });
  }

  async isRevoked(idOrTokenOrHash: string): Promise<boolean> {
    await this.initialize();
    const sessions = await this.readSessionsFromFile();
    const hashed = hashToken(idOrTokenOrHash);
    const session = sessions.find(
      (s) => s.id === idOrTokenOrHash || s.tokenHash === idOrTokenOrHash || s.tokenHash === hashed
    );
    if (!session) return false;
    return !!session.revokedAt;
  }

  async isValid(idOrTokenOrHash: string): Promise<boolean> {
    await this.initialize();
    const sessions = await this.readSessionsFromFile();
    const hashed = hashToken(idOrTokenOrHash);
    const session = sessions.find(
      (s) => s.id === idOrTokenOrHash || s.tokenHash === idOrTokenOrHash || s.tokenHash === hashed
    );
    if (!session) return false;
    if (session.revokedAt) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
  }

  async cleanupExpired(): Promise<number> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const sessions = await this.readSessionsFromFile();
      const now = new Date().getTime();
      const valid = sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
      const removed = sessions.length - valid.length;
      if (removed > 0) {
        await this.writeSessionsToFile(valid);
      }
      return removed;
    });
  }
}

/**
 * ============================================================================
 * POSTGRESQL SESSION REPOSITORY ADAPTER (PRODUCTION PERSISTENCE)
 * ============================================================================
 */
export class PostgresSessionRepositoryAdapter implements ISessionRepository {
  public async initialize(): Promise<void> {
    // Verified via schema migrations
  }

  async create(data: {
    id?: string;
    userId: string;
    token?: string;
    tokenHash?: string;
    expiresAt: Date | string;
    userAgent?: string;
    ipAddress?: string;
    companyId?: string;
    userRole?: string;
  }): Promise<StoredSession> {
    const expiresAtDate = data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt);
    const sessionId = data.id || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tokenHash = data.tokenHash || (data.token ? hashToken(data.token) : '');

    try {
      // Check if user exists in PostgreSQL to prevent FK violation
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [data.userId]);
      if (userCheck.rows.length === 0 && process.env.NODE_ENV !== 'production') {
        // Attempt to sync user from local persistence only in development
        const usersJsonPath = path.join(process.cwd(), 'data', 'users.json');
        if (fs.existsSync(usersJsonPath)) {
          try {
            const raw = fs.readFileSync(usersJsonPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const list: any[] = Array.isArray(parsed) ? parsed : (parsed.users || []);
            const matchedUser = list.find((u) => u.id === data.userId || u.email?.toLowerCase() === data.userId.toLowerCase());
            if (matchedUser && matchedUser.companyId) {
              await query(
                `INSERT INTO users (id, name, email, password_hash, role, company_id, phone, active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  matchedUser.id,
                  matchedUser.name,
                  (matchedUser.email || '').toLowerCase().trim(),
                  matchedUser.passwordHash,
                  matchedUser.role || 'proprietario',
                  matchedUser.companyId.trim(),
                  matchedUser.phone || '',
                ]
              );
            }
          } catch {
            // Ignore JSON read errors in dev
          }
        }
      }

      const res = await query(
        `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_address, created_at, expires_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, NULL)
         ON CONFLICT (id) DO UPDATE 
         SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, revoked_at = NULL
         RETURNING id, user_id AS "userId", token_hash AS "tokenHash", user_agent AS "userAgent", 
                   ip_address AS "ipAddress", created_at AS "createdAt", expires_at AS "expiresAt", 
                   revoked_at AS "revokedAt"`,
        [sessionId, data.userId, tokenHash, data.userAgent || null, data.ipAddress || null, expiresAtDate]
      );

      return res.rows[0];
    } catch (err: any) {
      if (err.code === '23503' || err.message?.includes('fk_sessions_user')) {
        console.warn(`[MOUTRYX SESSION] Foreign key warning for userId '${data.userId}' on sessions table: ${err.message}`);
        const nowStr = new Date().toISOString();
        return {
          id: sessionId,
          userId: data.userId,
          tokenHash,
          userAgent: data.userAgent || '',
          ipAddress: data.ipAddress || '',
          createdAt: nowStr,
          expiresAt: expiresAtDate.toISOString(),
          revokedAt: null,
        };
      }
      throw err;
    }
  }

  async findById(id: string): Promise<StoredSession | null> {
    const res = await query(
      `SELECT id, user_id AS "userId", token_hash AS "tokenHash", user_agent AS "userAgent", 
              ip_address AS "ipAddress", created_at AS "createdAt", expires_at AS "expiresAt", 
              revoked_at AS "revokedAt"
       FROM sessions WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async findByToken(token: string): Promise<StoredSession | null> {
    const hashed = hashToken(token);
    const res = await query(
      `SELECT id, user_id AS "userId", token_hash AS "tokenHash", user_agent AS "userAgent", 
              ip_address AS "ipAddress", created_at AS "createdAt", expires_at AS "expiresAt", 
              revoked_at AS "revokedAt"
       FROM sessions WHERE token_hash = $1 OR token_hash = $2`,
      [token, hashed]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const res = await query(
      `SELECT id, user_id AS "userId", token_hash AS "tokenHash", user_agent AS "userAgent", 
              ip_address AS "ipAddress", created_at AS "createdAt", expires_at AS "expiresAt", 
              revoked_at AS "revokedAt"
       FROM sessions WHERE token_hash = $1`,
      [tokenHash]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async revoke(idOrTokenOrHash: string): Promise<boolean> {
    const hashed = hashToken(idOrTokenOrHash);
    const res = await query(
      `UPDATE sessions 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE (id = $1 OR token_hash = $1 OR token_hash = $2) AND revoked_at IS NULL`,
      [idOrTokenOrHash, hashed]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async isRevoked(idOrTokenOrHash: string): Promise<boolean> {
    const hashed = hashToken(idOrTokenOrHash);
    const res = await query(
      `SELECT revoked_at AS "revokedAt" 
       FROM sessions 
       WHERE id = $1 OR token_hash = $1 OR token_hash = $2`,
      [idOrTokenOrHash, hashed]
    );
    if (res.rows.length === 0) return false;
    return !!res.rows[0].revokedAt;
  }

  async isValid(idOrTokenOrHash: string): Promise<boolean> {
    const hashed = hashToken(idOrTokenOrHash);
    const res = await query(
      `SELECT id, expires_at AS "expiresAt", revoked_at AS "revokedAt"
       FROM sessions
       WHERE (id = $1 OR token_hash = $1 OR token_hash = $2)
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [idOrTokenOrHash, hashed]
    );
    return res.rows.length > 0;
  }

  async cleanupExpired(): Promise<number> {
    const res = await query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
    return res.rowCount ?? 0;
  }
}
