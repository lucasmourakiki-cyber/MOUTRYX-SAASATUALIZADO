-- Migration: 002_operational_schema.sql
-- Descrição: Tabelas do ecossistema operacional aeroagrícola (Clientes, Propriedades, Talhões, Drones, Baterias, Manutenções, Pilotos, Culturas, Produtos, Ocorrências)

-- 1. Clientes
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    type VARCHAR(10) NOT NULL DEFAULT 'pj' CHECK (type IN ('pf', 'pj')),
    cpf_cnpj VARCHAR(30) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    address TEXT,
    total_hectares NUMERIC(12, 2) DEFAULT 0,
    total_revenue NUMERIC(14, 2) DEFAULT 0,
    rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clients_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- 2. Propriedades / Fazendas
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(10),
    address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    total_area_ha NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_properties_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_properties_client FOREIGN KEY (client_id) 
        REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_properties_company_id ON properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_name ON properties(name);

-- 3. Talhões / Glebas
CREATE TABLE IF NOT EXISTS talhoes (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    property_id VARCHAR(100) NOT NULL,
    property_name VARCHAR(255),
    client_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    area_ha NUMERIC(10, 2) NOT NULL DEFAULT 0,
    crop VARCHAR(100) NOT NULL,
    crop_stage VARCHAR(100),
    last_application_date DATE,
    polygon_geojson JSONB DEFAULT '[]'::jsonb,
    center_lat NUMERIC(10, 7),
    center_lng NUMERIC(10, 7),
    soil_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_talhoes_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_talhoes_property FOREIGN KEY (property_id) 
        REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_talhoes_client FOREIGN KEY (client_id) 
        REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talhoes_company_id ON talhoes(company_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_property_id ON talhoes(property_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_client_id ON talhoes(client_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_crop ON talhoes(crop);

-- 4. Drones / Aeronaves
CREATE TABLE IF NOT EXISTS drones (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    asset_tag VARCHAR(50),
    year INTEGER DEFAULT 2026,
    purchase_date DATE,
    purchase_value NUMERIC(14, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_operacao', 'em_manutencao', 'parado')),
    flight_hours NUMERIC(10, 2) DEFAULT 0,
    accumulated_hectares NUMERIC(12, 2) DEFAULT 0,
    tank_capacity_liters NUMERIC(8, 2) DEFAULT 40,
    max_flow_rate_liters_min NUMERIC(8, 2) DEFAULT 12,
    spray_width_meters NUMERIC(8, 2) DEFAULT 9,
    anac_registration VARCHAR(50),
    insurance_validity DATE,
    last_maintenance_date DATE,
    next_maintenance_hours NUMERIC(10, 2) DEFAULT 100,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drones_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drones_company_id ON drones(company_id);
CREATE INDEX IF NOT EXISTS idx_drones_status ON drones(status);
CREATE INDEX IF NOT EXISTS idx_drones_serial_number ON drones(serial_number);

-- 5. Baterias
CREATE TABLE IF NOT EXISTS batteries (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    drone_id VARCHAR(100),
    identifier VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    cycles INTEGER NOT NULL DEFAULT 0,
    max_recommended_cycles INTEGER NOT NULL DEFAULT 500,
    hours NUMERIC(10, 2) DEFAULT 0,
    health_percent NUMERIC(5, 2) DEFAULT 100,
    condition VARCHAR(50) NOT NULL DEFAULT 'excelente' CHECK (condition IN ('excelente', 'boa', 'atencao', 'limite_atingido', 'em_manutencao')),
    purchase_date DATE,
    last_test_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batteries_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batteries_company_id ON batteries(company_id);
CREATE INDEX IF NOT EXISTS idx_batteries_condition ON batteries(condition);

-- 6. Manutenções
CREATE TABLE IF NOT EXISTS maintenance_records (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    drone_id VARCHAR(100) NOT NULL,
    drone_model VARCHAR(255) NOT NULL,
    battery_id VARCHAR(100),
    type VARCHAR(50) NOT NULL CHECK (type IN ('preventiva', 'corretiva', 'inspecao', 'troca_peca')),
    date DATE NOT NULL,
    provider VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    flight_hours_at_service NUMERIC(10, 2) DEFAULT 0,
    parts_replaced JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    next_maintenance_due_hours NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_maintenance_drone FOREIGN KEY (drone_id) 
        REFERENCES drones(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_drone_id ON maintenance_records(drone_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(date);

-- 7. Pilotos
CREATE TABLE IF NOT EXISTS pilots (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(30) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    hire_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_voo', 'folga', 'afastado', 'inativo')),
    contract_type VARCHAR(50) NOT NULL DEFAULT 'clt' CHECK (contract_type IN ('clt', 'mei', 'prestador_pj', 'autonomo')),
    cnpj_mei VARCHAR(30),
    anac_code VARCHAR(50),
    caar_certified BOOLEAN NOT NULL DEFAULT TRUE,
    caar_number VARCHAR(50),
    caar_validity DATE,
    cnh_validity DATE,
    contract_validity DATE,
    commission_model VARCHAR(50) NOT NULL DEFAULT 'por_hectare' CHECK (commission_model IN ('fixo', 'percentual', 'por_hectare', 'hibrido')),
    fixed_salary NUMERIC(12, 2) DEFAULT 0,
    percent_rate NUMERIC(6, 2) DEFAULT 0,
    rate_per_hectare NUMERIC(8, 2) DEFAULT 0,
    hybrid_fixed NUMERIC(12, 2) DEFAULT 0,
    hybrid_rate_per_ha NUMERIC(8, 2) DEFAULT 0,
    bonus_per_month NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    total_hectares_sprayed NUMERIC(12, 2) DEFAULT 0,
    flight_hours NUMERIC(10, 2) DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pilots_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pilots_company_id ON pilots(company_id);
CREATE INDEX IF NOT EXISTS idx_pilots_cpf ON pilots(cpf);
CREATE INDEX IF NOT EXISTS idx_pilots_status ON pilots(status);

-- 8. Culturas
CREATE TABLE IF NOT EXISTS crops (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    standard_cycle_days INTEGER DEFAULT 120,
    common_pests JSONB DEFAULT '[]'::jsonb,
    average_spraying_volume_l_per_ha NUMERIC(8, 2) DEFAULT 10,
    icon VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Produtos Fitossanitários / AGROFIT
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    commercial_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    active_ingredient TEXT NOT NULL,
    product_class VARCHAR(100) NOT NULL,
    formulation VARCHAR(50),
    mapa_registration VARCHAR(50),
    anvisa_monograph_ref VARCHAR(100),
    chemical_group VARCHAR(100),
    toxicological_class VARCHAR(50),
    environmental_class VARCHAR(50),
    authorized_crops JSONB DEFAULT '[]'::jsonb,
    target_pests JSONB DEFAULT '[]'::jsonb,
    recommended_dose_range VARCHAR(255),
    unit VARCHAR(20) DEFAULT 'L',
    default_volume_calda_l_per_ha NUMERIC(8, 2) DEFAULT 10,
    official_source VARCHAR(100) DEFAULT 'AGROFIT/MAPA',
    last_updated DATE,
    regulatory_disclaimer TEXT,
    status VARCHAR(20) DEFAULT 'ativo',
    notes TEXT,
    safety_interval_days INTEGER,
    drone_application_recommended BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_commercial_name ON products(commercial_name);
CREATE INDEX IF NOT EXISTS idx_products_class ON products(product_class);

-- 10. Ocorrências de Campo
CREATE TABLE IF NOT EXISTS field_occurrences (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    os_id VARCHAR(100) NOT NULL,
    os_number VARCHAR(100) NOT NULL,
    pilot_id VARCHAR(100),
    pilot_name VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    photo_url TEXT,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_occurrences_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_occurrences_company_id ON field_occurrences(company_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_os_id ON field_occurrences(os_id);

-- Register Migration 002
INSERT INTO schema_migrations (version, description)
VALUES ('002_operational_schema', 'Operational tables: clients, properties, talhoes, drones, batteries, maintenance, pilots, crops, products, occurrences')
ON CONFLICT (version) DO NOTHING;
