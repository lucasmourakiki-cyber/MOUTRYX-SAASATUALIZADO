import fs from 'fs';
import path from 'path';
import { IUserRepository, StoredUser, normalizeUserRole } from '../auth/userStore';
import { ICompanyRepository, DEFAULT_COMPANIES } from '../auth/companyStore';
import { query, withTransaction, isDatabaseConfigured, DbExecutor } from './postgresClient';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
import {
  INITIAL_CROPS,
  INITIAL_PRODUCTS,
  INITIAL_DRONES,
  INITIAL_BATTERIES,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_PILOTS,
  INITIAL_CLIENTS,
  INITIAL_PROPERTIES,
  INITIAL_TALHOES,
  INITIAL_QUOTES,
  INITIAL_SERVICE_ORDERS,
  INITIAL_ACCOUNTS_RECEIVABLE,
  INITIAL_ACCOUNTS_PAYABLE,
  INITIAL_PILOT_COMMISSIONS,
  INITIAL_RECEIPT_NOTES,
  INITIAL_AUDIT_LOGS,
} from '../../data/initialData';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — VERSIONED IDEMPOTENT MIGRATION & SEED ENGINE
 * ============================================================================
 * Executa todas as migrações SQL versionadas (001, 002, 003, 004) e popula o banco de dados
 * relacional com todos os registros operacionais e de negócio iniciais.
 */

export async function getAppliedMigrations(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    return [
      '001_initial_schema',
      '002_operational_schema',
      '003_commercial_financial_schema',
      '004_concurrency_and_transactions',
      '005_maintenance_and_entities_version',
      '006_application_parameters',
      '007_pilot_documents_persistence',
      '008_reactiva_persistence',
      '009_security_distributed_limits_and_quotas',
    ];
  }
  try {
    const res = await query('SELECT version FROM schema_migrations ORDER BY version ASC');
    return res.rows.map((r: any) => r.version);
  } catch {
    return [];
  }
}

export async function runMigrationsAndSeed(
  userRepo: IUserRepository,
  companyRepo: ICompanyRepository
): Promise<{
  migratedUsersCount: number;
  companiesCount: number;
  postgresMigrated: boolean;
  migrationsApplied: string[];
}> {
  let postgresMigrated = false;
  const migrationsApplied: string[] = [];

  // 1. If PostgreSQL is configured, apply versioned migrations from SQL files
  if (isDatabaseConfigured()) {
    try {
      console.log('[MOUTRYX DATABASE] Initializing schema_migrations table...');
      await query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(50) PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const possibleDirs = [
        path.join(process.cwd(), 'src', 'server', 'db', 'migrations'),
        path.join(currentDir, 'migrations'),
        path.join(__dirname, 'migrations'),
        path.join(__dirname, '..', 'src', 'server', 'db', 'migrations'),
        path.join(__dirname, 'src', 'server', 'db', 'migrations'),
      ];
      const migrationsDir = possibleDirs.find((d) => fs.existsSync(d)) || path.join(process.cwd(), 'src', 'server', 'db', 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith('.sql'))
          .sort();

        for (const file of files) {
          const version = file.replace('.sql', '');
          const checkRes = await query('SELECT version FROM schema_migrations WHERE version = $1', [version]);

          if (checkRes.rows.length === 0) {
            console.log(`[MOUTRYX DATABASE] Applying migration: ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            
            // Execute migration transactionally
            await withTransaction(async (tx: DbExecutor) => {
              await tx.query(sql);
              await tx.query(
                'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
                [version, `Applied migration ${file}`]
              );
            });
            
            migrationsApplied.push(version);
            console.log(`[MOUTRYX DATABASE] [PASS] Migration ${version} applied successfully.`);
          } else {
            migrationsApplied.push(version);
          }
        }
      }

      postgresMigrated = true;
      console.log('[MOUTRYX DATABASE] All PostgreSQL schema migrations verified.');

      // Ensure column alignments and compatibility
      await query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
            'super_admin',
            'proprietario',
            'administrador',
            'gestor_operacional',
            'piloto',
            'financeiro',
            'consultor'
        ));
        ALTER TABLE clients ALTER COLUMN rating TYPE NUMERIC(3, 1);
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_rating_check;
        ALTER TABLE clients ADD CONSTRAINT clients_rating_check CHECK (rating BETWEEN 1 AND 5);
        ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS polygon JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS center JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_cost_center_check;
        ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_commission_status_check;
        ALTER TABLE service_orders ADD CONSTRAINT service_orders_commission_status_check CHECK (commission_status IN (
            'prevista', 'aguardando_pagamento_cliente', 'liberada', 'aprovada', 'paga', 'cancelada'
        ));
      `);
    } catch (err: any) {
      console.warn('[MOUTRYX DATABASE] Warning during PostgreSQL migration run:', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  // 2. Ensure Companies/Tenants exist
  // Em PRODUÇÃO: Proibido semear empresas demo ou ler data/companies.json. A produção deve conter apenas tenants explicitamente criados.
  // Em DESENVOLVIMENTO: Permite seed de DEFAULT_COMPANIES e data/companies.json para ambiente local.
  const isProduction = process.env.NODE_ENV === 'production';
  const companyMap = new Map<string, any>();

  if (!isProduction) {
    const companiesJsonPath = path.join(process.cwd(), 'data', 'companies.json');
    let rawCompanies: any[] = [...DEFAULT_COMPANIES];
    if (fs.existsSync(companiesJsonPath)) {
      try {
        const raw = await fs.promises.readFile(companiesJsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          rawCompanies = [...rawCompanies, ...parsed];
        } else if (parsed && Array.isArray(parsed.companies)) {
          rawCompanies = [...rawCompanies, ...parsed.companies];
        }
      } catch (err: any) {
        console.warn('[MOUTRYX MIGRATION] Could not parse companies.json:', err.message);
      }
    }

    // Deduplicate companies by ID (dev only)
    for (const c of rawCompanies) {
      if (c && c.id) {
        companyMap.set(c.id, c);
      }
    }

    await companyRepo.initialize();
    for (const comp of companyMap.values()) {
      const existing = await companyRepo.findById(comp.id);
      if (!existing) {
        try {
          await companyRepo.create({
            id: comp.id,
            name: comp.name || `Empresa ${comp.id}`,
            tradeName: comp.tradeName || comp.name,
            document: comp.document || comp.cnpj || '',
            cnpj: comp.cnpj || comp.document || '',
            city: comp.city || '',
            state: comp.state || '',
            plan: comp.plan || 'enterprise',
            email: comp.email || '',
            phone: comp.phone || '',
          });
        } catch (err: any) {
          console.warn(`[MOUTRYX MIGRATION] Company creation notice for ${comp.id}:`, err.message);
        }
      }
    }
  } else {
    await companyRepo.initialize();
  }

  const allCompanies = await companyRepo.getAll();

  // 3. Read users from data/users.json for migration
  // Em PRODUÇÃO: Proibido ler data/users.json ou migrar usuários de dev/demo para PostgreSQL.
  // Em DESENVOLVIMENTO: Permite migração de data/users.json para persistência local de dev.
  let migratedUsersCount = 0;

  if (!isProduction) {
    const usersJsonPath = path.join(process.cwd(), 'data', 'users.json');
    let rawUsers: StoredUser[] = [];

    if (fs.existsSync(usersJsonPath)) {
      try {
        const raw = await fs.promises.readFile(usersJsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rawUsers = parsed;
        else if (parsed && Array.isArray(parsed.users)) rawUsers = parsed.users;
      } catch (err: any) {
        console.warn('[MOUTRYX MIGRATION] Could not parse users.json:', err.message);
      }
    }

    // 4. Migrate users into active repository (dev only)
    if (rawUsers.length > 0) {
      let existingIds = new Set<string>();
      let existingEmails = new Set<string>();
      let existingCompanyIds = new Set<string>();

      if (isDatabaseConfigured()) {
        try {
          const [usersRes, compsRes] = await Promise.all([
            query(`SELECT id, LOWER(email) AS email FROM users`),
            query(`SELECT id FROM companies`),
          ]);
          existingIds = new Set(usersRes.rows.map((r: any) => r.id));
          existingEmails = new Set(usersRes.rows.map((r: any) => r.email));
          existingCompanyIds = new Set(compsRes.rows.map((r: any) => r.id));
        } catch (err: any) {
          console.warn('[MOUTRYX MIGRATION] Notice pre-fetching users/companies:', err.message);
        }
      }

      for (const user of rawUsers) {
        const targetCompanyId = user.companyId?.trim();
        if (!targetCompanyId) {
          console.warn(`[MOUTRYX MIGRATION] Skipping user ${user.id} (${user.email}) due to missing companyId.`);
          continue;
        }

        // Ensure referenced company exists (dev only)
        if (!existingCompanyIds.has(targetCompanyId)) {
          const existingComp = await companyRepo.findById(targetCompanyId);
          if (!existingComp) {
            const companyMeta = companyMap.get(targetCompanyId);
            try {
              await companyRepo.create({
                id: targetCompanyId,
                name: companyMeta?.name || `Empresa ${targetCompanyId}`,
                tradeName: companyMeta?.tradeName || companyMeta?.name || `Empresa ${targetCompanyId}`,
                document: companyMeta?.document || companyMeta?.cnpj || '',
                cnpj: companyMeta?.cnpj || companyMeta?.document || '',
                email: companyMeta?.email || '',
                phone: companyMeta?.phone || '',
              });
              existingCompanyIds.add(targetCompanyId);
            } catch (createCompErr: any) {
              console.warn(`[MOUTRYX MIGRATION] Could not provision company ${targetCompanyId}:`, createCompErr.message);
            }
          } else {
            existingCompanyIds.add(targetCompanyId);
          }
        }

        const normalizedEmail = user.email.toLowerCase().trim();
        const isAlreadyInDb = existingIds.has(user.id) || existingEmails.has(normalizedEmail);

        if (!isAlreadyInDb) {
          try {
            await userRepo.create({
              id: user.id,
              name: user.name,
              email: user.email,
              passwordHash: user.passwordHash,
              role: normalizeUserRole(user.role),
              companyId: targetCompanyId,
              phone: user.phone || '',
            });
            existingIds.add(user.id);
            existingEmails.add(normalizedEmail);
            migratedUsersCount++;
          } catch (err: any) {
            console.warn(`[MOUTRYX MIGRATION] User migration notice for ${user.id}:`, err.message);
          }
        }
      }
    }
  }

  // 5. Seed reference and operational data into PostgreSQL if configured
  if (isDatabaseConfigured()) {
    try {
      // A) DADOS GLOBAIS DE REFERÊNCIA (Permitidos em Produção e Desenvolvimento)
      // Seed Crops (Culturas Agrícolas Globais — Sem company_id)
      for (const crop of INITIAL_CROPS) {
        await query(
          `INSERT INTO crops (id, name, category, standard_cycle_days, common_pests, average_spraying_volume_l_per_ha, icon)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [crop.id, crop.name, crop.category, crop.standardCycleDays, JSON.stringify(crop.commonPests), crop.averageSprayingVolumeLPerHa, crop.icon]
        );
      }

      // Seed Products (Catálogo Regulatório AGROFIT/MAPA — Sem company_id)
      for (const prod of INITIAL_PRODUCTS) {
        await query(
          `INSERT INTO products (id, commercial_name, manufacturer, active_ingredient, product_class, formulation, mapa_registration, anvisa_monograph_ref, toxicological_class, environmental_class, authorized_crops, target_pests, recommended_dose_range, unit, default_volume_calda_l_per_ha, official_source, last_updated, regulatory_disclaimer, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) ON CONFLICT (id) DO NOTHING`,
          [
            prod.id, prod.commercialName, prod.manufacturer, prod.activeIngredient, prod.productClass,
            prod.formulation || '', prod.mapaRegistration || '', prod.anvisaMonographRef || '', prod.toxicologicalClass || '',
            prod.environmentalClass || '', JSON.stringify(prod.authorizedCrops), JSON.stringify(prod.targetPests),
            prod.recommendedDoseRange || '', prod.unit || 'L', prod.defaultVolumeCaldaLPerHa || 10,
            prod.officialSource || 'AGROFIT/MAPA', prod.lastUpdated || null, prod.regulatoryDisclaimer || '', prod.status || 'ativo'
          ]
        );
      }

      // B) DADOS OPERACIONAIS / DEMO (Estritamente PROIBIDOS em Produção; Permitidos APENAS em Desenvolvimento)
      if (!isProduction) {
        // Seed All Companies in PostgreSQL table (dev only)
        for (const comp of companyMap.values()) {
          await query(
            `INSERT INTO companies (id, name, trade_name, document, email, phone, active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [
              comp.id,
              comp.name,
              comp.tradeName || comp.name,
              comp.document || comp.cnpj || '',
              comp.email || '',
              comp.phone || '',
              comp.active !== false,
              comp.createdAt || new Date().toISOString(),
              comp.updatedAt || new Date().toISOString(),
            ]
          );
        }

        // Seed Clients
        for (const c of INITIAL_CLIENTS) {
          await query(
            `INSERT INTO clients (id, company_id, name, contact_name, type, cpf_cnpj, phone, whatsapp, email, city, state, address, total_hectares, total_revenue, rating, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (id) DO NOTHING`,
            [c.id, c.companyId, c.name, c.contactName || '', c.type, c.cpfCnpj, c.phone || '', c.whatsapp || '', c.email || '', c.city, c.state, c.address || '', c.totalHectares, c.totalRevenue, c.rating, c.notes || '', c.createdAt]
          );
        }

        // Seed Properties
        for (const p of INITIAL_PROPERTIES) {
          await query(
            `INSERT INTO properties (id, company_id, client_id, client_name, name, manager_name, phone, city, state, address, latitude, longitude, total_area_ha, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING`,
            [p.id, p.companyId, p.clientId, p.clientName, p.name, p.managerName || '', p.phone || '', p.city, p.state, p.address || '', p.latitude, p.longitude, p.totalAreaHa, p.notes || '']
          );
        }

        // Seed Talhoes
        for (const t of INITIAL_TALHOES) {
          await query(
            `INSERT INTO talhoes (id, company_id, property_id, property_name, client_id, client_name, name, area_ha, crop, crop_stage, last_application_date, polygon_geojson, center_lat, center_lng, soil_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO NOTHING`,
            [t.id, t.companyId, t.propertyId, t.propertyName, t.clientId, t.clientName, t.name, t.areaHa, t.crop, t.cropStage || '', t.lastApplicationDate || null, JSON.stringify(t.polygon || []), t.center?.lat || null, t.center?.lng || null, t.soilType || '', t.notes || '']
          );
        }

        // Seed Drones
        for (const d of INITIAL_DRONES) {
          await query(
            `INSERT INTO drones (id, company_id, model, manufacturer, serial_number, asset_tag, year, purchase_date, purchase_value, status, flight_hours, accumulated_hectares, tank_capacity_liters, max_flow_rate_liters_min, spray_width_meters, anac_registration, insurance_validity, last_maintenance_date, next_maintenance_hours, photo_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) ON CONFLICT (id) DO NOTHING`,
            [d.id, d.companyId, d.model, d.manufacturer, d.serialNumber, d.assetTag || '', d.year, d.purchaseDate || null, d.purchaseValue, d.status, d.flightHours, d.accumulatedHectares, d.tankCapacityLiters || 40, d.maxFlowRateLitersMin || 12, d.sprayWidthMeters || 9, d.anacRegistration || '', d.insuranceValidity || null, d.lastMaintenanceDate || null, d.nextMaintenanceHours || 100, d.photoUrl || '']
          );
        }

        // Seed Batteries
        for (const b of INITIAL_BATTERIES) {
          await query(
            `INSERT INTO batteries (id, company_id, drone_id, identifier, manufacturer, model, serial_number, cycles, max_recommended_cycles, hours, health_percent, condition, purchase_date, last_test_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
            [b.id, b.companyId, b.droneId || null, b.identifier, b.manufacturer, b.model, b.serialNumber || '', b.cycles, b.maxRecommendedCycles || 500, b.hours || 0, b.healthPercent || 100, b.condition, b.purchaseDate || null, b.lastTestDate || null, b.notes || '']
          );
        }

        // Seed Maintenance
        for (const m of INITIAL_MAINTENANCE_RECORDS) {
          await query(
            `INSERT INTO maintenance_records (id, company_id, drone_id, drone_model, battery_id, type, date, provider, description, cost, flight_hours_at_service, parts_replaced, notes, next_maintenance_due_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING`,
            [m.id, m.companyId, m.droneId, m.droneModel, m.batteryId || null, m.type, m.date, m.provider, m.description, m.cost, m.flightHoursAtService || 0, JSON.stringify(m.partsReplaced || []), m.notes || '', m.nextMaintenanceDueHours || null]
          );
        }

        const sanitizeDate = (val?: string | null) => (val && /^\d{4}-\d{2}-\d{2}/.test(val) ? val.substring(0, 10) : null);

        // Seed Pilots
        for (const p of INITIAL_PILOTS) {
          await query(
            `INSERT INTO pilots (id, company_id, name, cpf, phone, whatsapp, email, city, state, hire_date, status, contract_type, cnpj_mei, anac_code, caar_certified, caar_number, caar_validity, cnh_validity, contract_validity, commission_model, fixed_salary, percent_rate, rate_per_hectare, hybrid_fixed, hybrid_rate_per_ha, bonus_per_month, notes, total_hectares_sprayed, flight_hours, avatar_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) ON CONFLICT (id) DO NOTHING`,
            [p.id, p.companyId, p.name, p.cpf, p.phone || '', p.whatsapp || '', p.email || '', p.city || '', p.state || '', sanitizeDate(p.hireDate), p.status, p.contractType || 'clt', p.cnpjMei || '', p.anacCode || '', p.caarCertified !== false, p.caarNumber || '', sanitizeDate(p.caarValidity), sanitizeDate(p.cnhValidity), sanitizeDate(p.contractValidity), p.commissionModel, p.fixedSalary || 0, p.percentRate || 0, p.ratePerHectare || 0, p.hybridFixed || 0, p.hybridRatePerHa || 0, p.bonusPerMonth || 0, p.notes || '', p.totalHectaresSprayed || 0, p.flightHours || 0, p.avatarUrl || '']
          );
        }

        // Seed Quotes
        for (const q of INITIAL_QUOTES) {
          await query(
            `INSERT INTO quotes (id, quote_number, company_id, client_id, client_name, client_whatsapp, client_email, property_id, property_name, talhao_name, crop, area_ha, service_type, drone_model_preferred, pilot_assigned_id, pilot_assigned_name, price_per_ha, subtotal, displacement_fee, discount, additional_fees, tax_amount, final_amount, estimated_cost, estimated_margin, estimated_margin_percent, payment_terms, valid_until, status, sent_at, approved_at, notes, converted_to_os_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34) ON CONFLICT (id) DO NOTHING`,
            [q.id, q.quoteNumber, q.companyId, q.clientId, q.clientName, q.clientWhatsapp || '', q.clientEmail || '', q.propertyId, q.propertyName, q.talhaoName || '', q.crop, q.areaHa, q.serviceType, q.droneModelPreferred || '', q.pilotAssignedId || '', q.pilotAssignedName || '', q.pricePerHa, q.subtotal, q.displacementFee || 0, q.discount || 0, q.additionalFees || 0, q.taxAmount || 0, q.finalAmount, q.estimatedCost || 0, q.estimatedMargin || 0, q.estimatedMarginPercent || 0, q.paymentTerms || '30 dias após aplicação', q.validUntil || null, q.status, q.sentAt || null, q.approvedAt || null, q.notes || '', q.convertedToOsId || null, q.createdAt]
          );
        }

        // Seed Service Orders
        for (const os of INITIAL_SERVICE_ORDERS) {
          await query(
            `INSERT INTO service_orders (id, os_number, company_id, quote_id, client_id, client_name, client_whatsapp, property_id, property_name, property_lat, property_lng, talhao_id, talhao_name, crop, area_ha, service_type, scheduled_date, scheduled_time, completed_date, status, pilot_id, pilot_name, drone_id, drone_model, products, weather_conditions, flight_height_meters, flight_speed_ms, flight_hours_recorded, battery_cycles_used, actual_area_sprayed_ha, price_per_ha, gross_amount, displacement_fee, additional_fees, discount, final_amount, estimated_cost, net_margin, payment_terms, calculated_pilot_commission, commission_status, commission_paid_date, client_signed, client_sign_date, client_sign_name, notes, field_occurrences_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48) ON CONFLICT (id) DO NOTHING`,
            [os.id, os.osNumber, os.companyId, os.quoteId || null, os.clientId, os.clientName, os.clientWhatsapp || '', os.propertyId, os.propertyName, os.propertyCoords?.lat || 0, os.propertyCoords?.lng || 0, os.talhaoId || null, os.talhaoName || '', os.crop, os.areaHa, os.serviceType, os.scheduledDate, os.scheduledTime || '08:00', os.completedDate || null, os.status, os.pilotId || '', os.pilotName, os.droneId || '', os.droneModel, JSON.stringify(os.products || []), JSON.stringify(os.weatherConditions || null), os.flightHeightMeters || 3.5, os.flightSpeedMs || 6.0, os.flightHoursRecorded || 0, os.batteryCyclesUsed || 0, os.actualAreaSprayedHa || null, os.pricePerHa, os.grossAmount, os.displacementFee || 0, os.additionalFees || 0, os.discount || 0, os.finalAmount, os.estimatedCost || 0, os.netMargin || 0, os.paymentTerms || '30 dias após aplicação', os.calculatedPilotCommission || 0, os.commissionStatus || 'prevista', os.commissionPaidDate || null, os.clientSigned || false, os.clientSignDate || null, os.clientSignName || '', os.notes || '', os.fieldOccurrencesCount || 0]
          );
        }

        // Seed Accounts Receivable
        for (const rec of INITIAL_ACCOUNTS_RECEIVABLE) {
          await query(
            `INSERT INTO accounts_receivable (id, company_id, client_id, client_name, os_id, os_number, description, amount, due_date, payment_date, status, payment_method, proof_document_url, receipt_number, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
            [rec.id, rec.companyId, rec.clientId || null, rec.clientName, rec.osId || null, rec.osNumber || '', rec.description, rec.amount, rec.dueDate, rec.paymentDate || null, rec.status, rec.paymentMethod || 'boleto', rec.proofDocumentUrl || '', rec.receiptNumber || '', rec.notes || '']
          );
        }

        // Seed Accounts Payable
        for (const pay of INITIAL_ACCOUNTS_PAYABLE) {
          await query(
            `INSERT INTO accounts_payable (id, company_id, cost_center, supplier_name, description, amount, due_date, payment_date, status, payment_method, drone_id, pilot_id, is_recurring, proof_document_url, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
            [pay.id, pay.companyId, pay.costCenter, pay.supplierName, pay.description, pay.amount, pay.dueDate, pay.paymentDate || null, pay.status, pay.paymentMethod || 'pix', pay.droneId || null, pay.pilotId || null, pay.isRecurring || false, pay.proofDocumentUrl || '', pay.notes || '']
          );
        }

        // Seed Pilot Commissions
        for (const comm of INITIAL_PILOT_COMMISSIONS) {
          await query(
            `INSERT INTO pilot_commissions (id, company_id, pilot_id, pilot_name, os_id, os_number, client_name, service_date, area_sprayed_ha, service_amount, commission_rule_applied, commission_amount, status, client_paid_date, released_date, approved_date, paid_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (id) DO NOTHING`,
            [comm.id, comm.companyId, comm.pilotId, comm.pilotName, comm.osId, comm.osNumber, comm.clientName, comm.serviceDate, comm.areaSprayedHa, comm.serviceAmount, comm.commissionRuleApplied, comm.commissionAmount, comm.status, comm.clientPaidDate || null, comm.releasedDate || null, comm.approvedDate || null, comm.paidDate || null, comm.notes || '']
          );
        }

        // Seed Receipt Notes
        for (const note of INITIAL_RECEIPT_NOTES) {
          await query(
            `INSERT INTO receipt_notes (id, company_id, pilot_id, pilot_name, date, time, establishment_name, cnpj, category, total_amount, payment_method, reimbursement_status, related_os_id, related_os_number, related_property_name, fuel_details, items, image_url, confidence_score, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) ON CONFLICT (id) DO NOTHING`,
            [note.id, note.companyId, note.pilotId || '', note.pilotName || 'Piloto', note.date, note.time || '', note.establishmentName, note.cnpj || '', note.category, note.totalAmount, note.paymentMethod || 'pix_piloto', note.reimbursementStatus || 'pendente', note.relatedOsId || null, note.relatedOsNumber || '', note.relatedPropertyName || '', JSON.stringify(note.fuelDetails || null), JSON.stringify(note.items || []), note.imageUrl || '', note.confidenceScore || 100, note.notes || '', note.createdAt]
          );
        }

        console.log('[MOUTRYX DATABASE] PostgreSQL dev seed data initialized successfully.');
      } else {
        console.log('[MOUTRYX DATABASE] PostgreSQL global reference data (crops/products) initialized for production.');
      }
    } catch (err: any) {
      console.warn('[MOUTRYX DATABASE] Warning during PostgreSQL seed population:', err.message);
    }
  }

  console.log(`[MOUTRYX MIGRATION] Total companies active: ${allCompanies.length} | Migrated users: ${migratedUsersCount}`);

  return {
    migratedUsersCount,
    companiesCount: allCompanies.length,
    postgresMigrated,
    migrationsApplied,
  };
}
