-- Persist registration fields required by the company/tenant identity.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(50);
