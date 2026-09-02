-- ============================================================================
-- MOUTRYX GESTÃO AEROAGRÍCOLA — MIGRATION 009: DISTRIBUTED SECURITY & QUOTAS
-- ============================================================================
-- Tabelas para controle distribuído multi-instância (Cloud Run):
-- 1. Rate Limiting Distribuído (contadores atômicos com janelas deslizantes)
-- 2. Concorrência Distribuída (locks/leases com expiração automática)
-- 3. Quotas de IA Distribuídas (contadores por IP, Usuário e Tenant)
-- ============================================================================

-- 1. Tabela de Rate Limiting Distribuído
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

-- 2. Tabela de Concorrência Distribuída (Locks / Leases)
CREATE TABLE IF NOT EXISTS distributed_concurrency_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    owner_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concurrency_owner_category ON distributed_concurrency_locks(owner_id, category);
CREATE INDEX IF NOT EXISTS idx_concurrency_expires ON distributed_concurrency_locks(expires_at);

-- 3. Tabela de Quotas de IA Distribuídas
CREATE TABLE IF NOT EXISTS distributed_quotas (
    quota_key VARCHAR(255) PRIMARY KEY,
    dimension VARCHAR(50) NOT NULL, -- 'user' | 'tenant' | 'ip'
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
