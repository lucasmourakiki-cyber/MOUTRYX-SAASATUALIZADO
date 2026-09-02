import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getTemporalContext, getBrazilDateParts } from '../utils/temporalEngine';
import { getAuthHeaders, useAuth } from './AuthContext';
import {
  Company,
  UserProfile,
  UserRole,
  Pilot,
  Drone,
  Battery,
  BatteryStatus,
  MaintenanceRecord,
  Client,
  Property,
  Talhao,
  Crop,
  FitossanitarioProduct,
  ServiceOrder,
  Quote,
  AccountReceivable,
  AccountPayable,
  PaymentMethod,
  PilotCommissionRecord,
  Occurrence,
  AuditLog,
  DocumentRecord,
  DroneIAScoreMetrics,
  AIRecommendation,
  ReceiptNote,
  ReceiptCategory,
  PilotMonthlyExpenseSummary,
} from '../types';
import {
  INITIAL_COMPANIES,
  INITIAL_PILOTS,
  INITIAL_DRONES,
  INITIAL_BATTERIES,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_CLIENTS,
  INITIAL_PROPERTIES,
  INITIAL_TALHOES,
  INITIAL_CROPS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICE_ORDERS,
  INITIAL_QUOTES,
  INITIAL_ACCOUNTS_RECEIVABLE,
  INITIAL_ACCOUNTS_PAYABLE,
  INITIAL_PILOT_COMMISSIONS,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AI_RECOMMENDATIONS,
  INITIAL_RECEIPT_NOTES,
} from '../data/initialData';

interface AppContextType {
  // Current Tenant & Role
  currentCompany: Company;
  setCurrentCompanyId: (id: string) => void;
  updateCurrentCompany: (updates: Partial<Company>) => Promise<Company>;
  companies: Company[];
  isSuperAdmin: boolean;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  currentUserId: string;
  currentUserName: string;

  // Active View & Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isFieldMode: boolean;
  setIsFieldMode: (val: boolean) => void;

  // Global Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Data Collections
  pilots: Pilot[];
  drones: Drone[];
  batteries: Battery[];
  maintenanceRecords: MaintenanceRecord[];
  droneMaintenances: MaintenanceRecord[];
  clients: Client[];
  properties: Property[];
  talhoes: Talhao[];
  crops: Crop[];
  products: FitossanitarioProduct[];
  serviceOrders: ServiceOrder[];
  quotes: Quote[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  pilotCommissions: PilotCommissionRecord[];
  occurrences: Occurrence[];
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  aiRecommendations: AIRecommendation[];
  receiptNotes: ReceiptNote[];

  // Operational & Financial Metrics
  metrics: {
    totalHectaresApplied: number;
    totalRevenue: number;
    totalForecastedRevenue: number;
    totalCompletedRevenue: number;
    totalReceived: number;
    totalReceivablePending: number;
    totalReceivableOverdue: number;
    totalPayable: number;
    hasRealCosts: boolean;
    totalCost: number;
    totalEstimatedCost: number;
    netResult: number | null;
    averageMarginPercent: number | null;
    averageCostPerHa: number | null;
    averageMarginPerHa: number | null;
    fleetUtilizationPercent: number;
    activeServicesCount: number;
    completedServicesCount: number;
    scheduledServicesCount: number;
    ticketMedio: number;
    totalFlightHours: number;
    totalReceiptsSpent: number;
    totalReimbursementsPending: number;
  };

  // Drone IA Score
  droneIAScore: DroneIAScoreMetrics;

  // Actions
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'quoteNumber'> & { id?: string; quoteNumber?: string }) => Promise<Quote>;
  updateQuoteStatus: (quoteId: string, status: Quote['status']) => Promise<void>;
  convertQuoteToOS: (quoteId: string) => Promise<ServiceOrder>;

  addServiceOrder: (os: Omit<ServiceOrder, 'id' | 'osNumber'> & { id?: string; osNumber?: string }) => Promise<ServiceOrder>;
  updateServiceOrder: (updatedOS: ServiceOrder) => Promise<void>;
  updateServiceOrderStatus: (osId: string, status: ServiceOrder['status'], extra?: Partial<ServiceOrder>) => Promise<void>;
  registerFieldOccurrence: (occurrence: Omit<Occurrence, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => Promise<void>;

  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'totalRevenue' | 'totalHectares'> & { id?: string }) => Promise<Client>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  addProperty: (property: Omit<Property, 'id'> & { id?: string }) => Promise<Property>;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
  addTalhao: (talhao: Omit<Talhao, 'id'> & { id?: string }) => Promise<Talhao>;
  updateTalhao: (talhaoId: string, updates: Partial<Talhao>) => Promise<void>;
  deleteTalhao: (talhaoId: string) => Promise<void>;

  addDrone: (drone: Partial<Drone> & { model: string; manufacturer: string; serialNumber: string; assetTag: string }) => Promise<Drone>;
  updateDrone: (drone: Drone) => Promise<void>;
  deleteDrone: (droneId: string) => Promise<{ success: boolean; reason?: string }>;
  updateDroneStatus: (droneId: string, status: Drone['status']) => Promise<void>;
  addBattery: (battery: Omit<Battery, 'id'> & { id?: string }) => Promise<Battery>;
  updateBattery: (battery: Battery) => Promise<void>;
  deleteBattery: (batteryId: string) => Promise<{ success: boolean; reason?: string }>;
  updateBatteryCycles: (batteryId: string, newCycles: number) => Promise<void>;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id'> & { id?: string }) => Promise<void>;
  deleteMaintenanceRecord: (maintId: string) => Promise<void>;

  addPilot: (pilot: Omit<Pilot, 'id' | 'totalHectaresSprayed' | 'flightHours'>) => Promise<Pilot>;
  updatePilot: (pilotId: string, updates: Partial<Pilot>) => Promise<Pilot | null>;
  deletePilot: (pilotId: string) => Promise<void>;

  addAccountReceivable: (rec: Omit<AccountReceivable, 'id'> & { id?: string }) => Promise<void>;
  settleAccountReceivable: (recId: string, paymentMethod: string) => Promise<void>;
  addAccountPayable: (pay: Omit<AccountPayable, 'id'> & { id?: string }) => Promise<void>;
  settleAccountPayable: (payId: string) => Promise<void>;
  payAccountPayable: (payId: string) => Promise<void>;

  updateCommissionStatus: (commissionId: string, status: PilotCommissionRecord['status']) => Promise<void>;

  addProduct: (product: Omit<FitossanitarioProduct, 'id' | 'lastUpdated'>) => Promise<FitossanitarioProduct>;
  updateProduct: (productId: string, updates: Partial<FitossanitarioProduct>) => Promise<void>;
  toggleProductStatus: (productId: string) => Promise<void>;
  addDocument: (doc: Omit<DocumentRecord, 'id' | 'uploadDate'>) => Promise<void>;

  // Receipt Notes Actions
  addReceiptNote: (note: Omit<ReceiptNote, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => Promise<ReceiptNote>;
  updateReceiptNote: (id: string, updates: Partial<ReceiptNote>) => Promise<void>;
  deleteReceiptNote: (id: string) => Promise<void>;
  approveReceiptReimbursement: (id: string) => Promise<void>;
  markReceiptAsReimbursed: (id: string) => Promise<void>;
  batchApproveReimbursements: (pilotId?: string, month?: string) => Promise<void>;
  scanReceiptWithAI: (imageBase64: string, mimeType?: string, hints?: any) => Promise<any>;
  getPilotMonthlyExpenses: (month?: string, pilotId?: string) => PilotMonthlyExpenseSummary[];

  // Audit Logger
  logAction: (action: string, entityType: AuditLog['entityType'], entityId: string, details: string, previousValue?: string, newValue?: string) => void;

  // Quick Chat Copilot context provider
  getCompanyContextForAI: () => any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getStoredItem = <T,>(key: string, legacyKey: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Safe backward compatibility: Ensure any legacy records without companyId are ignored or assigned properly
        const migrated = parsed.map((item: any) => {
          return item;
        });

        // If stored array is missing comp-2 seed items, merge them safely without overwriting
        if (Array.isArray(fallback)) {
          const storedIds = new Set(migrated.map((i: any) => i?.id).filter(Boolean));
          const missingFallbackItems = (fallback as any[]).filter(
            (fbItem: any) => fbItem?.id && !storedIds.has(fbItem.id) && fbItem?.companyId === 'comp-2'
          );
          if (missingFallbackItems.length > 0) {
            return [...migrated, ...missingFallbackItems] as unknown as T;
          }
        }

        return migrated as unknown as T;
      }
      return parsed;
    }
  } catch (err) {
    console.error(`Error reading key ${key}:`, err);
  }
  return fallback;
};

const getStoredCompanyId = (availableCompanies: Company[]): string => {
  try {
    const saved = localStorage.getItem('moutryx_current_company') || localStorage.getItem('droneia_current_company');
    if (saved) {
      let candidateId = saved.trim();
      if (candidateId.startsWith('"') && candidateId.endsWith('"')) {
        try {
          candidateId = JSON.parse(candidateId);
        } catch {
          // ignore
        }
      }
      // 1. Verify that the company exists in availableCompanies
      const exists = availableCompanies.some((c) => c && c.id === candidateId);
      if (exists) {
        return candidateId;
      }
    }
  } catch (err) {
    console.error('Erro ao ler moutryx_current_company:', err);
  }
  return availableCompanies[0]?.id || '';
};

const createDefaultCompany = (id: string, name?: string, ownerName?: string): Company => {
  const companyName = name?.trim() || 'Minha Organização';
  return {
    id,
    name: companyName,
    tradeName: companyName,
    cnpj: '',
    address: '',
    city: 'Sinop',
    state: 'MT',
    zipCode: '',
    phone: '',
    whatsapp: '',
    email: '',
    ownerName: ownerName || 'Proprietário',
    bankInfo: {
      bank: '',
      agency: '',
      account: '',
      pixKey: '',
      pixType: 'cnpj',
    },
    taxRatePercent: 0,
    currency: 'BRL',
    setupProgress: 100,
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Company & Multi-tenant State
  const [companies, setCompanies] = useState<Company[]>(() => {
    return getStoredItem('moutryx_companies', 'droneia_companies', INITIAL_COMPANIES);
  });
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string>(() => {
    const loadedCompanies = getStoredItem('moutryx_companies', 'droneia_companies', INITIAL_COMPANIES);
    return getStoredCompanyId(loadedCompanies);
  });

  // Strict SaaS Multi-Tenant Isolation:
  // When an authenticated non-super_admin logs in, strictly anchor their tenant to user.companyId
  useEffect(() => {
    if (user && user.companyId) {
      if (user.role !== 'super_admin') {
        setCurrentCompanyIdState(user.companyId);
        try {
          localStorage.setItem('moutryx_current_company', user.companyId);
        } catch {
          // ignore
        }
      }
      if (user.role) {
        setCurrentUserRole(user.role as UserRole);
      }
      // Never fabricate a tenant name from the user's name. The company record on the server is authoritative.
      setCompanies((prev) => {
        if (prev.some((c) => c && c.id === user.companyId)) return prev;
        return [...prev, createDefaultCompany(user.companyId, 'Carregando empresa...', user.name)];
      });
    }
  }, [user]);

  const setCurrentCompanyId = useCallback((newId: string) => {
    if (user && user.role !== 'super_admin' && newId !== user.companyId) {
      console.warn(`[MOUTRYX SAAS] Usuário restrito ao tenant ${user.companyId}. Troca de empresa bloqueada.`);
      return;
    }
    setCompanies((latestCompanies) => {
      const targetCompany = latestCompanies.find((c) => c.id === newId);
      if (targetCompany) {
        setCurrentCompanyIdState(targetCompany.id);
        try {
          localStorage.setItem('moutryx_current_company', targetCompany.id);
        } catch (err) {
          console.error('Erro ao salvar moutryx_current_company:', err);
        }
      } else {
        console.warn(`Tentativa de selecionar empresa inexistente: "${newId}". Mantendo empresa atual.`);
      }
      return latestCompanies;
    });
  }, [user]);

  // User Role State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('proprietario');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isFieldMode, setIsFieldMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Entities (Loaded from server / memory defaults — strictly not cached in localStorage)
  const [allPilots, setAllPilots] = useState<Pilot[]>(INITIAL_PILOTS);
  const [allDrones, setAllDrones] = useState<Drone[]>(INITIAL_DRONES);
  const [allBatteries, setAllBatteries] = useState<Battery[]>(INITIAL_BATTERIES);
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>(INITIAL_MAINTENANCE_RECORDS);
  const [allClients, setAllClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [allProperties, setAllProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [allTalhoes, setAllTalhoes] = useState<Talhao[]>(INITIAL_TALHOES);
  const [crops, setCrops] = useState<Crop[]>(INITIAL_CROPS);
  const [products, setProducts] = useState<FitossanitarioProduct[]>(INITIAL_PRODUCTS);
  const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>(INITIAL_SERVICE_ORDERS);
  const [allQuotes, setAllQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [allAccountsReceivable, setAllAccountsReceivable] = useState<AccountReceivable[]>(INITIAL_ACCOUNTS_RECEIVABLE);
  const [allAccountsPayable, setAllAccountsPayable] = useState<AccountPayable[]>(INITIAL_ACCOUNTS_PAYABLE);
  const [allPilotCommissions, setAllPilotCommissions] = useState<PilotCommissionRecord[]>(INITIAL_PILOT_COMMISSIONS);
  const [allOccurrences, setAllOccurrences] = useState<Occurrence[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRecord[]>(INITIAL_DOCUMENTS);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [aiRecommendations] = useState<AIRecommendation[]>(INITIAL_AI_RECOMMENDATIONS);

  const [allReceiptNotes, setAllReceiptNotes] = useState<ReceiptNote[]>(INITIAL_RECEIPT_NOTES);

  // UI & Theme persistence only (strictly no operational entities persisted to localStorage)
  // Persist currentCompanyId whenever it updates
  useEffect(() => {
    if (currentCompanyId) {
      try {
        localStorage.setItem('moutryx_current_company', currentCompanyId);
      } catch (err) {
        console.error('Erro ao persistir moutryx_current_company:', err);
      }
    }
  }, [currentCompanyId]);

  // Fallback watchdog: If companies list changes and currentCompanyId is no longer valid, reset to a safe company
  useEffect(() => {
    if (companies.length > 0) {
      const isValid = companies.some((c) => c && c.id === currentCompanyId);
      if (!isValid) {
        const safeFallback = user?.companyId && companies.some((c) => c.id === user.companyId)
          ? user.companyId
          : companies[0].id;
        setCurrentCompanyIdState(safeFallback);
        try {
          localStorage.setItem('moutryx_current_company', safeFallback);
        } catch (err) {
          console.error('Erro ao persistir fallback moutryx_current_company:', err);
        }
      }
    }
  }, [companies, currentCompanyId, user?.companyId]);

  // Current Company object
  const currentCompany = useMemo(() => {
    const found = companies.find((c) => c.id === currentCompanyId);
    if (found) return found;
    return companies[0] || createDefaultCompany(currentCompanyId || 'comp-default', 'Organização');
  }, [companies, currentCompanyId, user]);

  // SaaS Multi-tenant visibility:
  // Non-super_admin users can ONLY see their single linked company in lists/dropdowns.
  // Super admin can see all available companies.
  const visibleCompanies = useMemo(() => {
    if (isSuperAdmin) {
      return companies;
    }
    const targetId = user?.companyId || currentCompanyId;
    const myComp = companies.find((c) => c.id === targetId);
    if (myComp) return [myComp];
    if (targetId) {
      return [createDefaultCompany(targetId, 'Carregando empresa...', user?.name)];
    }
    return companies.slice(0, 1);
  }, [companies, isSuperAdmin, user, currentCompanyId]);

  const lastFetchedCompanyIdRef = useRef<string | null>(null);
  const inFlightBootstrapRef = useRef<boolean>(false);

  // Fetch tenant operational & financial data from server API
  const refreshTenantDataFromServer = useCallback(async (companyId: string, force = false) => {
    if (!companyId || inFlightBootstrapRef.current) return;
    if (!force && lastFetchedCompanyIdRef.current === companyId) return;

    inFlightBootstrapRef.current = true;
    try {
      const res = await fetch('/api/bootstrap', {
        headers: getAuthHeaders({
          'x-company-id': companyId,
        }),
        credentials: 'include',
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data) {
          lastFetchedCompanyIdRef.current = companyId;
          const {
            clients,
            properties,
            talhoes,
            drones,
            batteries,
            maintenanceRecords,
            pilots,
            crops,
            products,
            occurrences,
            quotes,
            serviceOrders,
            accountsReceivable,
            accountsPayable,
            pilotCommissions,
            receiptNotes,
            auditLogs,
          } = json.data;

          if (clients) setAllClients((prev) => [...prev.filter((c) => c.companyId !== companyId), ...clients]);
          if (properties) setAllProperties((prev) => [...prev.filter((p) => p.companyId !== companyId), ...properties]);
          if (talhoes) setAllTalhoes((prev) => [...prev.filter((t) => t.companyId !== companyId), ...talhoes]);
          if (drones) setAllDrones((prev) => [...prev.filter((d) => d.companyId !== companyId), ...drones]);
          if (batteries) setAllBatteries((prev) => [...prev.filter((b) => b.companyId !== companyId), ...batteries]);
          if (maintenanceRecords) setAllMaintenanceRecords((prev) => [...prev.filter((m) => m.companyId !== companyId), ...maintenanceRecords]);
          if (pilots) setAllPilots((prev) => [...prev.filter((p) => p.companyId !== companyId), ...pilots]);
          if (crops && crops.length > 0) setCrops(crops);
          if (products && products.length > 0) setProducts(products);
          if (occurrences) setAllOccurrences((prev) => [...prev.filter((o) => o.companyId !== companyId), ...occurrences]);
          if (quotes) setAllQuotes((prev) => [...prev.filter((q) => q.companyId !== companyId), ...quotes]);
          if (serviceOrders) setAllServiceOrders((prev) => [...prev.filter((os) => os.companyId !== companyId), ...serviceOrders]);
          if (accountsReceivable) setAllAccountsReceivable((prev) => [...prev.filter((r) => r.companyId !== companyId), ...accountsReceivable]);
          if (accountsPayable) setAllAccountsPayable((prev) => [...prev.filter((p) => p.companyId !== companyId), ...accountsPayable]);
          if (pilotCommissions) setAllPilotCommissions((prev) => [...prev.filter((c) => c.companyId !== companyId), ...pilotCommissions]);
          if (receiptNotes) setAllReceiptNotes((prev) => [...prev.filter((n) => n.companyId !== companyId), ...receiptNotes]);
          if (auditLogs) setAllAuditLogs((prev) => [...prev.filter((l) => l.companyId !== companyId), ...auditLogs]);
        }
      }
    } catch (err) {
      console.warn('[MOUTRYX APP] Server bootstrap fetch fallback:', err);
    } finally {
      inFlightBootstrapRef.current = false;
    }
  }, []);

  const apiSync = useCallback(
    async (url: string, method: string, body?: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(url, {
          method,
          headers: getAuthHeaders({
            'x-company-id': currentCompanyId,
          }),
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 409) {
          console.warn('[MOUTRYX CONFLICT] Conflito de concorrência detectado no servidor. Recarregando dados...');
          refreshTenantDataFromServer(currentCompanyId, true);
          throw new Error('Conflito de versão detectado: Os dados foram alterados por outro usuário ou sessão. As informações mais recentes foram sincronizadas. Por favor, tente novamente.');
        }

        if (!res.ok) {
          let errorMsg = `Falha na requisição ao servidor (${res.status})`;
          try {
            const errorJson = await res.json();
            if (errorJson?.error) {
              errorMsg = errorJson.error;
            } else if (errorJson?.message) {
              errorMsg = errorJson.message;
            }
          } catch {
            // response was not JSON
          }
          throw new Error(errorMsg);
        }

        try {
          const json = await res.json();
          return json;
        } catch {
          return { success: true };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          console.error(`[MOUTRYX SYNC TIMEOUT] ${method} ${url}: Tempo limite de 20s excedido.`);
          throw new Error('Tempo limite de conexão excedido ao comunicar com o servidor. A gravação não pôde ser confirmada.');
        }
        console.error(`[MOUTRYX SYNC ERROR] ${method} ${url}:`, err);
        throw err;
      }
    },
    [currentCompanyId, refreshTenantDataFromServer]
  );

  // Hydrate the authenticated tenant from the server. PostgreSQL is authoritative.
  useEffect(() => {
    if (!user?.companyId) return;
    let cancelled = false;
    const loadCompany = async () => {
      try {
        const res = await fetch(`/api/auth/companies/${encodeURIComponent(user.companyId)}`, { method: 'GET', headers: getAuthHeaders(), credentials: 'include' });
        if (!res.ok) throw new Error(`Falha ao carregar empresa (${res.status})`);
        const json = await res.json();
        if (cancelled || !json?.company) return;
        const serverCompany = json.company as any;
        const normalized: Company = {
          ...createDefaultCompany(user.companyId, serverCompany.name || 'Empresa', user.name),
          ...serverCompany, id: user.companyId,
          name: serverCompany.name || 'Empresa',
          tradeName: serverCompany.tradeName || serverCompany.name || 'Empresa',
          cnpj: serverCompany.cnpj || serverCompany.document || '',
          city: serverCompany.city || '', state: serverCompany.state || '',
          email: serverCompany.email || '', phone: serverCompany.phone || '',
          ownerName: user.name || 'Proprietário',
        };
        setCompanies((prev) => [...prev.filter((c) => c.id !== user.companyId), normalized]);
      } catch (err) { console.warn('[MOUTRYX APP] Não foi possível hidratar a empresa do servidor:', err); }
    };
    loadCompany();
    return () => { cancelled = true; };
  }, [user]);

  // Persist company settings only after the server confirms the update.
  const updateCurrentCompany = useCallback(async (updates: Partial<Company>) => {
    if (!user?.companyId || currentCompanyId !== user.companyId) throw new Error('Empresa atual inválida para atualização.');
    const json = await apiSync(`/api/auth/companies/${encodeURIComponent(user.companyId)}`, 'PUT', {
      name: updates.name, tradeName: updates.tradeName, document: updates.cnpj, cnpj: updates.cnpj,
      city: updates.city, state: updates.state, email: updates.email, phone: updates.phone || updates.whatsapp,
    });
    if (!json?.company) throw new Error('O servidor não confirmou a atualização da empresa.');
    const serverCompany = json.company as any;
    const normalized: Company = { ...currentCompany, ...serverCompany, id: user.companyId,
      name: serverCompany.name || currentCompany.name, tradeName: serverCompany.tradeName || serverCompany.name || currentCompany.tradeName,
      cnpj: serverCompany.cnpj || serverCompany.document || currentCompany.cnpj, city: serverCompany.city ?? currentCompany.city,
      state: serverCompany.state ?? currentCompany.state, email: serverCompany.email ?? currentCompany.email, phone: serverCompany.phone ?? currentCompany.phone };
    setCompanies((prev) => [...prev.filter((c) => c.id !== user.companyId), normalized]);
    return normalized;
  }, [user?.companyId, currentCompanyId, currentCompany, apiSync]);

  useEffect(() => {
    if (user && currentCompanyId) {
      refreshTenantDataFromServer(currentCompanyId);
    } else if (!user) {
      lastFetchedCompanyIdRef.current = null;
    }
  }, [user, currentCompanyId, refreshTenantDataFromServer]);

  // Tenant-Filtered Data Selectors (Strict Multi-Tenant Isolation by currentCompany.id)
  const pilots = useMemo(
    () => allPilots.filter((p) => p.companyId === currentCompany.id),
    [allPilots, currentCompany.id]
  );
  const drones = useMemo(
    () => allDrones.filter((d) => d.companyId === currentCompany.id),
    [allDrones, currentCompany.id]
  );
  const batteries = useMemo(
    () => allBatteries.filter((b) => b.companyId === currentCompany.id),
    [allBatteries, currentCompany.id]
  );
  const maintenanceRecords = useMemo(
    () => allMaintenanceRecords.filter((m) => m.companyId === currentCompany.id),
    [allMaintenanceRecords, currentCompany.id]
  );
  const clients = useMemo(
    () => allClients.filter((c) => c.companyId === currentCompany.id),
    [allClients, currentCompany.id]
  );
  const properties = useMemo(
    () => allProperties.filter((p) => p.companyId === currentCompany.id),
    [allProperties, currentCompany.id]
  );
  const talhoes = useMemo(
    () => allTalhoes.filter((t) => t.companyId === currentCompany.id),
    [allTalhoes, currentCompany.id]
  );
  const serviceOrders = useMemo(
    () => allServiceOrders.filter((os) => os.companyId === currentCompany.id),
    [allServiceOrders, currentCompany.id]
  );
  const quotes = useMemo(
    () => allQuotes.filter((q) => q.companyId === currentCompany.id),
    [allQuotes, currentCompany.id]
  );
  const accountsReceivable = useMemo(
    () => allAccountsReceivable.filter((r) => r.companyId === currentCompany.id),
    [allAccountsReceivable, currentCompany.id]
  );
  const accountsPayable = useMemo(
    () => allAccountsPayable.filter((p) => p.companyId === currentCompany.id),
    [allAccountsPayable, currentCompany.id]
  );
  const pilotCommissions = useMemo(() => {
    const list = allPilotCommissions.filter(
      (c) => c.companyId === currentCompany.id
    );

    return list.map((comm) => {
      const linkedOS = allServiceOrders.find(
        (os) =>
          (os.id === comm.osId || os.osNumber === comm.osNumber) &&
          os.companyId === currentCompany.id
      );
      const linkedRec = allAccountsReceivable.find(
        (r) =>
          (r.osId === comm.osId || r.osNumber === comm.osNumber) &&
          r.companyId === currentCompany.id
      );

      const isClientPaid = linkedOS?.status === 'pago' || linkedRec?.status === 'pago';

      if (isClientPaid) {
        if (comm.status === 'aguardando_pagamento_cliente' || comm.status === 'prevista') {
          return {
            ...comm,
            status: 'liberada' as const,
            clientPaidDate:
              comm.clientPaidDate ||
              linkedRec?.paymentDate ||
              linkedOS?.completedDate ||
              new Date().toISOString().split('T')[0],
            releasedDate: comm.releasedDate || new Date().toISOString().split('T')[0],
          };
        }
      } else if (linkedOS && linkedOS.status !== 'pago' && (!linkedRec || linkedRec.status !== 'pago')) {
        if (comm.status === 'liberada') {
          return {
            ...comm,
            status: 'aguardando_pagamento_cliente' as const,
          };
        }
      }

      return comm;
    });
  }, [allPilotCommissions, allServiceOrders, allAccountsReceivable, currentCompany.id]);
  const occurrences = useMemo(
    () => allOccurrences.filter((o) => o.companyId === currentCompany.id),
    [allOccurrences, currentCompany.id]
  );
  const documents = useMemo(
    () => allDocuments.filter((d) => d.companyId === currentCompany.id),
    [allDocuments, currentCompany.id]
  );
  const auditLogs = useMemo(
    () => allAuditLogs.filter((l) => l.companyId === currentCompany.id),
    [allAuditLogs, currentCompany.id]
  );
  const receiptNotes = useMemo(
    () => allReceiptNotes.filter((n) => n.companyId === currentCompany.id),
    [allReceiptNotes, currentCompany.id]
  );

  // User Name based on Role
  const currentUserName = useMemo(() => {
    switch (currentUserRole) {
      case 'proprietario':
        return currentCompany.ownerName || 'Lucas Moura';
      case 'administrador':
        return 'Mariana Costa (Administradora)';
      case 'gestor_operacional':
        return 'Rodrigo Toledo (Gestor de Operações)';
      case 'piloto':
        return 'João Pedro Silveira (Piloto)';
      case 'financeiro':
        return 'Patrícia Nogueira (Financeiro)';
      case 'super_admin':
        return 'Super Administrador (MOUTRYX)';
      default:
        return 'Consultor Agronômico';
    }
  }, [currentUserRole, currentCompany]);

  const currentUserId = 'user-current';

  // Audit Logger
  const logAction = (
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      companyId: currentCompany.id,
      userName: currentUserName,
      userRole: currentUserRole,
      action,
      entityType,
      entityId,
      details,
      previousValue,
      newValue,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setAllAuditLogs((prev) => [newLog, ...prev]);
  };

  // Operational & Financial Metrics Calculations (Strict Separation of Realized vs Estimated)
  const metrics = useMemo(() => {
    const compOS = serviceOrders.filter((os) => os.companyId === currentCompany.id);
    const compRec = accountsReceivable.filter((r) => r.companyId === currentCompany.id);
    const compPay = accountsPayable.filter((p) => p.companyId === currentCompany.id);
    const compDrones = drones.filter((d) => d.companyId === currentCompany.id);
    const compReceipts = receiptNotes.filter((n) => n.companyId === currentCompany.id);

    const validOS = compOS.filter((os) => os.status !== 'cancelado');
    // Realized services: strictly completed/invoiced/paid service orders
    const completedOS = validOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');
    const scheduledOS = validOS.filter((os) => os.status === 'agendado' || os.status === 'em_deslocamento' || os.status === 'em_operacao' || os.status === 'pausado');

    // Realized area: strictly actualAreaSprayedHa recorded (> 0). Never fallback to planned areaHa for realized KPI.
    const totalHectaresApplied = completedOS.reduce((acc, os) => {
      const actualHa = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : 0;
      return acc + actualHa;
    }, 0);

    const totalForecastedRevenue = scheduledOS.reduce((acc, os) => acc + (os.finalAmount || 0), 0);
    const totalCompletedRevenue = completedOS.reduce((acc, os) => acc + (os.finalAmount || 0), 0);
    const totalRevenue = totalCompletedRevenue;

    const totalReceived = compRec
      .filter((r) => r.status === 'pago')
      .reduce((acc, r) => acc + r.amount, 0);

    const totalReceivablePending = compRec
      .filter((r) => r.status === 'aberto' || r.status === 'vencendo')
      .reduce((acc, r) => acc + r.amount, 0);

    const totalReceivableOverdue = compRec
      .filter((r) => r.status === 'vencido')
      .reduce((acc, r) => acc + r.amount, 0);

    const totalPayable = compPay
      .filter((p) => p.status === 'aberto' || p.status === 'vencido' || p.status === 'vencendo')
      .reduce((acc, p) => acc + p.amount, 0);

    // Real paid costs: strictly accounts payable with status 'pago'
    const paidPayables = compPay.filter((p) => p.status === 'pago');
    const totalPaidPayables = paidPayables.reduce((acc, p) => acc + p.amount, 0);

    // Real paid field receipts: corporate card, invoiced to company, or pilot reimbursements settled
    const paidReceipts = compReceipts.filter((n) =>
      n.paymentMethod === 'cartao_corporativo' ||
      n.paymentMethod === 'faturado_empresa' ||
      n.reimbursementStatus === 'reembolsado'
    );
    const totalPaidReceipts = paidReceipts.reduce((acc, n) => acc + (n.totalAmount || 0), 0);

    // Total expenses logged in field (for field expenses module overview)
    const totalReceiptsSpent = compReceipts.reduce((acc, n) => acc + (n.totalAmount || 0), 0);

    const hasRealCosts = paidPayables.length > 0 || paidReceipts.length > 0;
    const totalCost = hasRealCosts ? (totalPaidPayables + totalPaidReceipts) : 0;

    // Realized Net Result (Receita Realizada - Custos Realizados)
    const netResult = hasRealCosts
      ? (totalCompletedRevenue > 0 ? (totalCompletedRevenue - totalCost) : -totalCost)
      : null;

    const averageMarginPercent = (hasRealCosts && totalCompletedRevenue > 0 && netResult !== null)
      ? Math.round(((netResult / totalCompletedRevenue) * 100) * 10) / 10
      : null;

    const averageCostPerHa = (hasRealCosts && totalHectaresApplied > 0)
      ? Math.round((totalCost / totalHectaresApplied) * 100) / 100
      : null;

    const averageMarginPerHa = (hasRealCosts && totalHectaresApplied > 0 && netResult !== null)
      ? Math.round((netResult / totalHectaresApplied) * 100) / 100
      : null;

    // Estimated costs isolated strictly for budgeting/quoting reference
    const totalEstimatedCost = completedOS.reduce((acc, os) => acc + (os.estimatedCost || 0), 0);

    const operatingDrones = compDrones.filter((d) => d.status === 'em_operacao').length;
    const fleetUtilizationPercent = compDrones.length > 0 ? Math.round((operatingDrones / compDrones.length) * 100) : 0;

    const activeServicesCount = compOS.filter((os) => os.status === 'em_operacao' || os.status === 'em_deslocamento').length;
    const completedServicesCount = completedOS.length;
    const scheduledServicesCount = compOS.filter((os) => os.status === 'agendado').length;

    const ticketMedio = completedOS.length > 0 ? totalCompletedRevenue / completedOS.length : 0;
    const totalFlightHours = compDrones.reduce((acc, d) => acc + (d.flightHours || 0), 0);

    const totalReimbursementsPending = compReceipts
      .filter((n) => n.reimbursementStatus === 'pendente' || n.reimbursementStatus === 'aprovado')
      .reduce((acc, n) => acc + (n.totalAmount || 0), 0);

    return {
      totalHectaresApplied,
      totalRevenue,
      totalForecastedRevenue,
      totalCompletedRevenue,
      totalReceived,
      totalReceivablePending,
      totalReceivableOverdue,
      totalPayable,
      hasRealCosts,
      totalCost,
      totalEstimatedCost,
      netResult,
      averageMarginPercent,
      averageCostPerHa,
      averageMarginPerHa,
      fleetUtilizationPercent,
      activeServicesCount,
      completedServicesCount,
      scheduledServicesCount,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      totalFlightHours,
      totalReceiptsSpent,
      totalReimbursementsPending,
    };
  }, [serviceOrders, accountsReceivable, accountsPayable, drones, receiptNotes, currentCompany.id]);

  // DRONE IA Score Engine (100% Real Data Calculation)
  const droneIAScore: DroneIAScoreMetrics = useMemo(() => {
    const compOS = serviceOrders.filter((os) => os.companyId === currentCompany.id);
    const validOS = compOS.filter((os) => os.status !== 'cancelado');
    const completedOS = validOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');
    const compDrones = drones.filter((d) => d.companyId === currentCompany.id);
    const compBatteries = batteries.filter((b) => b.companyId === currentCompany.id);
    const compRec = accountsReceivable.filter((r) => r.companyId === currentCompany.id);

    const hasEnoughData = validOS.length > 0 || compDrones.length > 0 || compRec.length > 0;

    if (!hasEnoughData) {
      return {
        overallScore: null,
        productivityScore: null,
        marginScore: null,
        fleetUtilizationScore: null,
        financialControlScore: null,
        efficiencyScore: null,
        hasEnoughData: false,
        strengths: ['Nenhum dado operacional registrado para compor pontos fortes.'],
        attentionPoints: ['Cadastre ordens de serviço, drones e movimentações financeiras para gerar o Score.'],
        history: [],
      };
    }

    // 1. Produtividade real
    const productivityScore = validOS.length > 0
      ? Math.min(100, Math.max(0, Math.round((completedOS.length / validOS.length) * 100)))
      : null;

    // 2. Margem real (apenas se houver custos reais registrados)
    const marginScore = (metrics.hasRealCosts && metrics.averageMarginPercent !== null && metrics.totalRevenue > 0)
      ? Math.min(100, Math.max(0, Math.round(metrics.averageMarginPercent)))
      : null;

    // 3. Utilização da Frota
    const activeDrones = compDrones.filter((d) => d.status === 'em_operacao' || d.status === 'disponivel').length;
    const fleetUtilizationScore = compDrones.length > 0
      ? Math.min(100, Math.max(0, Math.round((activeDrones / compDrones.length) * 100)))
      : null;

    // 4. Controle Financeiro
    const totalFinVolume = metrics.totalReceived + metrics.totalReceivablePending + metrics.totalReceivableOverdue;
    const financialControlScore = totalFinVolume > 0
      ? Math.min(100, Math.max(0, Math.round(((metrics.totalReceived + metrics.totalReceivablePending) / totalFinVolume) * 100)))
      : null;

    // 5. Eficiência Operacional
    let efficiencyScore: number | null = null;
    if (completedOS.length > 0) {
      const plannedCompletedHa = completedOS.reduce((acc, os) => acc + (os.areaHa || 0), 0);
      efficiencyScore = plannedCompletedHa > 0
        ? Math.min(100, Math.max(0, Math.round((metrics.totalHectaresApplied / plannedCompletedHa) * 100)))
        : 100;
    }

    // Overall Score: Média matemática dos pilares com dados válidos
    const validScores: number[] = [];
    if (productivityScore !== null) validScores.push(productivityScore);
    if (marginScore !== null) validScores.push(marginScore);
    if (fleetUtilizationScore !== null) validScores.push(fleetUtilizationScore);
    if (financialControlScore !== null) validScores.push(financialControlScore);
    if (efficiencyScore !== null) validScores.push(efficiencyScore);

    const overallScore = validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : null;

    // Pontos Fortes Reais
    const strengths: string[] = [];
    if (metrics.hasRealCosts && metrics.averageMarginPercent !== null && metrics.averageMarginPercent >= 20) {
      strengths.push(`✓ Margem líquida operacional de ${metrics.averageMarginPercent.toFixed(1)}% nas áreas executadas`);
    }
    if (metrics.totalHectaresApplied > 0) {
      strengths.push(`✓ ${metrics.totalHectaresApplied.toFixed(1)} hectares pulverizados com sucesso`);
    }
    const operatingDrones = compDrones.filter((d) => d.status === 'em_operacao').length;
    if (operatingDrones > 0) {
      strengths.push(`✓ ${operatingDrones} drone(s) em operação ativa no campo`);
    }
    if (metrics.totalReceived > 0) {
      strengths.push(`✓ R$ ${metrics.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebidos com comissões vinculadas`);
    }
    if (strengths.length === 0) {
      strengths.push('✓ Operação em conformidade com as normas agroagrícolas');
    }

    // Pontos de Atenção Reais
    const attentionPoints: string[] = [];
    if (!metrics.hasRealCosts && metrics.totalHectaresApplied > 0) {
      attentionPoints.push('⚠ Lance despesas e contas a pagar para calcular a margem e o custo real por hectare');
    }
    if (metrics.totalReceivableOverdue > 0) {
      attentionPoints.push(`⚠ R$ ${metrics.totalReceivableOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em contas a receber vencidas necessitando cobrança`);
    }

    const criticalBatteries = compBatteries.filter((b) => {
      const maxC = b.maxRecommendedCycles || 500;
      return b.cycles >= maxC * 0.8;
    });
    criticalBatteries.slice(0, 2).forEach((b) => {
      const maxC = b.maxRecommendedCycles || 500;
      attentionPoints.push(`⚠ Bateria ${b.identifier} com ${b.cycles} ciclos (${Math.round((b.cycles / maxC) * 100)}% da vida útil recomendada)`);
    });

    const maintenanceDrones = compDrones.filter((d) => d.status === 'em_manutencao');
    if (maintenanceDrones.length > 0) {
      attentionPoints.push(`⚠ ${maintenanceDrones.length} drone(s) em manutenção`);
    }

    if (metrics.totalPayable > 0 && accountsPayable.some((p) => p.status === 'vencido')) {
      const overduePay = accountsPayable.filter((p) => p.status === 'vencido').reduce((acc, p) => acc + p.amount, 0);
      if (overduePay > 0) {
        attentionPoints.push(`⚠ R$ ${overduePay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em contas a pagar vencidas`);
      }
    }

    if (attentionPoints.length === 0) {
      attentionPoints.push('✓ Nenhum ponto crítico de atenção pendente no momento');
    }

    // Histórico Dinâmico Real
    const history: { month: string; score: number }[] = [];
    if (overallScore !== null) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentMonthIndex = new Date().getMonth();
      const currentMonthLabel = monthNames[currentMonthIndex] || 'Atual';
      history.push({ month: currentMonthLabel, score: overallScore });
    }

    return {
      overallScore,
      productivityScore,
      marginScore,
      fleetUtilizationScore,
      financialControlScore,
      efficiencyScore,
      hasEnoughData: true,
      strengths,
      attentionPoints,
      history,
    };
  }, [metrics, serviceOrders, drones, batteries, accountsReceivable, accountsPayable, currentCompany.id]);

  // Helper to generate next unique sequential numbers safely
  const generateNextQuoteNumber = (): string => {
    const currentYear = new Date().getFullYear();
    let maxSeq = 42;
    quotes.forEach((q) => {
      const match = q.quoteNumber?.match(/ORC-\d{4}-(\d+)/) || q.quoteNumber?.match(/ORC-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    return `ORC-${currentYear}-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  const generateNextOSNumber = (): string => {
    const currentYear = new Date().getFullYear();
    let maxSeq = 90;
    serviceOrders.forEach((os) => {
      const match = os.osNumber?.match(/OS-\d{4}-(\d+)/) || os.osNumber?.match(/OS-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    return `OS-${currentYear}-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  // Actions: Quotes
  const addQuote = async (quoteData: Omit<Quote, 'id' | 'createdAt' | 'quoteNumber'> & { id?: string; quoteNumber?: string }): Promise<Quote> => {
    const quoteNumber = quoteData.quoteNumber || generateNextQuoteNumber();
    const newQuote: Quote = {
      ...quoteData,
      id: quoteData.id || `quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quoteNumber,
      createdAt: new Date().toISOString().split('T')[0],
      companyId: currentCompany.id,
    };
    const res = await apiSync('/api/quotes', 'POST', newQuote);
    const savedQuote = (res && (res.data || res.quote)) ? (res.data || res.quote) : newQuote;
    setAllQuotes((prev) => [savedQuote, ...prev.filter((q) => q.id !== savedQuote.id)]);
    logAction(
      'Criação de Orçamento',
      'Orçamento',
      savedQuote.quoteNumber,
      `Criou orçamento para ${savedQuote.clientName} (${savedQuote.areaHa} ha - R$ ${savedQuote.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
    );
    return savedQuote;
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    const today = new Date().toISOString().split('T')[0];
    const approvedAt = status === 'aprovado' ? today : undefined;
    const sentAt = status === 'enviado' ? today : undefined;
    await apiSync(`/api/quotes/${quoteId}/status`, 'PATCH', { status, approvedAt, sentAt });

    setAllQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId && q.companyId === currentCompany.id) {
          const oldStatus = q.status;
          logAction(
            'Atualização de Status de Orçamento',
            'Orçamento',
            q.quoteNumber,
            `Alterou status do orçamento de ${oldStatus} para ${status}`,
            oldStatus,
            status
          );
          return {
            ...q,
            status,
            approvedAt: status === 'aprovado' ? (q.approvedAt || today) : q.approvedAt,
            sentAt: status === 'enviado' ? (q.sentAt || today) : q.sentAt,
          };
        }
        return q;
      })
    );
  };

  // Convert Quote to Service Order (1-Click Pipeline)
  const convertQuoteToOS = async (quoteId: string): Promise<ServiceOrder> => {
    const quote = quotes.find((q) => q.id === quoteId && q.companyId === currentCompany.id);
    if (!quote) throw new Error('Orçamento não encontrado no tenant ativo');

    // Prevent duplicate OS creation if already converted
    if (quote.convertedToOsId) {
      const existingOS = serviceOrders.find((os) => os.id === quote.convertedToOsId && os.companyId === currentCompany.id);
      if (existingOS) {
        return existingOS;
      }
    }

    const osNumber = generateNextOSNumber();

    // Look up real property data
    const property = properties.find((p) => p.id === quote.propertyId);
    const propertyCoords = property
      ? { lat: property.latitude, lng: property.longitude }
      : { lat: 0, lng: 0 };

    // Look up talhão data
    const talhao =
      talhoes.find((t) => t.propertyId === quote.propertyId && (t.name === quote.talhaoName || t.id === quote.talhaoName)) ||
      talhoes.find((t) => t.propertyId === quote.propertyId);
    const talhaoId = talhao?.id || 'talhao-1';
    const talhaoName = quote.talhaoName || talhao?.name || 'Talhão Principal';

    // Look up pilot and drone
    const assignedPilot =
      pilots.find((p) => p.id === quote.pilotAssignedId) ||
      pilots.find((p) => p.status === 'ativo') ||
      pilots[0];

    const assignedDrone =
      drones.find((d) => d.model === quote.droneModelPreferred || d.id === quote.droneModelPreferred) ||
      drones.find((d) => d.status === 'disponivel') ||
      drones[0];

    // Calculate pilot commission based on his model
    let calculatedCommission = 0;
    let commissionRuleApplied = 'Sem comissão configurada';

    if (assignedPilot) {
      if (assignedPilot.commissionModel === 'por_hectare') {
        const rate = assignedPilot.ratePerHectare || 0;
        calculatedCommission = quote.areaHa * rate;
        commissionRuleApplied = `R$ ${rate.toFixed(2)}/ha`;
      } else if (assignedPilot.commissionModel === 'percentual') {
        const rate = assignedPilot.percentRate || 0;
        calculatedCommission = quote.finalAmount * (rate / 100);
        commissionRuleApplied = `${rate}% do valor do serviço`;
      } else if (assignedPilot.commissionModel === 'hibrido') {
        const rate = assignedPilot.hybridRatePerHa || 0;
        calculatedCommission = quote.areaHa * rate;
        commissionRuleApplied = `Híbrido: R$ ${rate.toFixed(2)}/ha`;
      } else if (assignedPilot.commissionModel === 'fixo') {
        calculatedCommission = 0;
        commissionRuleApplied = `Salário Fixo (R$ ${(assignedPilot.fixedSalary || 0).toFixed(2)}/mês)`;
      }
    }

    const calculatedPilotCommission = Math.round(calculatedCommission * 100) / 100;

    const newOS: ServiceOrder = {
      id: `os-${Date.now()}`,
      osNumber,
      companyId: currentCompany.id,
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientWhatsapp: quote.clientWhatsapp || '',
      propertyId: quote.propertyId,
      propertyName: quote.propertyName,
      propertyCoords,
      talhaoId,
      talhaoName,
      crop: quote.crop,
      areaHa: quote.areaHa,
      serviceType: quote.serviceType,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '08:00',
      status: 'agendado',
      pilotId: assignedPilot ? assignedPilot.id : '',
      pilotName: assignedPilot ? assignedPilot.name : 'Piloto a Definir',
      droneId: assignedDrone ? assignedDrone.id : '',
      droneModel: assignedDrone ? assignedDrone.model : (quote.droneModelPreferred || 'Drone a Definir'),
      products: [],
      pricePerHa: quote.pricePerHa,
      grossAmount: quote.subtotal || (quote.areaHa * quote.pricePerHa),
      displacementFee: quote.displacementFee || 0,
      additionalFees: quote.additionalFees || 0,
      discount: quote.discount || 0,
      finalAmount: quote.finalAmount,
      estimatedCost: quote.estimatedCost || 0,
      netMargin: quote.estimatedMargin ?? (quote.finalAmount - (quote.estimatedCost || 0)),
      paymentTerms: quote.paymentTerms || '30 dias após aplicação',
      calculatedPilotCommission,
      commissionStatus: 'prevista',
      clientSigned: false,
      notes: `Gerada a partir do orçamento ${quote.quoteNumber}.`,
    };

    // Call server conversion endpoint for atomic backend persistence
    const res = await apiSync(`/api/quotes/${quoteId}/convert`, 'POST', { newOS });
    const savedOS = (res && (res.data || res.serviceOrder)) ? (res.data || res.serviceOrder) : newOS;

    setAllServiceOrders((prev) => [savedOS, ...prev.filter((o) => o.id !== savedOS.id)]);

    // Update Quote to convertido_em_os with linked OS ID
    setAllQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: 'convertido_em_os', convertedToOsId: savedOS.id } : q))
    );

    // Create Pilot Commission Record if pilot exists and not already created
    if (assignedPilot && !pilotCommissions.some((c) => c.osId === savedOS.id)) {
      const newCommission: PilotCommissionRecord = {
        id: `comm-${Date.now()}`,
        companyId: currentCompany.id,
        pilotId: assignedPilot.id,
        pilotName: assignedPilot.name,
        osId: savedOS.id,
        osNumber: savedOS.osNumber,
        clientName: savedOS.clientName,
        serviceDate: savedOS.scheduledDate,
        areaSprayedHa: savedOS.areaHa,
        serviceAmount: savedOS.finalAmount,
        commissionRuleApplied,
        commissionAmount: calculatedPilotCommission,
        status: 'prevista',
        notes: 'Comissão provisionada na geração da OS a partir de orçamento.',
      };
      setAllPilotCommissions((prev) => [newCommission, ...prev.filter((c) => c.id !== newCommission.id)]);
    }

    logAction(
      'Geração de OS a partir de Orçamento',
      'Ordem de Serviço',
      savedOS.osNumber,
      `Converteu ${quote.quoteNumber} em ${savedOS.osNumber} para ${savedOS.clientName}`
    );

    return savedOS;
  };

  // Add Service Order directly
  const addServiceOrder = async (osData: Omit<ServiceOrder, 'id' | 'osNumber'> & { id?: string; osNumber?: string }): Promise<ServiceOrder> => {
    const osNumber = osData.osNumber || generateNextOSNumber();
    const newOS: ServiceOrder = {
      ...osData,
      id: osData.id || `os-${Date.now()}`,
      osNumber,
      companyId: currentCompany.id,
    };

    const res = await apiSync('/api/service-orders', 'POST', newOS);
    const savedOS = (res && (res.data || res.serviceOrder)) ? (res.data || res.serviceOrder) : newOS;

    setAllServiceOrders((prev) => [savedOS, ...prev.filter((o) => o.id !== savedOS.id)]);

    // Create commission records if pilot or caldista exists
    const pilot = pilots.find((p) => p.id === savedOS.pilotId);
    if (pilot && !pilotCommissions.some((c) => c.osId === savedOS.id && (c.pilotId === pilot.id || c.professionalRole === 'piloto'))) {
      let commRule = pilot.commissionModel;
      if (pilot.commissionType === 'por_hectare' || pilot.commissionModel === 'por_hectare') {
        commRule = `R$ ${(pilot.commissionValue ?? pilot.ratePerHectare ?? 0).toFixed(2)}/ha`;
      } else if (pilot.commissionType === 'percentual' || pilot.commissionModel === 'percentual') {
        commRule = `${pilot.commissionValue ?? pilot.percentRate ?? 0}% do serviço`;
      } else if (pilot.commissionType === 'fixo_por_servico') {
        commRule = `R$ ${(pilot.commissionValue ?? pilot.fixedPerService ?? 0).toFixed(2)} fixo/OS`;
      } else if (pilot.commissionModel === 'hibrido') {
        commRule = `Híbrido: R$ ${(pilot.hybridRatePerHa || 0).toFixed(2)}/ha`;
      } else if (pilot.commissionModel === 'fixo') {
        commRule = `Fixo (R$ ${(pilot.fixedSalary || 0).toFixed(2)}/mês)`;
      }

      const newComm: PilotCommissionRecord = {
        id: `comm-${Date.now()}-pilot`,
        companyId: currentCompany.id,
        pilotId: pilot.id,
        pilotName: pilot.name,
        professionalRole: 'piloto',
        professionalType: 'piloto',
        osId: savedOS.id,
        osNumber: savedOS.osNumber,
        clientName: savedOS.clientName,
        propertyName: savedOS.propertyName,
        serviceDate: savedOS.scheduledDate,
        areaSprayedHa: savedOS.areaHa,
        serviceAmount: savedOS.finalAmount,
        commissionRuleApplied: commRule,
        commissionAmount: savedOS.calculatedPilotCommission,
        status: 'prevista',
      };
      setAllPilotCommissions((prev) => [newComm, ...prev.filter((c) => c.id !== newComm.id)]);
    }

    const caldistaId = savedOS.caldistaId || savedOS.auxiliarId;
    const caldista = pilots.find((p) => p.id === caldistaId);
    if (caldista && !pilotCommissions.some((c) => c.osId === savedOS.id && (c.pilotId === caldista.id || c.professionalRole === 'auxiliar_caldista'))) {
      let caldistaCommRule = 'Auxiliar / Caldista';
      if (caldista.commissionType === 'por_hectare' || caldista.commissionModel === 'por_hectare') {
        caldistaCommRule = `R$ ${(caldista.commissionValue ?? caldista.ratePerHectare ?? 0).toFixed(2)}/ha`;
      } else if (caldista.commissionType === 'percentual' || caldista.commissionModel === 'percentual') {
        caldistaCommRule = `${caldista.commissionValue ?? caldista.percentRate ?? 0}% do serviço`;
      } else if (caldista.commissionType === 'fixo_por_servico') {
        caldistaCommRule = `R$ ${(caldista.commissionValue ?? caldista.fixedPerService ?? 0).toFixed(2)} fixo/OS`;
      } else if (caldista.hasFixedSalary) {
        caldistaCommRule = `Fixo (R$ ${(caldista.fixedSalary || 0).toFixed(2)}/mês)`;
      }

      const newCaldistaComm: PilotCommissionRecord = {
        id: `comm-${Date.now()}-caldista`,
        companyId: currentCompany.id,
        pilotId: caldista.id,
        pilotName: caldista.name,
        professionalRole: 'auxiliar_caldista',
        professionalType: 'auxiliar_caldista',
        osId: savedOS.id,
        osNumber: savedOS.osNumber,
        clientName: savedOS.clientName,
        propertyName: savedOS.propertyName,
        serviceDate: savedOS.scheduledDate,
        areaSprayedHa: savedOS.areaHa,
        serviceAmount: savedOS.finalAmount,
        commissionRuleApplied: caldistaCommRule,
        commissionAmount: savedOS.calculatedCaldistaCommission || 0,
        status: 'prevista',
      };
      setAllPilotCommissions((prev) => [newCaldistaComm, ...prev.filter((c) => c.id !== newCaldistaComm.id)]);
    }

    logAction('Criação de Ordem de Serviço', 'Ordem de Serviço', savedOS.osNumber, `Criou OS para ${savedOS.clientName} (${savedOS.areaHa} ha - ${savedOS.serviceType})`);
    return savedOS;
  };

  // Update existing OS (e.g. operational parameters, pricing, scheduling, etc.)
  const updateServiceOrder = async (updatedOS: ServiceOrder) => {
    await apiSync(`/api/service-orders/${updatedOS.id}`, 'PUT', updatedOS);

    setAllServiceOrders((prev) =>
      prev.map((os) => (os.id === updatedOS.id && os.companyId === currentCompany.id ? updatedOS : os))
    );

    // If pilot changed or commission amount changed, update commission
    setAllPilotCommissions((prev) =>
      prev.map((c) => {
        if (c.osId === updatedOS.id && c.companyId === currentCompany.id) {
          return {
            ...c,
            pilotId: updatedOS.pilotId,
            pilotName: updatedOS.pilotName,
            serviceDate: updatedOS.scheduledDate,
            areaSprayedHa: updatedOS.areaHa,
            serviceAmount: updatedOS.finalAmount,
            commissionAmount: updatedOS.calculatedPilotCommission,
          };
        }
        return c;
      })
    );

    logAction('Edição de Ordem de Serviço', 'Ordem de Serviço', updatedOS.osNumber, `Atualizou dados e parâmetros da OS ${updatedOS.osNumber}`);
  };

  // Update OS Status & Lifecycle Transitions
  const updateServiceOrderStatus = async (osId: string, status: ServiceOrder['status'], extra?: Partial<ServiceOrder>) => {
    const today = new Date().toISOString().split('T')[0];
    await apiSync(`/api/service-orders/${osId}/status`, 'PATCH', { status, ...extra });

    setAllServiceOrders((prev) =>
      prev.map((os) => {
        if (os.id === osId && os.companyId === currentCompany.id) {
          const oldStatus = os.status;
          const updated: ServiceOrder = {
            ...os,
            ...extra,
            status,
            completedDate: status === 'concluido' ? (extra?.completedDate || os.completedDate || today) : os.completedDate,
            finalizedAt: status === 'concluido' ? (extra?.finalizedAt || os.finalizedAt || new Date().toISOString()) : os.finalizedAt,
            completedAt: status === 'concluido' ? (extra?.completedAt || os.completedAt || new Date().toISOString()) : os.completedAt,
          };

          // If finished or invoiced, generate Account Receivable if not already created
          if (status === 'concluido' || status === 'faturado' || status === 'pago') {
            setAllAccountsReceivable((rList) => {
              const exists = rList.some((r) => r.osId === os.id && r.companyId === currentCompany.id);
              if (!exists) {
                const newRec: AccountReceivable = {
                  id: `rec-${Date.now()}`,
                  companyId: currentCompany.id,
                  clientId: os.clientId,
                  clientName: os.clientName,
                  osId: os.id,
                  osNumber: os.osNumber,
                  description: `Serviço ${os.serviceType} - ${os.areaHa} ha (${os.propertyName})`,
                  amount: os.finalAmount,
                  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: status === 'pago' ? 'pago' : 'aberto',
                  paymentDate: status === 'pago' ? today : undefined,
                  paymentMethod: 'boleto',
                  notes: 'Conta a receber gerada automaticamente ao faturar/concluir a OS.',
                };
                return [newRec, ...rList];
              }
              if (status === 'pago') {
                return rList.map((r) =>
                  r.osId === os.id && r.companyId === currentCompany.id
                    ? { ...r, status: 'pago', paymentDate: r.paymentDate || today }
                    : r
                );
              }
              return rList;
            });

            // Update Pilot Commission status
            setAllPilotCommissions((commList) =>
              commList.map((c) => {
                if (c.osId === os.id && c.companyId === currentCompany.id) {
                  if (status === 'pago') {
                    return {
                      ...c,
                      status: 'liberada',
                      clientPaidDate: c.clientPaidDate || today,
                      releasedDate: c.releasedDate || today,
                    };
                  }
                  if (c.status === 'prevista') {
                    return { ...c, status: 'aguardando_pagamento_cliente' };
                  }
                }
                return c;
              })
            );
          }

          // If OS is cancelled, cleanup pending unpaid receivable and unpaid commission
          if (status === 'cancelado') {
            setAllAccountsReceivable((rList) =>
              rList.filter((r) => (r.osId !== os.id || r.companyId !== currentCompany.id) || r.status === 'pago')
            );
            setAllPilotCommissions((commList) =>
              commList.filter((c) => (c.osId !== os.id || c.companyId !== currentCompany.id) || c.status === 'paga')
            );
          }

          logAction(
            'Atualização de Status de OS',
            'Ordem de Serviço',
            os.osNumber,
            `Alterou status da OS de ${oldStatus} para ${status}`,
            oldStatus,
            status
          );

          return updated;
        }
        return os;
      })
    );
  };

  // Field Occurrence Registration
  const registerFieldOccurrence = async (
    occData: Omit<Occurrence, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const localTimestamp = occData.timestamp || `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const newOcc: Occurrence = {
      ...occData,
      id: occData.id || `occ-${Date.now()}`,
      companyId: occData.companyId || currentCompany.id,
      timestamp: localTimestamp,
    };

    const res = await apiSync('/api/occurrences', 'POST', newOcc);
    const savedOcc = (res && (res.data || res.occurrence)) ? (res.data || res.occurrence) : newOcc;

    setAllOccurrences((prev) => [savedOcc, ...prev.filter((o) => o.id !== savedOcc.id)]);

    // Update OS counter
    setAllServiceOrders((prev) =>
      prev.map((os) =>
        os.id === occData.osId
          ? { ...os, fieldOccurrencesCount: (os.fieldOccurrencesCount || 0) + 1 }
          : os
      )
    );

    logAction(
      'Registro de Ocorrência de Campo',
      'Ordem de Serviço',
      occData.osNumber,
      `Ocorrência (${occData.type}) registrada pelo piloto ${occData.pilotName}: ${occData.description}`
    );
  };

  // Client / Property / Talhao Actions
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'totalRevenue' | 'totalHectares'> & { id?: string }): Promise<Client> => {
    const newClient: Client = {
      ...clientData,
      id: clientData.id || `client-${Date.now()}`,
      companyId: currentCompany.id,
      totalRevenue: 0,
      totalHectares: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const res = await apiSync('/api/clients', 'POST', newClient);
    const savedClient = (res && (res.data || res.client)) ? (res.data || res.client) : newClient;

    setAllClients((prev) => [savedClient, ...prev.filter((c) => c.id !== savedClient.id)]);
    logAction('Cadastro de Cliente', 'Cliente', savedClient.name, `Cadastrou cliente ${savedClient.name} (${savedClient.city}/${savedClient.state})`);
    return savedClient;
  };

  const updateClient = async (clientId: string, updates: Partial<Client>): Promise<Client> => {
    const res = await apiSync(`/api/clients/${clientId}`, 'PUT', updates);
    const updatedClient = (res && (res.data || res.client)) ? (res.data || res.client) : updates;

    setAllClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...updatedClient } : c))
    );
    // If client name changes, update associated properties and talhoes as well
    if (updates.name) {
      setAllProperties((prev) =>
        prev.map((p) => (p.clientId === clientId ? { ...p, clientName: updates.name! } : p))
      );
      setAllTalhoes((prev) =>
        prev.map((t) => (t.clientId === clientId ? { ...t, clientName: updates.name! } : t))
      );
    }
    logAction('Atualização de Cliente', 'Cliente', updates.name || clientId, `Atualizou dados do cliente ${updates.name || clientId}`);
    const finalClient = allClients.find((c) => c.id === clientId) || { ...updates, id: clientId } as Client;
    return finalClient;
  };

  const deleteClient = async (clientId: string) => {
    const client = allClients.find((c) => c.id === clientId);
    await apiSync(`/api/clients/${clientId}`, 'DELETE');
    setAllClients((prev) => prev.filter((c) => c.id !== clientId));
    logAction('Exclusão de Cliente', 'Cliente', client?.name || clientId, `Removeu cliente ${client?.name || clientId}`);
  };

  const addProperty = async (propData: Omit<Property, 'id'> & { id?: string }): Promise<Property> => {
    const newProp: Property = {
      ...propData,
      id: propData.id || `prop-${Date.now()}`,
      companyId: currentCompany.id,
    };

    const res = await apiSync('/api/properties', 'POST', newProp);
    const savedProp = (res && (res.data || res.property)) ? (res.data || res.property) : newProp;

    setAllProperties((prev) => [savedProp, ...prev.filter((p) => p.id !== savedProp.id)]);
    logAction('Cadastro de Propriedade', 'Cliente', savedProp.name, `Cadastrou propriedade ${savedProp.name} para o cliente ${savedProp.clientName}`);
    return savedProp;
  };

  const updateProperty = async (propertyId: string, updates: Partial<Property>) => {
    await apiSync(`/api/properties/${propertyId}`, 'PUT', updates);
    setAllProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, ...updates } : p))
    );
    if (updates.name) {
      setAllTalhoes((prev) =>
        prev.map((t) => (t.propertyId === propertyId ? { ...t, propertyName: updates.name! } : t))
      );
    }
    logAction('Atualização de Propriedade', 'Cliente', updates.name || propertyId, `Atualizou propriedade ${updates.name || propertyId}`);
  };

  const deleteProperty = async (propertyId: string) => {
    const prop = allProperties.find((p) => p.id === propertyId);
    await apiSync(`/api/properties/${propertyId}`, 'DELETE');
    setAllProperties((prev) => prev.filter((p) => p.id !== propertyId));
    logAction('Exclusão de Propriedade', 'Cliente', prop?.name || propertyId, `Removeu propriedade ${prop?.name || propertyId}`);
  };

  const addTalhao = async (talhaoData: Omit<Talhao, 'id'> & { id?: string }): Promise<Talhao> => {
    const newTalhao: Talhao = {
      ...talhaoData,
      id: talhaoData.id || `talhao-${Date.now()}`,
      companyId: currentCompany.id,
    };

    const res = await apiSync('/api/talhoes', 'POST', newTalhao);
    const savedTalhao = (res && (res.data || res.talhao)) ? (res.data || res.talhao) : newTalhao;

    setAllTalhoes((prev) => [savedTalhao, ...prev.filter((t) => t.id !== savedTalhao.id)]);
    logAction('Cadastro de Talhão', 'Cliente', savedTalhao.name, `Cadastrou talhão ${savedTalhao.name} (${savedTalhao.areaHa} ha - ${savedTalhao.crop})`);
    return savedTalhao;
  };

  const updateTalhao = async (talhaoId: string, updates: Partial<Talhao>) => {
    await apiSync(`/api/talhoes/${talhaoId}`, 'PUT', updates);
    setAllTalhoes((prev) =>
      prev.map((t) => (t.id === talhaoId ? { ...t, ...updates } : t))
    );
    logAction('Atualização de Talhão', 'Cliente', updates.name || talhaoId, `Atualizou talhão ${updates.name || talhaoId}`);
  };

  const deleteTalhao = async (talhaoId: string) => {
    const talhao = allTalhoes.find((t) => t.id === talhaoId);
    await apiSync(`/api/talhoes/${talhaoId}`, 'DELETE');
    setAllTalhoes((prev) => prev.filter((t) => t.id !== talhaoId));
    logAction('Exclusão de Talhão', 'Cliente', talhao?.name || talhaoId, `Removeu talhão ${talhao?.name || talhaoId}`);
  };

  // Drone & Battery Actions
  const addDrone = async (droneData: Partial<Drone> & { model: string; manufacturer: string; serialNumber: string; assetTag: string }): Promise<Drone> => {
    const newDrone: Drone = {
      id: droneData.id || `drone-${Date.now()}`,
      companyId: currentCompany.id,
      name: droneData.name || droneData.model,
      model: droneData.model,
      manufacturer: droneData.manufacturer,
      serialNumber: droneData.serialNumber,
      assetTag: droneData.assetTag || `DRONE-${Date.now().toString().slice(-3)}`,
      year: droneData.year || new Date().getFullYear(),
      purchaseDate: droneData.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseValue: droneData.purchaseValue || 0,
      status: droneData.status || 'disponivel',
      flightHours: droneData.flightHours !== undefined ? Number(droneData.flightHours) : 0,
      accumulatedHectares: droneData.accumulatedHectares !== undefined ? Number(droneData.accumulatedHectares) : 0,
      tankCapacityLiters: droneData.tankCapacityLiters !== undefined ? Number(droneData.tankCapacityLiters) : 40,
      maxFlowRateLitersMin: droneData.maxFlowRateLitersMin || 16,
      sprayWidthMeters: droneData.sprayWidthMeters || 11.0,
      anacRegistration: droneData.anacRegistration || '',
      insuranceValidity: droneData.insuranceValidity || '',
      lastMaintenanceDate: droneData.lastMaintenanceDate || '',
      nextMaintenanceHours: droneData.nextMaintenanceHours || 100,
      notes: droneData.notes || '',
      photoUrl: droneData.photoUrl || '',
      version: 1,
    };

    const res = await apiSync('/api/drones', 'POST', newDrone);
    const savedDrone = (res && (res.data || res.drone)) ? (res.data || res.drone) : newDrone;

    setAllDrones((prev) => [savedDrone, ...prev.filter((d) => d.id !== savedDrone.id)]);
    logAction('Cadastro de Drone', 'Drone', savedDrone.model, `Cadastrou drone ${savedDrone.name || savedDrone.model} (${savedDrone.assetTag})`);
    return savedDrone;
  };

  const updateDrone = async (updatedDrone: Drone) => {
    await apiSync(`/api/drones/${updatedDrone.id}`, 'PUT', updatedDrone);
    setAllDrones((prev) =>
      prev.map((d) => (d.id === updatedDrone.id && d.companyId === currentCompany.id ? { ...updatedDrone } : d))
    );
    logAction('Atualização de Drone', 'Drone', updatedDrone.model, `Atualizou dados do drone ${updatedDrone.name || updatedDrone.model} (${updatedDrone.assetTag})`);
  };

  const deleteDrone = async (droneId: string): Promise<{ success: boolean; reason?: string }> => {
    const drone = allDrones.find((d) => d.id === droneId && d.companyId === currentCompany.id);
    if (!drone) return { success: false, reason: 'Drone não encontrado.' };

    const activeOS = allServiceOrders.find(
      (os) => os.companyId === currentCompany.id && os.droneId === droneId && (os.status === 'em_operacao' || os.status === 'em_deslocamento')
    );
    if (activeOS) {
      return {
        success: false,
        reason: `Não é possível excluir: O drone está alocado na Ordem de Serviço ${activeOS.osNumber} que está em andamento.`,
      };
    }

    await apiSync(`/api/drones/${droneId}`, 'DELETE');

    // Desvincular baterias associadas
    setAllBatteries((prev) =>
      prev.map((b) => (b.droneId === droneId && b.companyId === currentCompany.id ? { ...b, droneId: undefined } : b))
    );

    setAllDrones((prev) => prev.filter((d) => d.id !== droneId));
    logAction('Exclusão de Drone', 'Drone', drone.model, `Removeu drone ${drone.name || drone.model} (${drone.assetTag})`);
    return { success: true };
  };

  const updateDroneStatus = async (droneId: string, status: Drone['status']) => {
    await apiSync(`/api/drones/${droneId}/status`, 'PATCH', { status });
    setAllDrones((prev) =>
      prev.map((d) => (d.id === droneId && d.companyId === currentCompany.id ? { ...d, status } : d))
    );
  };

  const addBattery = async (batteryData: Omit<Battery, 'id'> & { id?: string }): Promise<Battery> => {
    const newBattery: Battery = {
      ...batteryData,
      id: batteryData.id || `bat-${Date.now()}`,
      companyId: currentCompany.id,
      identifier: batteryData.identifier || `Bateria #${Date.now().toString().slice(-3)}`,
      manufacturer: batteryData.manufacturer || 'DJI Agriculture',
      model: batteryData.model || 'DB1560',
      serialNumber: batteryData.serialNumber || `SN-BAT-${Date.now().toString().slice(-4)}`,
      cycles: batteryData.cycles !== undefined ? Number(batteryData.cycles) : 0,
      maxRecommendedCycles: batteryData.maxRecommendedCycles || 500,
      capacity: batteryData.capacity || '30.000 mAh',
      hours: batteryData.hours || 0,
      healthPercent: batteryData.healthPercent !== undefined ? Number(batteryData.healthPercent) : 100,
      condition: batteryData.condition || 'excelente',
      status: batteryData.status || 'disponivel',
      purchaseDate: batteryData.purchaseDate || new Date().toISOString().split('T')[0],
      lastTestDate: batteryData.lastTestDate || new Date().toISOString().split('T')[0],
      notes: batteryData.notes || '',
      version: 1,
    };

    const res = await apiSync('/api/batteries', 'POST', newBattery);
    const savedBattery = (res && (res.data || res.battery)) ? (res.data || res.battery) : newBattery;

    setAllBatteries((prev) => [savedBattery, ...prev.filter((b) => b.id !== savedBattery.id)]);
    logAction('Cadastro de Bateria', 'Bateria' as any, savedBattery.identifier, `Cadastrou bateria ${savedBattery.identifier}`);
    return savedBattery;
  };

  const updateBattery = async (updatedBattery: Battery) => {
    await apiSync(`/api/batteries/${updatedBattery.id}`, 'PUT', updatedBattery);
    setAllBatteries((prev) =>
      prev.map((b) => (b.id === updatedBattery.id && b.companyId === currentCompany.id ? { ...updatedBattery } : b))
    );
    logAction('Atualização de Bateria', 'Bateria' as any, updatedBattery.identifier, `Atualizou bateria ${updatedBattery.identifier}`);
  };

  const deleteBattery = async (batteryId: string): Promise<{ success: boolean; reason?: string }> => {
    const battery = allBatteries.find((b) => b.id === batteryId && b.companyId === currentCompany.id);
    if (!battery) return { success: false, reason: 'Bateria não encontrada.' };

    await apiSync(`/api/batteries/${batteryId}`, 'DELETE');
    setAllBatteries((prev) => prev.filter((b) => b.id !== batteryId));
    logAction('Exclusão de Bateria', 'Bateria' as any, battery.identifier, `Removeu bateria ${battery.identifier}`);
    return { success: true };
  };

  const updateBatteryCycles = async (batteryId: string, newCycles: number) => {
    await apiSync(`/api/batteries/${batteryId}/cycles`, 'PATCH', { cycles: newCycles });
    setAllBatteries((prev) =>
      prev.map((b) => {
        if (b.id === batteryId && b.companyId === currentCompany.id) {
          const max = b.maxRecommendedCycles || 500;
          const health = Math.max(10, Math.round(((max - newCycles) / max) * 100));
          const cond: BatteryStatus =
            health > 80 ? 'excelente' : health > 50 ? 'boa' : health > 25 ? 'atencao' : 'limite_atingido';
          return { ...b, cycles: newCycles, healthPercent: health, condition: cond };
        }
        return b;
      })
    );
  };

  const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id'> & { id?: string }) => {
    const newRec: MaintenanceRecord = {
      ...recordData,
      id: recordData.id || `maint-${Date.now()}`,
      companyId: currentCompany.id,
    };

    const res = await apiSync('/api/maintenance', 'POST', newRec);
    const savedRec = (res && (res.data || res.maintenance)) ? (res.data || res.maintenance) : newRec;

    setAllMaintenanceRecords((prev) => [savedRec, ...prev.filter((m) => m.id !== savedRec.id)]);

    // Also add to Accounts Payable if cost > 0
    if (savedRec.cost > 0) {
      const newPay: AccountPayable = {
        id: `pay-${Date.now()}`,
        companyId: currentCompany.id,
        costCenter: 'manutencao',
        supplierName: savedRec.provider,
        description: `Manutenção ${savedRec.type.toUpperCase()}: ${savedRec.droneModel} - ${savedRec.description.substring(0, 40)}`,
        amount: savedRec.cost,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'aberto',
        droneId: savedRec.droneId,
        isRecurring: false,
      };
      await apiSync('/api/finance/payables', 'POST', newPay);
      setAllAccountsPayable((prev) => [newPay, ...prev.filter((p) => p.id !== newPay.id)]);
    }

    logAction('Registro de Manutenção', 'Drone', savedRec.droneModel, `Registrou manutenção ${savedRec.type} no valor de R$ ${savedRec.cost}`);
  };

  const deleteMaintenanceRecord = async (maintId: string) => {
    await apiSync(`/api/maintenance/${maintId}`, 'DELETE');
    setAllMaintenanceRecords((prev) => prev.filter((m) => m.id !== maintId));
  };

  // Pilot Actions
  const addPilot = async (pilotData: Omit<Pilot, 'id' | 'totalHectaresSprayed' | 'flightHours'>): Promise<Pilot> => {
    const newPilot: Pilot = {
      ...pilotData,
      id: `pilot-${Date.now()}`,
      companyId: currentCompany.id,
      totalHectaresSprayed: 0,
      flightHours: 0,
      documents: pilotData.documents || [],
      version: 1,
    };
    const res = await apiSync('/api/pilots', 'POST', newPilot);
    const savedPilot = (res && (res.data || res.pilot)) ? (res.data || res.pilot) : newPilot;
    setAllPilots((prev) => [savedPilot, ...prev.filter((p) => p.id !== savedPilot.id)]);
    logAction('Cadastro de Piloto', 'Piloto', savedPilot.name, `Cadastrou piloto ${savedPilot.name} com modelo de comissão ${savedPilot.commissionModel}`);
    return savedPilot;
  };

  const updatePilot = async (pilotId: string, updates: Partial<Pilot>): Promise<Pilot | null> => {
    const res = await apiSync(`/api/pilots/${pilotId}`, 'PUT', updates);
    const updatedPilot: Pilot = (res && (res.data || res.pilot)) ? (res.data || res.pilot) : updates;
    setAllPilots((prev) => prev.map((p) => (p.id === pilotId && p.companyId === currentCompany.id ? { ...p, ...updatedPilot } : p)));
    logAction('Atualização de Profissional', 'Piloto', updates.name || pilotId, `Atualizou dados do profissional ${updates.name || pilotId}`);
    return updatedPilot;
  };

  const deletePilot = async (pilotId: string) => {
    const p = allPilots.find((pilot) => pilot.id === pilotId);
    await apiSync(`/api/pilots/${pilotId}`, 'DELETE');
    setAllPilots((prev) => prev.filter((pilot) => pilot.id !== pilotId));
    logAction('Exclusão de Profissional', 'Piloto', p?.name || pilotId, `Removeu profissional ${p?.name || pilotId}`);
  };

  // Financial Actions & The Fundamental Commission Release Rule
  const addAccountReceivable = async (recData: Omit<AccountReceivable, 'id'> & { id?: string }) => {
    const newRec: AccountReceivable = {
      ...recData,
      id: recData.id || `rec-${Date.now()}`,
      companyId: currentCompany.id,
    };
    const res = await apiSync('/api/finance/receivables', 'POST', newRec);
    const savedRec = (res && (res.data || res.receivable)) ? (res.data || res.receivable) : newRec;
    setAllAccountsReceivable((prev) => [savedRec, ...prev.filter((r) => r.id !== savedRec.id)]);
  };

  // Settle Account Receivable -> TRIGGERS PILOT COMMISSION LIBERATION!
  const settleAccountReceivable = async (recId: string, paymentMethod: PaymentMethod | string = 'pix') => {
    const today = new Date().toISOString().split('T')[0];
    let matchingOsNumber = '';
    const normalizedMethod = typeof paymentMethod === 'string' ? paymentMethod.toLowerCase() : paymentMethod;
    const safeMethod: PaymentMethod =
      normalizedMethod === 'pix' ||
      normalizedMethod === 'transferencia' ||
      normalizedMethod === 'boleto' ||
      normalizedMethod === 'cartao' ||
      normalizedMethod === 'dinheiro'
        ? (normalizedMethod as PaymentMethod)
        : 'pix';

    await apiSync(`/api/finance/receivables/${recId}/settle`, 'POST', { paymentMethod: safeMethod });

    setAllAccountsReceivable((prev) =>
      prev.map((rec) => {
        if (rec.id === recId && rec.companyId === currentCompany.id) {
          if (rec.status === 'pago') return rec; // Idempotent: already paid
          matchingOsNumber = rec.osNumber;
          logAction(
            'Baixa de Conta a Receber',
            'Financeiro',
            rec.osNumber,
            `Recebeu R$ ${rec.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do cliente ${rec.clientName} via ${safeMethod.toUpperCase()}`,
            'Aberto',
            'Pago'
          );
          return {
            ...rec,
            status: 'pago',
            paymentDate: today,
            paymentMethod: safeMethod,
          };
        }
        return rec;
      })
    );

    // Fundamental Rule: Release Pilot Commission when Client Pays!
    if (matchingOsNumber) {
      setAllPilotCommissions((prev) =>
        prev.map((comm) => {
          if (comm.companyId === currentCompany.id && (comm.osNumber === matchingOsNumber || (matchingOsNumber && comm.osNumber.includes(matchingOsNumber)))) {
            logAction(
              'Comissão de Piloto Liberada Automaticamente',
              'Comissão',
              comm.osNumber,
              `Comissão de R$ ${comm.commissionAmount.toFixed(2)} do piloto ${comm.pilotName} foi LIBERADA após pagamento do cliente.`,
              'Aguardando Pagamento',
              'Liberada'
            );
            return {
              ...comm,
              status: 'liberada',
              clientPaidDate: today,
              releasedDate: today,
            };
          }
          return comm;
        })
      );

      // Update OS status to 'pago'
      setAllServiceOrders((prev) =>
        prev.map((os) => (os.companyId === currentCompany.id && os.osNumber === matchingOsNumber ? { ...os, status: 'pago' } : os))
      );
    }
  };

  const addAccountPayable = async (payData: Omit<AccountPayable, 'id'> & { id?: string }) => {
    const newPay: AccountPayable = {
      ...payData,
      id: payData.id || `pay-${Date.now()}`,
      companyId: currentCompany.id,
    };
    const res = await apiSync('/api/finance/payables', 'POST', newPay);
    const savedPay = (res && (res.data || res.payable)) ? (res.data || res.payable) : newPay;
    setAllAccountsPayable((prev) => [savedPay, ...prev.filter((p) => p.id !== savedPay.id)]);
  };

  const settleAccountPayable = async (payId: string) => {
    const today = new Date().toISOString().split('T')[0];
    await apiSync(`/api/finance/payables/${payId}/pay`, 'POST');
    setAllAccountsPayable((prev) =>
      prev.map((p) => {
        if (p.id === payId && p.companyId === currentCompany.id) {
          if (p.status === 'pago') return p; // Idempotent: already paid
          logAction('Pagamento de Conta a Pagar', 'Financeiro', p.supplierName, `Pagou R$ ${p.amount.toFixed(2)} para ${p.supplierName}`);
          return { ...p, status: 'pago', paymentDate: today };
        }
        return p;
      })
    );
  };

  const updateCommissionStatus = async (commissionId: string, status: PilotCommissionRecord['status']) => {
    const today = new Date().toISOString().split('T')[0];
    await apiSync(`/api/commissions/${commissionId}/status`, 'PATCH', { status });
    setAllPilotCommissions((prev) =>
      prev.map((comm) => {
        if (comm.id === commissionId && comm.companyId === currentCompany.id) {
          logAction(
            'Atualização de Comissão',
            'Comissão',
            comm.osNumber,
            `Alterou comissão de ${comm.pilotName} para ${status.toUpperCase()} (R$ ${comm.commissionAmount.toFixed(2)})`
          );
          return {
            ...comm,
            status,
            approvedDate: status === 'aprovada' ? today : comm.approvedDate,
            paidDate: status === 'paga' ? today : comm.paidDate,
          };
        }
        return comm;
      })
    );
  };

  // Fitossanitário Product & Documents
  const addProduct = async (prodData: Omit<FitossanitarioProduct, 'id' | 'lastUpdated'>): Promise<FitossanitarioProduct> => {
    const newProd: FitossanitarioProduct = {
      ...prodData,
      id: `prod-${Date.now()}`,
      status: prodData.status || 'ativo',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setProducts((prev) => [newProd, ...prev]);
    logAction('Cadastro de Produto Fitossanitário', 'Configuração', newProd.commercialName, `Cadastrou o produto ${newProd.commercialName} (${newProd.productClass}) - ${newProd.activeIngredient}`);
    return newProd;
  };

  const updateProduct = async (productId: string, updates: Partial<FitossanitarioProduct>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              ...updates,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : p
      )
    );
    logAction('Atualização de Produto Fitossanitário', 'Configuração', productId, `Atualizou informações do produto ${updates.commercialName || productId}`);
  };

  const toggleProductStatus = async (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStatus = p.status === 'inativo' ? 'ativo' : 'inativo';
          logAction('Alteração de Status de Produto', 'Configuração', p.commercialName, `Alterou status do produto ${p.commercialName} para ${newStatus.toUpperCase()}`);
          return {
            ...p,
            status: newStatus,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
        }
        return p;
      })
    );
  };

  const addDocument = async (docData: Omit<DocumentRecord, 'id' | 'uploadDate'>) => {
    const newDoc: DocumentRecord = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0],
      companyId: currentCompany.id,
    };
    setAllDocuments((prev) => [newDoc, ...prev]);
    logAction('Upload de Documento', 'Configuração', newDoc.title, `Anexou documento ${newDoc.title} (${newDoc.category})`);
  };

  // Receipt Notes & Field Expenses Handlers
  const addReceiptNote = async (noteData: Omit<ReceiptNote, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<ReceiptNote> => {
    const newNote: ReceiptNote = {
      ...noteData,
      id: noteData.id || `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: noteData.createdAt || new Date().toISOString(),
      companyId: currentCompany.id,
      pilotId: noteData.pilotId !== undefined ? noteData.pilotId : '',
      pilotName: noteData.pilotName || (noteData.pilotId ? 'Piloto' : 'Equipe de Campo (Sem piloto associado)'),
    };

    const res = await apiSync('/api/reimbursements', 'POST', newNote);
    const savedNote = (res && (res.data || res.receiptNote)) ? (res.data || res.receiptNote) : newNote;

    setAllReceiptNotes((prev) => [savedNote, ...prev.filter((n) => n.id !== savedNote.id)]);
    logAction(
      'Registro de Notinha/Despesa',
      'Financeiro',
      savedNote.id,
      `Piloto ${savedNote.pilotName} registrou notinha de R$ ${savedNote.totalAmount.toFixed(2)} (${savedNote.establishmentName} - ${savedNote.category})`
    );
    return savedNote;
  };

  const updateReceiptNote = async (id: string, updates: Partial<ReceiptNote>) => {
    await apiSync(`/api/reimbursements/${id}`, 'PUT', updates);
    setAllReceiptNotes((prev) =>
      prev.map((note) => (note.id === id && note.companyId === currentCompany.id ? { ...note, ...updates } : note))
    );
    logAction('Atualização de Notinha', 'Financeiro', id, `Notinha ${id} atualizada`);
  };

  const deleteReceiptNote = async (id: string) => {
    const target = allReceiptNotes.find((n) => n.id === id && n.companyId === currentCompany.id);
    await apiSync(`/api/reimbursements/${id}`, 'DELETE');
    setAllReceiptNotes((prev) => prev.filter((note) => note.id !== id || note.companyId !== currentCompany.id));
    if (target) {
      logAction('Exclusão de Notinha', 'Financeiro', id, `Notinha ${target.establishmentName} de R$ ${target.totalAmount.toFixed(2)} foi removida`);
    }
  };

  const approveReceiptReimbursement = async (id: string) => {
    await apiSync(`/api/reimbursements/${id}/approve`, 'PATCH');
    setAllReceiptNotes((prev) =>
      prev.map((note) =>
        note.id === id && note.companyId === currentCompany.id
          ? {
              ...note,
              reimbursementStatus: 'aprovado',
              approvedDate: new Date().toISOString(),
            }
          : note
      )
    );
    const target = allReceiptNotes.find((n) => n.id === id && n.companyId === currentCompany.id);
    logAction('Aprovação de Reembolso', 'Financeiro', id, `Reembolso da notinha de R$ ${target?.totalAmount.toFixed(2) || '0'} aprovado para ${target?.pilotName || 'Piloto'}`);
  };

  const markReceiptAsReimbursed = async (id: string) => {
    await apiSync(`/api/reimbursements/${id}/reimburse`, 'PATCH');
    setAllReceiptNotes((prev) =>
      prev.map((note) =>
        note.id === id && note.companyId === currentCompany.id
          ? {
              ...note,
              reimbursementStatus: 'reembolsado',
              reimbursedDate: new Date().toISOString(),
            }
          : note
      )
    );
    const target = allReceiptNotes.find((n) => n.id === id && n.companyId === currentCompany.id);
    logAction('Liquidação de Reembolso', 'Financeiro', id, `Reembolso de R$ ${target?.totalAmount.toFixed(2) || '0'} pago ao piloto ${target?.pilotName || ''}`);
  };

  const batchApproveReimbursements = async (pilotId?: string, month?: string) => {
    await apiSync('/api/reimbursements/batch-approve', 'POST', { pilotId, month });
    setAllReceiptNotes((prev) =>
      prev.map((note) => {
        const matchesCompany = note.companyId === currentCompany.id;
        const matchesPilot = !pilotId || note.pilotId === pilotId;
        const matchesMonth = !month || (note.date || '').startsWith(month);
        if (matchesCompany && matchesPilot && matchesMonth && note.reimbursementStatus === 'pendente') {
          return {
            ...note,
            reimbursementStatus: 'aprovado',
            approvedDate: new Date().toISOString(),
          };
        }
        return note;
      })
    );
    logAction('Aprovação em Lote', 'Financeiro', 'batch', `Aprovados reembolsos pendentes em lote ${pilotId ? `para piloto ${pilotId}` : 'de todos os pilotos'}`);
  };

  const scanReceiptWithAI = async (imageBase64: string, mimeType?: string, hints?: any) => {
    try {
      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          imageBase64,
          mimeType: mimeType || 'image/jpeg',
          ...hints,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Erro na API de leitura de recibos (${response.status}): ${errText.substring(0, 100)}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.warn('Erro ao chamar /api/ai/scan-receipt:', err);
      return {
        success: false,
        source: 'error',
        data: {
          establishmentName: hints?.establishmentHint || 'Comprovante / Recibo',
          cnpj: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          category: 'alimentacao' as ReceiptCategory,
          totalAmount: 0,
          paymentMethod: 'pix_piloto',
          reimbursementStatus: 'pendente',
          fuelDetails: null,
          items: [],
          confidenceScore: 0,
          notes: 'Não foi possível ler os dados automaticamente. Por favor, preencha ou ajuste manualmente.',
        },
      };
    }
  };

  const getPilotMonthlyExpenses = (month?: string, pilotId?: string): PilotMonthlyExpenseSummary[] => {
    const temporal = getTemporalContext();
    const targetMonth = month || temporal.currentMonthStr;
    const compNotes = receiptNotes.filter(
      (n) => n.companyId === currentCompany.id && (n.date || '').startsWith(targetMonth)
    );

    const relevantPilots = pilotId ? pilots.filter((p) => p.id === pilotId) : pilots;

    const summaries: PilotMonthlyExpenseSummary[] = relevantPilots.map((pilot) => {
      const pilotNotes = compNotes.filter((n) => n.pilotId === pilot.id || (n.pilotName && n.pilotName.toLowerCase().includes(pilot.name.toLowerCase())));
      
      const totalNotesCount = pilotNotes.length;
      const totalSpent = pilotNotes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      
      const fuelNotes = pilotNotes.filter((n) => n.category === 'combustivel');
      const fuelSpent = fuelNotes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const fuelLiters = fuelNotes.reduce((sum, n) => sum + (n.fuelDetails?.liters || 0), 0);

      const foodSpent = pilotNotes.filter((n) => n.category === 'alimentacao').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const marketSpent = pilotNotes.filter((n) => n.category === 'mercado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const maintenanceSpent = pilotNotes.filter((n) => n.category === 'manutencao_pecas').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const hotelSpent = pilotNotes.filter((n) => n.category === 'hospedagem').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const tollSpent = pilotNotes.filter((n) => n.category === 'pedagio').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const otherSpent = pilotNotes.filter((n) => n.category === 'outro').reduce((sum, n) => sum + (n.totalAmount || 0), 0);

      const reimbursementPending = pilotNotes.filter((n) => n.reimbursementStatus === 'pendente').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const reimbursementApproved = pilotNotes.filter((n) => n.reimbursementStatus === 'aprovado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const reimbursementPaid = pilotNotes.filter((n) => n.reimbursementStatus === 'reembolsado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
      const corporateCardSpent = pilotNotes.filter((n) => n.reimbursementStatus === 'corporativo' || n.paymentMethod === 'cartao_corporativo').reduce((sum, n) => sum + (n.totalAmount || 0), 0);

      return {
        pilotId: pilot.id,
        pilotName: pilot.name,
        month: targetMonth,
        totalNotesCount,
        totalSpent,
        fuelSpent,
        fuelLiters,
        foodSpent,
        marketSpent,
        maintenanceSpent,
        hotelSpent,
        tollSpent,
        otherSpent,
        reimbursementPending,
        reimbursementApproved,
        reimbursementPaid,
        corporateCardSpent,
      };
    });

    // If there are receipts unlinked to known pilots (e.g. general field team) and not filtering a single pilot
    if (!pilotId) {
      const unassignedNotes = compNotes.filter((n) => !n.pilotId || !pilots.some((p) => p.id === n.pilotId));
      if (unassignedNotes.length > 0) {
        const totalNotesCount = unassignedNotes.length;
        const totalSpent = unassignedNotes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const fuelNotes = unassignedNotes.filter((n) => n.category === 'combustivel');
        const fuelSpent = fuelNotes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const fuelLiters = fuelNotes.reduce((sum, n) => sum + (n.fuelDetails?.liters || 0), 0);
        const foodSpent = unassignedNotes.filter((n) => n.category === 'alimentacao').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const marketSpent = unassignedNotes.filter((n) => n.category === 'mercado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const maintenanceSpent = unassignedNotes.filter((n) => n.category === 'manutencao_pecas').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const hotelSpent = unassignedNotes.filter((n) => n.category === 'hospedagem').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const tollSpent = unassignedNotes.filter((n) => n.category === 'pedagio').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const otherSpent = unassignedNotes.filter((n) => n.category === 'outro').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const reimbursementPending = unassignedNotes.filter((n) => n.reimbursementStatus === 'pendente').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const reimbursementApproved = unassignedNotes.filter((n) => n.reimbursementStatus === 'aprovado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const reimbursementPaid = unassignedNotes.filter((n) => n.reimbursementStatus === 'reembolsado').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
        const corporateCardSpent = unassignedNotes.filter((n) => n.reimbursementStatus === 'corporativo' || n.paymentMethod === 'cartao_corporativo').reduce((sum, n) => sum + (n.totalAmount || 0), 0);

        summaries.push({
          pilotId: '',
          pilotName: 'Equipe de Campo (Sem piloto associado)',
          month: targetMonth,
          totalNotesCount,
          totalSpent,
          fuelSpent,
          fuelLiters,
          foodSpent,
          marketSpent,
          maintenanceSpent,
          hotelSpent,
          tollSpent,
          otherSpent,
          reimbursementPending,
          reimbursementApproved,
          reimbursementPaid,
          corporateCardSpent,
        });
      }
    }

    return summaries;
  };

  // Structured Rich Context payload for Gemini Copilot with ALL platform details
  const getCompanyContextForAI = () => {
    const temporal = getTemporalContext();
    const currentMonthStr = temporal.currentMonthStr;
    const monthlyPilotExpenses = getPilotMonthlyExpenses(currentMonthStr);
    return {
      companyName: currentCompany.name,
      tradeName: currentCompany.tradeName,
      ownerName: currentCompany.ownerName,
      city: `${currentCompany.city}/${currentCompany.state}`,
      address: currentCompany.address,
      cnpj: currentCompany.cnpj,
      phone: currentCompany.phone,
      email: currentCompany.email,
      temporalInfo: {
        currentDate: temporal.todayStr,
        currentYear: temporal.currentYear,
        currentMonth: temporal.currentMonth,
        currentMonthStr: temporal.currentMonthStr,
        currentMonthName: temporal.currentMonthName,
        currentPeriod: temporal.currentPeriodLabel,
        currentPeriodLong: temporal.currentPeriodLongLabel,
        previousMonthStr: temporal.previousMonthStr,
        previousMonthName: temporal.previousMonthName,
        previousPeriod: temporal.previousPeriodLabel,
        previousPeriodLong: temporal.previousPeriodLongLabel,
        today: temporal.todayStr,
        yesterday: temporal.yesterdayStr,
        thisWeekStart: temporal.thisWeekStart,
        thisWeekEnd: temporal.thisWeekEnd,
        lastWeekStart: temporal.lastWeekStart,
        lastWeekEnd: temporal.lastWeekEnd,
        last7DaysStart: temporal.last7DaysStart,
        last30DaysStart: temporal.last30DaysStart,
        last90DaysStart: temporal.last90DaysStart,
        thisYearStart: temporal.thisYearStart,
        thisYearEnd: temporal.thisYearEnd,
        lastYear: temporal.lastYear,
        lastYearStart: temporal.lastYearStart,
        lastYearEnd: temporal.lastYearEnd,
      },
      metrics,
      score: droneIAScore,
      receiptExpensesSummary: {
        currentMonth: currentMonthStr,
        currentPeriod: temporal.currentPeriodLabel,
        totalReceiptsSpent: metrics.totalReceiptsSpent,
        totalReimbursementsPending: metrics.totalReimbursementsPending,
        pilotsExpenseSummary: monthlyPilotExpenses,
        recentReceipts: receiptNotes.slice(0, 25).map((n) => ({
          pilot: n.pilotName,
          pilotId: n.pilotId,
          date: n.date,
          establishment: n.establishmentName,
          category: n.category,
          amount: n.totalAmount,
          status: n.reimbursementStatus,
          payment: n.paymentMethod,
          fuelLiters: n.fuelDetails?.liters,
          fuelType: n.fuelDetails?.fuelType,
          items: (n.items || []).map((i) => `${i.description} (R$ ${i.totalPrice})`).join(', '),
        })),
      },
      drones: drones.map((d) => ({
        id: d.id,
        tag: d.assetTag,
        model: d.model,
        serialNumber: d.serialNumber,
        hours: d.flightHours,
        ha: d.accumulatedHectares,
        tankL: d.tankCapacityLiters,
        status: d.status,
        anac: d.anacRegistration,
        sprayWidthM: d.sprayWidthM,
        maxSpeedMs: d.maxSpeedMs,
        nozzleType: d.nozzleType,
        nextMaintenanceHours: d.nextMaintenanceHours,
        notes: d.notes,
      })),
      batteries: batteries.map((b) => ({
        id: b.id,
        identifier: b.identifier,
        model: b.model,
        serialNumber: b.serialNumber,
        cycles: b.cycles,
        maxCycles: b.maxRecommendedCycles,
        healthPercent: b.healthPercent,
        condition: b.condition,
        status: b.status,
        capacityMah: b.capacityMah,
        voltageV: b.voltageV,
        notes: b.notes,
      })),
      maintenances: maintenanceRecords.map((m) => ({
        date: m.date,
        drone: m.droneModel,
        type: m.type,
        cost: m.cost,
        desc: m.description,
        provider: m.provider,
        parts: m.replacedParts,
        nextDueHours: m.nextDueHours,
      })),
      pilots: pilots.map((p) => {
        const pilotOS = serviceOrders.filter(
          (os) => os.pilotId === p.id || (os.pilotName && os.pilotName.toLowerCase().includes(p.name.toLowerCase()))
        );
        const thisMonthOS = pilotOS.filter(
          (os) => (os.scheduledDate || '').startsWith(currentMonthStr) || (os.completedDate || '').startsWith(currentMonthStr)
        );
        const monthHa = thisMonthOS.reduce((acc, curr) => acc + (curr.areaHa || 0), 0);
        const monthCompletedHa = thisMonthOS
          .filter((os) => os.status === 'pago' || os.status === 'faturado' || os.status === 'concluido')
          .reduce((acc, curr) => acc + (curr.areaHa || 0), 0);
        const monthCommissionTotal = thisMonthOS.reduce(
          (acc, curr) => acc + (curr.calculatedPilotCommission || 0),
          0
        );
        const monthReleasedCommission = thisMonthOS
          .filter((os) => os.commissionStatus === 'liberada')
          .reduce((acc, curr) => acc + (curr.calculatedPilotCommission || 0), 0);
        const monthPendingCommission = thisMonthOS
          .filter((os) => os.commissionStatus !== 'liberada')
          .reduce((acc, curr) => acc + (curr.calculatedPilotCommission || 0), 0);

        return {
          id: p.id,
          name: p.name,
          contract: p.contractType,
          model: p.commissionModel,
          ratePerHa: p.ratePerHectare,
          percentRate: p.percentRate,
          hybridFixed: p.hybridFixed,
          hybridRatePerHa: p.hybridRatePerHa,
          ha: p.totalHectaresSprayed,
          totalHectares: p.totalHectaresSprayed,
          hours: p.flightHours,
          totalFlightHours: p.flightHours,
          monthHectares: monthHa,
          monthCompletedHectares: monthCompletedHa,
          monthOrdersCount: thisMonthOS.length,
          monthCommissionTotal,
          monthReleasedCommission,
          monthPendingCommission,
          city: `${p.city}/${p.state}`,
          phone: p.phone,
          whatsapp: p.whatsapp,
          email: p.email,
          anacNumber: p.anacLicenseNumber || p.anacCode,
          caarNumber: p.caarNumber,
          caarValidity: p.caarValidity,
          status: p.status,
          serviceOrdersThisMonth: thisMonthOS.map((os) => ({
            osNumber: os.osNumber,
            client: os.clientName,
            property: os.propertyName,
            crop: os.crop,
            areaHa: os.areaHa,
            date: os.scheduledDate,
            status: os.status,
            commission: os.calculatedPilotCommission,
            commissionStatus: os.commissionStatus,
          })),
        };
      }),
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        contact: c.contactName,
        phone: c.phone,
        whatsapp: c.whatsapp,
        email: c.email,
        doc: c.cpfCnpj,
        city: `${c.city}/${c.state}`,
        address: c.address,
        totalHa: c.totalHectares,
        totalRevenue: c.totalRevenue,
        rating: c.rating,
        type: c.type,
        status: c.status,
        notes: c.notes,
        propertiesOwned: properties.filter((p) => p.clientId === c.id).map((p) => p.name),
      })),
      properties: properties.map((p) => {
        const propTalhoes = talhoes.filter((t) => t.propertyId === p.id);
        const hasCoords = typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude) && p.latitude !== 0 && p.longitude !== 0;
        const lat = hasCoords ? p.latitude : undefined;
        const lng = hasCoords ? p.longitude : undefined;
        return {
          id: p.id,
          name: p.name,
          client: p.clientName,
          clientId: p.clientId,
          ha: p.totalAreaHa,
          city: `${p.city}/${p.state}`,
          address: p.address,
          manager: p.managerName,
          phone: p.phone,
          latitude: lat,
          longitude: lng,
          googleMapsUrl: hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null,
          wazeUrl: hasCoords ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null,
          notes: p.notes,
          talhoes: propTalhoes.map((t) => ({
            name: t.name,
            ha: t.areaHa,
            crop: t.crop,
            stage: t.cropStage,
            lastApplication: t.lastApplicationDate,
          })),
        };
      }),
      talhoes: talhoes.map((t) => {
        const centerLat = t.center?.lat;
        const centerLng = t.center?.lng;
        const hasCoords = typeof centerLat === 'number' && typeof centerLng === 'number' && !isNaN(centerLat) && !isNaN(centerLng) && centerLat !== 0 && centerLng !== 0;
        const lat = hasCoords ? centerLat : undefined;
        const lng = hasCoords ? centerLng : undefined;
        return {
          id: t.id,
          name: t.name,
          property: t.propertyName,
          propertyId: t.propertyId,
          client: t.clientName,
          crop: t.crop,
          stage: t.cropStage,
          ha: t.areaHa,
          latitude: lat,
          longitude: lng,
          googleMapsUrl: hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null,
          wazeUrl: hasCoords ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null,
          lastApplicationDate: t.lastApplicationDate,
          soilType: t.soilType,
          polygonPointsCount: (t.polygon || []).length,
          notes: t.notes,
        };
      }),
      products: products.map((pr) => ({
        id: pr.id,
        commercialName: pr.commercialName,
        manufacturer: pr.manufacturer,
        activeIngredient: pr.activeIngredient,
        mapa: pr.mapaRegistration,
        class: pr.productClass,
        formulation: pr.formulation,
        toxicologicalClass: pr.toxicologicalClass,
        environmentalClass: pr.environmentalClass,
        doseRange: pr.recommendedDoseRange,
        volumeCalda: pr.defaultVolumeCaldaLPerHa,
        targetPests: pr.targetPests,
        crops: pr.authorizedCrops,
        officialSource: pr.officialSource || 'AGROFIT/MAPA',
      })),
      crops: crops.map((cr) => ({
        id: cr.id,
        name: cr.name,
        category: cr.category,
        cycleDays: cr.standardCycleDays,
        pests: cr.commonPests,
        volumeLHa: cr.averageSprayingVolumeLPerHa,
      })),
      serviceOrders: serviceOrders.map((os) => ({
        id: os.id,
        osNumber: os.osNumber,
        client: os.clientName,
        property: os.propertyName,
        talhao: os.talhaoName,
        crop: os.crop,
        serviceType: os.serviceType,
        areaHa: os.areaHa,
        actualAreaSprayedHa: typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : null,
        pricePerHa: os.pricePerHa,
        totalAmount: os.finalAmount,
        estimatedCost: os.estimatedCost || 0,
        estimatedMargin: os.netMargin ?? (os.finalAmount - (os.estimatedCost || 0)),
        estimatedMarginPercent: os.finalAmount > 0 ? Number((((os.finalAmount - (os.estimatedCost || 0)) / os.finalAmount) * 100).toFixed(1)) : 0.0,
        status: os.status,
        date: os.scheduledDate,
        completedDate: os.completedDate,
        pilot: os.pilotName,
        pilotId: os.pilotId,
        drone: os.droneModel,
        droneId: os.droneId,
        commission: os.calculatedPilotCommission,
        commissionStatus: os.commissionStatus,
        weather: os.weatherConditions
          ? {
              windSpeed: os.weatherConditions.windSpeedKmH,
              temperature: os.weatherConditions.temperatureC,
              humidity: os.weatherConditions.humidityPercent,
              direction: os.weatherConditions.windDirection,
            }
          : undefined,
        products: (os.products || []).map((p) => ({
          name: p.commercialName,
          active: p.activeIngredient,
          targetPest: p.targetPest,
          dose: p.dosePerHa,
          unit: p.unit,
          volumeCalda: p.volumeCaldaLPerHa,
        })),
        notes: os.notes,
      })),
      quotes: quotes.map((q) => ({
        quoteNumber: q.quoteNumber,
        client: q.clientName,
        property: q.propertyName,
        crop: q.crop,
        areaHa: q.areaHa,
        pricePerHa: q.pricePerHa,
        discountPercent: q.discountPercent,
        finalAmount: q.finalAmount,
        status: q.status,
        validUntil: q.validUntil,
        paymentTerms: q.paymentTerms,
      })),
      financials: {
        receivablesPending: metrics.totalReceivablePending,
        receivablesOverdue: metrics.totalReceivableOverdue,
        totalPayable: metrics.totalPayable,
        totalReceived: metrics.totalReceived,
        netResult: metrics.netResult,
        marginPercent: metrics.averageMarginPercent,
        overdueItems: accountsReceivable
          .filter((r) => r.status === 'vencido')
          .map((r) => ({
            client: r.clientName,
            amount: r.amount,
            due: r.dueDate,
            os: r.osNumber,
            description: r.description,
          })),
        pendingItems: accountsReceivable
          .filter((r) => r.status === 'aberto')
          .map((r) => ({
            client: r.clientName,
            amount: r.amount,
            due: r.dueDate,
            os: r.osNumber,
            description: r.description,
          })),
        payableItems: accountsPayable.map((p) => ({
          supplier: p.supplierName,
          category: p.costCenter,
          amount: p.amount,
          due: p.dueDate,
          status: p.status,
          doc: p.documentNumber,
        })),
      },
      documents: documents.map((doc) => ({
        title: doc.title,
        category: doc.category,
        number: doc.documentNumber,
        issuingEntity: doc.issuingEntity,
        expiryDate: doc.expiryDate,
        status: doc.status,
      })),
    };
  };

  return (
    <AppContext.Provider
      value={{
        currentCompany,
        setCurrentCompanyId,
        updateCurrentCompany,
        companies: visibleCompanies,
        isSuperAdmin,
        currentUserRole,
        setCurrentUserRole,
        currentUserId,
        currentUserName,
        activeTab,
        setActiveTab,
        isFieldMode,
        setIsFieldMode,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        pilots,
        drones,
        batteries,
        maintenanceRecords,
        droneMaintenances: maintenanceRecords,
        clients,
        properties,
        talhoes,
        crops,
        products,
        serviceOrders,
        quotes,
        accountsReceivable,
        accountsPayable,
        pilotCommissions,
        occurrences,
        documents,
        auditLogs,
        aiRecommendations,
        metrics,
        droneIAScore,
        addQuote,
        updateQuoteStatus,
        convertQuoteToOS,
        addServiceOrder,
        updateServiceOrder,
        updateServiceOrderStatus,
        registerFieldOccurrence,
        addClient,
        updateClient,
        deleteClient,
        addProperty,
        updateProperty,
        deleteProperty,
        addTalhao,
        updateTalhao,
        deleteTalhao,
        addDrone,
        updateDrone,
        deleteDrone,
        updateDroneStatus,
        addBattery,
        updateBattery,
        deleteBattery,
        updateBatteryCycles,
        addMaintenanceRecord,
        deleteMaintenanceRecord,
        addPilot,
        updatePilot,
        deletePilot,
        addAccountReceivable,
        settleAccountReceivable,
        addAccountPayable,
        settleAccountPayable,
        payAccountPayable: settleAccountPayable,
        updateCommissionStatus,
        addProduct,
        updateProduct,
        toggleProductStatus,
        addDocument,
        receiptNotes,
        addReceiptNote,
        updateReceiptNote,
        deleteReceiptNote,
        approveReceiptReimbursement,
        markReceiptAsReimbursed,
        batchApproveReimbursements,
        scanReceiptWithAI,
        getPilotMonthlyExpenses,
        logAction,
        getCompanyContextForAI,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
