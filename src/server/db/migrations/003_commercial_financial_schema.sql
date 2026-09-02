-- Migration: 003_commercial_financial_schema.sql
-- Descrição: Tabelas do ecossistema comercial, financeiro, auditoria e marketing (Orçamentos, Ordens de Serviço, Contas a Receber, Contas a Pagar, Comissões de Piloto, Notinhas de Campo, Logs de Auditoria, Brand Kit, Criativos)

-- 11. Orçamentos
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(100) PRIMARY KEY,
    quote_number VARCHAR(50) NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_whatsapp VARCHAR(50),
    client_email VARCHAR(255),
    property_id VARCHAR(100) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    talhao_name VARCHAR(255),
    crop VARCHAR(100) NOT NULL,
    area_ha NUMERIC(10, 2) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    drone_model_preferred VARCHAR(100),
    pilot_assigned_id VARCHAR(100),
    pilot_assigned_name VARCHAR(255),
    price_per_ha NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    displacement_fee NUMERIC(10, 2) DEFAULT 0,
    discount NUMERIC(10, 2) DEFAULT 0,
    additional_fees NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    final_amount NUMERIC(14, 2) NOT NULL,
    estimated_cost NUMERIC(14, 2) DEFAULT 0,
    estimated_margin NUMERIC(14, 2) DEFAULT 0,
    estimated_margin_percent NUMERIC(6, 2) DEFAULT 0,
    payment_terms VARCHAR(255) DEFAULT '30 dias após aplicação',
    valid_until DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'convertido_em_os', 'cancelado')),
    sent_at DATE,
    approved_at DATE,
    notes TEXT,
    converted_to_os_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotes_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);

-- 12. Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS service_orders (
    id VARCHAR(100) PRIMARY KEY,
    os_number VARCHAR(50) NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    quote_id VARCHAR(100),
    client_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_whatsapp VARCHAR(50),
    property_id VARCHAR(100) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    property_lat NUMERIC(10, 7),
    property_lng NUMERIC(10, 7),
    talhao_id VARCHAR(100),
    talhao_name VARCHAR(255),
    crop VARCHAR(100) NOT NULL,
    area_ha NUMERIC(10, 2) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(20) DEFAULT '08:00',
    completed_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'agendado' CHECK (status IN (
        'agendado', 'em_deslocamento', 'em_operacao', 'pausado', 'concluido', 'faturado', 'pago', 'cancelado'
    )),
    pilot_id VARCHAR(100),
    pilot_name VARCHAR(255) NOT NULL DEFAULT 'Piloto a Definir',
    drone_id VARCHAR(100),
    drone_model VARCHAR(255) NOT NULL DEFAULT 'Drone a Definir',
    products JSONB DEFAULT '[]'::jsonb,
    weather_conditions JSONB,
    flight_height_meters NUMERIC(6, 2) DEFAULT 3.5,
    flight_speed_ms NUMERIC(6, 2) DEFAULT 6.0,
    flight_hours_recorded NUMERIC(8, 2) DEFAULT 0,
    battery_cycles_used INTEGER DEFAULT 0,
    actual_area_sprayed_ha NUMERIC(10, 2),
    price_per_ha NUMERIC(10, 2) NOT NULL,
    gross_amount NUMERIC(14, 2) NOT NULL,
    displacement_fee NUMERIC(10, 2) DEFAULT 0,
    additional_fees NUMERIC(10, 2) DEFAULT 0,
    discount NUMERIC(10, 2) DEFAULT 0,
    final_amount NUMERIC(14, 2) NOT NULL,
    estimated_cost NUMERIC(14, 2) DEFAULT 0,
    net_margin NUMERIC(14, 2) DEFAULT 0,
    payment_terms VARCHAR(255) DEFAULT '30 dias após aplicação',
    calculated_pilot_commission NUMERIC(12, 2) DEFAULT 0,
    commission_status VARCHAR(50) DEFAULT 'prevista' CHECK (commission_status IN (
        'prevista', 'aguardando_pagamento_cliente', 'liberada', 'aprovada', 'paga'
    )),
    commission_paid_date DATE,
    client_signed BOOLEAN DEFAULT FALSE,
    client_sign_date DATE,
    client_sign_name VARCHAR(255),
    notes TEXT,
    field_occurrences_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_orders_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_orders_company_id ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_os_number ON service_orders(os_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_pilot_id ON service_orders(pilot_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled_date ON service_orders(scheduled_date);

-- 13. Contas a Receber
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    client_id VARCHAR(100),
    client_name VARCHAR(255) NOT NULL,
    os_id VARCHAR(100),
    os_number VARCHAR(50),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'vencendo', 'vencido', 'pago', 'cancelado')),
    payment_method VARCHAR(50) DEFAULT 'boleto' CHECK (payment_method IN ('pix', 'transferencia', 'boleto', 'cartao', 'dinheiro')),
    proof_document_url TEXT,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receivable_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receivable_company_id ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_receivable_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_receivable_os_id ON accounts_receivable(os_id);

-- 14. Contas a Pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    cost_center VARCHAR(50) NOT NULL CHECK (cost_center IN (
        'manutencao', 'combustivel', 'comissao', 'administrativo', 'seguro', 'aeronaves', 'outros'
    )),
    supplier_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'vencendo', 'vencido', 'pago', 'cancelado')),
    payment_method VARCHAR(50) DEFAULT 'pix' CHECK (payment_method IN ('pix', 'transferencia', 'boleto', 'cartao', 'dinheiro')),
    drone_id VARCHAR(100),
    pilot_id VARCHAR(100),
    is_recurring BOOLEAN DEFAULT FALSE,
    proof_document_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payable_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payable_company_id ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_payable_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_payable_cost_center ON accounts_payable(cost_center);

-- 15. Comissões de Piloto
CREATE TABLE IF NOT EXISTS pilot_commissions (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    pilot_id VARCHAR(100) NOT NULL,
    pilot_name VARCHAR(255) NOT NULL,
    os_id VARCHAR(100) NOT NULL,
    os_number VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    area_sprayed_ha NUMERIC(10, 2) NOT NULL,
    service_amount NUMERIC(14, 2) NOT NULL,
    commission_rule_applied VARCHAR(255) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'prevista' CHECK (status IN (
        'prevista', 'aguardando_pagamento_cliente', 'liberada', 'aprovada', 'paga'
    )),
    client_paid_date DATE,
    released_date DATE,
    approved_date DATE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commissions_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON pilot_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_pilot_id ON pilot_commissions(pilot_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON pilot_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_os_id ON pilot_commissions(os_id);

-- 16. Notinhas de Campo e Despesas
CREATE TABLE IF NOT EXISTS receipt_notes (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    pilot_id VARCHAR(100),
    pilot_name VARCHAR(255),
    date DATE NOT NULL,
    time VARCHAR(10),
    establishment_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(30),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'combustivel', 'alimentacao', 'mercado', 'hospedagem', 'manutencao_pecas', 'pedagio', 'outro'
    )),
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'pix_piloto',
    reimbursement_status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (reimbursement_status IN (
        'pendente', 'aprovado', 'reembolsado', 'recusado', 'corporativo'
    )),
    related_os_id VARCHAR(100),
    related_os_number VARCHAR(50),
    related_property_name VARCHAR(255),
    fuel_details JSONB,
    items JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    confidence_score NUMERIC(5, 2) DEFAULT 100,
    notes TEXT,
    approved_date TIMESTAMPTZ,
    reimbursed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receipt_notes_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipt_notes_company_id ON receipt_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_receipt_notes_pilot_id ON receipt_notes(pilot_id);
CREATE INDEX IF NOT EXISTS idx_receipt_notes_status ON receipt_notes(reimbursement_status);

-- 17. Logs de Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- 18. Brand Kits
CREATE TABLE IF NOT EXISTS brand_kits (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    slogan VARCHAR(255),
    primary_color VARCHAR(20) DEFAULT '#059669',
    secondary_color VARCHAR(20) DEFAULT '#0284c7',
    accent_color VARCHAR(20) DEFAULT '#f59e0b',
    logo_url TEXT,
    whatsapp VARCHAR(50),
    phone VARCHAR(50),
    instagram VARCHAR(100),
    website VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    region VARCHAR(100),
    target_audience_default TEXT,
    reference_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brand_kits_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 19. Criativos de Marketing
CREATE TABLE IF NOT EXISTS creative_assets (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    headline TEXT NOT NULL,
    subtitle TEXT,
    cta VARCHAR(255),
    caption TEXT,
    hashtags JSONB DEFAULT '[]'::jsonb,
    format VARCHAR(50) NOT NULL,
    objective VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    offer TEXT,
    style_tone VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    source_photo_url TEXT,
    drone_model_used VARCHAR(100),
    is_favorite BOOLEAN DEFAULT FALSE,
    campaign_id VARCHAR(100),
    lead_target VARCHAR(100),
    variations_count INTEGER DEFAULT 1,
    quality_score NUMERIC(5, 2),
    quality_breakdown JSONB,
    concept_title VARCHAR(255),
    overlay_settings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creative_assets_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creative_assets_company_id ON creative_assets(company_id);

-- 20. Campanhas Criativas
CREATE TABLE IF NOT EXISTS creative_campaigns (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    objective VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    offer TEXT,
    target_audience TEXT,
    sales_approach TEXT,
    objection_handling TEXT,
    main_headline TEXT,
    feed_post_text TEXT,
    story_hook TEXT,
    whatsapp_pitch TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'planejada', 'concluida')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creative_campaigns_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creative_campaigns_company_id ON creative_campaigns(company_id);

-- Register Migration 003
INSERT INTO schema_migrations (version, description)
VALUES ('003_commercial_financial_schema', 'Commercial, financial, audit, and creative assets schema')
ON CONFLICT (version) DO NOTHING;
