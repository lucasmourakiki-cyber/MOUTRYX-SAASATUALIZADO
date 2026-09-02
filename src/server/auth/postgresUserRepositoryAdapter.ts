import { IUserRepository, StoredUser, SafeUser, sanitizeUser, normalizeUserRole } from './userStore';
import { query, DbExecutor } from '../db/postgresClient';

/**
 * ============================================================================
 * POSTGRESQL USER REPOSITORY ADAPTER (PRODUCTION PERSISTENCE)
 * ============================================================================
 * Implementação corporativa de IUserRepository conectada a banco PostgreSQL real.
 * 
 * Características:
 * - Queries parametrizadas ($1, $2, ...) protegidas contra SQL Injection.
 * - Constraints de unicidade case-insensitive gerenciadas pelo banco (índice idx_users_lower_email).
 * - Tratamento de violação de chave única (código de erro PostgreSQL 23505).
 * - Foreign Key restrita garantindo que companyId exista na tabela companies.
 * - Zero vazamento de passwordHash para endpoints públicos.
 */
export class PostgresUserRepositoryAdapter implements IUserRepository {
  public async initialize(): Promise<void> {
    // Tabela e índices criados via DDL / migrations
  }

  async findById(id: string, executor?: DbExecutor): Promise<StoredUser | null> {
    const exec = executor || { query };
    const res = await exec.query(
      `SELECT id, name, email, password_hash AS "passwordHash", role, company_id AS "companyId", 
              phone, avatar_url AS "avatarUrl", active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async findByEmail(email: string, executor?: DbExecutor): Promise<StoredUser | null> {
    const exec = executor || { query };
    const normalized = (email || '').toLowerCase().trim();
    const res = await exec.query(
      `SELECT id, name, email, password_hash AS "passwordHash", role, company_id AS "companyId", 
              phone, avatar_url AS "avatarUrl", active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE LOWER(email) = $1`,
      [normalized]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async findByCompany(companyId: string, executor?: DbExecutor): Promise<StoredUser[]> {
    const exec = executor || { query };
    const res = await exec.query(
      `SELECT id, name, email, password_hash AS "passwordHash", role, company_id AS "companyId", 
              phone, avatar_url AS "avatarUrl", active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE company_id = $1
       ORDER BY created_at ASC`,
      [companyId]
    );

    return res.rows;
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
    const exec = executor || { query };
    const normalizedEmail = (data.email || '').toLowerCase().trim();
    const id = data.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const role = normalizeUserRole(data.role);
    const companyId = data.companyId?.trim();
    if (!companyId) {
      throw new Error('companyId é obrigatório para cadastrar usuário.');
    }
    const phone = data.phone?.trim() || '';

    try {
      const res = await exec.query(
        `INSERT INTO users (id, name, email, password_hash, role, company_id, phone, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role, company_id = EXCLUDED.company_id, phone = EXCLUDED.phone, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, email, password_hash AS "passwordHash", role, company_id AS "companyId", 
                   phone, avatar_url AS "avatarUrl", active, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [id, data.name.trim(), normalizedEmail, data.passwordHash, role, companyId, phone]
      );

      return res.rows[0];
    } catch (err: any) {
      // PostgreSQL Unique Violation Error Code: 23505
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('idx_users_lower_email')) {
        throw new Error(`Este e-mail (${normalizedEmail}) já está cadastrado no sistema.`);
      }
      // PostgreSQL Foreign Key Violation Error Code: 23503
      if (err.code === '23503' || err.message?.includes('fk_users_company')) {
        throw new Error(`Empresa/Tenant informado (${companyId}) não existe.`);
      }
      throw err;
    }
  }

  async getAll(executor?: DbExecutor): Promise<SafeUser[]> {
    const exec = executor || { query };
    const res = await exec.query(
      `SELECT id, name, email, role, company_id AS "companyId", phone, avatar_url AS "avatarUrl", 
              active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       ORDER BY created_at ASC`
    );
    return res.rows;
  }

  async update(
    id: string,
    updates: Partial<Omit<StoredUser, 'id'>> & { passwordHash?: string },
    executor?: DbExecutor
  ): Promise<StoredUser | null> {
    const exec = executor || { query };
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name.trim());
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email.toLowerCase().trim());
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(updates.passwordHash);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(normalizeUserRole(updates.role));
    }
    if (updates.companyId !== undefined) {
      fields.push(`company_id = $${idx++}`);
      values.push(updates.companyId);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(updates.phone.trim());
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) {
      return this.findById(id, executor);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const sql = `UPDATE users 
                 SET ${fields.join(', ')} 
                 WHERE id = $${idx}
                 RETURNING id, name, email, password_hash AS "passwordHash", role, company_id AS "companyId", 
                           phone, avatar_url AS "avatarUrl", active, created_at AS "createdAt", updated_at AS "updatedAt"`;

    try {
      const res = await exec.query(sql, values);
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        throw new Error(`Este e-mail já está cadastrado para outro usuário.`);
      }
      throw err;
    }
  }

  async delete(id: string, executor?: DbExecutor): Promise<boolean> {
    const exec = executor || { query };
    const res = await exec.query('DELETE FROM users WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
