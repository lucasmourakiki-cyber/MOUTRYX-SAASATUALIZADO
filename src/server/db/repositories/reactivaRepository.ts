import { query, isDatabaseConfigured, DbExecutor, registerDevRollbackHook } from '../postgresClient';
import { SimpleReactivationStatus, SimpleReactivationPriority } from '../../../types';
import { INITIAL_REACTIVATION_TEMPLATES, ReactivationMessageTemplateItem } from '../../../data/reactivationTemplates';

export interface ReactivaClientStatusRecord {
  id: string;
  companyId: string;
  clientId: string;
  status: SimpleReactivationStatus;
  priority?: SimpleReactivationPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReactivaContactHistoryRecord {
  id: string;
  companyId: string;
  clientId: string;
  date: string;
  messageText: string;
  channel: 'whatsapp' | 'ligacao' | 'presencial';
  statusAfter: SimpleReactivationStatus;
  userName?: string;
  createdAt: string;
}

export interface ReactivaDataResponse {
  statuses: Record<string, SimpleReactivationStatus>;
  notes: Record<string, string>;
  history: Record<string, Array<{
    id: string;
    date: string;
    messageText: string;
    channel: 'whatsapp' | 'ligacao' | 'presencial';
    statusAfter: SimpleReactivationStatus;
    userName?: string;
  }>>;
  templates: ReactivationMessageTemplateItem[];
}

// Dev fallback stores
let devReactivaStatuses: ReactivaClientStatusRecord[] = [];
let devReactivaHistory: ReactivaContactHistoryRecord[] = [];
let devReactivaTemplates: { companyId: string; templates: ReactivationMessageTemplateItem[] }[] = [];

// Register rollback hook for ACID transactions in dev mode
registerDevRollbackHook(() => {
  const snapshotStatuses = JSON.parse(JSON.stringify(devReactivaStatuses));
  const snapshotHistory = JSON.parse(JSON.stringify(devReactivaHistory));
  const snapshotTemplates = JSON.parse(JSON.stringify(devReactivaTemplates));

  return {
    rollback: () => {
      devReactivaStatuses = snapshotStatuses;
      devReactivaHistory = snapshotHistory;
      devReactivaTemplates = snapshotTemplates;
    },
  };
});

export const reactivaRepository = {
  /**
   * Get all REATIVA data for a company (statuses, notes, history, templates)
   */
  async getCompanyData(companyId: string, tx?: DbExecutor): Promise<ReactivaDataResponse> {
    const statuses: Record<string, SimpleReactivationStatus> = {};
    const notes: Record<string, string> = {};
    const history: Record<string, any[]> = {};
    let templates: ReactivationMessageTemplateItem[] = [...INITIAL_REACTIVATION_TEMPLATES];

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;

      // 1. Fetch statuses and notes
      const statusRes = await dbQuery(
        `SELECT client_id AS "clientId", status, notes
         FROM reactiva_client_status
         WHERE company_id = $1`,
        [companyId]
      );
      for (const row of statusRes.rows) {
        if (row.status) statuses[row.clientId] = row.status as SimpleReactivationStatus;
        if (row.notes) notes[row.clientId] = row.notes;
      }

      // 2. Fetch contact history
      const historyRes = await dbQuery(
        `SELECT id, client_id AS "clientId", date, message_text AS "messageText",
                channel, status_after AS "statusAfter", user_name AS "userName"
         FROM reactiva_contact_history
         WHERE company_id = $1
         ORDER BY date DESC`,
        [companyId]
      );
      for (const row of historyRes.rows) {
        if (!history[row.clientId]) {
          history[row.clientId] = [];
        }
        history[row.clientId].push({
          id: row.id,
          date: typeof row.date === 'string' ? row.date : new Date(row.date).toLocaleString('pt-BR'),
          messageText: row.messageText,
          channel: row.channel || 'whatsapp',
          statusAfter: row.statusAfter as SimpleReactivationStatus,
          userName: row.userName,
        });
      }

      // 3. Fetch custom templates
      const tmplRes = await dbQuery(
        `SELECT id, title, category, icon, body, tone, is_ai_suggested AS "isAiSuggested"
         FROM reactiva_custom_templates
         WHERE company_id = $1
         ORDER BY created_at ASC`,
        [companyId]
      );
      if (tmplRes.rows.length > 0) {
        templates = tmplRes.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          icon: r.icon || 'Sparkles',
          body: r.body,
          tone: r.tone,
          isAiSuggested: r.isAiSuggested,
        }));
      }

      return { statuses, notes, history, templates };
    }

    // Dev mode in-memory store
    const compStatuses = devReactivaStatuses.filter((s) => s.companyId === companyId);
    for (const s of compStatuses) {
      if (s.status) statuses[s.clientId] = s.status;
      if (s.notes) notes[s.clientId] = s.notes;
    }

    const compHistory = devReactivaHistory.filter((h) => h.companyId === companyId);
    for (const h of compHistory) {
      if (!history[h.clientId]) history[h.clientId] = [];
      history[h.clientId].push({
        id: h.id,
        date: h.date,
        messageText: h.messageText,
        channel: h.channel,
        statusAfter: h.statusAfter,
        userName: h.userName,
      });
    }

    const compTmpl = devReactivaTemplates.find((t) => t.companyId === companyId);
    if (compTmpl && compTmpl.templates.length > 0) {
      templates = compTmpl.templates;
    }

    return { statuses, notes, history, templates };
  },

  /**
   * Upsert reactivation status for a client in a tenant
   */
  async upsertStatus(
    clientId: string,
    status: SimpleReactivationStatus,
    companyId: string,
    tx?: DbExecutor
  ): Promise<ReactivaClientStatusRecord> {
    const id = `rcs-${companyId}-${clientId}`;
    const now = new Date().toISOString();

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `INSERT INTO reactiva_client_status (id, company_id, client_id, status, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, client_id) 
         DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
         RETURNING id, company_id AS "companyId", client_id AS "clientId", status, notes,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [id, companyId, clientId, status]
      );
      return res.rows[0];
    }

    const idx = devReactivaStatuses.findIndex(
      (s) => s.companyId === companyId && s.clientId === clientId
    );
    if (idx >= 0) {
      devReactivaStatuses[idx] = {
        ...devReactivaStatuses[idx],
        status,
        updatedAt: now,
      };
      return devReactivaStatuses[idx];
    }

    const record: ReactivaClientStatusRecord = {
      id,
      companyId,
      clientId,
      status,
      createdAt: now,
      updatedAt: now,
    };
    devReactivaStatuses.push(record);
    return record;
  },

  /**
   * Upsert notes for a client in a tenant
   */
  async upsertNotes(
    clientId: string,
    notes: string,
    companyId: string,
    tx?: DbExecutor
  ): Promise<ReactivaClientStatusRecord> {
    const id = `rcs-${companyId}-${clientId}`;
    const now = new Date().toISOString();

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;
      const res = await dbQuery(
        `INSERT INTO reactiva_client_status (id, company_id, client_id, notes, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, client_id) 
         DO UPDATE SET notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
         RETURNING id, company_id AS "companyId", client_id AS "clientId", status, notes,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [id, companyId, clientId, notes]
      );
      return res.rows[0];
    }

    const idx = devReactivaStatuses.findIndex(
      (s) => s.companyId === companyId && s.clientId === clientId
    );
    if (idx >= 0) {
      devReactivaStatuses[idx] = {
        ...devReactivaStatuses[idx],
        notes,
        updatedAt: now,
      };
      return devReactivaStatuses[idx];
    }

    const record: ReactivaClientStatusRecord = {
      id,
      companyId,
      clientId,
      status: 'a_contatar',
      notes,
      createdAt: now,
      updatedAt: now,
    };
    devReactivaStatuses.push(record);
    return record;
  },

  /**
   * Add a contact history record and atomically update the client's status
   */
  async addContactHistory(
    entry: {
      clientId: string;
      messageText: string;
      channel?: 'whatsapp' | 'ligacao' | 'presencial';
      statusAfter: SimpleReactivationStatus;
      userName?: string;
      date?: string;
    },
    companyId: string,
    tx?: DbExecutor
  ): Promise<ReactivaContactHistoryRecord> {
    const id = `rch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const formattedDate = entry.date || `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const channel = entry.channel || 'whatsapp';

    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;

      // 1. Insert history
      const res = await dbQuery(
        `INSERT INTO reactiva_contact_history (id, company_id, client_id, date, message_text, channel, status_after, user_name)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)
         RETURNING id, company_id AS "companyId", client_id AS "clientId", date,
                   message_text AS "messageText", channel, status_after AS "statusAfter",
                   user_name AS "userName", created_at AS "createdAt"`,
        [id, companyId, entry.clientId, entry.messageText, channel, entry.statusAfter, entry.userName || null]
      );

      // 2. Update status in reactiva_client_status
      await this.upsertStatus(entry.clientId, entry.statusAfter, companyId, tx);

      return res.rows[0];
    }

    // Dev fallback
    const record: ReactivaContactHistoryRecord = {
      id,
      companyId,
      clientId: entry.clientId,
      date: formattedDate,
      messageText: entry.messageText,
      channel,
      statusAfter: entry.statusAfter,
      userName: entry.userName,
      createdAt: now,
    };
    devReactivaHistory.unshift(record);

    // Update status in dev store
    await this.upsertStatus(entry.clientId, entry.statusAfter, companyId);

    return record;
  },

  /**
   * Save custom message templates for a company
   */
  async saveTemplates(
    templates: ReactivationMessageTemplateItem[],
    companyId: string,
    tx?: DbExecutor
  ): Promise<ReactivationMessageTemplateItem[]> {
    if (isDatabaseConfigured()) {
      const dbQuery = tx ? tx.query.bind(tx) : query;

      // Delete existing custom templates for this company and insert new list
      await dbQuery(`DELETE FROM reactiva_custom_templates WHERE company_id = $1`, [companyId]);

      for (const t of templates) {
        const item = t as any;
        const id = t.id || `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const icon = item.icon || item.categoryIcon || 'Sparkles';
        const body = item.body || item.templateText || '';
        const isAiSuggested = !!(item.isAiSuggested || item.isCustom);
        await dbQuery(
          `INSERT INTO reactiva_custom_templates (id, company_id, title, category, icon, body, tone, is_ai_suggested)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, companyId, t.title, t.category, icon, body, t.tone || null, isAiSuggested]
        );
      }
      return templates;
    }

    const idx = devReactivaTemplates.findIndex((t) => t.companyId === companyId);
    if (idx >= 0) {
      devReactivaTemplates[idx].templates = templates;
    } else {
      devReactivaTemplates.push({ companyId, templates });
    }
    return templates;
  },
};
