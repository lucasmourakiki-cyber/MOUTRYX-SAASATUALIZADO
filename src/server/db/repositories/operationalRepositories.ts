import { query, isDatabaseConfigured, DbExecutor, registerDevRollbackHook, assertCanUseDevFallback } from '../postgresClient';
import { ConcurrencyConflictError } from '../errors';
import {
  isValidCPF,
  isValidCNPJ,
  isValidCpfOrCnpj,
  cleanDigits,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  formatCPF,
  formatCNPJ,
  formatCpfOrCnpj,
} from '../../../utils/validators';
import {
  Client,
  Property,
  Talhao,
  Drone,
  DroneStatus,
  Battery,
  MaintenanceRecord,
  Pilot,
  Crop,
  FitossanitarioProduct,
  Occurrence,
} from '../../../types';
import {
  INITIAL_CLIENTS,
  INITIAL_PROPERTIES,
  INITIAL_TALHOES,
  INITIAL_DRONES,
  INITIAL_BATTERIES,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_PILOTS,
  INITIAL_CROPS,
  INITIAL_PRODUCTS,
} from '../../../data/initialData';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — OPERATIONAL REPOSITORIES (POSTGRESQL + DEV STORE)
 * ============================================================================
 * Camada de acesso a dados operacionais com suporte a transações ACID (DbExecutor)
 * e isolamento multi-tenant estrito por `companyId`.
 */

// In-Memory Dev Stores for Development fallback
let devClients: Client[] = [...INITIAL_CLIENTS];
let devProperties: Property[] = [...INITIAL_PROPERTIES];
let devTalhoes: Talhao[] = [...INITIAL_TALHOES];
let devDrones: Drone[] = [...INITIAL_DRONES];
let devBatteries: Battery[] = [...INITIAL_BATTERIES];
let devMaintenance: MaintenanceRecord[] = [...INITIAL_MAINTENANCE_RECORDS];
let devPilots: Pilot[] = [...INITIAL_PILOTS];
let devCrops: Crop[] = [...INITIAL_CROPS];
let devProducts: FitossanitarioProduct[] = [...INITIAL_PRODUCTS];
let devOccurrences: Occurrence[] = [];

// Register rollback hook for atomic in-memory transactions during dev mode
registerDevRollbackHook(() => {
  const snapshotClients = JSON.parse(JSON.stringify(devClients));
  const snapshotProperties = JSON.parse(JSON.stringify(devProperties));
  const snapshotTalhoes = JSON.parse(JSON.stringify(devTalhoes));
  const snapshotDrones = JSON.parse(JSON.stringify(devDrones));
  const snapshotBatteries = JSON.parse(JSON.stringify(devBatteries));
  const snapshotMaintenance = JSON.parse(JSON.stringify(devMaintenance));
  const snapshotPilots = JSON.parse(JSON.stringify(devPilots));
  const snapshotCrops = JSON.parse(JSON.stringify(devCrops));
  const snapshotProducts = JSON.parse(JSON.stringify(devProducts));
  const snapshotOccurrences = JSON.parse(JSON.stringify(devOccurrences));

  return {
    rollback: () => {
      devClients = snapshotClients;
      devProperties = snapshotProperties;
      devTalhoes = snapshotTalhoes;
      devDrones = snapshotDrones;
      devBatteries = snapshotBatteries;
      devMaintenance = snapshotMaintenance;
      devPilots = snapshotPilots;
      devCrops = snapshotCrops;
      devProducts = snapshotProducts;
      devOccurrences = snapshotOccurrences;
    },
  };
});

// ----------------------------------------------------------------------------
// 1. CLIENT REPOSITORY
// ----------------------------------------------------------------------------
export const clientRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Client[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", name, contact_name as "contactName", type,
                cpf_cnpj as "cpfCnpj", phone, whatsapp, email, city, state, address,
                total_hectares as "totalHectares", total_revenue as "totalRevenue", rating,
                notes, COALESCE(version, 1) as version, created_at as "createdAt"
         FROM clients WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        totalHectares: parseFloat(r.totalHectares || 0),
        totalRevenue: parseFloat(r.totalRevenue || 0),
        rating: parseInt(r.rating || 5, 10),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devClients.filter((c) => c.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Client | null> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", name, contact_name as "contactName", type,
                cpf_cnpj as "cpfCnpj", phone, whatsapp, email, city, state, address,
                total_hectares as "totalHectares", total_revenue as "totalRevenue", rating,
                notes, COALESCE(version, 1) as version, created_at as "createdAt"
         FROM clients WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        totalHectares: parseFloat(r.totalHectares || 0),
        totalRevenue: parseFloat(r.totalRevenue || 0),
        rating: parseInt(r.rating || 5, 10),
        version: parseInt(r.version || 1, 10),
      };
    }
    return devClients.find((c) => c.id === id && c.companyId === companyId) || null;
  },

  async create(data: Omit<Client, 'id' | 'createdAt'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Client> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Nome ou Razão Social do cliente é obrigatório.');
    }

    const rawDoc = data.cpfCnpj || (data as any).document || '';
    const cleanDoc = cleanDigits(rawDoc);
    let formattedDoc = '';

    // Validação estrita de CPF/CNPJ quando informado
    if (cleanDoc.length > 0) {
      if (!isValidCpfOrCnpj(cleanDoc)) {
        throw new Error(`O CPF ou CNPJ informado (${rawDoc}) é inválido.`);
      }

      // Prevenir duplicidade de CPF/CNPJ dentro da mesma empresa
      const existing = await this.getByCompany(targetCompanyId, tx);
      const isDuplicate = existing.some((c) => cleanDigits(c.cpfCnpj) === cleanDoc);
      if (isDuplicate) {
        throw new Error('Já existe um cliente cadastrado com este CPF/CNPJ nesta empresa.');
      }
      formattedDoc = formatCpfOrCnpj(cleanDoc);
    }

    const rawEmail = (data.email || '').trim();
    if (rawEmail.length > 0) {
      if (!isValidEmail(rawEmail)) {
        throw new Error(`O e-mail informado (${rawEmail}) é inválido.`);
      }
    }
    const cleanEmail = normalizeEmail(rawEmail);

    const rawPhone = (data.phone || '').trim();
    if (rawPhone.length > 0) {
      if (!isValidPhone(rawPhone)) {
        throw new Error(`O telefone informado (${rawPhone}) é inválido.`);
      }
    }

    const rawWhatsapp = (data.whatsapp || '').trim();
    if (rawWhatsapp.length > 0) {
      if (!isValidPhone(rawWhatsapp)) {
        throw new Error(`O WhatsApp informado (${rawWhatsapp}) é inválido.`);
      }
    }

    const id = data.id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const client: Client = {
      ...data,
      id,
      companyId: targetCompanyId,
      name: trimmedName,
      type: data.type || (cleanDoc.length > 11 ? 'pj' : 'pf'),
      cpfCnpj: formattedDoc,
      contactName: (data.contactName || '').trim(),
      phone: rawPhone,
      whatsapp: rawWhatsapp || rawPhone,
      email: cleanEmail,
      city: (data.city || '').trim(),
      state: (data.state || '').trim().toUpperCase(),
      address: (data.address || '').trim(),
      createdAt,
      totalHectares: typeof data.totalHectares === 'number' ? Math.max(0, data.totalHectares) : 0,
      totalRevenue: typeof data.totalRevenue === 'number' ? Math.max(0, data.totalRevenue) : 0,
      rating: typeof data.rating === 'number' ? data.rating : 5,
      notes: (data.notes || '').trim(),
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO clients (id, company_id, name, contact_name, type, cpf_cnpj, phone, whatsapp, email, city, state, address, total_hectares, total_revenue, rating, notes, version, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, contact_name = EXCLUDED.contact_name, phone = EXCLUDED.phone,
            whatsapp = EXCLUDED.whatsapp, email = EXCLUDED.email, city = EXCLUDED.city, state = EXCLUDED.state,
            address = EXCLUDED.address, notes = EXCLUDED.notes, rating = EXCLUDED.rating, version = clients.version + 1, updated_at = CURRENT_TIMESTAMP`,
        [
          client.id,
          targetCompanyId,
          client.name,
          client.contactName || '',
          client.type,
          client.cpfCnpj,
          client.phone || '',
          client.whatsapp || '',
          client.email || '',
          client.city,
          client.state,
          client.address || '',
          client.totalHectares,
          client.totalRevenue,
          client.rating,
          client.notes || '',
          client.version || 1,
          client.createdAt,
        ]
      );
      return client;
    }

    devClients.unshift(client);
    return client;
  },

  async update(id: string, updates: Partial<Client>, companyId: string, tx?: DbExecutor): Promise<Client | null> {
    const rawDoc = updates.cpfCnpj !== undefined ? updates.cpfCnpj : undefined;
    let formattedDoc: string | undefined = undefined;
    if (rawDoc !== undefined && rawDoc !== null) {
      const cleanDoc = cleanDigits(rawDoc);
      if (cleanDoc.length > 0) {
        if (!isValidCpfOrCnpj(cleanDoc)) {
          throw new Error(`O CPF ou CNPJ informado (${rawDoc}) é inválido.`);
        }
        const existing = await this.getByCompany(companyId, tx);
        const isDuplicate = existing.some((c) => c.id !== id && cleanDigits(c.cpfCnpj) === cleanDoc);
        if (isDuplicate) {
          throw new Error('Já existe outro cliente cadastrado com este CPF/CNPJ nesta empresa.');
        }
        formattedDoc = formatCpfOrCnpj(cleanDoc);
      } else {
        formattedDoc = '';
      }
    }

    if (updates.email !== undefined && updates.email !== null) {
      const rawEmail = updates.email.trim();
      if (rawEmail.length > 0 && !isValidEmail(rawEmail)) {
        throw new Error(`O e-mail informado (${rawEmail}) é inválido.`);
      }
      updates.email = normalizeEmail(rawEmail);
    }

    if (updates.phone !== undefined && updates.phone !== null) {
      const rawPhone = updates.phone.trim();
      if (rawPhone.length > 0 && !isValidPhone(rawPhone)) {
        throw new Error(`O telefone informado (${rawPhone}) é inválido.`);
      }
    }

    if (updates.whatsapp !== undefined && updates.whatsapp !== null) {
      const rawWhatsapp = updates.whatsapp.trim();
      if (rawWhatsapp.length > 0 && !isValidPhone(rawWhatsapp)) {
        throw new Error(`O WhatsApp informado (${rawWhatsapp}) é inválido.`);
      }
    }

    const sanitizedUpdates = {
      ...updates,
      ...(formattedDoc !== undefined ? { cpfCnpj: formattedDoc } : {}),
    };

    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...sanitizedUpdates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE clients SET
            name = $1, contact_name = $2, type = $3, cpf_cnpj = $4, phone = $5, whatsapp = $6,
            email = $7, city = $8, state = $9, address = $10, total_hectares = $11,
            total_revenue = $12, rating = $13, notes = $14, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $15 AND company_id = $16 AND ($17::integer IS NULL OR version = $17)
         RETURNING *`,
        [
          updated.name,
          updated.contactName,
          updated.type,
          updated.cpfCnpj,
          updated.phone,
          updated.whatsapp,
          updated.email,
          updated.city,
          updated.state,
          updated.address,
          updated.totalHectares,
          updated.totalRevenue,
          updated.rating,
          updated.notes,
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devClients.findIndex((c) => c.id === id && c.companyId === companyId);
    if (index === -1) return null;
    const current = devClients[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Client = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devClients[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM clients WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devClients.length;
    devClients = devClients.filter((c) => !(c.id === id && c.companyId === companyId));
    return devClients.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 2. PROPERTY REPOSITORY
// ----------------------------------------------------------------------------
export const propertyRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Property[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", client_id as "clientId", client_name as "clientName",
                name, manager_name as "managerName", phone, city, state, address,
                latitude, longitude, total_area_ha as "totalAreaHa", notes,
                COALESCE(version, 1) as version
         FROM properties WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        latitude: parseFloat(r.latitude || 0),
        longitude: parseFloat(r.longitude || 0),
        totalAreaHa: parseFloat(r.totalAreaHa || 0),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devProperties.filter((p) => p.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Property | null> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", client_id as "clientId", client_name as "clientName",
                name, manager_name as "managerName", phone, city, state, address,
                latitude, longitude, total_area_ha as "totalAreaHa", notes,
                COALESCE(version, 1) as version
         FROM properties WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        latitude: parseFloat(r.latitude || 0),
        longitude: parseFloat(r.longitude || 0),
        totalAreaHa: parseFloat(r.totalAreaHa || 0),
        version: parseInt(r.version || 1, 10),
      };
    }
    return devProperties.find((p) => p.id === id && p.companyId === companyId) || null;
  },

  async create(data: Omit<Property, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Property> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Nome da fazenda ou propriedade é obrigatório.');
    }

    const clientId = data.clientId;
    if (!clientId) {
      throw new Error('O cliente responsável pela propriedade é obrigatório.');
    }

    // Validar se o cliente existe e pertence a esta empresa
    const client = await clientRepository.getById(clientId, targetCompanyId, tx);
    if (!client) {
      throw new Error('Cliente informado não existe ou não pertence a esta empresa.');
    }

    const clientName = client.name;
    const totalAreaHa = typeof data.totalAreaHa === 'number' ? data.totalAreaHa : (data.totalAreaHa ? parseFloat(data.totalAreaHa as any) : 0);
    if (isNaN(totalAreaHa) || totalAreaHa <= 0) {
      throw new Error('A área total da fazenda/propriedade deve ser maior que zero hectares.');
    }
    const id = data.id || `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const prop: Property = {
      ...data,
      id,
      companyId: targetCompanyId,
      clientId,
      clientName,
      name: trimmedName,
      managerName: (data.managerName || '').trim(),
      phone: (data.phone || '').trim(),
      city: (data.city || client.city || '').trim(),
      state: (data.state || client.state || '').trim().toUpperCase(),
      address: (data.address || '').trim(),
      totalAreaHa,
      latitude: typeof data.latitude === 'number' ? data.latitude : 0,
      longitude: typeof data.longitude === 'number' ? data.longitude : 0,
      notes: (data.notes || '').trim(),
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO properties (id, company_id, client_id, client_name, name, manager_name, phone, city, state, address, latitude, longitude, total_area_ha, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [
          prop.id,
          targetCompanyId,
          prop.clientId,
          prop.clientName,
          prop.name,
          prop.managerName || '',
          prop.phone || '',
          prop.city,
          prop.state,
          prop.address || '',
          prop.latitude,
          prop.longitude,
          prop.totalAreaHa,
          prop.notes || '',
          prop.version || 1,
        ]
      );
      return prop;
    }

    devProperties.unshift(prop);
    return prop;
  },

  async update(id: string, updates: Partial<Property>, companyId: string, tx?: DbExecutor): Promise<Property | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE properties SET
            client_id = $1, client_name = $2, name = $3, manager_name = $4,
            phone = $5, city = $6, state = $7, address = $8, latitude = $9,
            longitude = $10, total_area_ha = $11, notes = $12, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $13 AND company_id = $14 AND ($15::integer IS NULL OR version = $15)
         RETURNING *`,
        [
          updated.clientId,
          updated.clientName,
          updated.name,
          updated.managerName,
          updated.phone,
          updated.city,
          updated.state,
          updated.address,
          updated.latitude,
          updated.longitude,
          updated.totalAreaHa,
          updated.notes,
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devProperties.findIndex((p) => p.id === id && p.companyId === companyId);
    if (index === -1) return null;
    const current = devProperties[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Property = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devProperties[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM properties WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devProperties.length;
    devProperties = devProperties.filter((p) => !(p.id === id && p.companyId === companyId));
    return devProperties.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 3. TALHÃO REPOSITORY
// ----------------------------------------------------------------------------
export const talhaoRepository = {
  async getByProperty(propertyId: string, companyId: string, tx?: DbExecutor): Promise<Talhao[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, property_id as "propertyId", property_name as "propertyName",
                client_id as "clientId", client_name as "clientName", company_id as "companyId",
                name, area_ha as "areaHa", crop, crop_stage as "cropStage",
                last_application_date as "lastApplicationDate", polygon, center,
                soil_type as "soilType", notes, COALESCE(version, 1) as version
         FROM talhoes WHERE property_id = $1 AND company_id = $2 ORDER BY name ASC`,
        [propertyId, companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        areaHa: parseFloat(r.areaHa || 0),
        polygon: Array.isArray(r.polygon) ? r.polygon : (typeof r.polygon === 'string' ? JSON.parse(r.polygon) : []),
        center: r.center && typeof r.center === 'string' ? JSON.parse(r.center) : (r.center || { lat: 0, lng: 0 }),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devTalhoes.filter((t) => t.propertyId === propertyId && t.companyId === companyId);
  },

  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Talhao[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, property_id as "propertyId", property_name as "propertyName",
                client_id as "clientId", client_name as "clientName", company_id as "companyId",
                name, area_ha as "areaHa", crop, crop_stage as "cropStage",
                last_application_date as "lastApplicationDate", polygon, center,
                soil_type as "soilType", notes, COALESCE(version, 1) as version
         FROM talhoes WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        areaHa: parseFloat(r.areaHa || 0),
        polygon: Array.isArray(r.polygon) ? r.polygon : (typeof r.polygon === 'string' ? JSON.parse(r.polygon) : []),
        center: r.center && typeof r.center === 'string' ? JSON.parse(r.center) : (r.center || { lat: 0, lng: 0 }),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devTalhoes.filter((t) => t.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Talhao | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((t) => t.id === id) || null;
  },

  async create(data: Omit<Talhao, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Talhao> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Nome do talhão é obrigatório.');
    }

    if (!data.propertyId) {
      throw new Error('A fazenda/propriedade do talhão é obrigatória.');
    }

    const prop = await propertyRepository.getById(data.propertyId, targetCompanyId, tx);
    if (!prop) {
      throw new Error('Propriedade informada não existe ou não pertence a esta empresa.');
    }

    const areaHa = typeof data.areaHa === 'number' ? data.areaHa : parseFloat(data.areaHa as any);
    if (isNaN(areaHa) || areaHa <= 0) {
      throw new Error('A área do talhão deve ser maior que zero hectares.');
    }
    if (prop.totalAreaHa > 0 && areaHa > prop.totalAreaHa) {
      throw new Error(`A área do talhão (${areaHa} ha) não pode exceder a área total da fazenda (${prop.totalAreaHa} ha).`);
    }

    const id = data.id || `talhao-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const talhao: Talhao = {
      ...data,
      id,
      companyId: targetCompanyId,
      propertyId: prop.id,
      propertyName: prop.name,
      clientId: prop.clientId,
      clientName: prop.clientName,
      name: trimmedName,
      crop: (data.crop || '').trim(),
      cropStage: (data.cropStage || '').trim(),
      areaHa,
      polygon: data.polygon || [],
      center: data.center || { lat: prop.latitude || 0, lng: prop.longitude || 0 },
      soilType: (data.soilType || '').trim(),
      notes: (data.notes || '').trim(),
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO talhoes (id, property_id, property_name, client_id, client_name, company_id, name, area_ha, crop, crop_stage, last_application_date, polygon, center, soil_type, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          talhao.id,
          talhao.propertyId,
          talhao.propertyName || '',
          talhao.clientId || '',
          talhao.clientName || '',
          targetCompanyId,
          talhao.name,
          talhao.areaHa,
          talhao.crop || '',
          talhao.cropStage || '',
          talhao.lastApplicationDate || null,
          JSON.stringify(talhao.polygon || []),
          JSON.stringify(talhao.center || { lat: 0, lng: 0 }),
          talhao.soilType || '',
          talhao.notes || '',
          talhao.version || 1,
        ]
      );
      return talhao;
    }

    devTalhoes.unshift(talhao);
    return talhao;
  },

  async update(id: string, updates: Partial<Talhao>, companyId: string, tx?: DbExecutor): Promise<Talhao | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE talhoes SET
            name = $1, area_ha = $2, crop = $3, crop_stage = $4,
            last_application_date = $5, polygon = $6, center = $7,
            soil_type = $8, notes = $9, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 AND company_id = $11 AND ($12::integer IS NULL OR version = $12)
         RETURNING *`,
        [
          updated.name,
          updated.areaHa,
          updated.crop,
          updated.cropStage,
          updated.lastApplicationDate || null,
          JSON.stringify(updated.polygon || []),
          JSON.stringify(updated.center || { lat: 0, lng: 0 }),
          updated.soilType,
          updated.notes,
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devTalhoes.findIndex((t) => t.id === id && t.companyId === companyId);
    if (index === -1) return null;
    const current = devTalhoes[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Talhao = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devTalhoes[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM talhoes WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devTalhoes.length;
    devTalhoes = devTalhoes.filter((t) => !(t.id === id && t.companyId === companyId));
    return devTalhoes.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 4. DRONE REPOSITORY
// ----------------------------------------------------------------------------
export const droneRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Drone[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", model, manufacturer, serial_number as "serialNumber",
                asset_tag as "assetTag", year, purchase_date as "purchaseDate", purchase_value as "purchaseValue",
                status, flight_hours as "flightHours", accumulated_hectares as "accumulatedHectares",
                tank_capacity_liters as "tankCapacityLiters", max_flow_rate_liters_min as "maxFlowRateLitersMin",
                spray_width_meters as "sprayWidthMeters", anac_registration as "anacRegistration",
                insurance_validity as "insuranceValidity", last_maintenance_date as "lastMaintenanceDate",
                next_maintenance_hours as "nextMaintenanceHours", photo_url as "photoUrl",
                COALESCE(version, 1) as version
         FROM drones WHERE company_id = $1 ORDER BY asset_tag ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        tag: r.assetTag || r.asset_tag,
        year: parseInt(r.year || 2024, 10),
        purchaseValue: parseFloat(r.purchaseValue || 0),
        flightHours: parseFloat(r.flightHours || 0),
        accumulatedHectares: parseFloat(r.accumulatedHectares || 0),
        tankCapacityLiters: parseFloat(r.tankCapacityLiters || 40),
        maxFlowRateLitersMin: parseFloat(r.maxFlowRateLitersMin || 12),
        sprayWidthMeters: parseFloat(r.sprayWidthMeters || 9),
        nextMaintenanceHours: parseFloat(r.nextMaintenanceHours || 100),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devDrones.filter((d) => d.companyId === companyId).map((d) => ({ ...d, tag: d.assetTag || d.tag }));
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Drone | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((d) => d.id === id) || null;
  },

  async create(data: Omit<Drone, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Drone> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const trimmedModel = (data.model || '').trim();
    if (!trimmedModel) {
      throw new Error('Modelo da aeronave/drone é obrigatório.');
    }

    const trimmedAssetTag = (data.assetTag || (data as any).tag || (data as any).prefix || '').trim();
    if (!trimmedAssetTag) {
      throw new Error('Prefixo ou Tag de identificação do drone é obrigatório.');
    }

    // Check duplicate assetTag or serialNumber in same company
    const existingDrones = await this.getByCompany(targetCompanyId, tx);
    const hasDuplicateTag = existingDrones.some(
      (d) => (d.assetTag || (d as any).tag || '').toLowerCase() === trimmedAssetTag.toLowerCase()
    );
    if (hasDuplicateTag) {
      throw new Error(`Já existe um drone com o prefixo/tag "${trimmedAssetTag}" cadastrado nesta empresa.`);
    }

    const trimmedSerial = (data.serialNumber || '').trim();
    if (trimmedSerial) {
      const hasDuplicateSerial = existingDrones.some(
        (d) => d.serialNumber && d.serialNumber.toLowerCase() === trimmedSerial.toLowerCase()
      );
      if (hasDuplicateSerial) {
        throw new Error(`Já existe um drone com o número de série "${trimmedSerial}" nesta empresa.`);
      }
    }

    const statusVal = ((data.status as string) || 'disponivel').toLowerCase();
    const validDroneStatus: Drone['status'] =
      statusVal === 'ativo' || statusVal === 'disponivel' ? 'disponivel' :
      statusVal === 'em_operacao' || statusVal === 'em_voo' ? 'em_operacao' :
      statusVal === 'em_manutencao' || statusVal === 'manutencao' ? 'em_manutencao' :
      statusVal === 'inativo' || statusVal === 'parado' ? 'parado' :
      'disponivel';

    const id = data.id || `drone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const drone: Drone = {
      ...data,
      id,
      companyId: targetCompanyId,
      model: trimmedModel,
      assetTag: trimmedAssetTag,
      tag: trimmedAssetTag,
      serialNumber: trimmedSerial,
      manufacturer: data.manufacturer || (trimmedModel.toUpperCase().includes('XAG') ? 'XAG' : 'DJI'),
      year: typeof data.year === 'number' ? data.year : new Date().getFullYear(),
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseValue: typeof data.purchaseValue === 'number' ? Math.max(0, data.purchaseValue) : 0,
      status: validDroneStatus,
      flightHours: typeof data.flightHours === 'number' ? Math.max(0, data.flightHours) : 0,
      accumulatedHectares: typeof data.accumulatedHectares === 'number' ? Math.max(0, data.accumulatedHectares) : 0,
      tankCapacityLiters: typeof data.tankCapacityLiters === 'number' ? Math.max(0, data.tankCapacityLiters) : 40,
      maxFlowRateLitersMin: typeof data.maxFlowRateLitersMin === 'number' ? Math.max(0, data.maxFlowRateLitersMin) : 12,
      sprayWidthMeters: typeof data.sprayWidthMeters === 'number' ? Math.max(0, data.sprayWidthMeters) : 9,
      nextMaintenanceHours: typeof data.nextMaintenanceHours === 'number' ? Math.max(0, data.nextMaintenanceHours) : 100,
      anacRegistration: (data.anacRegistration || '').trim(),
      insuranceValidity: data.insuranceValidity || undefined,
      lastMaintenanceDate: data.lastMaintenanceDate || undefined,
      photoUrl: data.photoUrl || '',
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO drones (id, company_id, model, manufacturer, serial_number, asset_tag, year, purchase_date, purchase_value, status, flight_hours, accumulated_hectares, tank_capacity_liters, max_flow_rate_liters_min, spray_width_meters, anac_registration, insurance_validity, last_maintenance_date, next_maintenance_hours, photo_url, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (id) DO NOTHING`,
        [
          drone.id,
          targetCompanyId,
          drone.model,
          drone.manufacturer,
          drone.serialNumber,
          drone.assetTag,
          drone.year,
          drone.purchaseDate,
          drone.purchaseValue,
          drone.status,
          drone.flightHours,
          drone.accumulatedHectares,
          drone.tankCapacityLiters,
          drone.maxFlowRateLitersMin,
          drone.sprayWidthMeters,
          drone.anacRegistration,
          drone.insuranceValidity,
          drone.lastMaintenanceDate,
          drone.nextMaintenanceHours,
          drone.photoUrl || '',
          drone.version || 1,
        ]
      );
      return drone;
    }

    devDrones.unshift(drone);
    return drone;
  },

  async update(id: string, updates: Partial<Drone>, companyId: string, tx?: DbExecutor): Promise<Drone | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE drones SET
            model = $1, manufacturer = $2, serial_number = $3, asset_tag = $4,
            year = $5, purchase_date = $6, purchase_value = $7, status = $8,
            flight_hours = $9, accumulated_hectares = $10, tank_capacity_liters = $11,
            max_flow_rate_liters_min = $12, spray_width_meters = $13,
            anac_registration = $14, insurance_validity = $15, last_maintenance_date = $16,
            next_maintenance_hours = $17, photo_url = $18,
            version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $19 AND company_id = $20 AND ($21::integer IS NULL OR version = $21)
         RETURNING *`,
        [
          updated.model,
          updated.manufacturer,
          updated.serialNumber,
          updated.assetTag,
          updated.year,
          updated.purchaseDate,
          updated.purchaseValue,
          updated.status,
          updated.flightHours,
          updated.accumulatedHectares,
          updated.tankCapacityLiters,
          updated.maxFlowRateLitersMin,
          updated.sprayWidthMeters,
          updated.anacRegistration,
          updated.insuranceValidity,
          updated.lastMaintenanceDate,
          updated.nextMaintenanceHours,
          updated.photoUrl || '',
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devDrones.findIndex((d) => d.id === id && d.companyId === companyId);
    if (index === -1) return null;
    const current = devDrones[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Drone = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devDrones[index] = updated;
    return updated;
  },

  async updateStatus(id: string, status: Drone['status'] | 'em_voo', companyId: string, version?: number, tx?: DbExecutor): Promise<Drone | null> {
    const normalizedStatus: DroneStatus = (status as string) === 'em_voo' ? 'em_operacao' : (status as DroneStatus);
    return this.update(id, { status: normalizedStatus, ...(version !== undefined ? { version } : {}) }, companyId, tx);
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM drones WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devDrones.length;
    devDrones = devDrones.filter((d) => !(d.id === id && d.companyId === companyId));
    return devDrones.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 5. BATTERY REPOSITORY
// ----------------------------------------------------------------------------
export const batteryRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Battery[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", drone_id as "droneId", identifier,
                manufacturer, model, serial_number as "serialNumber", cycles,
                max_recommended_cycles as "maxRecommendedCycles", hours,
                health_percent as "healthPercent", condition, purchase_date as "purchaseDate",
                last_test_date as "lastTestDate", notes, COALESCE(version, 1) as version
         FROM batteries WHERE company_id = $1 ORDER BY identifier ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        cycles: parseInt(r.cycles || 0, 10),
        maxRecommendedCycles: parseInt(r.maxRecommendedCycles || 500, 10),
        hours: parseFloat(r.hours || 0),
        healthPercent: parseFloat(r.healthPercent || 100),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devBatteries.filter((b) => b.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Battery | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((b) => b.id === id) || null;
  },

  async create(data: Omit<Battery, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Battery> {
    const id = data.id || `bat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetCompanyId = companyId || data.companyId || '';
    const battery: Battery = {
      ...data,
      id,
      companyId: targetCompanyId,
      identifier: data.identifier || (data as any).code || `BAT-${Date.now().toString().slice(-4)}`,
      manufacturer: data.manufacturer || 'DJI',
      model: data.model || 'DB1560',
      serialNumber: data.serialNumber || (data as any).code || `SN-BAT-${Date.now().toString().slice(-4)}`,
      cycles: data.cycles || 0,
      maxRecommendedCycles: data.maxRecommendedCycles || 500,
      hours: data.hours || 0,
      healthPercent: data.healthPercent || 100,
      condition: data.condition || 'excelente',
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      lastTestDate: data.lastTestDate || new Date().toISOString().split('T')[0],
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO batteries (id, company_id, drone_id, identifier, manufacturer, model, serial_number, cycles, max_recommended_cycles, hours, health_percent, condition, purchase_date, last_test_date, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          battery.id,
          targetCompanyId,
          battery.droneId || null,
          battery.identifier,
          battery.manufacturer,
          battery.model,
          battery.serialNumber,
          battery.cycles,
          battery.maxRecommendedCycles,
          battery.hours,
          battery.healthPercent,
          battery.condition,
          battery.purchaseDate,
          battery.lastTestDate,
          battery.notes || '',
          battery.version || 1,
        ]
      );
      return battery;
    }

    devBatteries.unshift(battery);
    return battery;
  },

  async update(id: string, updates: Partial<Battery>, companyId: string, tx?: DbExecutor): Promise<Battery | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE batteries SET
            drone_id = $1, identifier = $2, manufacturer = $3, model = $4,
            serial_number = $5, cycles = $6, max_recommended_cycles = $7,
            hours = $8, health_percent = $9, condition = $10, purchase_date = $11,
            last_test_date = $12, notes = $13,
            version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 AND company_id = $15 AND ($16::integer IS NULL OR version = $16)
         RETURNING *`,
        [
          updated.droneId,
          updated.identifier,
          updated.manufacturer,
          updated.model,
          updated.serialNumber,
          updated.cycles,
          updated.maxRecommendedCycles,
          updated.hours,
          updated.healthPercent,
          updated.condition,
          updated.purchaseDate,
          updated.lastTestDate,
          updated.notes,
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devBatteries.findIndex((b) => b.id === id && b.companyId === companyId);
    if (index === -1) return null;
    const current = devBatteries[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Battery = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devBatteries[index] = updated;
    return updated;
  },

  async updateCycles(id: string, cycles: number, companyId: string, version?: number, tx?: DbExecutor): Promise<Battery | null> {
    const current = await this.getById(id, companyId, tx);
    if (!current) return null;
    const max = current.maxRecommendedCycles || 500;
    const health = Math.max(10, Math.round(((max - cycles) / max) * 100));
    const cond = health > 80 ? 'excelente' : health > 50 ? 'boa' : health > 25 ? 'atencao' : 'limite_atingido';
    return this.update(id, {
      cycles,
      healthPercent: health,
      condition: cond as any,
      ...(version !== undefined ? { version } : {}),
    }, companyId, tx);
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM batteries WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devBatteries.length;
    devBatteries = devBatteries.filter((b) => !(b.id === id && b.companyId === companyId));
    return devBatteries.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 6. MAINTENANCE REPOSITORY
// ----------------------------------------------------------------------------
export const maintenanceRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<MaintenanceRecord[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", drone_id as "droneId", drone_model as "droneModel",
                battery_id as "batteryId", type, date, provider, description, cost,
                flight_hours_at_service as "flightHoursAtService", parts_replaced as "partsReplaced",
                notes, next_maintenance_due_hours as "nextMaintenanceDueHours", COALESCE(version, 1) as version
         FROM maintenance_records WHERE company_id = $1 ORDER BY date DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        cost: parseFloat(r.cost || 0),
        flightHoursAtService: parseFloat(r.flightHoursAtService || 0),
        nextMaintenanceDueHours: parseFloat(r.nextMaintenanceDueHours || 0),
        partsReplaced: Array.isArray(r.partsReplaced) ? r.partsReplaced : [],
      }));
    }
    return devMaintenance.filter((m) => m.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<MaintenanceRecord | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((m) => m.id === id) || null;
  },

  async create(data: Omit<MaintenanceRecord, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<MaintenanceRecord> {
    const id = data.id || `maint-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetCompanyId = companyId || data.companyId || '';
    const maint: MaintenanceRecord = {
      ...data,
      id,
      companyId: targetCompanyId,
      cost: data.cost || 0,
      flightHoursAtService: data.flightHoursAtService || 0,
      partsReplaced: data.partsReplaced || [],
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO maintenance_records (id, company_id, drone_id, drone_model, battery_id, type, date, provider, description, cost, flight_hours_at_service, parts_replaced, notes, next_maintenance_due_hours, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [
          maint.id,
          targetCompanyId,
          maint.droneId,
          maint.droneModel,
          maint.batteryId || '',
          maint.type,
          maint.date,
          maint.provider,
          maint.description,
          maint.cost,
          maint.flightHoursAtService,
          JSON.stringify(maint.partsReplaced || []),
          maint.notes || '',
          maint.nextMaintenanceDueHours || 0,
          maint.version || 1,
        ]
      );
      return maint;
    }

    devMaintenance.unshift(maint);
    return maint;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM maintenance_records WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devMaintenance.length;
    devMaintenance = devMaintenance.filter((m) => !(m.id === id && m.companyId === companyId));
    return devMaintenance.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 7. PILOT REPOSITORY
// ----------------------------------------------------------------------------
export const pilotRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Pilot[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", name, cpf, phone, whatsapp, email, city, state,
                hire_date as "hireDate", status, contract_type as "contractType", cnpj_mei as "cnpjMei",
                anac_code as "anacCode", caar_certified as "caarCertified", caar_number as "caarNumber",
                caar_validity as "caarValidity", cnh_validity as "cnhValidity", contract_validity as "contractValidity",
                commission_model as "commissionModel", fixed_salary as "fixedSalary", percent_rate as "percentRate",
                rate_per_hectare as "ratePerHectare", hybrid_fixed as "hybridFixed",
                hybrid_rate_per_ha as "hybridRatePerHa", bonus_per_month as "bonusPerMonth",
                notes, total_hectares_sprayed as "totalHectaresSprayed", flight_hours as "flightHours",
                avatar_url as "avatarUrl", COALESCE(version, 1) as version,
                documents, contract_pdf_url as "contractPdfUrl", contract_pdf_name as "contractPdfName",
                contract_pdf_size as "contractPdfSize", contract_upload_date as "contractUploadDate",
                professional_type as "professionalType", role, cnh_number as "cnhNumber",
                cnh_category as "cnhCategory", emergency_contact as "emergencyContact",
                admission_date as "admissionDate", has_fixed_salary as "hasFixedSalary",
                has_commission as "hasCommission", commission_type as "commissionType",
                commission_value as "commissionValue", fixed_per_service as "fixedPerService",
                authorized_drones as "authorizedDrones", function_title as "functionTitle",
                operational_notes as "operationalNotes"
         FROM pilots WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        caarCertified: !!r.caarCertified,
        flightHours: parseFloat(r.flightHours || 0),
        totalHectaresSprayed: parseFloat(r.totalHectaresSprayed || 0),
        fixedSalary: parseFloat(r.fixedSalary || 0),
        percentRate: parseFloat(r.percentRate || 0),
        ratePerHectare: parseFloat(r.ratePerHectare || 0),
        hybridFixed: parseFloat(r.hybridFixed || 0),
        hybridRatePerHa: parseFloat(r.hybridRatePerHa || 0),
        bonusPerMonth: parseFloat(r.bonusPerMonth || 0),
        hasFixedSalary: !!r.hasFixedSalary,
        hasCommission: !!r.hasCommission,
        commissionValue: parseFloat(r.commissionValue || 0),
        fixedPerService: parseFloat(r.fixedPerService || 0),
        version: parseInt(r.version || 1, 10),
        documents: Array.isArray(r.documents)
          ? r.documents
          : (typeof r.documents === 'string' ? JSON.parse(r.documents) : []),
        authorizedDrones: Array.isArray(r.authorizedDrones)
          ? r.authorizedDrones
          : (typeof r.authorizedDrones === 'string' ? JSON.parse(r.authorizedDrones) : []),
      }));
    }
    return devPilots.filter((p) => p.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Pilot | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((p) => p.id === id) || null;
  },

  async create(data: Omit<Pilot, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Pilot> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Nome do profissional/piloto é obrigatório.');
    }

    const rawCpf = data.cpf || (data as any).document || '';
    const cleanCpf = cleanDigits(rawCpf);
    let formattedCpf = '';

    if (cleanCpf.length > 0) {
      if (!isValidCPF(cleanCpf)) {
        throw new Error(`O CPF informado para o profissional (${rawCpf}) é inválido.`);
      }

      const existingPilots = await this.getByCompany(targetCompanyId, tx);
      const isDuplicate = existingPilots.some((p) => cleanDigits(p.cpf) === cleanCpf);
      if (isDuplicate) {
        throw new Error('Já existe um profissional cadastrado com este CPF nesta empresa.');
      }
      formattedCpf = formatCPF(cleanCpf);
    }

    const rawEmail = (data.email || '').trim();
    if (rawEmail.length > 0 && !isValidEmail(rawEmail)) {
      throw new Error(`O e-mail informado para o piloto (${rawEmail}) é inválido.`);
    }
    const cleanEmail = normalizeEmail(rawEmail);

    const rawPhone = (data.phone || '').trim();
    if (rawPhone.length > 0 && !isValidPhone(rawPhone)) {
      throw new Error(`O telefone informado para o piloto (${rawPhone}) é inválido.`);
    }

    const rawWhatsapp = (data.whatsapp || '').trim();
    if (rawWhatsapp.length > 0 && !isValidPhone(rawWhatsapp)) {
      throw new Error(`O WhatsApp informado para o piloto (${rawWhatsapp}) é inválido.`);
    }

    const id = data.id || `pilot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const contractVal = (data.contractType as unknown as string);
    const validContractType: Pilot['contractType'] =
      contractVal === 'pj' || contractVal === 'prestador_pj'
        ? 'prestador_pj'
        : contractVal === 'mei'
        ? 'mei'
        : contractVal === 'autonomo'
        ? 'autonomo'
        : 'clt';

    const statusVal = (data.status as unknown as string);
    const validStatus: Pilot['status'] =
      statusVal === 'em_voo' ? 'em_voo' :
      statusVal === 'folga' ? 'folga' :
      statusVal === 'afastado' ? 'afastado' :
      statusVal === 'inativo' ? 'inativo' :
      'ativo';

    const pilot: Pilot = {
      ...data,
      id,
      companyId: targetCompanyId,
      name: trimmedName,
      cpf: formattedCpf,
      phone: rawPhone,
      whatsapp: rawWhatsapp || rawPhone,
      email: cleanEmail,
      city: (data.city || '').trim(),
      state: (data.state || '').trim().toUpperCase(),
      status: validStatus,
      contractType: validContractType,
      flightHours: typeof data.flightHours === 'number' ? Math.max(0, data.flightHours) : 0,
      totalHectaresSprayed: typeof data.totalHectaresSprayed === 'number' ? Math.max(0, data.totalHectaresSprayed) : 0,
      caarCertified: data.caarCertified !== undefined ? !!data.caarCertified : !!(data as any).caarCertificate,
      caarNumber: (data.caarNumber || (data as any).caarCertificate || '').trim(),
      anacCode: (data.anacCode || (data as any).anacLicense || '').trim(),
      fixedSalary: typeof data.fixedSalary === 'number' ? Math.max(0, data.fixedSalary) : 0,
      percentRate: typeof data.percentRate === 'number' ? Math.max(0, data.percentRate) : 0,
      ratePerHectare: typeof data.ratePerHectare === 'number' ? Math.max(0, data.ratePerHectare) : 0,
      hybridFixed: typeof data.hybridFixed === 'number' ? Math.max(0, data.hybridFixed) : 0,
      hybridRatePerHa: typeof data.hybridRatePerHa === 'number' ? Math.max(0, data.hybridRatePerHa) : 0,
      bonusPerMonth: typeof data.bonusPerMonth === 'number' ? Math.max(0, data.bonusPerMonth) : 0,
      commissionValue: typeof data.commissionValue === 'number' ? Math.max(0, data.commissionValue) : 0,
      fixedPerService: typeof data.fixedPerService === 'number' ? Math.max(0, data.fixedPerService) : 0,
      documents: data.documents || [],
      contractPdfUrl: data.contractPdfUrl,
      contractPdfName: data.contractPdfName,
      contractPdfSize: data.contractPdfSize,
      contractUploadDate: data.contractUploadDate,
      professionalType: data.professionalType || 'piloto',
      role: data.role || data.professionalType || 'piloto',
      cnhNumber: (data.cnhNumber || '').trim() || undefined,
      cnhCategory: data.cnhCategory,
      emergencyContact: (data.emergencyContact || '').trim() || undefined,
      admissionDate: data.admissionDate,
      hasFixedSalary: !!data.hasFixedSalary,
      hasCommission: !!data.hasCommission,
      commissionType: data.commissionType,
      authorizedDrones: data.authorizedDrones || [],
      functionTitle: data.functionTitle,
      operationalNotes: data.operationalNotes,
      notes: (data.notes || '').trim(),
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO pilots (
           id, company_id, name, cpf, phone, whatsapp, email, city, state, hire_date, status, contract_type, cnpj_mei,
           anac_code, caar_certified, caar_number, caar_validity, cnh_validity, contract_validity, commission_model,
           fixed_salary, percent_rate, rate_per_hectare, hybrid_fixed, hybrid_rate_per_ha, bonus_per_month, notes,
           total_hectares_sprayed, flight_hours, avatar_url, documents, contract_pdf_url, contract_pdf_name,
           contract_pdf_size, contract_upload_date, professional_type, role, cnh_number, cnh_category,
           emergency_contact, admission_date, has_fixed_salary, has_commission, commission_type, commission_value,
           fixed_per_service, authorized_drones, function_title, operational_notes, version
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27,
           $28, $29, $30, $31, $32, $33,
           $34, $35, $36, $37, $38, $39,
           $40, $41, $42, $43, $44, $45,
           $46, $47, $48, $49, $50
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          pilot.id,
          targetCompanyId,
          pilot.name,
          pilot.cpf,
          pilot.phone || '',
          pilot.whatsapp || '',
          pilot.email || '',
          pilot.city || '',
          pilot.state || '',
          pilot.hireDate || new Date().toISOString().split('T')[0],
          pilot.status || 'ativo',
          pilot.contractType || 'prestador_pj',
          pilot.cnpjMei || '',
          pilot.anacCode || '',
          pilot.caarCertified,
          pilot.caarNumber || '',
          pilot.caarValidity || null,
          pilot.cnhValidity || null,
          pilot.contractValidity || null,
          pilot.commissionModel || 'por_hectare',
          pilot.fixedSalary || 0,
          pilot.percentRate || 0,
          pilot.ratePerHectare || 0,
          pilot.hybridFixed || 0,
          pilot.hybridRatePerHa || 0,
          pilot.bonusPerMonth || 0,
          pilot.notes || '',
          pilot.totalHectaresSprayed || 0,
          pilot.flightHours || 0,
          pilot.avatarUrl || '',
          JSON.stringify(pilot.documents || []),
          pilot.contractPdfUrl || null,
          pilot.contractPdfName || null,
          pilot.contractPdfSize || null,
          pilot.contractUploadDate || null,
          pilot.professionalType || 'piloto',
          pilot.role || pilot.professionalType || 'piloto',
          pilot.cnhNumber || null,
          pilot.cnhCategory || null,
          pilot.emergencyContact || null,
          pilot.admissionDate || null,
          pilot.hasFixedSalary || false,
          pilot.hasCommission || false,
          pilot.commissionType || null,
          pilot.commissionValue || 0,
          pilot.fixedPerService || 0,
          JSON.stringify(pilot.authorizedDrones || []),
          pilot.functionTitle || null,
          pilot.operationalNotes || null,
          pilot.version || 1,
        ]
      );
      return pilot;
    }

    devPilots.unshift(pilot);
    return pilot;
  },

  async update(id: string, updates: Partial<Pilot>, companyId: string, tx?: DbExecutor): Promise<Pilot | null> {
    const rawCpf = updates.cpf !== undefined ? updates.cpf : undefined;
    if (rawCpf !== undefined && rawCpf !== null) {
      const cleanCpf = cleanDigits(rawCpf);
      if (cleanCpf.length > 0) {
        if (!isValidCPF(cleanCpf)) {
          throw new Error(`O CPF informado para o profissional (${rawCpf}) é inválido.`);
        }
        const existing = await this.getByCompany(companyId, tx);
        const isDuplicate = existing.some((p) => p.id !== id && cleanDigits(p.cpf) === cleanCpf);
        if (isDuplicate) {
          throw new Error('Já existe outro profissional cadastrado com este CPF nesta empresa.');
        }
      }
    }
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE pilots SET
            name = $1, cpf = $2, phone = $3, whatsapp = $4, email = $5,
            city = $6, state = $7, status = $8, contract_type = $9,
            cnpj_mei = $10, anac_code = $11, caar_certified = $12,
            caar_number = $13, caar_validity = $14, cnh_validity = $15,
            contract_validity = $16, commission_model = $17, fixed_salary = $18,
            percent_rate = $19, rate_per_hectare = $20, hybrid_fixed = $21,
            hybrid_rate_per_ha = $22, bonus_per_month = $23, notes = $24,
            total_hectares_sprayed = $25, flight_hours = $26, avatar_url = $27,
            documents = $28, contract_pdf_url = $29, contract_pdf_name = $30,
            contract_pdf_size = $31, contract_upload_date = $32, professional_type = $33,
            role = $34, cnh_number = $35, cnh_category = $36, emergency_contact = $37,
            admission_date = $38, has_fixed_salary = $39, has_commission = $40,
            commission_type = $41, commission_value = $42, fixed_per_service = $43,
            authorized_drones = $44, function_title = $45, operational_notes = $46,
            version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $47 AND company_id = $48 AND ($49::integer IS NULL OR version = $49)
         RETURNING *`,
        [
          updated.name,
          updated.cpf,
          updated.phone,
          updated.whatsapp,
          updated.email,
          updated.city,
          updated.state,
          updated.status,
          updated.contractType,
          updated.cnpjMei,
          updated.anacCode,
          updated.caarCertified,
          updated.caarNumber,
          updated.caarValidity || null,
          updated.cnhValidity || null,
          updated.contractValidity || null,
          updated.commissionModel,
          updated.fixedSalary,
          updated.percentRate,
          updated.ratePerHectare,
          updated.hybridFixed,
          updated.hybridRatePerHa,
          updated.bonusPerMonth,
          updated.notes,
          updated.totalHectaresSprayed,
          updated.flightHours,
          updated.avatarUrl,
          JSON.stringify(updated.documents || []),
          updated.contractPdfUrl || null,
          updated.contractPdfName || null,
          updated.contractPdfSize || null,
          updated.contractUploadDate || null,
          updated.professionalType || 'piloto',
          updated.role || updated.professionalType || 'piloto',
          updated.cnhNumber || null,
          updated.cnhCategory || null,
          updated.emergencyContact || null,
          updated.admissionDate || null,
          updated.hasFixedSalary || false,
          updated.hasCommission || false,
          updated.commissionType || null,
          updated.commissionValue || 0,
          updated.fixedPerService || 0,
          JSON.stringify(updated.authorizedDrones || []),
          updated.functionTitle || null,
          updated.operationalNotes || null,
          id,
          companyId,
          updates.version !== undefined ? updates.version : null,
        ]
      );
      if (res.rows.length === 0) {
        throw new ConcurrencyConflictError();
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devPilots.findIndex((p) => p.id === id && p.companyId === companyId);
    if (index === -1) return null;
    const current = devPilots[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Pilot = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devPilots[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM pilots WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devPilots.length;
    devPilots = devPilots.filter((p) => !(p.id === id && p.companyId === companyId));
    return devPilots.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 8. CROPS & FITOSSANITARIO PRODUCTS REPOSITORY
// ----------------------------------------------------------------------------
export const catalogRepository = {
  async getCrops(tx?: DbExecutor): Promise<Crop[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, name, category, standard_cycle_days as "standardCycleDays",
                common_pests as "commonPests", average_spraying_volume_l_per_ha as "averageSprayingVolumeLPerHa",
                icon
         FROM crops ORDER BY name ASC`
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          standardCycleDays: parseInt(r.standardCycleDays || 120, 10),
          averageSprayingVolumeLPerHa: parseFloat(r.averageSprayingVolumeLPerHa || 10),
          commonPests: Array.isArray(r.commonPests) ? r.commonPests : [],
        }));
      }
    }
    return devCrops;
  },

  async getProducts(tx?: DbExecutor): Promise<FitossanitarioProduct[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, commercial_name as "commercialName", manufacturer, active_ingredient as "activeIngredient",
                product_class as "productClass", formulation, mapa_registration as "mapaRegistration",
                anvisa_monograph_ref as "anvisaMonographRef", toxicological_class as "toxicologicalClass",
                environmental_class as "environmentalClass", authorized_crops as "authorizedCrops",
                target_pests as "targetPests", recommended_dose_range as "recommendedDoseRange",
                unit, default_volume_calda_l_per_ha as "defaultVolumeCaldaLPerHa",
                official_source as "officialSource", last_updated as "lastUpdated",
                regulatory_disclaimer as "regulatoryDisclaimer", status, notes
         FROM products ORDER BY commercial_name ASC`
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          defaultVolumeCaldaLPerHa: parseFloat(r.defaultVolumeCaldaLPerHa || 10),
          authorizedCrops: Array.isArray(r.authorizedCrops) ? r.authorizedCrops : [],
          targetPests: Array.isArray(r.targetPests) ? r.targetPests : [],
        }));
      }
    }
    return devProducts;
  },
};

// ----------------------------------------------------------------------------
// 9. FIELD OCCURRENCES REPOSITORY
// ----------------------------------------------------------------------------
export const occurrenceRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Occurrence[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", os_id as "osId", os_number as "osNumber",
                pilot_id as "pilotId", pilot_name as "pilotName", type, timestamp,
                description, latitude, longitude, photo_url as "photoUrl", action_taken as "actionTaken"
         FROM field_occurrences WHERE company_id = $1 ORDER BY timestamp DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        latitude: r.latitude ? parseFloat(r.latitude) : undefined,
        longitude: r.longitude ? parseFloat(r.longitude) : undefined,
      }));
    }
    return devOccurrences.filter((o) => o.companyId === companyId);
  },

  async create(data: Omit<Occurrence, 'id'> & { id?: string }, companyId: string, tx?: DbExecutor): Promise<Occurrence> {
    const id = data.id || `occ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const occ: Occurrence = {
      ...data,
      id,
      companyId,
      timestamp: data.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO field_occurrences (id, company_id, os_id, os_number, pilot_id, pilot_name, type, timestamp, description, latitude, longitude, photo_url, action_taken)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           description = EXCLUDED.description,
           photo_url = EXCLUDED.photo_url,
           timestamp = EXCLUDED.timestamp,
           action_taken = EXCLUDED.action_taken,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude`,
        [
          occ.id,
          companyId,
          occ.osId,
          occ.osNumber,
          occ.pilotId || null,
          occ.pilotName || '',
          occ.type,
          occ.timestamp,
          occ.description,
          occ.latitude || null,
          occ.longitude || null,
          occ.photoUrl || '',
          occ.actionTaken || '',
        ]
      );
      return occ;
    }

    const existingIdx = devOccurrences.findIndex((o) => o.id === occ.id && o.companyId === companyId);
    if (existingIdx >= 0) {
      devOccurrences[existingIdx] = occ;
    } else {
      devOccurrences.unshift(occ);
    }
    return occ;
  },
};
