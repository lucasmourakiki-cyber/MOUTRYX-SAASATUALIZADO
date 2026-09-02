import fs from 'fs';
import path from 'path';
import { query, isDatabaseConfigured, DbExecutor } from '../db/postgresClient';
import { ProductionInfrastructureError } from '../db/errors';

export interface StoredCompany {
  id: string;
  name: string;
  tradeName?: string;
  document?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  plan?: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICompanyRepository {
  initialize(): Promise<void>;
  findById(id: string, executor?: DbExecutor): Promise<StoredCompany | null>;
  getAll(executor?: DbExecutor): Promise<StoredCompany[]>;
  create(data: {
    id?: string;
    name: string;
    tradeName?: string;
    document?: string;
    cnpj?: string;
    city?: string;
    state?: string;
    plan?: string;
    email?: string;
    phone?: string;
  }, executor?: DbExecutor): Promise<StoredCompany>;
  update(id: string, updates: Partial<Omit<StoredCompany, 'id'>>, executor?: DbExecutor): Promise<StoredCompany | null>;
  delete(id: string, executor?: DbExecutor): Promise<boolean>;
}

/**
 * Default standard tenant seed data
 */
export const DEFAULT_COMPANIES: StoredCompany[] = [
  {
    id: 'comp-1',
    name: 'Moutryx Aviação Agrícola Ltda',
    tradeName: 'Moutryx Aeroagrícola',
    document: '12.345.678/0001-90',
    email: 'contato@moutryx.com',
    phone: '(66) 3544-1200',
    active: true,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
  },
  {
    id: 'comp-2',
    name: 'AgroFly Pulverizações e Drones S.A.',
    tradeName: 'AgroFly Drones',
    document: '98.765.432/0001-10',
    email: 'operacoes@agrofly.com.br',
    phone: '(66) 3544-8800',
    active: true,
    createdAt: '2026-01-15 00:00:00',
    updatedAt: '2026-01-15 00:00:00',
  },
];

/**
 * ============================================================================
 * JSON FILE COMPANY REPOSITORY ADAPTER (DEVELOPMENT / LOCAL PERSISTENCE)
 * ============================================================================
 */
export class JsonFileCompanyRepositoryAdapter implements ICompanyRepository {
  private filePath: string;
  private writeMutex: Promise<any> = Promise.resolve();
  private isInitialized: boolean = false;

  constructor(customPath?: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ProductionInfrastructureError('[FAIL_CLOSED] Instanciação de JsonFileCompanyRepositoryAdapter é estritamente proibida em ambiente de produção.');
    }
    this.filePath = customPath || path.join(process.cwd(), 'data', 'companies.json');
  }

  private async executeWithLock<T>(action: () => Promise<T>): Promise<T> {
    const nextPromise = this.writeMutex.then(async () => {
      return action();
    });
    this.writeMutex = nextPromise.catch(() => {});
    return nextPromise;
  }

  private async readCompaniesFromFile(): Promise<StoredCompany[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf-8');
      if (!raw || raw.trim().length === 0) return [];
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.companies)) return data.companies;
      return [];
    } catch {
      return [];
    }
  }

  private async writeCompaniesToFile(companies: StoredCompany[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const payload = {
      schemaVersion: 1,
      lastPersistedAt: new Date().toISOString(),
      companyCount: companies.length,
      companies,
    };
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.promises.rename(tmpFile, this.filePath);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.executeWithLock(async () => {
      const existing = await this.readCompaniesFromFile();
      if (existing.length > 0) {
        this.isInitialized = true;
        return;
      }

      await this.writeCompaniesToFile(DEFAULT_COMPANIES);
      this.isInitialized = true;
    });
  }

  async findById(id: string): Promise<StoredCompany | null> {
    await this.initialize();
    const list = await this.readCompaniesFromFile();
    return list.find((c) => c.id === id) || null;
  }

  async getAll(): Promise<StoredCompany[]> {
    await this.initialize();
    return this.readCompaniesFromFile();
  }

  async create(data: {
    id?: string;
    name: string;
    tradeName?: string;
    document?: string;
    cnpj?: string;
    city?: string;
    state?: string;
    plan?: string;
    email?: string;
    phone?: string;
  }): Promise<StoredCompany> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const list = await this.readCompaniesFromFile();
      const id = data.id || `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const doc = (data.cnpj || data.document || '').trim();

      const newCompany: StoredCompany = {
        id,
        name: data.name.trim(),
        tradeName: data.tradeName?.trim(),
        document: doc,
        cnpj: doc,
        city: data.city?.trim(),
        state: data.state?.trim(),
        plan: data.plan?.trim(),
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      list.push(newCompany);
      await this.writeCompaniesToFile(list);
      return newCompany;
    });
  }

  async update(id: string, updates: Partial<Omit<StoredCompany, 'id'>>): Promise<StoredCompany | null> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const list = await this.readCompaniesFromFile();
      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return null;

      const updated: StoredCompany = {
        ...list[index],
        ...updates,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      list[index] = updated;
      await this.writeCompaniesToFile(list);
      return updated;
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();

    return this.executeWithLock(async () => {
      const list = await this.readCompaniesFromFile();
      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return false;

      list.splice(index, 1);
      await this.writeCompaniesToFile(list);
      return true;
    });
  }
}

/**
 * ============================================================================
 * POSTGRESQL COMPANY REPOSITORY ADAPTER (PRODUCTION PERSISTENCE)
 * ============================================================================
 */
export class PostgresCompanyRepositoryAdapter implements ICompanyRepository {
  public async initialize(): Promise<void> {
    // Em ambiente de produção, NÃO semeia empresas demo nem lê arquivos JSON locais.
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Apenas em desenvolvimento: seed de empresas default e de data/companies.json
    const companiesJsonPath = path.join(process.cwd(), 'data', 'companies.json');
    let allCompaniesToSeed: StoredCompany[] = [...DEFAULT_COMPANIES];
    if (fs.existsSync(companiesJsonPath)) {
      try {
        const raw = await fs.promises.readFile(companiesJsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          allCompaniesToSeed = [...allCompaniesToSeed, ...parsed];
        } else if (parsed && Array.isArray(parsed.companies)) {
          allCompaniesToSeed = [...allCompaniesToSeed, ...parsed.companies];
        }
      } catch {
        // Fallback to DEFAULT_COMPANIES if file read fails
      }
    }

    for (const comp of allCompaniesToSeed) {
      if (!comp || !comp.id) continue;
      await query(
        `INSERT INTO companies (id, name, trade_name, document, email, phone, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          comp.id,
          comp.name,
          comp.tradeName || comp.name,
          comp.document || comp.cnpj || null,
          comp.email || null,
          comp.phone || null,
          comp.active !== false,
          comp.createdAt || new Date(),
          comp.updatedAt || new Date(),
        ]
      );
    }
  }

  async findById(id: string, executor?: DbExecutor): Promise<StoredCompany | null> {
    const exec = executor || { query };
    const res = await exec.query(
      `SELECT id, name, trade_name AS "tradeName", document, document AS cnpj, email, phone, active, 
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM companies WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async getAll(executor?: DbExecutor): Promise<StoredCompany[]> {
    const exec = executor || { query };
    const res = await exec.query(
      `SELECT id, name, trade_name AS "tradeName", document, document AS cnpj, email, phone, active, 
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM companies ORDER BY name ASC`
    );
    return res.rows;
  }

  async create(data: {
    id?: string;
    name: string;
    tradeName?: string;
    document?: string;
    cnpj?: string;
    city?: string;
    state?: string;
    plan?: string;
    email?: string;
    phone?: string;
  }, executor?: DbExecutor): Promise<StoredCompany> {
    const exec = executor || { query };
    const id = data.id || `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const doc = (data.cnpj || data.document || '').trim();

    const res = await exec.query(
      `INSERT INTO companies (id, name, trade_name, document, email, phone, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
       RETURNING id, name, trade_name AS "tradeName", document, document AS cnpj, email, phone, active, 
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, data.name.trim(), data.tradeName?.trim() || null, doc || null, data.email?.trim() || null, data.phone?.trim() || null, now]
    );

    return res.rows[0];
  }

  async update(id: string, updates: Partial<Omit<StoredCompany, 'id'>>, executor?: DbExecutor): Promise<StoredCompany | null> {
    const exec = executor || { query };
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.tradeName !== undefined) {
      fields.push(`trade_name = $${idx++}`);
      values.push(updates.tradeName);
    }
    if (updates.document !== undefined) {
      fields.push(`document = $${idx++}`);
      values.push(updates.document);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) {
      return this.findById(id, executor);
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    values.push(id);
    const sql = `UPDATE companies SET ${fields.join(', ')} WHERE id = $${idx} 
                 RETURNING id, name, trade_name AS "tradeName", document, email, phone, active, 
                           created_at AS "createdAt", updated_at AS "updatedAt"`;

    const res = await exec.query(sql, values);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async delete(id: string, executor?: DbExecutor): Promise<boolean> {
    const exec = executor || { query };
    const res = await exec.query('DELETE FROM companies WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
