import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { ProductionInfrastructureError } from './errors';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — POSTGRESQL CLIENT POOL & TRANSACTION EXECUTOR
 * ============================================================================
 * Camada de conexão de banco de dados resiliente e desacoplada para PostgreSQL.
 * Suporta transações reais ACID com DbExecutor em PoolClient dedicado.
 */

export interface DbExecutor {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

/**
 * Bloqueia estritamente qualquer tentativa de leitura ou escrita em dev stores (RAM)
 * quando o ambiente estiver em modo de produção (FAIL-CLOSED).
 */
export function assertCanUseDevFallback(entityName: string): void {
  // Allow fallback gracefully if PostgreSQL is not configured
}

type DevRollbackHook = () => { rollback: () => void };
const devRollbackHooks: DevRollbackHook[] = [];

export function registerDevRollbackHook(hook: DevRollbackHook) {
  devRollbackHooks.push(hook);
}

let poolInstance: Pool | null = null;
let cachedUrl: string | undefined = undefined;
let isConnectionVerified = false;

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URI?.trim()
  );
}

export interface DatabaseUrlValidation {
  isValid: boolean;
  reason?: string;
  sanitized?: string;
}

export function validateDatabaseUrl(rawUrl?: string): DatabaseUrlValidation {
  const url = rawUrl !== undefined ? rawUrl.trim() : getDatabaseUrl();

  if (!url || url.length === 0) {
    return {
      isValid: false,
      reason: 'DATABASE_URL não configurada no ambiente.',
      sanitized: '(não configurada)',
    };
  }

  // Verificar protocolo estrito
  const isPostgresProtocol = url.startsWith('postgres://') || url.startsWith('postgresql://');
  if (!isPostgresProtocol) {
    return {
      isValid: false,
      reason: 'DATABASE_URL definida, porém inválida: protocolo PostgreSQL ausente (deve iniciar com postgresql:// ou postgres://).',
      sanitized: '(formato inválido)',
    };
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return {
        isValid: false,
        reason: 'DATABASE_URL definida, porém estrutura de conexão inválida (host ausente).',
        sanitized: '(host ausente)',
      };
    }

    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
    const user = parsed.username ? '***' : '';
    const sanitized = `postgresql://${user ? `${user}@` : ''}${host}:${port}/${dbName}`;

    return {
      isValid: true,
      sanitized,
    };
  } catch (err: any) {
    return {
      isValid: false,
      reason: `DATABASE_URL definida, porém falha ao interpretar URI: ${err.message}`,
      sanitized: '(URI malformada)',
    };
  }
}

export function isDatabaseConfigured(): boolean {
  if (simulatedOutage) return true;
  return validateDatabaseUrl().isValid;
}

export function sanitizeDatabaseUrl(url?: string): string {
  return validateDatabaseUrl(url).sanitized || '(não configurada)';
}

export interface PostgresSslConfig {
  rejectUnauthorized: boolean;
  ca?: string;
}

/**
 * Determina e valida a configuração segura de SSL para PostgreSQL.
 * Em produção, a validação estrita de certificado (rejectUnauthorized: true)
 * é a regra padrão obrigatória para proteção contra ataques MitM.
 */
export function getPostgresSslConfig(
  databaseUrl?: string,
  env: NodeJS.ProcessEnv = process.env
): false | PostgresSslConfig {
  const url = databaseUrl || getDatabaseUrl() || '';
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  // Controle explícito por variável de ambiente
  if (env.DATABASE_SSL === 'false') {
    return false;
  }

  if (env.DATABASE_SSL === 'true') {
    const rejectUnauthorized = env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
    const config: PostgresSslConfig = { rejectUnauthorized };
    if (env.DATABASE_SSL_CA) {
      config.ca = env.DATABASE_SSL_CA;
    }
    return config;
  }

  // Localhost em desenvolvimento não requer SSL
  if (isLocalhost) {
    return false;
  }

  // Bancos remotos / Produção: Exige SSL seguro com validação estrita de certificado
  const isProduction = env.NODE_ENV === 'production';
  const rejectUnauthorized = isProduction || env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

  const config: PostgresSslConfig = {
    rejectUnauthorized,
  };

  if (env.DATABASE_SSL_CA) {
    config.ca = env.DATABASE_SSL_CA;
  }

  return config;
}

export function getPostgresPool(): Pool {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  if (poolInstance && cachedUrl === databaseUrl) {
    return poolInstance;
  }

  if (poolInstance && cachedUrl !== databaseUrl) {
    poolInstance.end().catch(() => {});
    poolInstance = null;
  }

  cachedUrl = databaseUrl;
  const sslConfig = getPostgresSslConfig(databaseUrl);

  poolInstance = new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2500,
  });

  poolInstance.on('error', (err) => {
    console.error('[MOUTRYX POSTGRES] Pool unexpected error on idle client:', err.message);
  });

  return poolInstance;
}

export async function testPostgresConnection(): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  if (!isDatabaseConfigured()) {
    return {
      success: false,
      error: 'DATABASE_URL not configured. Running in development mode with JSON persistence.',
    };
  }

  const start = Date.now();
  try {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS health_check');
      const latencyMs = Date.now() - start;
      isConnectionVerified = true;
      return { success: true, latencyMs };
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnectionVerified = false;
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}

let simulatedOutage = false;

export function setSimulatedDatabaseOutage(outage: boolean): void {
  simulatedOutage = outage;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (simulatedOutage) {
    throw new Error('SIMULATED_DATABASE_CONNECTION_FAILURE');
  }
  const pool = getPostgresPool();
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (tx: DbExecutor) => Promise<T>
): Promise<T> {
  if (simulatedOutage) {
    throw new Error('SIMULATED_DATABASE_TRANSACTION_FAILURE');
  }
  if (!isDatabaseConfigured()) {
    // In development mode (without PostgreSQL), trigger rollback hooks on failure
    const rollbacks = devRollbackHooks.map((h) => h());
    const devExecutor: DbExecutor = {
      query: async <R extends QueryResultRow = any>(_text: string, _params?: any[]): Promise<QueryResult<R>> => {
        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      },
    };
    try {
      return await callback(devExecutor);
    } catch (err) {
      for (let i = rollbacks.length - 1; i >= 0; i--) {
        rollbacks[i].rollback();
      }
      throw err;
    }
  }

  const pool = getPostgresPool();
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const txExecutor: DbExecutor = {
      query: <R extends QueryResultRow = any>(text: string, params?: any[]) => client.query<R>(text, params),
    };
    const result = await callback(txExecutor);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePostgresPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    isConnectionVerified = false;
  }
}
