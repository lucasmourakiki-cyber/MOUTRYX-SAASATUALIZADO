-- ============================================================================
-- MOUTRYX GESTÃO AEROAGRÍCOLA — DDL SCHEMA COMPLETO DE PRODUÇÃO (POSTGRESQL)
-- ============================================================================
-- Compatível com: Cloud SQL, Neon, Supabase, AWS RDS, PostgreSQL 14+
-- Suporta: Multi-Tenant Nativo, Constraints Estritas de Integridade, ACID e RBAC
-- ============================================================================

-- 1. EXTENSÕES (se suportado pelo provedor de banco)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE EMPRESAS / TENANTS (COMPANIES)
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(30), -- CNPJ ou CPF
    email VARCHAR(255),
    phone VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta para Empresas
CREATE INDEX IF NOT EXISTS idx_companies_document ON companies(document);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(active);

-- 3. TABELA DE USUÁRIOS (USERS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin',
        'proprietario',
        'administrador',
        'gestor_operacional',
        'piloto',
        'financeiro',
        'consultor'
    )),
    company_id VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Índice Único Case-Insensitive para E-mail (Garante Unicidade em Nível de Banco de Dados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));

-- Índices para otimização de consultas e isolamento Multi-Tenant
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- 4. TABELA DE SESSÕES PERSISTENTES E AUDITORIA (SESSIONS)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY, -- JTI do token
    user_id VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL, -- Hash SHA-256 do token para busca e validação segura
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Índices para otimização de validação e revogação de sessões
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions (revoked_at);

-- 5. TABELAS DE SEGURANÇA DISTRIBUÍDA (MULTI-INSTÂNCIA / CLOUD RUN)
CREATE TABLE IF NOT EXISTS distributed_rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_category ON distributed_rate_limits(category);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON distributed_rate_limits(window_end);

CREATE TABLE IF NOT EXISTS distributed_concurrency_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    owner_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_concurrency_owner_category ON distributed_concurrency_locks(owner_id, category);
CREATE INDEX IF NOT EXISTS idx_concurrency_expires ON distributed_concurrency_locks(expires_at);

CREATE TABLE IF NOT EXISTS distributed_quotas (
    quota_key VARCHAR(255) PRIMARY KEY,
    dimension VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    minute_count INTEGER NOT NULL DEFAULT 0,
    minute_window_end TIMESTAMPTZ NOT NULL,
    day_count INTEGER NOT NULL DEFAULT 0,
    day_window_end TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_distributed_quotas_targets ON distributed_quotas(dimension, target_id);
CREATE INDEX IF NOT EXISTS idx_distributed_quotas_minute_end ON distributed_quotas(minute_window_end);
CREATE INDEX IF NOT EXISTS idx_distributed_quotas_day_end ON distributed_quotas(day_window_end);

-- 6. TABELA DE AUDITORIA DE MIGRAÇÃO
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

