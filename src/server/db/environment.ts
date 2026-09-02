import {
  isDatabaseConfigured,
  testPostgresConnection,
  getDatabaseUrl,
  validateDatabaseUrl,
  sanitizeDatabaseUrl,
} from './postgresClient';
import { ProductionInfrastructureError } from './errors';

export {
  isDatabaseConfigured,
  testPostgresConnection,
  getDatabaseUrl,
  validateDatabaseUrl,
  sanitizeDatabaseUrl,
  ProductionInfrastructureError,
};

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — CENTRALIZED ENVIRONMENT & FAIL-CLOSED VALIDATOR
 * ============================================================================
 * Regras estritas de infraestrutura e segurança:
 * 
 * 1. PRODUÇÃO (NODE_ENV=production):
 *    - DATABASE_URL é OBRIGATÓRIA e deve ser uma URI PostgreSQL válida.
 *    - Conexão real com PostgreSQL deve ser testada e bem-sucedida.
 *    - Se DATABASE_URL estiver ausente, vazia, inválida ou a conexão falhar:
 *      O processo DEVE LANÇAR UM ERRO FATAL (ProductionInfrastructureError - FAIL_CLOSED)
 *      impedindo qualquer inicialização parcial ou fallback.
 *    - É TERMINANTEMENTE PROIBIDO utilizar fallback JSON em produção.
 * 
 * 2. DESENVOLVIMENTO (NODE_ENV !== production):
 *    - Se DATABASE_URL for válida e acessível -> PostgreSQL ativado.
 *    - Se DATABASE_URL estiver ausente ou inacessível -> fallback JSON local permitido
 *      e explicitamente identificado nos logs e no /api/health como "DEVELOPMENT ONLY".
 */

export interface SystemEnvironmentStatus {
  isProduction: boolean;
  environmentName: 'production' | 'development';
  databaseUrlConfigured: boolean;
  databaseUrlValid: boolean;
  validationReason?: string;
  sanitizedUrl: string;
  canUseFallback: boolean;
}

export interface EnvironmentValidationResult {
  isProduction: boolean;
  databaseUrlConfigured: boolean;
  databaseUrlValid: boolean;
  postgresConnected: boolean;
  latencyMs?: number;
  error?: string;
  sanitizedUrl: string;
}

export function getSystemEnvironment(): SystemEnvironmentStatus {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawUrl = getDatabaseUrl();
  const validation = validateDatabaseUrl(rawUrl);
  const databaseUrlConfigured = !!rawUrl && rawUrl.length > 0;
  const databaseUrlValid = validation.isValid;
  const canUseFallback = !isProduction;

  return {
    isProduction,
    environmentName: isProduction ? 'production' : 'development',
    databaseUrlConfigured,
    databaseUrlValid,
    validationReason: validation.reason,
    sanitizedUrl: validation.sanitized || '(não configurada)',
    canUseFallback,
  };
}

export async function validateEnvironmentAndFailClosed(): Promise<EnvironmentValidationResult> {
  const env = getSystemEnvironment();

  console.log(`[MOUTRYX SECURITY] Environment: ${env.environmentName.toUpperCase()} | Node Version: ${process.version}`);

  if (env.databaseUrlValid) {
    console.log(`[MOUTRYX SECURITY] Testing PostgreSQL connection (${env.sanitizedUrl})...`);
    const testResult = await testPostgresConnection();
    if (testResult.success) {
      console.log(`[MOUTRYX SECURITY] [PASS] Connected to PostgreSQL successfully (${testResult.latencyMs}ms).`);
      return {
        isProduction: env.isProduction,
        databaseUrlConfigured: true,
        databaseUrlValid: true,
        postgresConnected: true,
        latencyMs: testResult.latencyMs,
        sanitizedUrl: env.sanitizedUrl,
      };
    } else {
      if (env.isProduction) {
        throw new ProductionInfrastructureError(
          `PostgreSQL indisponível em produção: ${testResult.error || 'falha de conexão'}`
        );
      }
      console.warn(`[MOUTRYX SECURITY] [WARN] Could not connect to PostgreSQL (${testResult.error}). Utilizando persistência local apenas em desenvolvimento.`);
      return {
        isProduction: false,
        databaseUrlConfigured: true,
        databaseUrlValid: true,
        postgresConnected: false,
        error: testResult.error,
        sanitizedUrl: env.sanitizedUrl,
      };
    }
  } else {
    if (env.isProduction) {
      throw new ProductionInfrastructureError(
        env.databaseUrlConfigured
          ? `DATABASE_URL inválida em produção: ${env.validationReason || 'valor inválido'}`
          : 'DATABASE_URL é obrigatória em produção.'
      );
    }
    if (env.databaseUrlConfigured && !env.databaseUrlValid) {
      console.warn(`[MOUTRYX SECURITY] [WARN] ${env.validationReason}`);
    }
    console.log('[MOUTRYX SECURITY] Persistência local habilitada apenas em desenvolvimento.');
    return {
      isProduction: false,
      databaseUrlConfigured: env.databaseUrlConfigured,
      databaseUrlValid: env.databaseUrlValid,
      postgresConnected: false,
      error: env.validationReason || 'DATABASE_URL não configurada',
      sanitizedUrl: env.sanitizedUrl,
    };
  }
}

