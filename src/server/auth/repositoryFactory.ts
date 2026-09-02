import { IUserRepository, JsonFileUserRepositoryAdapter } from './userStore';
import { PostgresUserRepositoryAdapter } from './postgresUserRepositoryAdapter';
import { ICompanyRepository, JsonFileCompanyRepositoryAdapter, PostgresCompanyRepositoryAdapter } from './companyStore';
import { ISessionRepository, JsonFileSessionRepositoryAdapter, PostgresSessionRepositoryAdapter } from './sessionStore';
import { isDatabaseConfigured, testPostgresConnection } from '../db/postgresClient';
import { runMigrationsAndSeed } from '../db/migrationEngine';
import { validateEnvironmentAndFailClosed, getSystemEnvironment } from '../db/environment';
import { ProductionInfrastructureError } from '../db/errors';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — REPOSITORY FACTORY & ORCHESTRATOR
 * ============================================================================
 * Fábrica central que resolve os repositórios adequados conforme o ambiente:
 * - PostgreSQL Adapter: Ativo quando DATABASE_URL está configurada e acessível.
 * - JSON File Adapter: Ativo como fallback exclusivo de desenvolvimento (DEVELOPMENT ONLY).
 * 
 * Regra de Segurança Estrita: Em modo produção (NODE_ENV=production), o Fail-Closed
 * aborta imediatamente a inicialização se DATABASE_URL estiver ausente, inválida ou
 * se o PostgreSQL for inacessível. O uso de adaptadores JSON em produção é ESTRITAMENTE PROIBIDO.
 */

export type DatabaseProvider = 'uninitialized' | 'postgresql' | 'json_file';

export interface DatabaseStatus {
  provider: DatabaseProvider;
  isProductionReady: boolean;
  statusMessage: string;
  databaseUrlConfigured: boolean;
  connected: boolean;
  activeAdapter: string;
  schemaVersion?: string;
  isFallback: boolean;
}

const UNINITIALIZED_STATUS: DatabaseStatus = {
  provider: 'uninitialized',
  isProductionReady: false,
  statusMessage: 'Persistência ainda não inicializada',
  databaseUrlConfigured: false,
  connected: false,
  activeAdapter: 'none',
  schemaVersion: undefined,
  isFallback: false,
};

let activeUserRepo: IUserRepository;
let activeCompanyRepo: ICompanyRepository;
let activeSessionRepo: ISessionRepository;
let dbStatus: DatabaseStatus = { ...UNINITIALIZED_STATUS };

let isBootstrapped = false;

export async function bootstrapPersistence(): Promise<{
  userRepository: IUserRepository;
  companyRepository: ICompanyRepository;
  sessionRepository: ISessionRepository;
  status: DatabaseStatus;
}> {
  if (isBootstrapped) {
    return {
      userRepository: activeUserRepo,
      companyRepository: activeCompanyRepo,
      sessionRepository: activeSessionRepo,
      status: dbStatus,
    };
  }

  // 1. Strict Fail-Closed Validation for Production & Environment Detection
  const validation = await validateEnvironmentAndFailClosed();

  if (validation.postgresConnected) {
    console.log(`[MOUTRYX DATABASE] Conexão com PostgreSQL estabelecida com sucesso (${validation.latencyMs ?? 0}ms).`);
    activeUserRepo = new PostgresUserRepositoryAdapter();
    activeCompanyRepo = new PostgresCompanyRepositoryAdapter();
    activeSessionRepo = new PostgresSessionRepositoryAdapter();

    dbStatus = {
      provider: 'postgresql',
      isProductionReady: true,
      statusMessage: validation.isProduction ? 'CONECTADO AO POSTGRESQL DE PRODUÇÃO' : 'CONECTADO AO POSTGRESQL (DESENVOLVIMENTO)',
      databaseUrlConfigured: true,
      connected: true,
      activeAdapter: 'PostgresUserRepositoryAdapter',
      schemaVersion: '008_reactiva_persistence',
      isFallback: false,
    };
  } else {
    const reason = validation.error || 'DATABASE_URL não configurada';
    console.log(`[MOUTRYX DATABASE] Persistência local ativada (${reason}).`);
    activeUserRepo = new JsonFileUserRepositoryAdapter();
    activeCompanyRepo = new JsonFileCompanyRepositoryAdapter();
    activeSessionRepo = new JsonFileSessionRepositoryAdapter();

    dbStatus = {
      provider: 'json_file',
      isProductionReady: false,
      statusMessage: `BANCO POSTGRESQL NÃO CONECTADO (${reason}) - ADAPTADOR LOCAL ATIVO`,
      databaseUrlConfigured: validation.databaseUrlConfigured,
      connected: false,
      activeAdapter: 'JsonFileUserRepositoryAdapter',
      schemaVersion: '008',
      isFallback: true,
    };
  }

  // Initialize and run migrations/seeds
  await activeCompanyRepo.initialize();
  await activeUserRepo.initialize();
  await activeSessionRepo.initialize();

  const migrationResult = await runMigrationsAndSeed(activeUserRepo, activeCompanyRepo);

  if (migrationResult.migrationsApplied && migrationResult.migrationsApplied.length > 0) {
    dbStatus.schemaVersion = migrationResult.migrationsApplied[migrationResult.migrationsApplied.length - 1];
  }

  isBootstrapped = true;

  return {
    userRepository: activeUserRepo,
    companyRepository: activeCompanyRepo,
    sessionRepository: activeSessionRepo,
    status: dbStatus,
  };
}

export function getUserRepository(): IUserRepository {
  if (!activeUserRepo) {
    activeUserRepo = new JsonFileUserRepositoryAdapter();
  }
  return activeUserRepo;
}

export function getCompanyRepository(): ICompanyRepository {
  if (!activeCompanyRepo) {
    activeCompanyRepo = new JsonFileCompanyRepositoryAdapter();
  }
  return activeCompanyRepo;
}

export function getSessionRepository(): ISessionRepository {
  if (!activeSessionRepo) {
    activeSessionRepo = new JsonFileSessionRepositoryAdapter();
  }
  return activeSessionRepo;
}

export function getDatabaseStatus(): DatabaseStatus {
  return dbStatus;
}

/**
 * Helper interno para testes automatizados limparem o estado da fábrica entre cenários.
 */
export function _resetPersistenceBootstrap(): void {
  isBootstrapped = false;
  activeUserRepo = undefined as any;
  activeCompanyRepo = undefined as any;
  activeSessionRepo = undefined as any;
  dbStatus = { ...UNINITIALIZED_STATUS };
}

