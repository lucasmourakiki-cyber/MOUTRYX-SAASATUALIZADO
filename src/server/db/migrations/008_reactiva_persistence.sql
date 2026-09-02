-- Migration: 008_reactiva_persistence.sql
-- Descrição: Persistência real de dados de negócio do MOUTRYX REATIVA (status, notas, histórico de contato, templates personalizados)

-- 1. Status de Reativação e Notas por Cliente
CREATE TABLE IF NOT EXISTS reactiva_client_status (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'a_contatar',
    priority VARCHAR(50) DEFAULT 'media_prioridade',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reactiva_status_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_reactiva_status_company_client UNIQUE (company_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_reactiva_status_company ON reactiva_client_status(company_id);
CREATE INDEX IF NOT EXISTS idx_reactiva_status_client ON reactiva_client_status(client_id);
CREATE INDEX IF NOT EXISTS idx_reactiva_status_status ON reactiva_client_status(status);

-- 2. Histórico de Contato e Interações
CREATE TABLE IF NOT EXISTS reactiva_contact_history (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_text TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    status_after VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reactiva_history_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reactiva_history_company ON reactiva_contact_history(company_id);
CREATE INDEX IF NOT EXISTS idx_reactiva_history_client ON reactiva_contact_history(client_id);
CREATE INDEX IF NOT EXISTS idx_reactiva_history_date ON reactiva_contact_history(date DESC);

-- 3. Templates Personalizados de Mensagens por Empresa
CREATE TABLE IF NOT EXISTS reactiva_custom_templates (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    body TEXT NOT NULL,
    tone VARCHAR(50),
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reactiva_templates_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reactiva_templates_company ON reactiva_custom_templates(company_id);

-- Registrar Migração
INSERT INTO schema_migrations (version, description)
VALUES ('008_reactiva_persistence', 'MOUTRYX REATIVA statuses, notes, contact history and custom templates persistence')
ON CONFLICT (version) DO NOTHING;
