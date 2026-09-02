-- Migration: 005_maintenance_and_entities_version.sql
-- Descrição: Adiciona coluna version e compatibilidade de versionamento para maintenance_records e outras entidades operacionais

-- 1. Manutenções
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'version') THEN
        ALTER TABLE maintenance_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 2. Ocorrências de Campo
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_occurrences' AND column_name = 'version') THEN
        ALTER TABLE field_occurrences ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 3. Comprovantes / Notas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipt_notes' AND column_name = 'version') THEN
        ALTER TABLE receipt_notes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 4. Brand Kits
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brand_kits' AND column_name = 'version') THEN
        ALTER TABLE brand_kits ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 5. Creative Assets
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creative_assets' AND column_name = 'version') THEN
        ALTER TABLE creative_assets ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 6. Creative Campaigns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creative_campaigns' AND column_name = 'version') THEN
        ALTER TABLE creative_campaigns ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;
