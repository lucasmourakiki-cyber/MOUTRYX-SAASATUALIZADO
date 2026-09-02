-- Migration: 004_concurrency_and_transactions.sql
-- Descrição: Suporte a controle de concorrência otimista (optimistic locking) e integridade transacional
-- Adiciona a coluna version (INTEGER DEFAULT 1) a todas as entidades críticas do Moutryx

-- 1. Clientes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'version') THEN
        ALTER TABLE clients ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 2. Propriedades
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'version') THEN
        ALTER TABLE properties ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 3. Talhões
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'talhoes' AND column_name = 'version') THEN
        ALTER TABLE talhoes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 4. Drones
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drones' AND column_name = 'version') THEN
        ALTER TABLE drones ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 5. Baterias
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batteries' AND column_name = 'version') THEN
        ALTER TABLE batteries ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 6. Pilotos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pilots' AND column_name = 'version') THEN
        ALTER TABLE pilots ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 7. Orçamentos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'version') THEN
        ALTER TABLE quotes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 8. Ordens de Serviço (OS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'version') THEN
        ALTER TABLE service_orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 9. Contas a Receber
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_receivable' AND column_name = 'version') THEN
        ALTER TABLE accounts_receivable ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 10. Contas a Pagar
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts_payable' AND column_name = 'version') THEN
        ALTER TABLE accounts_payable ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 11. Comissões de Piloto
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pilot_commissions' AND column_name = 'version') THEN
        ALTER TABLE pilot_commissions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 12. Compatibilidade de tipos e colunas adicionais
ALTER TABLE clients ALTER COLUMN rating TYPE NUMERIC(3, 1);
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_rating_check;
ALTER TABLE clients ADD CONSTRAINT clients_rating_check CHECK (rating BETWEEN 1 AND 5);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'talhoes' AND column_name = 'polygon') THEN
        ALTER TABLE talhoes ADD COLUMN polygon JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'talhoes' AND column_name = 'center') THEN
        ALTER TABLE talhoes ADD COLUMN center JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
