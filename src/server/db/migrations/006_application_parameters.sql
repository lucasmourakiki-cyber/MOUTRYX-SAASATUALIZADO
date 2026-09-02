-- Migration: 006_application_parameters.sql
-- Descrição: Adiciona a coluna application_parameters (JSONB) na tabela service_orders para persistir os parâmetros operacionais da OS

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS application_parameters JSONB;
