import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  Layers,
  Trash2,
  Edit3,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Flame,
  ArrowRight,
  Send,
  RotateCcw,
  Eye,
  SkipForward,
  UserCheck,
  FileText,
  ShieldCheck,
  Phone,
  MapPin,
  Building2,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  ReactivationCampaign,
  ReactivationCampaignClientItem,
  ReactivationClientSummary,
  Company,
  ReactivationFunnelStage,
} from '../../types';
import {
  buildWhatsAppLink,
  formatReactivationMessage,
  formatPhoneForWhatsApp,
} from '../../utils/reactivationEngine';

interface ReactivationCampaignsViewProps {
  campaigns: ReactivationCampaign[];
  clientSummaries: ReactivationClientSummary[];
  company: Company;
  responsibleName?: string;
  onOpenCreateCampaignModal: () => void;
  onDeleteCampaign: (id: string) => void;
  onUpdateCampaignStatus: (id: string, status: ReactivationCampaign['status']) => void;
  onOpenDirectWhatsApp: (client: ReactivationClientSummary) => void;
  onUpdateCampaignClientStage: (
    campaignId: string,
    clientId: string,
    newStage: ReactivationFunnelStage,
    customMessage?: string
  ) => void;
  onGenerateQuote?: (clientId: string) => void;
}

export const ReactivationCampaignsView: React.FC<ReactivationCampaignsViewProps> = ({
  campaigns = [],
  clientSummaries = [],
  company,
  responsibleName = 'Lucas Moura',
  onOpenCreateCampaignModal,
  onDeleteCampaign,
  onUpdateCampaignStatus,
  onOpenDirectWhatsApp,
  onUpdateCampaignClientStage,
  onGenerateQuote,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    campaigns[0]?.id || null
  );

  // Active client focus index in "Modo Próximo Cliente"
  const [focusedClientIndex, setFocusedClientIndex] = useState<number>(0);
  const [activeTabMode, setActiveTabMode] = useState<'assistido' | 'fila'>('assistido');
  const [queueFilter, setQueueFilter] = useState<'todos' | 'pendentes' | 'abertos' | 'enviados' | 'interessados' | 'ignorados'>('todos');
  const [queueSearch, setQueueSearch] = useState('');
  const [editingCustomText, setEditingCustomText] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Auto-dismiss toast
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Campaign-level computed metrics
  const campaignStats = useMemo(() => {
    if (!selectedCampaign) return null;
    const total = selectedCampaign.clients.length;
    const sentCount = selectedCampaign.clients.filter(
      (c) => c.funnelStage === 'contatado' || c.funnelStage === 'interessado' || c.funnelStage === 'orcamento' || c.funnelStage === 'reativado_contratado'
    ).length;
    const openedCount = selectedCampaign.clients.filter((c) => c.funnelStage === 'whatsapp_aberto' || c.whatsappOpenedAt).length;
    const interestedCount = selectedCampaign.clients.filter(
      (c) => c.funnelStage === 'interessado' || c.funnelStage === 'orcamento' || c.funnelStage === 'reativado_contratado'
    ).length;
    const quotesCount = selectedCampaign.clients.filter(
      (c) => c.funnelStage === 'orcamento' || c.funnelStage === 'reativado_contratado'
    ).length;
    const reactivatedCount = selectedCampaign.clients.filter(
      (c) => c.funnelStage === 'reativado_contratado'
    ).length;
    const ignoredCount = selectedCampaign.clients.filter((c) => c.isIgnored || c.funnelStage === 'declinado').length;
    const pendingCount = total - sentCount - ignoredCount;
    const progressPercent = total > 0 ? Math.round((sentCount / total) * 100) : 0;

    return {
      total,
      sentCount,
      openedCount,
      interestedCount,
      quotesCount,
      reactivatedCount,
      ignoredCount,
      pendingCount,
      progressPercent,
    };
  }, [selectedCampaign]);

  // Filtered queue
  const filteredQueue = useMemo(() => {
    if (!selectedCampaign) return [];
    return selectedCampaign.clients.filter((item) => {
      // Search term
      if (queueSearch.trim()) {
        const term = queueSearch.toLowerCase();
        const matchesName = item.clientName.toLowerCase().includes(term);
        const matchesContact = item.contactName?.toLowerCase().includes(term);
        const matchesCity = item.city?.toLowerCase().includes(term);
        if (!matchesName && !matchesContact && !matchesCity) return false;
      }

      // Filter category
      if (queueFilter === 'pendentes') {
        return item.funnelStage === 'selecionado' && !item.isIgnored;
      }
      if (queueFilter === 'abertos') {
        return item.funnelStage === 'whatsapp_aberto';
      }
      if (queueFilter === 'enviados') {
        return item.funnelStage === 'contatado' || item.funnelStage === 'interessado' || item.funnelStage === 'orcamento' || item.funnelStage === 'reativado_contratado';
      }
      if (queueFilter === 'interessados') {
        return item.funnelStage === 'interessado' || item.funnelStage === 'orcamento' || item.funnelStage === 'reativado_contratado';
      }
      if (queueFilter === 'ignorados') {
        return item.isIgnored || item.funnelStage === 'declinado';
      }
      return true;
    });
  }, [selectedCampaign, queueSearch, queueFilter]);

  // Current client in assisted mode
  const currentAssistedClient = selectedCampaign?.clients[focusedClientIndex] || selectedCampaign?.clients[0];

  // Full client data if available
  const currentFullClient = useMemo(() => {
    if (!currentAssistedClient) return null;
    return clientSummaries.find((c) => c.clientId === currentAssistedClient.clientId) || null;
  }, [currentAssistedClient, clientSummaries]);

  // Message for the focused client
  const currentAssistedMessage = useMemo(() => {
    if (!selectedCampaign || !currentAssistedClient) return '';
    if (editingCustomText !== null) return editingCustomText;
    if (currentAssistedClient.customMessage) return currentAssistedClient.customMessage;

    if (currentFullClient) {
      return formatReactivationMessage(
        selectedCampaign.baseMessage,
        currentFullClient,
        company,
        responsibleName
      );
    }
    return selectedCampaign.baseMessage;
  }, [selectedCampaign, currentAssistedClient, currentFullClient, company, responsibleName, editingCustomText]);

  // Handlers for assisted send flow
  const handleOpenWhatsAppForCurrent = (force: boolean = false) => {
    if (!selectedCampaign || !currentAssistedClient) return;

    // Check if already contacted or opened
    if (!force && (currentAssistedClient.contactedAt || currentAssistedClient.funnelStage === 'contatado')) {
      setShowDuplicateWarning(true);
      return;
    }

    setShowDuplicateWarning(false);
    const messageToSend = currentAssistedMessage;
    const phone = currentAssistedClient.whatsapp;
    const url = buildWhatsAppLink(phone, messageToSend);

    // Mark as opened in state
    onUpdateCampaignClientStage(
      selectedCampaign.id,
      currentAssistedClient.clientId,
      'whatsapp_aberto',
      messageToSend
    );

    window.open(url, '_blank', 'noopener,noreferrer');
    triggerToast(
      `📲 WhatsApp oficial aberto para ${currentAssistedClient.contactName || currentAssistedClient.clientName}. Confira o texto e clique em Enviar na conversa!`,
      'info'
    );
  };

  const handleMarkAsSentAndAdvance = () => {
    if (!selectedCampaign || !currentAssistedClient) return;

    onUpdateCampaignClientStage(
      selectedCampaign.id,
      currentAssistedClient.clientId,
      'contatado',
      currentAssistedMessage
    );

    triggerToast(
      `✓ Envio confirmado para ${currentAssistedClient.contactName || currentAssistedClient.clientName}! Carregando próximo cliente da fila...`,
      'success'
    );

    setEditingCustomText(null);

    // Auto advance to next client
    if (focusedClientIndex < selectedCampaign.clients.length - 1) {
      setFocusedClientIndex((prev) => prev + 1);
    }
  };

  const handleSkipClient = () => {
    if (!selectedCampaign) return;
    setEditingCustomText(null);
    if (focusedClientIndex < selectedCampaign.clients.length - 1) {
      setFocusedClientIndex((prev) => prev + 1);
      triggerToast('⏭ Produtor pulado. Você pode retornar a ele a qualquer momento na fila.', 'info');
    }
  };

  const handleIgnoreClient = () => {
    if (!selectedCampaign || !currentAssistedClient) return;
    onUpdateCampaignClientStage(
      selectedCampaign.id,
      currentAssistedClient.clientId,
      'declinado'
    );
    triggerToast(`🚫 ${currentAssistedClient.clientName} marcado como ignorado/não enviar.`, 'warning');
    handleSkipClient();
  };

  const handleMarkStage = (stage: ReactivationFunnelStage) => {
    if (!selectedCampaign || !currentAssistedClient) return;
    onUpdateCampaignClientStage(
      selectedCampaign.id,
      currentAssistedClient.clientId,
      stage,
      currentAssistedMessage
    );
    triggerToast(`Estágio alterado para: ${stage}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : feedbackToast.type === 'warning'
              ? 'bg-amber-950/95 border-amber-500/50 text-amber-200'
              : 'bg-slate-900/95 border-sky-500/50 text-sky-200'
          }`}
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold leading-relaxed">{feedbackToast.message}</span>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              CENTRAL DE DISPARO ASSISTIDO
            </span>
            <span className="text-xs text-slate-400">100% WhatsApp Oficial • 1 Clique por Produtor</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            Campanhas & Central de Reativação Comercial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Prepare e dispare mensagens personalizadas com dados reais de safra para cada produtor, sem risco de bloqueio ou APIs externas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateCampaignModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Campanha</span>
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhuma campanha de reativação criada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Vá até o Radar de Oportunidades, selecione os clientes desejados com a caixa de seleção múltipla e crie sua primeira campanha assistida.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateCampaignModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Campanha Agora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Campaigns Selector (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Suas Campanhas ({campaigns.length})
              </span>
            </div>

            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                const total = camp.clients.length;
                const sent = camp.clients.filter(
                  (c) => c.funnelStage !== 'selecionado' && c.funnelStage !== 'whatsapp_aberto' && !c.isIgnored
                ).length;
                const percent = total > 0 ? Math.round((sent / total) * 100) : 0;

                return (
                  <div
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaignId(camp.id);
                      setFocusedClientIndex(0);
                      setEditingCustomText(null);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-slate-800/95 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              camp.status === 'em_andamento'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {camp.status === 'em_andamento' ? '● Ativa' : camp.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {camp.clients.length} produtores
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-xs sm:text-sm tracking-tight line-clamp-1">
                          {camp.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {camp.objective}
                        </p>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 mt-1 transition-transform ${
                          isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Mini Progress */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Disparos:</span>
                        <strong className="text-slate-200">
                          {sent}/{total} ({percent}%)
                        </strong>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Potencial:</span>
                      <strong className="text-emerald-400 font-bold">
                        R$ {(camp.estimatedPotentialValue || 0).toLocaleString('pt-BR')}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Campaign Operational Hub (8 cols on lg) */}
          {selectedCampaign && campaignStats && (
            <div className="lg:col-span-8 space-y-6">
              {/* Campaign Status Card */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {selectedCampaign.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Objetivo: <strong className="text-slate-200">{selectedCampaign.objective}</strong> • Cultura:{' '}
                      <span className="text-emerald-400 font-medium">
                        {selectedCampaign.targetCrop || 'Milho/Soja'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCampaignStatus(
                          selectedCampaign.id,
                          selectedCampaign.status === 'em_andamento' ? 'concluida' : 'em_andamento'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      {selectedCampaign.status === 'em_andamento' ? 'Finalizar Campanha' : 'Reabrir'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCampaign(selectedCampaign.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Excluir Campanha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quantitative Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-800 text-center">
                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Fila</span>
                    <strong className="text-base font-extrabold text-white">
                      {campaignStats.total}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-sky-400 uppercase font-bold block">WhatsApp Aberto</span>
                    <strong className="text-base font-extrabold text-sky-400">
                      {campaignStats.openedCount}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Enviados</span>
                    <strong className="text-base font-extrabold text-emerald-400">
                      {campaignStats.sentCount}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Interessados</span>
                    <strong className="text-base font-extrabold text-amber-400">
                      {campaignStats.interestedCount}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Potencial Total</span>
                    <strong className="text-xs font-bold text-emerald-300 block truncate">
                      R$ {(selectedCampaign.estimatedPotentialValue || 0).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                {/* Mode Selector Tabs (Modo Próximo Cliente vs Visão Geral da Fila) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTabMode('assistido')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTabMode === 'assistido'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Modo "Próximo Cliente"</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabMode('fila')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTabMode === 'fila'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Fila Completa ({selectedCampaign.clients.length})</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    {campaignStats.progressPercent}% concluído
                  </span>
                </div>
              </div>

              {/* VIEW 1: ACTIVE ASSISTED FOCUS MODE ("Modo Próximo Cliente") */}
              {activeTabMode === 'assistido' && currentAssistedClient && (
                <div className="space-y-4">
                  {/* Progress Header & Navigation */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="text-xs font-bold text-slate-300">
                        Cliente <strong className="text-white text-sm">{focusedClientIndex + 1}</strong> de{' '}
                        <strong className="text-white text-sm">{selectedCampaign.clients.length}</strong>
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {currentAssistedClient.funnelStage === 'contatado'
                          ? '✓ Mensagem Enviada'
                          : currentAssistedClient.funnelStage === 'whatsapp_aberto'
                          ? '📲 WhatsApp Aberto'
                          : currentAssistedClient.funnelStage === 'interessado'
                          ? '💬 Em Negociação'
                          : currentAssistedClient.isIgnored
                          ? '🚫 Ignorado'
                          : '⏳ Aguardando Envio'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        disabled={focusedClientIndex === 0}
                        onClick={() => {
                          setFocusedClientIndex((prev) => Math.max(0, prev - 1));
                          setEditingCustomText(null);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 transition-colors"
                        title="Cliente Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleSkipClient}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <span>Pular</span>
                        <SkipForward className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        disabled={focusedClientIndex >= selectedCampaign.clients.length - 1}
                        onClick={() => {
                          setFocusedClientIndex((prev) =>
                            Math.min(selectedCampaign.clients.length - 1, prev + 1)
                          );
                          setEditingCustomText(null);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 transition-colors"
                        title="Próximo Cliente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Duplicate / Already Contacted Warning Alert */}
                  {showDuplicateWarning && (
                    <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <strong className="text-xs font-bold text-white block">
                            Produtor já contatado nesta campanha!
                          </strong>
                          <p className="text-[11px] text-amber-300">
                            Último contato registrado em{' '}
                            {currentAssistedClient.contactedAt
                              ? new Date(currentAssistedClient.contactedAt).toLocaleString('pt-BR')
                              : 'sessão anterior'}
                            . Deseja reabrir a conversa no WhatsApp mesmo assim?
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDuplicateWarning(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppForCurrent(true)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                        >
                          Sim, Reabrir WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Focused Client Big Operational Card */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                    {/* Top Producer Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-white">
                            {currentAssistedClient.clientName}
                          </h4>
                          {currentAssistedClient.reactivationScore >= 70 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Flame className="w-3 h-3 fill-amber-400" />
                              Score: {currentAssistedClient.reactivationScore}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            Contato: {currentAssistedClient.contactName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {currentAssistedClient.whatsapp || 'Sem telefone'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {currentAssistedClient.city}
                          </span>
                          <span>•</span>
                          <span className="text-amber-400">
                            ⏳ {currentAssistedClient.daysInactive} dias sem aplicar
                          </span>
                        </div>
                      </div>

                      {/* Quick stage changer */}
                      <div className="flex items-center gap-2">
                        <select
                          value={currentAssistedClient.funnelStage}
                          onChange={(e) =>
                            handleMarkStage(e.target.value as ReactivationFunnelStage)
                          }
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="selecionado">🎯 A Contatar</option>
                          <option value="whatsapp_aberto">📲 WhatsApp Aberto</option>
                          <option value="contatado">✉️ Mensagem Enviada</option>
                          <option value="interessado">💬 Em Negociação</option>
                          <option value="orcamento">📄 Orçamento Enviado</option>
                          <option value="reativado_contratado">🏆 Reativado / Fechou OS</option>
                          <option value="sem_resposta">⏳ Sem Resposta</option>
                          <option value="declinado">🚫 Não Tem Interesse</option>
                        </select>
                      </div>
                    </div>

                    {/* Prepared Message Box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          Mensagem Pronta para Envio no WhatsApp:
                        </span>

                        <span className="text-[11px] text-slate-400">
                          {editingCustomText !== null ? 'Modo de Edição Ativo' : 'Gerada automaticamente'}
                        </span>
                      </div>

                      <textarea
                        rows={6}
                        value={currentAssistedMessage}
                        onChange={(e) => setEditingCustomText(e.target.value)}
                        placeholder="Mensagem pronta..."
                        className="w-full bg-slate-950/90 border border-slate-800 focus:border-emerald-500/70 rounded-2xl p-4 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed transition-all shadow-inner"
                      />
                      <p className="text-[10px] text-slate-500">
                        Dica: Você pode editar o texto livremente acima antes de clicar em "Abrir WhatsApp".
                      </p>
                    </div>

                    {/* Primary Assisted Send Action Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleIgnoreClient}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-medium transition-colors"
                        >
                          Ignorar / Não Enviar
                        </button>

                        {onGenerateQuote && currentFullClient && (
                          <button
                            type="button"
                            onClick={() => onGenerateQuote(currentAssistedClient.clientId)}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Gerar Orçamento</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        {/* 1. Open WhatsApp Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppForCurrent(false)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>1. ABRIR WHATSAPP</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </button>

                        {/* 2. Confirm Sent and Next */}
                        <button
                          type="button"
                          onClick={handleMarkAsSentAndAdvance}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>2. CONFIRMAR ENVIO & PRÓXIMO</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: FULL QUEUE TABLE ("Visão Geral da Fila") */}
              {activeTabMode === 'fila' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg space-y-0">
                  {/* Filter & Search Bar */}
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar na fila..."
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {(
                        [
                          { id: 'todos', label: 'Todos' },
                          { id: 'pendentes', label: 'Pendentes' },
                          { id: 'abertos', label: 'WhatsApp Aberto' },
                          { id: 'enviados', label: 'Enviados' },
                          { id: 'interessados', label: 'Interessados' },
                          { id: 'ignorados', label: 'Ignorados' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setQueueFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                            queueFilter === tab.id
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Queue Items */}
                  <div className="divide-y divide-slate-800 max-h-[560px] overflow-y-auto">
                    {filteredQueue.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        Nenhum produtor encontrado com os filtros selecionados.
                      </div>
                    ) : (
                      filteredQueue.map((item, idx) => {
                        const isSent =
                          item.funnelStage === 'contatado' ||
                          item.funnelStage === 'interessado' ||
                          item.funnelStage === 'orcamento' ||
                          item.funnelStage === 'reativado_contratado';

                        const originalIndex = selectedCampaign.clients.findIndex(
                          (c) => c.clientId === item.clientId
                        );

                        return (
                          <div
                            key={item.clientId}
                            className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isSent
                                    ? 'bg-emerald-500 text-slate-950'
                                    : item.funnelStage === 'whatsapp_aberto'
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {originalIndex + 1}
                              </div>

                              <div>
                                <strong className="text-white text-xs sm:text-sm font-bold block">
                                  {item.clientName}
                                </strong>
                                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                  <span>👤 {item.contactName}</span>
                                  <span>•</span>
                                  <span>📍 {item.city}</span>
                                  <span>•</span>
                                  <span className="text-amber-400">⏳ {item.daysInactive}d inativo</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                              <select
                                value={item.funnelStage}
                                onChange={(e) =>
                                  onUpdateCampaignClientStage(
                                    selectedCampaign.id,
                                    item.clientId,
                                    e.target.value as ReactivationFunnelStage
                                  )
                                }
                                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                              >
                                <option value="selecionado">🎯 A Contatar</option>
                                <option value="whatsapp_aberto">📲 Aberto</option>
                                <option value="contatado">✉️ Enviado</option>
                                <option value="interessado">💬 Interessado</option>
                                <option value="orcamento">📄 Orçamento</option>
                                <option value="reativado_contratado">🏆 Reativado</option>
                                <option value="declinado">🚫 Ignorado</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setFocusedClientIndex(originalIndex >= 0 ? originalIndex : 0);
                                  setActiveTabMode('assistido');
                                }}
                                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                              >
                                Focar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const full = clientSummaries.find((c) => c.clientId === item.clientId);
                                  const msg = item.customMessage || (full ? formatReactivationMessage(selectedCampaign.baseMessage, full, company, responsibleName) : selectedCampaign.baseMessage);
                                  const url = buildWhatsAppLink(item.whatsapp, msg);
                                  onUpdateCampaignClientStage(selectedCampaign.id, item.clientId, 'whatsapp_aberto', msg);
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 fill-current" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
