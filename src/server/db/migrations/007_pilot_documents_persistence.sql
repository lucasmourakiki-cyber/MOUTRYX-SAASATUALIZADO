-- Migration: 007_pilot_documents_persistence.sql
-- Descrição: Adiciona colunas para persistência completa de documentos digitalizados, contratos em PDF e dados profissionais de pilotos

ALTER TABLE pilots ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS contract_pdf_name VARCHAR(255);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS contract_pdf_size VARCHAR(50);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS contract_upload_date DATE;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT 'piloto';
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'piloto';
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS cnh_number VARCHAR(50);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS cnh_category VARCHAR(10);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS has_fixed_salary BOOLEAN DEFAULT FALSE;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS has_commission BOOLEAN DEFAULT FALSE;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS commission_value NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS fixed_per_service NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS authorized_drones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS function_title VARCHAR(255);
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS operational_notes TEXT;
