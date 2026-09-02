import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  Users,
  Flame,
  MessageCircle,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  Send,
  CheckSquare,
  Square,
  ChevronRight,
  RotateCw,
  ExternalLink,
  HelpCircle,
  FileCheck2,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ReactivationClientSummary,
  SimpleReactivationPriority,
  SimpleReactivationStatus,
  ReactivationFunnelStage,
} from '../../types';
import {
  buildClientReactivationSummary,
  buildWhatsAppLink,
} from '../../utils/reactivationEngine';
import {
  INITIAL_REACTIVATION_TEMPLATES,
  ReactivationMessageTemplateItem,
} from '../../data/reactivationTemplates';
import { ReactivationFlowModal } from './ReactivationFlowModal';
import { ClientReactivationDrawer } from './ClientReactivationDrawer';
import { ReactivationMessageBankModal } from './ReactivationMessageBankModal';

interface MoutryxReativaViewProps {
  onOpenNewQuote?: (
    clientId?: string,
    quoteData?: {
      crop?: string;
      areaHa?: number;
      pricePerHa?: number;
      serviceType?: string;
      notes?: string;
    }
  ) => void;
}

type FilterTab =
  | 'todos'
  | 'alta_prioridade'
  | 'em_oportunidade'
  | 'media_prioridade'
  | 'baixa_prioridade'
  | 'a_contatar'
  | 'contatado'
  | 'respondeu'
  | 'orcamento'
  | 'reativado'
  | 'sem_resposta';

export const MoutryxReativaView: React.FC<MoutryxReativaViewProps> = ({
  onOpenNewQuote,
}) => {
  const {
    clients,
    serviceOrders,
    quotes,
    properties,
    currentCompany,
    currentUserName,
    logAction,
  } = useApp();

  const companyId = currentCompany?.id || 'moutryx-demo';

  // Server-authoritative state for persistent tenant reactivation statuses
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SimpleReactivationStatus>>({});
  const [notesOverrides, setNotesOverrides] = useState<Record<string, string>>({});
  const [contactHistoryMap, setContactHistoryMap] = useState<
    Record<
      string,
      {
        id: string;
        date: string;
        messageText: string;
        channel: 'whatsapp' | 'ligacao' | 'presencial';
        statusAfter: SimpleReactivationStatus;
        userName?: string;
      }[]
    >
  >({});
  const [templates, setTemplates] = useState<ReactivationMessageTemplateItem[]>(INITIAL_REACTIVATION_TEMPLATES);

  // Fetch REATIVA data from PostgreSQL backend and purge any legacy localStorage tokens/keys
  useEffect(() => {
    try {
      // Purge any legacy localStorage keys to ensure clean persistence exclusively on backend
      localStorage.removeItem(`moutryx_reactiva_statuses_${companyId}`);
      localStorage.removeItem(`moutryx_reactiva_notes_${companyId}`);
      localStorage.removeItem(`moutryx_reactiva_history_${companyId}`);
      localStorage.removeItem(`moutryx_reactiva_templates_${companyId}`);
    } catch {
      // ignore
    }

    if (!companyId) return;

    let isMounted = true;
    const fetchReativaData = async () => {
      try {
        const res = await fetch('/api/reactiva/data', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            if (json.data.statuses) setStatusOverrides(json.data.statuses);
            if (json.data.notes) setNotesOverrides(json.data.notes);
            if (json.data.history) setContactHistoryMap(json.data.history);
            if (json.data.templates && json.data.templates.length > 0) {
              setTemplates(json.data.templates);
            }
          }
        }
      } catch (err) {
        console.warn('[MOUTRYX REATIVA] Falha ao carregar dados do servidor:', err);
      }
    };

    fetchReativaData();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const saveTemplates = async (newTemplates: ReactivationMessageTemplateItem[]) => {
    setTemplates(newTemplates);
    try {
      await fetch('/api/reactiva/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templates: newTemplates }),
      });
    } catch (e) {
      console.error('[MOUTRYX REATIVA] Erro ao salvar templates no PostgreSQL:', e);
    }
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');

  // Selected Clients for Mass Action
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Modals & Drawers States
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowQueue, setFlowQueue] = useState<ReactivationClientSummary[]>([]);
  
  const [selectedClientIdForDrawer, setSelectedClientIdForDrawer] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isMessageBankOpen, setIsMessageBankOpen] = useState(false);

  // Sync statuses and contact history to PostgreSQL backend
  const handleUpdateStatus = (
    clientId: string,
    newStatus: SimpleReactivationStatus,
    messageSent?: string
  ) => {
    setStatusOverrides((prev) => ({ ...prev, [clientId]: newStatus }));

    if (messageSent) {
      const formattedDate = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const newHistoryItem = {
        id: `hist-${Date.now()}`,
        date: formattedDate,
        messageText: messageSent,
        channel: 'whatsapp' as const,
        statusAfter: newStatus,
        userName: currentUserName,
      };

      setContactHistoryMap((prev) => {
        const existing = prev[clientId] || [];
        return { ...prev, [clientId]: [newHistoryItem, ...existing] };
      });

      // Persist contact interaction and update status in PostgreSQL
      fetch('/api/reactiva/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId,
          messageText: messageSent,
          channel: 'whatsapp',
          statusAfter: newStatus,
        }),
      }).catch((err) => {
        console.warn('[MOUTRYX REATIVA] Falha ao persistir contato:', err);
      });
    } else {
      // Persist status update in PostgreSQL
      fetch('/api/reactiva/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId, status: newStatus }),
      }).catch((err) => {
        console.warn('[MOUTRYX REATIVA] Falha ao persistir status:', err);
      });
    }

    logAction('atualizou_status_reativacao', { clientId, newStatus });
  };

  // Save notes handler to PostgreSQL backend
  const handleSaveNotes = (clientId: string, notes: string) => {
    setNotesOverrides((prev) => ({ ...prev, [clientId]: notes }));

    fetch('/api/reactiva/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ clientId, notes }),
    }).catch((err) => {
      console.warn('[MOUTRYX REATIVA] Falha ao persistir notas:', err);
    });
  };

  // Compute Reactivation Summary for all clients
  const allClientSummaries: ReactivationClientSummary[] = useMemo(() => {
    const rawSummaries = clients.map((c) => {
      const summary = buildClientReactivationSummary(
        c,
        serviceOrders,
        quotes,
        properties,
        {},
        new Date()
      );

      // Apply overrides if any
      const overrideStatus = statusOverrides[c.id];
      if (overrideStatus) {
        summary.simpleStatus = overrideStatus;
      }
      const overrideNotes = notesOverrides[c.id];
      if (overrideNotes) {
        summary.notes = overrideNotes;
      }
      const historyItems = contactHistoryMap[c.id];
      if (historyItems) {
        summary.contactHistory = historyItems;
      }

      return summary;
    });

    // Sort by status flow and priority (A_CONTATAR Alta -> Média -> Baixa, then in opportunity, then inactivity days)
    return rawSummaries.sort((a, b) => {
      // Prioritize a_contatar first, then opportunity stages, then reativado/sem_resposta
      const statusWeight: Record<SimpleReactivationStatus, number> = {
        a_contatar: 6,
        contatado: 5,
        respondeu: 4,
        orcamento: 3,
        reativado: 2,
        sem_resposta: 1,
      };
      const prioWeight = { alta: 3, media: 2, baixa: 1 };
      
      const sA = statusWeight[a.simpleStatus] || 0;
      const sB = statusWeight[b.simpleStatus] || 0;
      if (sB !== sA) return sB - sA;

      const pA = prioWeight[a.simplePriority] || 1;
      const pB = prioWeight[b.simplePriority] || 1;
      if (pB !== pA) return pB - pA;

      return b.daysSinceLastService - a.daysSinceLastService;
    });
  }, [clients, serviceOrders, quotes, properties, statusOverrides, notesOverrides, contactHistoryMap]);

  // Derived selected client for drawer from reactive list
  const selectedClientForDrawer = useMemo(() => {
    if (!selectedClientIdForDrawer) return null;
    return allClientSummaries.find((c) => c.clientId === selectedClientIdForDrawer) || null;
  }, [allClientSummaries, selectedClientIdForDrawer]);

  // Essential Top Metrics with strict Mutual Exclusivity
  const metrics = useMemo(() => {
    const total = allClientSummaries.length;
    
    // 🔥 Alta Prioridade: APENAS clientes com Status = A_CONTATAR e Prioridade = Alta
    const highPriorityCount = allClientSummaries.filter(
      (c) => c.simplePriority === 'alta' && c.simpleStatus === 'a_contatar'
    ).length;

    // Média prioridade a contatar
    const mediumPriorityCount = allClientSummaries.filter(
      (c) => c.simplePriority === 'media' && c.simpleStatus === 'a_contatar'
    ).length;

    // Baixa prioridade a contatar
    const lowPriorityCount = allClientSummaries.filter(
      (c) => c.simplePriority === 'baixa' && c.simpleStatus === 'a_contatar'
    ).length;

    // 🟡 Em Oportunidade: clientes com Status = CONTATADO, RESPONDEU ou ORÇAMENTO
    const inOpportunityCount = allClientSummaries.filter(
      (c) => c.simpleStatus === 'contatado' || c.simpleStatus === 'respondeu' || c.simpleStatus === 'orcamento'
    ).length;

    // ✅ Reativados: clientes com Status = REATIVADO
    const reactivatedCount = allClientSummaries.filter(
      (c) => c.simpleStatus === 'reativado'
    ).length;

    // ⏳ Sem Resposta
    const semRespostaCount = allClientSummaries.filter(
      (c) => c.simpleStatus === 'sem_resposta'
    ).length;

    // Detalhamento individual de status
    const aContatarCount = allClientSummaries.filter((c) => c.simpleStatus === 'a_contatar').length;
    const contatadoCount = allClientSummaries.filter((c) => c.simpleStatus === 'contatado').length;
    const respondeuCount = allClientSummaries.filter((c) => c.simpleStatus === 'respondeu').length;
    const orcamentoCount = allClientSummaries.filter((c) => c.simpleStatus === 'orcamento').length;

    const reactivationRate = total > 0 ? Math.round((reactivatedCount / total) * 100) : 0;

    return {
      total,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      inOpportunityCount,
      reactivatedCount,
      reactivationRate,
      aContatarCount,
      contatadoCount,
      respondeuCount,
      orcamentoCount,
      semRespostaCount,
    };
  }, [allClientSummaries]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return allClientSummaries.filter((client) => {
      // 1. Search Query Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = client.clientName.toLowerCase().includes(q);
        const matchesContact = client.contactName?.toLowerCase().includes(q);
        const matchesFarm = client.lastPropertyName?.toLowerCase().includes(q);
        const matchesCity = client.city?.toLowerCase().includes(q);
        const matchesPhone = (client.phone || client.whatsapp || '').includes(q);
        if (!matchesName && !matchesContact && !matchesFarm && !matchesCity && !matchesPhone) {
          return false;
        }
      }

      // 2. Tab Filter (Strict Mutually Exclusive)
      switch (activeFilter) {
        case 'alta_prioridade':
          // 🔥 Alta prioridade: APENAS clientes a contatar com prioridade alta
          return client.simplePriority === 'alta' && client.simpleStatus === 'a_contatar';
        case 'em_oportunidade':
          // 🟡 Em oportunidade: contatados, responderam ou com orçamento aberto
          return client.simpleStatus === 'contatado' || client.simpleStatus === 'respondeu' || client.simpleStatus === 'orcamento';
        case 'media_prioridade':
          return client.simplePriority === 'media' && client.simpleStatus === 'a_contatar';
        case 'baixa_prioridade':
          return client.simplePriority === 'baixa' && client.simpleStatus === 'a_contatar';
        case 'a_contatar':
          return client.simpleStatus === 'a_contatar';
        case 'contatado':
          return client.simpleStatus === 'contatado';
        case 'respondeu':
          return client.simpleStatus === 'respondeu';
        case 'orcamento':
          return client.simpleStatus === 'orcamento';
        case 'reativado':
          return client.simpleStatus === 'reativado';
        case 'sem_resposta':
          return client.simpleStatus === 'sem_resposta';
        case 'todos':
        default:
          return true;
      }
    });
  }, [allClientSummaries, searchQuery, activeFilter]);

  // Multi-selection handlers
  const handleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map((c) => c.clientId));
    }
  };

  const handleToggleSelectOne = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  // Launch Reactivation Flow for Single Client
  const handleOpenSingleReactivation = (client: ReactivationClientSummary) => {
    setFlowQueue([client]);
    setIsFlowModalOpen(true);
  };

  // Launch Reactivation Flow for Multiple Selected Clients
  const handleOpenSelectedReactivation = () => {
    const selectedClients = allClientSummaries.filter((c) =>
      selectedClientIds.includes(c.clientId)
    );
    if (selectedClients.length === 0) return;
    setFlowQueue(selectedClients);
    setIsFlowModalOpen(true);
  };

  // Open Drawer for Client Details
  const handleOpenDrawer = (client: ReactivationClientSummary) => {
    setSelectedClientIdForDrawer(client.clientId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="reativa-main-module">
      {/* ========================================== */}
      {/* 1. TOP HEADER & MAIN PURPOSE */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#111827] text-emerald-400 flex items-center justify-center font-bold text-xl shadow-md border border-[#111827]">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  REATIVA
                </h1>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Simples & Direto
                </span>
              </div>
              <p className="text-sm font-medium text-stone-600 mt-0.5">
                Recupere clientes antigos e transforme relacionamento em novos serviços.
              </p>
            </div>
          </div>
        </div>

        {/* Message Bank Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMessageBankOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs sm:text-sm border border-stone-300 shadow-xs hover:shadow transition-all cursor-pointer"
            id="btn-open-message-bank"
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Banco de Mensagens ({templates.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TOP SUMMARY INDICATORS (MUTUALLY EXCLUSIVE) */}
      {/* ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 🔥 Alta Prioridade (A Contatar) */}
        <div
          onClick={() => setActiveFilter('alta_prioridade')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeFilter === 'alta_prioridade'
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/40'
              : 'bg-white border-stone-200 hover:border-rose-300 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <span>🔥 Alta prioridade</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 block font-mono">
              {metrics.highPriorityCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              A contatar agora
            </span>
          </div>
        </div>

        {/* 🟡 Em Oportunidade (Contatado, Respondeu, Orçamento) */}
        <div
          onClick={() => setActiveFilter('em_oportunidade')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeFilter === 'em_oportunidade' || activeFilter === 'contatado' || activeFilter === 'respondeu' || activeFilter === 'orcamento'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/40'
              : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span>🟡 Em oportunidade</span>
            </span>
            <MessageCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 block font-mono">
              {metrics.inOpportunityCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Contatados / em negociação
            </span>
          </div>
        </div>

        {/* ✅ Reativados (Novo Serviço Fechado) */}
        <div
          onClick={() => setActiveFilter('reativado')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeFilter === 'reativado'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/40'
              : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>✅ Reativados</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 block font-mono">
              {metrics.reactivatedCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Voltaram a contratar
            </span>
          </div>
        </div>

        {/* 📊 Taxa de Reativação */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <span>📊 Taxa de reativação</span>
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 block font-mono">
              {metrics.reactivationRate}%
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Conversão geral da carteira
            </span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. CONTEXT INSIGHT BANNER */}
      {/* ========================================== */}
      <div className="bg-[#111827] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-[#111827] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-100">
              Você possui{' '}
              <strong className="text-emerald-400 font-bold text-base">
                {metrics.highPriorityCount + metrics.mediumPriorityCount} clientes
              </strong>{' '}
              a contatar prontos para uma nova contratação de pulverização.
            </p>
            <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap font-medium">
              <span className="text-rose-300">🔥 {metrics.highPriorityCount} Alta prioridade a contatar</span>
              <span>•</span>
              <span className="text-amber-300">🟡 {metrics.mediumPriorityCount} Média prioridade a contatar</span>
              <span>•</span>
              <span className="text-stone-300">⚪ {metrics.lowPriorityCount} Baixa prioridade a contatar</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const highAndMediumAContatar = allClientSummaries.filter(
              (c) => c.simpleStatus === 'a_contatar' && (c.simplePriority === 'alta' || c.simplePriority === 'media')
            );
            const queueToUse =
              highAndMediumAContatar.length > 0
                ? highAndMediumAContatar
                : allClientSummaries.filter((c) => c.simpleStatus === 'a_contatar');

            if (queueToUse.length > 0) {
              setFlowQueue(queueToUse);
              setIsFlowModalOpen(true);
            }
          }}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#111827] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm shrink-0 cursor-pointer hover:scale-102"
        >
          <span>Iniciar Reativações ({metrics.highPriorityCount + metrics.mediumPriorityCount})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================== */}
      {/* 4. SEARCH & FILTER CONTROLS */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, fazenda, cidade ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-stone-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'todos', label: 'Todos', count: metrics.total },
            { id: 'alta_prioridade', label: '🔥 Alta prioridade', count: metrics.highPriorityCount },
            { id: 'em_oportunidade', label: '🟡 Em oportunidade', count: metrics.inOpportunityCount },
            { id: 'a_contatar', label: '⚪ A contatar', count: metrics.aContatarCount },
            { id: 'contatado', label: '💬 Contatados', count: metrics.contatadoCount },
            { id: 'respondeu', label: '🤝 Respondeu', count: metrics.respondeuCount },
            { id: 'orcamento', label: '📋 Orçamento', count: metrics.orcamentoCount },
            { id: 'reativado', label: '✅ Reativados', count: metrics.reactivatedCount },
            { id: 'sem_resposta', label: '⏳ Sem resposta', count: metrics.semRespostaCount },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as FilterTab)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* 5. MASS ACTION BAR (WHEN CLIENTS SELECTED) */}
      {/* ========================================== */}
      {selectedClientIds.length > 0 && (
        <div className="bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150 border border-emerald-700">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-stone-950 font-black text-xs px-2.5 py-1 rounded-full">
              {selectedClientIds.length} selecionado(s)
            </span>
            <span className="text-xs sm:text-sm font-medium text-emerald-100">
              Prontos para iniciar o fluxo de reativação em fila.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setSelectedClientIds([])}
              className="text-xs text-emerald-200 hover:text-white px-3 py-1.5 transition-colors font-medium cursor-pointer"
            >
              Desmarcar todos
            </button>

            <button
              type="button"
              onClick={handleOpenSelectedReactivation}
              className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-[#111827] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow transition-all cursor-pointer hover:scale-102"
              id="btn-reactivate-selected"
            >
              <Send className="w-4 h-4" />
              <span>REATIVAR SELECIONADOS ({selectedClientIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. MAIN TABLE: CLIENTES PARA REATIVAR */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>CLIENTES PARA REATIVAR</span>
              <span className="text-xs font-semibold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full font-mono">
                {filteredClients.length}
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              Selecione os clientes que deseja contatar e envie mensagens personalizadas diretamente no WhatsApp.
            </p>
          </div>

          {filteredClients.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {selectedClientIds.length === filteredClients.length
                ? 'Desmarcar todos'
                : 'Selecionar todos nesta lista'}
            </button>
          )}
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Users className="w-12 h-12 mx-auto text-stone-300 stroke-1" />
            <h3 className="text-base font-bold text-stone-800">
              Nenhum cliente encontrado
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Não há clientes que correspondam aos filtros ou busca selecionados. Tente selecionar "Todos" ou limpar a pesquisa.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('todos');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredClients.length > 0 &&
                        selectedClientIds.length === filteredClients.length
                      }
                      onChange={handleSelectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[180px]">Cliente</th>
                  <th className="py-3 px-4 min-w-[160px]">Empresa / Fazenda</th>
                  <th className="py-3 px-4 min-w-[140px]">Último Serviço</th>
                  <th className="py-3 px-4 min-w-[120px]">Última Contratação</th>
                  <th className="py-3 px-4 min-w-[110px]">Dias s/ Contratar</th>
                  <th className="py-3 px-4 min-w-[130px]">Histórico</th>
                  <th className="py-3 px-4 min-w-[200px]">Prioridade & Motivo</th>
                  <th className="py-3 px-4 min-w-[130px]">Status</th>
                  <th className="py-3 px-4 min-w-[130px] text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {filteredClients.map((client) => {
                  const isSelected = selectedClientIds.includes(client.clientId);

                  return (
                    <tr
                      key={client.clientId}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(client.clientId)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => handleOpenDrawer(client)}
                          className="cursor-pointer group"
                        >
                          <span className="font-bold text-stone-900 group-hover:text-emerald-800 block text-xs">
                            {client.clientName}
                          </span>
                          {client.contactName && client.contactName !== client.clientName && (
                            <span className="text-[11px] text-stone-500 block">
                              {client.contactName}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 font-mono">
                            {client.phone || client.whatsapp || 'Sem telefone'}
                          </span>
                        </div>
                      </td>

                      {/* Empresa / Fazenda */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-semibold text-stone-900 block truncate max-w-[150px]">
                            {client.lastPropertyName || 'Fazenda Principal'}
                          </span>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            {client.city || 'Sede'}{client.state ? `/${client.state}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Último Serviço */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-semibold text-stone-800 block">
                            {client.lastServiceName || 'Pulverização'}
                          </span>
                          <span className="text-[11px] text-emerald-800 font-medium">
                            {client.lastCrop || 'Soja'}
                          </span>
                        </div>
                      </td>

                      {/* Última Contratação */}
                      <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                        {client.lastServiceDate ? (
                          new Date(client.lastServiceDate).toLocaleDateString('pt-BR')
                        ) : (
                          <span className="text-stone-400 italic">Nunca</span>
                        )}
                      </td>

                      {/* Dias sem Contratar */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            client.daysSinceLastService >= 90
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : client.daysSinceLastService >= 30
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {client.daysSinceLastService >= 999
                            ? '—'
                            : `${client.daysSinceLastService} dias`}
                        </span>
                      </td>

                      {/* Histórico Resumido */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-stone-800 block">
                            {client.totalCompletedOrders > 0
                              ? `${client.totalCompletedOrders} serviço(s)`
                              : '0 serviços'}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {client.totalHectares ? `${client.totalHectares} ha` : 'Área inicial'}
                          </span>
                        </div>
                      </td>

                      {/* Prioridade & Motivo */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {client.simplePriority === 'alta' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] uppercase tracking-wide">
                              🔥 Alta
                            </span>
                          )}
                          {client.simplePriority === 'media' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wide">
                              🟡 Média
                            </span>
                          )}
                          {client.simplePriority === 'baixa' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-semibold text-[10px] uppercase tracking-wide">
                              ⚪ Baixa
                            </span>
                          )}
                          <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                            {client.simplePriorityExplanation}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={client.simpleStatus || 'a_contatar'}
                          onChange={(e) =>
                            handleUpdateStatus(
                              client.clientId,
                              e.target.value as SimpleReactivationStatus
                            )
                          }
                          className="text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer w-full"
                        >
                          <option value="a_contatar">⚪ A contatar</option>
                          <option value="contatado">💬 Contatado</option>
                          <option value="respondeu">🤝 Respondeu</option>
                          <option value="orcamento">📋 Orçamento</option>
                          <option value="reativado">✅ Reativado</option>
                          <option value="sem_resposta">⏳ Sem resposta</option>
                        </select>
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSingleReactivation(client)}
                            className="inline-flex items-center gap-1 bg-[#111827] hover:bg-[#111827] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer hover:scale-102"
                            id={`btn-reactivate-${client.clientId}`}
                          >
                            <Send className="w-3 h-3 text-emerald-400" />
                            <span>REATIVAR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(client)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
                            title="Ver histórico e detalhes do cliente"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 7. INTEGRATED MODALS & DRAWERS */}
      {/* ========================================== */}

      {/* Step-by-Step Flow Modal (Single / Queue) */}
      {isFlowModalOpen && (
        <ReactivationFlowModal
          isOpen={isFlowModalOpen}
          onClose={() => {
            setIsFlowModalOpen(false);
            setFlowQueue([]);
          }}
          clientsQueue={flowQueue}
          company={currentCompany || { name: 'MOUTRYX Agro', tradeName: 'MOUTRYX' } as any}
          responsibleName={currentUserName || 'Lucas Moura'}
          customTemplates={templates}
          onUpdateClientStatus={handleUpdateStatus}
          onOpenNewQuote={onOpenNewQuote}
        />
      )}

      {/* Client Detail / History Drawer */}
      {isDrawerOpen && selectedClientForDrawer && (
        <ClientReactivationDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedClientIdForDrawer(null);
          }}
          client={selectedClientForDrawer}
          serviceOrders={serviceOrders}
          company={currentCompany || { name: 'MOUTRYX Agro', tradeName: 'MOUTRYX' } as any}
          onReactivate={(client) => {
            setIsDrawerOpen(false);
            handleOpenSingleReactivation(client);
          }}
          onUpdateStatus={handleUpdateStatus}
          onSaveNotes={handleSaveNotes}
          onOpenNewQuote={onOpenNewQuote}
        />
      )}

      {/* Editable Message Bank Modal */}
      {isMessageBankOpen && (
        <ReactivationMessageBankModal
          isOpen={isMessageBankOpen}
          onClose={() => setIsMessageBankOpen(false)}
          templates={templates}
          company={currentCompany || { name: 'MOUTRYX Agro', tradeName: 'MOUTRYX' } as any}
          onSaveTemplates={saveTemplates}
          sampleClient={allClientSummaries[0]}
        />
      )}
    </div>
  );
};
