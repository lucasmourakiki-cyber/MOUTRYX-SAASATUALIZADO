import { query, isDatabaseConfigured, DbExecutor, registerDevRollbackHook } from '../postgresClient';
import { ConcurrencyConflictError } from '../errors';
import {
  clientRepository,
  propertyRepository,
  talhaoRepository,
  pilotRepository,
  droneRepository,
} from './operationalRepositories';
import {
  Quote,
  ServiceOrder,
  ServiceStatus,
  AccountReceivable,
  AccountPayable,
  PaymentStatus,
  PilotCommissionRecord,
  ReceiptNote,
  AuditLog,
} from '../../../types';
import {
  INITIAL_QUOTES,
  INITIAL_SERVICE_ORDERS,
  INITIAL_ACCOUNTS_RECEIVABLE,
  INITIAL_ACCOUNTS_PAYABLE,
  INITIAL_PILOT_COMMISSIONS,
  INITIAL_RECEIPT_NOTES,
  INITIAL_AUDIT_LOGS,
} from '../../../data/initialData';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — FINANCIAL & COMMERCIAL REPOSITORIES
 * ============================================================================
 * Camada de acesso a dados comerciais e financeiros com suporte a transações ACID (DbExecutor)
 * e isolamento multi-tenant estrito por `companyId`.
 */

// Dev fallback stores
let devQuotes: Quote[] = [...INITIAL_QUOTES];
let devServiceOrders: ServiceOrder[] = [...INITIAL_SERVICE_ORDERS];
let devReceivables: AccountReceivable[] = [...INITIAL_ACCOUNTS_RECEIVABLE];
let devPayables: AccountPayable[] = [...INITIAL_ACCOUNTS_PAYABLE];
let devCommissions: PilotCommissionRecord[] = [...INITIAL_PILOT_COMMISSIONS];
let devReceiptNotes: ReceiptNote[] = [...INITIAL_RECEIPT_NOTES];
let devAuditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];

// Register rollback hook for atomic in-memory transactions during dev mode
registerDevRollbackHook(() => {
  const snapshotQuotes = JSON.parse(JSON.stringify(devQuotes));
  const snapshotServiceOrders = JSON.parse(JSON.stringify(devServiceOrders));
  const snapshotReceivables = JSON.parse(JSON.stringify(devReceivables));
  const snapshotPayables = JSON.parse(JSON.stringify(devPayables));
  const snapshotCommissions = JSON.parse(JSON.stringify(devCommissions));
  const snapshotReceiptNotes = JSON.parse(JSON.stringify(devReceiptNotes));
  const snapshotAuditLogs = JSON.parse(JSON.stringify(devAuditLogs));

  return {
    rollback: () => {
      devQuotes = snapshotQuotes;
      devServiceOrders = snapshotServiceOrders;
      devReceivables = snapshotReceivables;
      devPayables = snapshotPayables;
      devCommissions = snapshotCommissions;
      devReceiptNotes = snapshotReceiptNotes;
      devAuditLogs = snapshotAuditLogs;
    },
  };
});

// ----------------------------------------------------------------------------
// 10. QUOTE REPOSITORY
// ----------------------------------------------------------------------------
export const quoteRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<Quote[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, quote_number as "quoteNumber", company_id as "companyId", client_id as "clientId",
                client_name as "clientName", client_whatsapp as "clientWhatsapp", client_email as "clientEmail",
                property_id as "propertyId", property_name as "propertyName", talhao_name as "talhaoName",
                crop, area_ha as "areaHa", service_type as "serviceType", drone_model_preferred as "droneModelPreferred",
                pilot_assigned_id as "pilotAssignedId", pilot_assigned_name as "pilotAssignedName",
                price_per_ha as "pricePerHa", subtotal, displacement_fee as "displacementFee",
                discount, additional_fees as "additionalFees", tax_amount as "taxAmount",
                final_amount as "finalAmount", estimated_cost as "estimatedCost", estimated_margin as "estimatedMargin",
                estimated_margin_percent as "estimatedMarginPercent", payment_terms as "paymentTerms",
                valid_until as "validUntil", status, sent_at as "sentAt", approved_at as "approvedAt",
                notes, converted_to_os_id as "convertedToOsId", created_at as "createdAt",
                COALESCE(version, 1) as version
         FROM quotes WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        areaHa: parseFloat(r.areaHa || 0),
        pricePerHa: parseFloat(r.pricePerHa || 0),
        subtotal: parseFloat(r.subtotal || 0),
        displacementFee: parseFloat(r.displacementFee || 0),
        discount: parseFloat(r.discount || 0),
        additionalFees: parseFloat(r.additionalFees || 0),
        finalAmount: parseFloat(r.finalAmount || 0),
        estimatedCost: parseFloat(r.estimatedCost || 0),
        estimatedMargin: parseFloat(r.estimatedMargin || 0),
        estimatedMarginPercent: parseFloat(r.estimatedMarginPercent || 0),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devQuotes.filter((q) => q.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<Quote | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((q) => q.id === id) || null;
  },

  async create(data: Omit<Quote, 'id' | 'createdAt'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<Quote> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const clientId = data.clientId;
    if (!clientId) {
      throw new Error('O cliente do orçamento é obrigatório.');
    }

    const client = await clientRepository.getById(clientId, targetCompanyId, tx);
    if (!client) {
      throw new Error('Cliente informado não existe ou não pertence a esta empresa.');
    }

    const propertyId = data.propertyId;
    if (!propertyId) {
      throw new Error('A fazenda/propriedade do orçamento é obrigatória.');
    }

    const property = await propertyRepository.getById(propertyId, targetCompanyId, tx);
    if (!property) {
      throw new Error('Propriedade informada não existe ou não pertence a esta empresa.');
    }
    if (property.clientId !== clientId) {
      throw new Error('A propriedade informada não pertence ao cliente selecionado.');
    }

    const areaHa = typeof data.areaHa === 'number' ? data.areaHa : parseFloat(data.areaHa as any);
    if (isNaN(areaHa) || areaHa <= 0) {
      throw new Error('A área do orçamento deve ser maior que zero hectares.');
    }

    const pricePerHa = typeof data.pricePerHa === 'number' ? Math.max(0, data.pricePerHa) : 0;
    const displacementFee = typeof data.displacementFee === 'number' ? Math.max(0, data.displacementFee) : 0;
    const additionalFees = typeof data.additionalFees === 'number' ? Math.max(0, data.additionalFees) : 0;
    const discount = typeof data.discount === 'number' ? Math.max(0, data.discount) : 0;
    const taxAmount = typeof data.taxAmount === 'number' ? Math.max(0, data.taxAmount) : 0;
    const subtotal = areaHa * pricePerHa;
    const finalAmount = Math.max(0, subtotal + displacementFee + additionalFees - discount + taxAmount);

    let pilotAssignedName = data.pilotAssignedName || '';
    if (data.pilotAssignedId) {
      const pilot = await pilotRepository.getById(data.pilotAssignedId, targetCompanyId, tx);
      if (pilot) {
        pilotAssignedName = pilot.name;
      }
    }

    const id = data.id || `quote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const quote: Quote = {
      ...data,
      id,
      quoteNumber: data.quoteNumber || `ORC-${Date.now().toString().slice(-4)}`,
      companyId: targetCompanyId,
      clientId: client.id,
      clientName: client.name,
      clientWhatsapp: (data.clientWhatsapp || client.whatsapp || client.phone || '').trim(),
      clientEmail: (data.clientEmail || client.email || '').trim(),
      propertyId: property.id,
      propertyName: property.name,
      talhaoName: (data.talhaoName || '').trim(),
      crop: (data.crop || 'Soja').trim(),
      serviceType: data.serviceType || 'pulverizacao',
      droneModelPreferred: (data.droneModelPreferred || '').trim(),
      pilotAssignedId: data.pilotAssignedId || '',
      pilotAssignedName,
      createdAt,
      areaHa,
      pricePerHa,
      subtotal,
      displacementFee,
      discount,
      additionalFees,
      taxAmount,
      finalAmount,
      estimatedCost: typeof data.estimatedCost === 'number' ? Math.max(0, data.estimatedCost) : 0,
      estimatedMargin: typeof data.estimatedMargin === 'number' ? data.estimatedMargin : 0,
      estimatedMarginPercent: typeof data.estimatedMarginPercent === 'number' ? data.estimatedMarginPercent : 0,
      paymentTerms: data.paymentTerms || '30 dias após aplicação',
      validUntil: data.validUntil || null,
      status: data.status || 'rascunho',
      notes: (data.notes || '').trim(),
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO quotes (id, quote_number, company_id, client_id, client_name, client_whatsapp, client_email, property_id, property_name, talhao_name, crop, area_ha, service_type, drone_model_preferred, pilot_assigned_id, pilot_assigned_name, price_per_ha, subtotal, displacement_fee, discount, additional_fees, tax_amount, final_amount, estimated_cost, estimated_margin, estimated_margin_percent, payment_terms, valid_until, status, sent_at, approved_at, notes, converted_to_os_id, created_at, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
         ON CONFLICT (id) DO NOTHING`,
        [
          quote.id,
          quote.quoteNumber,
          targetCompanyId,
          quote.clientId,
          quote.clientName,
          quote.clientWhatsapp || '',
          quote.clientEmail || '',
          quote.propertyId,
          quote.propertyName,
          quote.talhaoName || '',
          quote.crop,
          quote.areaHa,
          quote.serviceType,
          quote.droneModelPreferred || '',
          quote.pilotAssignedId || '',
          quote.pilotAssignedName || '',
          quote.pricePerHa,
          quote.subtotal,
          quote.displacementFee || 0,
          quote.discount || 0,
          quote.additionalFees || 0,
          quote.taxAmount || 0,
          quote.finalAmount,
          quote.estimatedCost || 0,
          quote.estimatedMargin || 0,
          quote.estimatedMarginPercent || 0,
          quote.paymentTerms || '30 dias após aplicação',
          quote.validUntil || null,
          quote.status,
          quote.sentAt || null,
          quote.approvedAt || null,
          quote.notes || '',
          quote.convertedToOsId || null,
          quote.createdAt,
          quote.version || 1,
        ]
      );
      return quote;
    }

    devQuotes.unshift(quote);
    return quote;
  },

  async update(id: string, updates: Partial<Quote>, companyId: string, tx?: DbExecutor): Promise<Quote | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE quotes SET
            client_id = $1, client_name = $2, client_whatsapp = $3, client_email = $4,
            property_id = $5, property_name = $6, talhao_name = $7, crop = $8,
            area_ha = $9, service_type = $10, drone_model_preferred = $11, pilot_assigned_id = $12,
            pilot_assigned_name = $13, price_per_ha = $14, subtotal = $15, displacement_fee = $16,
            discount = $17, additional_fees = $18, tax_amount = $19, final_amount = $20,
            estimated_cost = $21, estimated_margin = $22, estimated_margin_percent = $23,
            payment_terms = $24, valid_until = $25, status = $26, notes = $27,
            version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $28 AND company_id = $29 AND ($30::integer IS NULL OR version = $30)
         RETURNING *`,
        [
          updated.clientId,
          updated.clientName,
          updated.clientWhatsapp || '',
          updated.clientEmail || '',
          updated.propertyId,
          updated.propertyName,
          updated.talhaoName || '',
          updated.crop,
          updated.areaHa,
          updated.serviceType,
          updated.droneModelPreferred || '',
          updated.pilotAssignedId || '',
          updated.pilotAssignedName || '',
          updated.pricePerHa,
          updated.subtotal,
          updated.displacementFee || 0,
          updated.discount || 0,
          updated.additionalFees || 0,
          updated.taxAmount || 0,
          updated.finalAmount,
          updated.estimatedCost || 0,
          updated.estimatedMargin || 0,
          updated.estimatedMarginPercent || 0,
          updated.paymentTerms || '30 dias após aplicação',
          updated.validUntil || null,
          updated.status,
          updated.notes || '',
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

    const index = devQuotes.findIndex((item) => item.id === id && item.companyId === companyId);
    if (index === -1) return null;
    const current = devQuotes[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: Quote = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devQuotes[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM quotes WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devQuotes.length;
    devQuotes = devQuotes.filter((q) => !(q.id === id && q.companyId === companyId));
    return devQuotes.length < initialLen;
  },

  async updateStatus(
    id: string,
    status: Quote['status'],
    companyId: string,
    extra?: { approvedAt?: string; sentAt?: string; convertedToOsId?: string; version?: number; currentVersion?: number },
    tx?: DbExecutor
  ): Promise<Quote | null> {
    const targetVersion = extra?.version !== undefined ? extra.version : extra?.currentVersion;
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE quotes SET
            status = $1,
            approved_at = COALESCE($2, approved_at),
            sent_at = COALESCE($3, sent_at),
            converted_to_os_id = COALESCE($4, converted_to_os_id),
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND company_id = $6 AND ($7::integer IS NULL OR version = $7)
         RETURNING *`,
        [status, extra?.approvedAt || null, extra?.sentAt || null, extra?.convertedToOsId || null, id, companyId, targetVersion !== undefined ? targetVersion : null]
      );
      if (res.rows.length === 0) {
        if (targetVersion !== undefined) {
          const exists = await this.getById(id, companyId, tx);
          if (exists) {
            throw new ConcurrencyConflictError();
          }
        }
        return null;
      }
      return this.getById(id, companyId, tx);
    }

    const q = devQuotes.find((item) => item.id === id && item.companyId === companyId);
    if (!q) return null;
    if (targetVersion !== undefined && q.version !== undefined && targetVersion !== q.version) {
      throw new ConcurrencyConflictError();
    }
    q.status = status;
    if (extra?.approvedAt) q.approvedAt = extra.approvedAt;
    if (extra?.sentAt) q.sentAt = extra.sentAt;
    if (extra?.convertedToOsId) q.convertedToOsId = extra.convertedToOsId;
    q.version = (q.version || 1) + 1;
    return { ...q };
  },
};

// ----------------------------------------------------------------------------
// 11. SERVICE ORDER REPOSITORY
// ----------------------------------------------------------------------------
export const serviceOrderRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<ServiceOrder[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, os_number as "osNumber", company_id as "companyId", quote_id as "quoteId",
                client_id as "clientId", client_name as "clientName", client_whatsapp as "clientWhatsapp",
                property_id as "propertyId", property_name as "propertyName", property_lat as "propertyLat",
                property_lng as "propertyLng", talhao_id as "talhaoId", talhao_name as "talhaoName",
                crop, area_ha as "areaHa", service_type as "serviceType", scheduled_date as "scheduledDate",
                scheduled_time as "scheduledTime", completed_date as "completedDate", status,
                pilot_id as "pilotId", pilot_name as "pilotName", drone_id as "droneId",
                drone_model as "droneModel", products, application_parameters as "applicationParameters", weather_conditions as "weatherConditions",
                flight_height_meters as "flightHeightMeters", flight_speed_ms as "flightSpeedMs",
                flight_hours_recorded as "flightHoursRecorded", battery_cycles_used as "batteryCyclesUsed",
                actual_area_sprayed_ha as "actualAreaSprayedHa", price_per_ha as "pricePerHa",
                gross_amount as "grossAmount", displacement_fee as "displacementFee",
                additional_fees as "additionalFees", discount, final_amount as "finalAmount",
                estimated_cost as "estimatedCost", net_margin as "netMargin", payment_terms as "paymentTerms",
                calculated_pilot_commission as "calculatedPilotCommission", commission_status as "commissionStatus",
                commission_paid_date as "commissionPaidDate", client_signed as "clientSigned",
                client_sign_date as "clientSignDate", client_sign_name as "clientSignName",
                notes, field_occurrences_count as "fieldOccurrencesCount",
                COALESCE(version, 1) as version
         FROM service_orders WHERE company_id = $1 ORDER BY scheduled_date DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        areaHa: parseFloat(r.areaHa || 0),
        actualAreaSprayedHa: r.actualAreaSprayedHa ? parseFloat(r.actualAreaSprayedHa) : undefined,
        pricePerHa: parseFloat(r.pricePerHa || 0),
        grossAmount: parseFloat(r.grossAmount || 0),
        finalAmount: parseFloat(r.finalAmount || 0),
        estimatedCost: parseFloat(r.estimatedCost || 0),
        netMargin: parseFloat(r.netMargin || 0),
        calculatedPilotCommission: parseFloat(r.calculatedPilotCommission || 0),
        propertyCoords: {
          lat: parseFloat(r.propertyLat || 0),
          lng: parseFloat(r.propertyLng || 0),
        },
        products: Array.isArray(r.products) ? r.products : [],
        applicationParameters: r.applicationParameters
          ? (typeof r.applicationParameters === 'string' ? JSON.parse(r.applicationParameters) : r.applicationParameters)
          : undefined,
        weatherConditions: r.weatherConditions
          ? (typeof r.weatherConditions === 'string' ? JSON.parse(r.weatherConditions) : r.weatherConditions)
          : undefined,
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devServiceOrders.filter((os) => os.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<ServiceOrder | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((os) => os.id === id) || null;
  },

  async create(data: Omit<ServiceOrder, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<ServiceOrder> {
    const targetCompanyId = companyId || data.companyId || '';
    if (!targetCompanyId) {
      throw new Error('Identificação da empresa (companyId) é obrigatória.');
    }

    const clientId = data.clientId;
    if (!clientId) {
      throw new Error('O cliente da ordem de serviço é obrigatório.');
    }

    const client = await clientRepository.getById(clientId, targetCompanyId, tx);
    if (!client) {
      throw new Error('Cliente informado não existe ou não pertence a esta empresa.');
    }

    const propertyId = data.propertyId;
    if (!propertyId) {
      throw new Error('A fazenda/propriedade da ordem de serviço é obrigatória.');
    }

    const property = await propertyRepository.getById(propertyId, targetCompanyId, tx);
    if (!property) {
      throw new Error('Propriedade informada não existe ou não pertence a esta empresa.');
    }
    if (property.clientId !== clientId) {
      throw new Error('A propriedade informada não pertence ao cliente selecionado.');
    }

    let talhaoName = data.talhaoName || '';
    if (data.talhaoId) {
      const talhao = await talhaoRepository.getById(data.talhaoId, targetCompanyId, tx);
      if (!talhao) {
        throw new Error('Talhão informado não existe ou não pertence a esta empresa.');
      }
      if (talhao.propertyId !== propertyId) {
        throw new Error('O talhão informado não pertence à fazenda/propriedade selecionada.');
      }
      talhaoName = talhao.name;
    }

    let pilotName = data.pilotName || '';
    if (data.pilotId) {
      const pilot = await pilotRepository.getById(data.pilotId, targetCompanyId, tx);
      if (!pilot) {
        throw new Error('Piloto informado não existe ou não pertence a esta empresa.');
      }
      pilotName = pilot.name;
    }

    let droneModel = data.droneModel || '';
    if (data.droneId) {
      const drone = await droneRepository.getById(data.droneId, targetCompanyId, tx);
      if (!drone) {
        throw new Error('Drone informado não existe ou não pertence a esta empresa.');
      }
      droneModel = drone.model;
    }

    const areaHa = typeof data.areaHa === 'number' ? data.areaHa : parseFloat(data.areaHa as any);
    if (isNaN(areaHa) || areaHa <= 0) {
      throw new Error('A área planejada da OS deve ser maior que zero hectares.');
    }

    const pricePerHa = typeof data.pricePerHa === 'number' ? Math.max(0, data.pricePerHa) : 0;
    const displacementFee = typeof data.displacementFee === 'number' ? Math.max(0, data.displacementFee) : 0;
    const additionalFees = typeof data.additionalFees === 'number' ? Math.max(0, data.additionalFees) : 0;
    const discount = typeof data.discount === 'number' ? Math.max(0, data.discount) : 0;
    const grossAmount = areaHa * pricePerHa;
    const finalAmount = Math.max(0, grossAmount + displacementFee + additionalFees - discount);
    const scheduledDate = data.scheduledDate || new Date().toISOString().split('T')[0];

    const rawStatus = (data.status as string) || 'agendado';
    const status: ServiceStatus =
      rawStatus === 'concluida' || rawStatus === 'concluido'
        ? 'concluido'
        : rawStatus === 'agendada' || rawStatus === 'agendado'
        ? 'agendado'
        : (rawStatus as ServiceStatus);

    const actualAreaSprayedHa =
      typeof data.actualAreaSprayedHa === 'number' && data.actualAreaSprayedHa > 0
        ? data.actualAreaSprayedHa
        : undefined;

    const id = data.id || `os-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const os: ServiceOrder = {
      ...data,
      id,
      osNumber: data.osNumber || `OS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      companyId: targetCompanyId,
      clientId: client.id,
      clientName: client.name,
      clientWhatsapp: (data.clientWhatsapp || client.whatsapp || client.phone || '').trim(),
      propertyId: property.id,
      propertyName: property.name,
      propertyCoords: data.propertyCoords || {
        lat: property.latitude || 0,
        lng: property.longitude || 0,
      },
      talhaoId: data.talhaoId || undefined,
      talhaoName: talhaoName.trim(),
      crop: (data.crop || (data as any).cropName || 'Milho').trim(),
      serviceType: data.serviceType || 'pulverizacao',
      scheduledDate,
      scheduledTime: data.scheduledTime || '08:00',
      completedDate: data.completedDate || null,
      status,
      pilotId: data.pilotId || undefined,
      pilotName: pilotName.trim(),
      droneId: data.droneId || undefined,
      droneModel: droneModel.trim(),
      products: data.products || [],
      applicationParameters: data.applicationParameters,
      weatherConditions: data.weatherConditions,
      flightHeightMeters: typeof data.flightHeightMeters === 'number' ? data.flightHeightMeters : 3.5,
      flightSpeedMs: typeof data.flightSpeedMs === 'number' ? data.flightSpeedMs : 6.0,
      flightHoursRecorded: typeof data.flightHoursRecorded === 'number' ? Math.max(0, data.flightHoursRecorded) : 0,
      batteryCyclesUsed: typeof data.batteryCyclesUsed === 'number' ? Math.max(0, data.batteryCyclesUsed) : 0,
      actualAreaSprayedHa,
      areaHa,
      pricePerHa,
      grossAmount,
      displacementFee,
      additionalFees,
      discount,
      finalAmount,
      estimatedCost: typeof data.estimatedCost === 'number' ? Math.max(0, data.estimatedCost) : 0,
      netMargin: typeof data.netMargin === 'number' ? data.netMargin : 0,
      paymentTerms: data.paymentTerms || '30 dias após aplicação',
      calculatedPilotCommission: typeof data.calculatedPilotCommission === 'number' ? data.calculatedPilotCommission : 0,
      commissionStatus: data.commissionStatus || 'prevista',
      commissionPaidDate: data.commissionPaidDate || null,
      clientSigned: !!data.clientSigned,
      clientSignDate: data.clientSignDate || null,
      clientSignName: (data.clientSignName || '').trim(),
      notes: (data.notes || '').trim(),
      fieldOccurrencesCount: typeof data.fieldOccurrencesCount === 'number' ? data.fieldOccurrencesCount : 0,
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO service_orders (id, os_number, company_id, quote_id, client_id, client_name, client_whatsapp, property_id, property_name, property_lat, property_lng, talhao_id, talhao_name, crop, area_ha, service_type, scheduled_date, scheduled_time, completed_date, status, pilot_id, pilot_name, drone_id, drone_model, products, application_parameters, weather_conditions, flight_height_meters, flight_speed_ms, flight_hours_recorded, battery_cycles_used, actual_area_sprayed_ha, price_per_ha, gross_amount, displacement_fee, additional_fees, discount, final_amount, estimated_cost, net_margin, payment_terms, calculated_pilot_commission, commission_status, commission_paid_date, client_signed, client_sign_date, client_sign_name, notes, field_occurrences_count, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)
         ON CONFLICT (id) DO NOTHING`,
        [
          os.id,
          os.osNumber,
          targetCompanyId,
          os.quoteId || null,
          os.clientId,
          os.clientName,
          os.clientWhatsapp || '',
          os.propertyId,
          os.propertyName,
          os.propertyCoords?.lat || 0,
          os.propertyCoords?.lng || 0,
          os.talhaoId || null,
          os.talhaoName || '',
          os.crop,
          os.areaHa,
          os.serviceType,
          os.scheduledDate,
          os.scheduledTime || '08:00',
          os.completedDate || null,
          os.status,
          os.pilotId || '',
          os.pilotName || '',
          os.droneId || '',
          os.droneModel || '',
          JSON.stringify(os.products || []),
          os.applicationParameters ? JSON.stringify(os.applicationParameters) : null,
          os.weatherConditions ? JSON.stringify(os.weatherConditions) : null,
          os.flightHeightMeters || 3.5,
          os.flightSpeedMs || 6.0,
          os.flightHoursRecorded || 0,
          os.batteryCyclesUsed || 0,
          os.actualAreaSprayedHa || null,
          os.pricePerHa,
          os.grossAmount,
          os.displacementFee || 0,
          os.additionalFees || 0,
          os.discount || 0,
          os.finalAmount,
          os.estimatedCost || 0,
          os.netMargin || 0,
          os.paymentTerms || '30 dias após aplicação',
          os.calculatedPilotCommission || 0,
          os.commissionStatus || 'prevista',
          os.commissionPaidDate || null,
          os.clientSigned || false,
          os.clientSignDate || null,
          os.clientSignName || '',
          os.notes || '',
          os.fieldOccurrencesCount || 0,
          os.version || 1,
        ]
      );
      return os;
    }

    devServiceOrders.unshift(os);
    return os;
  },

  async update(id: string, updates: Partial<ServiceOrder>, companyId: string, tx?: DbExecutor): Promise<ServiceOrder | null> {
    if (isDatabaseConfigured()) {
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated: ServiceOrder = { ...current, ...updates, version: (current.version || 1) + 1 };

      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE service_orders SET
            quote_id = $1, client_id = $2, client_name = $3, client_whatsapp = $4,
            property_id = $5, property_name = $6, property_lat = $7, property_lng = $8,
            talhao_id = $9, talhao_name = $10, crop = $11, area_ha = $12, service_type = $13,
            scheduled_date = $14, scheduled_time = $15, completed_date = $16, status = $17,
            pilot_id = $18, pilot_name = $19, drone_id = $20, drone_model = $21, products = $22,
            application_parameters = $23, weather_conditions = $24, flight_height_meters = $25, flight_speed_ms = $26,
            flight_hours_recorded = $27, battery_cycles_used = $28, actual_area_sprayed_ha = $29,
            price_per_ha = $30, gross_amount = $31, displacement_fee = $32, additional_fees = $33,
            discount = $34, final_amount = $35, estimated_cost = $36, net_margin = $37,
            payment_terms = $38, calculated_pilot_commission = $39, commission_status = $40,
            commission_paid_date = $41, client_signed = $42, client_sign_date = $43,
            client_sign_name = $44, notes = $45, field_occurrences_count = $46,
            version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $47 AND company_id = $48 AND ($49::integer IS NULL OR version = $49)
         RETURNING *`,
        [
          updated.quoteId || null,
          updated.clientId,
          updated.clientName,
          updated.clientWhatsapp || '',
          updated.propertyId,
          updated.propertyName,
          updated.propertyCoords?.lat || 0,
          updated.propertyCoords?.lng || 0,
          updated.talhaoId || null,
          updated.talhaoName || '',
          updated.crop,
          updated.areaHa,
          updated.serviceType,
          updated.scheduledDate,
          updated.scheduledTime || '08:00',
          updated.completedDate || null,
          updated.status,
          updated.pilotId || '',
          updated.pilotName,
          updated.droneId || '',
          updated.droneModel,
          JSON.stringify(updated.products || []),
          updated.applicationParameters ? JSON.stringify(updated.applicationParameters) : null,
          updated.weatherConditions ? JSON.stringify(updated.weatherConditions) : null,
          updated.flightHeightMeters || 3.5,
          updated.flightSpeedMs || 6.0,
          updated.flightHoursRecorded || 0,
          updated.batteryCyclesUsed || 0,
          updated.actualAreaSprayedHa || null,
          updated.pricePerHa,
          updated.grossAmount,
          updated.displacementFee || 0,
          updated.additionalFees || 0,
          updated.discount || 0,
          updated.finalAmount,
          updated.estimatedCost || 0,
          updated.netMargin || 0,
          updated.paymentTerms || '30 dias após aplicação',
          updated.calculatedPilotCommission || 0,
          updated.commissionStatus || 'prevista',
          updated.commissionPaidDate || null,
          updated.clientSigned || false,
          updated.clientSignDate || null,
          updated.clientSignName || '',
          updated.notes || '',
          updated.fieldOccurrencesCount || 0,
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

    const index = devServiceOrders.findIndex((os) => os.id === id && os.companyId === companyId);
    if (index === -1) return null;
    const current = devServiceOrders[index];
    if (updates.version !== undefined && current.version !== undefined && updates.version !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: ServiceOrder = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
    };
    devServiceOrders[index] = updated;
    return updated;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM service_orders WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devServiceOrders.length;
    devServiceOrders = devServiceOrders.filter((os) => !(os.id === id && os.companyId === companyId));
    return devServiceOrders.length < initialLen;
  },

  async updateStatus(
    id: string,
    status: ServiceOrder['status'],
    companyId: string,
    extra?: Partial<ServiceOrder> & { version?: number; currentVersion?: number },
    tx?: DbExecutor
  ): Promise<ServiceOrder | null> {
    const targetVersion = extra?.version !== undefined ? extra.version : extra?.currentVersion;
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const current = await this.getById(id, companyId, tx);
      if (!current) return null;
      if (targetVersion !== undefined && current.version !== undefined && targetVersion !== current.version) {
        throw new ConcurrencyConflictError();
      }
      const updated: ServiceOrder = { ...current, ...extra, status, version: (current.version || 1) + 1 };

      const res = await dbQuery(
        `UPDATE service_orders SET
            status = $1, completed_date = $2, actual_area_sprayed_ha = $3,
            flight_hours_recorded = $4, battery_cycles_used = $5,
            notes = $6, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND company_id = $8 AND ($9::integer IS NULL OR version = $9)
         RETURNING *`,
        [
          updated.status,
          updated.completedDate || null,
          updated.actualAreaSprayedHa || null,
          updated.flightHoursRecorded || 0,
          updated.batteryCyclesUsed || 0,
          updated.notes || '',
          id,
          companyId,
          targetVersion !== undefined ? targetVersion : null,
        ]
      );
      if (res.rows.length === 0) {
        if (targetVersion !== undefined) {
          throw new ConcurrencyConflictError();
        }
        return null;
      }
      return {
        ...updated,
        version: res.rows[0].version ? parseInt(res.rows[0].version, 10) : updated.version,
      };
    }

    const index = devServiceOrders.findIndex((os) => os.id === id && os.companyId === companyId);
    if (index === -1) return null;
    const current = devServiceOrders[index];
    if (targetVersion !== undefined && current.version !== undefined && targetVersion !== current.version) {
      throw new ConcurrencyConflictError();
    }
    const updated: ServiceOrder = {
      ...current,
      ...extra,
      status,
      version: (current.version || 1) + 1,
    };
    devServiceOrders[index] = updated;
    return updated;
  },
};

// ----------------------------------------------------------------------------
// 12. ACCOUNTS RECEIVABLE REPOSITORY
// ----------------------------------------------------------------------------
export const receivableRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<AccountReceivable[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", client_id as "clientId", client_name as "clientName",
                os_id as "osId", os_number as "osNumber", description, amount, due_date as "dueDate",
                payment_date as "paymentDate", status, payment_method as "paymentMethod",
                proof_document_url as "proofDocumentUrl", receipt_number as "receiptNumber", notes,
                COALESCE(version, 1) as version
         FROM accounts_receivable WHERE company_id = $1 ORDER BY due_date ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        amount: parseFloat(r.amount || 0),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devReceivables.filter((r) => r.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<AccountReceivable | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((r) => r.id === id) || null;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM accounts_receivable WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devReceivables.length;
    devReceivables = devReceivables.filter((r) => !(r.id === id && r.companyId === companyId));
    return devReceivables.length < initialLen;
  },

  async create(data: Omit<AccountReceivable, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<AccountReceivable> {
    const id = data.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetCompanyId = companyId || data.companyId || '';
    const rawStatus = (data.status as string) || 'aberto';
    const normalizedStatus: PaymentStatus =
      rawStatus === 'pendente' || rawStatus === 'aberto'
        ? 'aberto'
        : rawStatus === 'pago' || rawStatus === 'recebido'
        ? 'pago'
        : (rawStatus as PaymentStatus);

    const rec: AccountReceivable = {
      ...data,
      id,
      companyId: targetCompanyId,
      description: data.description || (data.osNumber ? `Serviço Aeroagrícola OS ${data.osNumber}` : 'Prestação de Serviços de Pulverização'),
      osId: data.osId || (data as any).serviceOrderId || null,
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      status: normalizedStatus,
      amount: data.amount || 0,
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO accounts_receivable (id, company_id, client_id, client_name, os_id, os_number, description, amount, due_date, payment_date, status, payment_method, proof_document_url, receipt_number, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          rec.id,
          targetCompanyId,
          rec.clientId || null,
          rec.clientName,
          rec.osId || null,
          rec.osNumber || '',
          rec.description,
          rec.amount,
          rec.dueDate,
          rec.paymentDate || null,
          rec.status,
          rec.paymentMethod || 'boleto',
          rec.proofDocumentUrl || '',
          rec.receiptNumber || '',
          rec.notes || '',
          rec.version || 1,
        ]
      );
      return rec;
    }

    devReceivables.unshift(rec);
    return rec;
  },

  async settle(id: string, paymentMethod: string, companyId: string, currentVersion?: number, tx?: DbExecutor): Promise<AccountReceivable | null> {
    const today = new Date().toISOString().split('T')[0];
    const validPaymentMethod = ['pix', 'transferencia', 'boleto', 'cartao', 'dinheiro'].includes(paymentMethod?.toLowerCase())
      ? paymentMethod.toLowerCase()
      : 'pix';

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE accounts_receivable SET
            status = 'pago', payment_date = $1, payment_method = $2, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND company_id = $4 AND ($5::integer IS NULL OR version = $5) RETURNING *`,
        [today, validPaymentMethod, id, companyId, currentVersion !== undefined ? currentVersion : null]
      );
      if (res.rows.length === 0) {
        if (currentVersion !== undefined) throw new ConcurrencyConflictError();
        return null;
      }
      const row = res.rows[0];
      return {
        id: row.id,
        companyId: row.company_id || row.companyId || companyId,
        clientId: row.client_id || row.clientId,
        clientName: row.client_name || row.clientName,
        osId: row.os_id || row.osId,
        osNumber: row.os_number || row.osNumber,
        description: row.description,
        amount: parseFloat(row.amount),
        dueDate: row.due_date || row.dueDate,
        paymentDate: today,
        status: 'pago',
        paymentMethod: validPaymentMethod as any,
        proofDocumentUrl: row.proof_document_url || row.proofDocumentUrl,
        receiptNumber: row.receipt_number || row.receiptNumber,
        notes: row.notes,
        version: parseInt(row.version || 1, 10),
      };
    }

    const target = devReceivables.find((r) => r.id === id && r.companyId === companyId);
    if (target) {
      if (currentVersion !== undefined && target.version !== undefined && currentVersion !== target.version) {
        throw new ConcurrencyConflictError();
      }
      target.status = 'pago';
      target.paymentDate = today;
      target.paymentMethod = paymentMethod as any;
      target.version = (target.version || 1) + 1;
      return target;
    }
    return null;
  },
};

// ----------------------------------------------------------------------------
// 13. ACCOUNTS PAYABLE REPOSITORY
// ----------------------------------------------------------------------------
export const payableRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<AccountPayable[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", cost_center as "costCenter", supplier_name as "supplierName",
                description, amount, due_date as "dueDate", payment_date as "paymentDate",
                status, payment_method as "paymentMethod", drone_id as "droneId", pilot_id as "pilotId",
                is_recurring as "isRecurring", proof_document_url as "proofDocumentUrl", notes,
                COALESCE(version, 1) as version
         FROM accounts_payable WHERE company_id = $1 ORDER BY due_date ASC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        amount: parseFloat(r.amount || 0),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devPayables.filter((p) => p.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<AccountPayable | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((p) => p.id === id) || null;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM accounts_payable WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devPayables.length;
    devPayables = devPayables.filter((p) => !(p.id === id && p.companyId === companyId));
    return devPayables.length < initialLen;
  },

  async create(data: Omit<AccountPayable, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<AccountPayable> {
    const id = data.id || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetCompanyId = companyId || data.companyId || '';
    const pay: AccountPayable = {
      ...data,
      id,
      companyId: targetCompanyId,
      supplierName: data.supplierName || 'Fornecedor Operacional',
      costCenter: data.costCenter || 'outros',
      description: data.description || 'Despesa Operacional',
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      status: data.status || 'aberto',
      amount: data.amount || 0,
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO accounts_payable (id, company_id, cost_center, supplier_name, description, amount, due_date, payment_date, status, payment_method, drone_id, pilot_id, is_recurring, proof_document_url, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          pay.id,
          targetCompanyId,
          pay.costCenter,
          pay.supplierName,
          pay.description,
          pay.amount,
          pay.dueDate,
          pay.paymentDate || null,
          pay.status,
          pay.paymentMethod || 'pix',
          pay.droneId || null,
          pay.pilotId || null,
          pay.isRecurring || false,
          pay.proofDocumentUrl || '',
          pay.notes || '',
          pay.version || 1,
        ]
      );
      return pay;
    }

    devPayables.unshift(pay);
    return pay;
  },

  async settle(id: string, companyId: string, currentVersion?: number, tx?: DbExecutor): Promise<AccountPayable | null> {
    const today = new Date().toISOString().split('T')[0];

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE accounts_payable SET status = 'pago', payment_date = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3 AND ($4::integer IS NULL OR version = $4) RETURNING *`,
        [today, id, companyId, currentVersion !== undefined ? currentVersion : null]
      );
      if (res.rows.length === 0) {
        if (currentVersion !== undefined) throw new ConcurrencyConflictError();
        return null;
      }
      const row = res.rows[0];
      return {
        id: row.id,
        companyId: row.company_id || row.companyId || companyId,
        costCenter: row.cost_center || row.costCenter,
        supplierName: row.supplier_name || row.supplierName,
        description: row.description,
        amount: parseFloat(row.amount),
        dueDate: row.due_date || row.dueDate,
        paymentDate: today,
        status: 'pago',
        paymentMethod: row.payment_method || row.paymentMethod || 'pix',
        droneId: row.drone_id || row.droneId,
        pilotId: row.pilot_id || row.pilotId,
        isRecurring: row.is_recurring !== undefined ? row.is_recurring : row.isRecurring,
        proofDocumentUrl: row.proof_document_url || row.proofDocumentUrl,
        notes: row.notes,
        version: parseInt(row.version || 1, 10),
      };
    }

    const target = devPayables.find((p) => p.id === id && p.companyId === companyId);
    if (target) {
      if (currentVersion !== undefined && target.version !== undefined && currentVersion !== target.version) {
        throw new ConcurrencyConflictError();
      }
      target.status = 'pago';
      target.paymentDate = today;
      target.version = (target.version || 1) + 1;
      return target;
    }
    return null;
  },
};

// ----------------------------------------------------------------------------
// 14. PILOT COMMISSION REPOSITORY
// ----------------------------------------------------------------------------
export const commissionRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<PilotCommissionRecord[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", pilot_id as "pilotId", pilot_name as "pilotName",
                os_id as "osId", os_number as "osNumber", client_name as "clientName",
                service_date as "serviceDate", area_sprayed_ha as "areaSprayedHa",
                service_amount as "serviceAmount", commission_rule_applied as "commissionRuleApplied",
                commission_amount as "commissionAmount", status, client_paid_date as "clientPaidDate",
                released_date as "releasedDate", approved_date as "approvedDate", paid_date as "paidDate",
                notes, COALESCE(version, 1) as version
         FROM pilot_commissions WHERE company_id = $1 ORDER BY service_date DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        areaSprayedHa: parseFloat(r.areaSprayedHa || 0),
        serviceAmount: parseFloat(r.serviceAmount || 0),
        commissionAmount: parseFloat(r.commissionAmount || 0),
        version: parseInt(r.version || 1, 10),
      }));
    }
    return devCommissions.filter((c) => c.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<PilotCommissionRecord | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((c) => c.id === id) || null;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM pilot_commissions WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devCommissions.length;
    devCommissions = devCommissions.filter((c) => !(c.id === id && c.companyId === companyId));
    return devCommissions.length < initialLen;
  },

  async create(data: Omit<PilotCommissionRecord, 'id'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<PilotCommissionRecord> {
    const id = data.id || `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetCompanyId = companyId || data.companyId || '';
    const validStatus =
      data.status === 'liberada' || data.status === 'aprovada' || data.status === 'paga' || data.status === 'aguardando_pagamento_cliente'
        ? data.status
        : 'prevista';

    const comm: PilotCommissionRecord = {
      ...data,
      id,
      companyId: targetCompanyId,
      osId: data.osId || (data as any).serviceOrderId || '',
      osNumber: data.osNumber || '',
      clientName: data.clientName || 'Cliente Operacional',
      serviceDate: data.serviceDate || new Date().toISOString().split('T')[0],
      areaSprayedHa: data.areaSprayedHa || (data as any).hectaresSprayed || 0,
      serviceAmount: data.serviceAmount || (data as any).baseAmount || 0,
      commissionRuleApplied: data.commissionRuleApplied || 'por_hectare',
      commissionAmount: data.commissionAmount || 0,
      status: validStatus,
      version: 1,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO pilot_commissions (id, company_id, pilot_id, pilot_name, os_id, os_number, client_name, service_date, area_sprayed_ha, service_amount, commission_rule_applied, commission_amount, status, client_paid_date, released_date, approved_date, paid_date, notes, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO NOTHING`,
        [
          comm.id,
          targetCompanyId,
          comm.pilotId,
          comm.pilotName,
          comm.osId,
          comm.osNumber,
          comm.clientName,
          comm.serviceDate,
          comm.areaSprayedHa,
          comm.serviceAmount,
          comm.commissionRuleApplied,
          comm.commissionAmount,
          comm.status,
          comm.clientPaidDate || null,
          comm.releasedDate || null,
          comm.approvedDate || null,
          comm.paidDate || null,
          comm.notes || '',
          comm.version || 1,
        ]
      );
      return comm;
    }

    devCommissions.unshift(comm);
    return comm;
  },

  async updateStatus(id: string, status: PilotCommissionRecord['status'], companyId: string, currentVersion?: number, tx?: DbExecutor): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE pilot_commissions SET
            status = $1::varchar,
            approved_date = CASE WHEN $1::varchar = 'aprovada' THEN $2::date ELSE approved_date END,
            paid_date = CASE WHEN $1::varchar = 'paga' THEN $2::date ELSE paid_date END,
            released_date = CASE WHEN $1::varchar = 'liberada' THEN $2::date ELSE released_date END,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND company_id = $4 AND ($5::integer IS NULL OR version = $5)`,
        [status, today, id, companyId, currentVersion !== undefined ? currentVersion : null]
      );
      if (res.rowCount === 0 && currentVersion !== undefined) {
        throw new ConcurrencyConflictError();
      }
      return (res.rowCount || 0) > 0;
    }

    const comm = devCommissions.find((c) => c.id === id && c.companyId === companyId);
    if (comm) {
      if (currentVersion !== undefined && comm.version !== undefined && currentVersion !== comm.version) {
        throw new ConcurrencyConflictError();
      }
      comm.status = status;
      if (status === 'aprovada') comm.approvedDate = today;
      if (status === 'paga') comm.paidDate = today;
      if (status === 'liberada') comm.releasedDate = today;
      comm.version = (comm.version || 1) + 1;
      return true;
    }
    return false;
  },
};

// ----------------------------------------------------------------------------
// 15. RECEIPT NOTES REPOSITORY
// ----------------------------------------------------------------------------
export const receiptNoteRepository = {
  async getByCompany(companyId: string, tx?: DbExecutor): Promise<ReceiptNote[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", pilot_id as "pilotId", pilot_name as "pilotName",
                date, time, establishment_name as "establishmentName", cnpj, category,
                total_amount as "totalAmount", payment_method as "paymentMethod",
                reimbursement_status as "reimbursementStatus", related_os_id as "relatedOsId",
                related_os_number as "relatedOsNumber", related_property_name as "relatedPropertyName",
                fuel_details as "fuelDetails", items, image_url as "imageUrl",
                confidence_score as "confidenceScore", notes, approved_date as "approvedDate",
                reimbursed_date as "reimbursedDate", created_at as "createdAt"
         FROM receipt_notes WHERE company_id = $1 ORDER BY date DESC`,
        [companyId]
      );
      return res.rows.map((r: any) => ({
        ...r,
        totalAmount: parseFloat(r.totalAmount || 0),
        confidenceScore: parseFloat(r.confidenceScore || 100),
        items: Array.isArray(r.items) ? r.items : [],
      }));
    }
    return devReceiptNotes.filter((n) => n.companyId === companyId);
  },

  async getById(id: string, companyId: string, tx?: DbExecutor): Promise<ReceiptNote | null> {
    const list = await this.getByCompany(companyId, tx);
    return list.find((n) => n.id === id) || null;
  },

  async create(data: Omit<ReceiptNote, 'id' | 'createdAt'> & { id?: string; companyId?: string }, companyId?: string, tx?: DbExecutor): Promise<ReceiptNote> {
    const id = data.id || `not-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    const targetCompanyId = companyId || data.companyId || '';
    const note: ReceiptNote = {
      ...data,
      id,
      companyId: targetCompanyId,
      createdAt,
      totalAmount: data.totalAmount || 0,
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO receipt_notes (id, company_id, pilot_id, pilot_name, date, time, establishment_name, cnpj, category, total_amount, payment_method, reimbursement_status, related_os_id, related_os_number, related_property_name, fuel_details, items, image_url, confidence_score, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (id) DO NOTHING`,
        [
          note.id,
          targetCompanyId,
          note.pilotId || '',
          note.pilotName || 'Piloto',
          note.date,
          note.time || '',
          note.establishmentName || (note as any).establishment || 'Estabelecimento Comercial',
          note.cnpj || '',
          note.category,
          note.totalAmount,
          note.paymentMethod || 'pix_piloto',
          note.reimbursementStatus || 'pendente',
          note.relatedOsId || null,
          note.relatedOsNumber || '',
          note.relatedPropertyName || '',
          JSON.stringify(note.fuelDetails || null),
          JSON.stringify(note.items || []),
          note.imageUrl || '',
          note.confidenceScore || 100,
          note.notes || '',
          note.createdAt,
        ]
      );
      return note;
    }

    devReceiptNotes.unshift(note);
    return note;
  },

  async updateReimbursement(id: string, status: ReceiptNote['reimbursementStatus'], companyId: string, currentVersion?: number, tx?: DbExecutor): Promise<boolean> {
    const now = new Date().toISOString();

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `UPDATE receipt_notes SET
            reimbursement_status = $1::varchar,
            approved_date = CASE WHEN $1::varchar = 'aprovado' THEN $2::timestamptz ELSE approved_date END,
            reimbursed_date = CASE WHEN $1::varchar = 'reembolsado' THEN $2::timestamptz ELSE reimbursed_date END,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND company_id = $4`,
        [status, now, id, companyId]
      );
      return (res.rowCount || 0) > 0;
    }

    const note = devReceiptNotes.find((n) => n.id === id && n.companyId === companyId);
    if (note) {
      note.reimbursementStatus = status;
      if (status === 'aprovado') note.approvedDate = now;
      if (status === 'reembolsado') note.reimbursedDate = now;
      return true;
    }
    return false;
  },

  async delete(id: string, companyId: string, tx?: DbExecutor): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(`DELETE FROM receipt_notes WHERE id = $1 AND company_id = $2`, [id, companyId]);
      return (res.rowCount || 0) > 0;
    }
    const initialLen = devReceiptNotes.length;
    devReceiptNotes = devReceiptNotes.filter((n) => !(n.id === id && n.companyId === companyId));
    return devReceiptNotes.length < initialLen;
  },
};

// ----------------------------------------------------------------------------
// 16. AUDIT LOG REPOSITORY
// ----------------------------------------------------------------------------
export const auditLogRepository = {
  async getByCompany(companyId: string, limit: number = 100, tx?: DbExecutor): Promise<AuditLog[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `SELECT id, company_id as "companyId", user_name as "userName", user_role as "userRole",
                action, entity_type as "entityType", entity_id as "entityId", details,
                previous_value as "previousValue", new_value as "newValue", timestamp
         FROM audit_logs WHERE company_id = $1 ORDER BY timestamp DESC LIMIT $2`,
        [companyId, limit]
      );
      return res.rows;
    }
    return devAuditLogs.filter((l) => l.companyId === companyId).slice(0, limit);
  },

  async create(data: Omit<AuditLog, 'id'> & { id?: string }, companyId: string, tx?: DbExecutor): Promise<AuditLog> {
    const id = data.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      ...data,
      id,
      companyId,
      timestamp: data.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      await dbQuery(
        `INSERT INTO audit_logs (id, company_id, user_name, user_role, action, entity_type, entity_id, details, previous_value, new_value, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          log.id,
          companyId,
          log.userName,
          log.userRole,
          log.action,
          log.entityType,
          log.entityId,
          log.details,
          log.previousValue || null,
          log.newValue || null,
          log.timestamp,
        ]
      );
      return log;
    }

    devAuditLogs.unshift(log);
    return log;
  },
};

