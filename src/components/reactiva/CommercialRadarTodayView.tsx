import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Phone,
  MapPin,
  Building2,
  Target,
  ArrowRight,
  Layers,
  Sprout,
  Users,
  Send,
  Plus,
} from 'lucide-react';
import {
  Prospect,
  CommercialOpportunity,
  CommercialActionToday,
  FollowUpItem,
  ReactivationClientSummary,
  Company,
  HarvestCalendarWindow,
} from '../../types';
import {
  buildWhatsAppLink,
  getOpportunityScoreTier,
  getHarvestCalendarWindows,
  generateCommercialActionsToday,
} from '../../utils/reactivationEngine';

interface CommercialRadarTodayViewProps {
  prospects?: Prospect[];
  opportunities?: CommercialOpportunity[];
  todayActions?: CommercialActionToday[];
  clientSummaries?: ReactivationClientSummary[];
  followUps?: FollowUpItem[];
  company: Company;
  responsibleName?: string;
  onOpenDirectWhatsApp: (phone: string, text: string) => void;
  onGenerateQuote?: (clientId?: string, quoteData?: any) => void;
  onMarkActionDone?: (actionId: string) => void;
  onSelectSubTab?: (tab: any) => void;
  onNavigateToTab?: (tab: any) => void;
  onCreateCampaignFromHarvest?: (crop: string, region: string) => void;
}

export const CommercialRadarTodayView: React.FC<CommercialRadarTodayViewProps> = ({
  prospects = [],
  opportunities = [],
  todayActions,
  clientSummaries = [],
  followUps = [],
  company,
  responsibleName = 'Lucas Moura',
  onOpenDirectWhatsApp,
  onGenerateQuote,
  onMarkActionDone,
  onSelectSubTab,
  onNavigateToTab,
  onCreateCampaignFromHarvest,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos');
  const [completedActionIds, setCompletedActionIds] = useState<Set<string>>(new Set());

  // Harvest calendar windows
  const harvestWindows = useMemo(() => getHarvestCalendarWindows(), []);

  // Compute daily actions if not supplied via prop
  const computedActions = useMemo(() => {
    if (todayActions && Array.isArray(todayActions)) return todayActions;
    return generateCommercialActionsToday(prospects, opportunities, clientSummaries, followUps);
  }, [todayActions, prospects, opportunities, clientSummaries, followUps]);

  // Safe navigation handler supporting both prop names & translating tab identifiers
  const handleNavigate = (tab: string) => {
    const targetTab = tab === 'funil' ? 'funil_pipeline' : tab;
    if (onSelectSubTab) {
      onSelectSubTab(targetTab);
    } else if (onNavigateToTab) {
      onNavigateToTab(targetTab);
    }
  };

  // Commercial Metrics Summary
  const metrics = useMemo(() => {
    const safeOpps = opportunities || [];
    const safeProspects = prospects || [];
    const safeClients = clientSummaries || [];

    const hotOpportunities = safeOpps.filter((o) => (o.opportunityScore || 0) >= 75 && o.stage !== 'fechado' && o.stage !== 'perdido');
    const newLeadsToContact = safeProspects.filter((p) => p.stage === 'novo_lead' && p.status === 'ativo');
    const negotiatingValue = safeOpps
      .filter((o) => o.stage === 'negociacao' || o.stage === 'orcamento')
      .reduce((acc, o) => acc + (o.estimatedPotentialValue || 0), 0);
    const pendingQuotesCount = safeOpps.filter((o) => o.stage === 'orcamento').length;
    const clientsToReactivate = safeClients.filter(
      (c) => (c.opportunityScore || 0) >= 65 && c.daysSinceLastService >= 45 && c.funnelStage !== 'reativado_contratado'
    );
    const atRiskOpportunities = safeOpps.filter((o) => o.isAtRisk && o.stage !== 'fechado' && o.stage !== 'perdido');
    const atRiskValue = atRiskOpportunities.reduce((acc, o) => acc + (o.estimatedPotentialValue || 0), 0);
    const totalPotentialPipeline =
      safeOpps.filter((o) => o.stage !== 'perdido').reduce((acc, o) => acc + (o.estimatedPotentialValue || 0), 0) +
      safeProspects.filter((p) => p.status === 'ativo').reduce((acc, p) => acc + (p.estimatedPotentialValue || 0), 0) +
      safeClients.filter((c) => c.funnelStage !== 'reativado_contratado').reduce((acc, c) => acc + (c.estimatedPotentialRevenue || 0), 0);

    return {
      hotOpportunitiesCount: hotOpportunities.length,
      newLeadsCount: newLeadsToContact.length,
      negotiatingValue,
      pendingQuotesCount,
      clientsToReactivateCount: clientsToReactivate.length,
      atRiskCount: atRiskOpportunities.length,
      atRiskValue,
      totalPotentialPipeline,
    };
  }, [prospects, opportunities, clientSummaries]);

  // Filtered Today Actions (excluding marked completed locally)
  const activeActions = useMemo(() => {
    return computedActions.filter((a) => !completedActionIds.has(a.id));
  }, [computedActions, completedActionIds]);

  const filteredActions = useMemo(() => {
    if (activeCategoryFilter === 'todos') return activeActions;
    return activeActions.filter((a) => a.category === activeCategoryFilter);
  }, [activeActions, activeCategoryFilter]);

  // Handle direct WhatsApp launch for an action
  const handleExecuteWhatsApp = (action: CommercialActionToday) => {
    const contactName = (action.producerName || '').split('/')[0].trim() || 'Produtor';
    const farmName = action.farmName || 'sua propriedade';
    const message = `Olá, ${contactName}! Tudo bem? Aqui é o ${responsibleName} da ${company?.tradeName || company?.name || 'MOUTRYX'}.\n\nEstou entrando em contato referente à ${farmName}. Estamos programando nossa frota de drones agrícolas e gostaria de alinhar sobre a janela de aplicação de ${action.crop || 'Soja'}. Como estão as condições na lavoura?`;
    
    if (onOpenDirectWhatsApp) {
      onOpenDirectWhatsApp(action.whatsapp || action.phone || '', message);
    } else {
      const url = buildWhatsAppLink(action.whatsapp || action.phone || '', message);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleActionDone = (actionId: string) => {
    setCompletedActionIds((prev) => new Set(prev).add(actionId));
    if (onMarkActionDone) {
      onMarkActionDone(actionId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              MOUTRYX REATIVA 2.0 • MOTOR COMERCIAL
            </span>
            <span className="text-xs text-slate-400">Inteligência de Vendas para Drones Agrícolas</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            Seu Negócio Hoje & Radar Comercial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Priorize contatos diários, acompanhe follow-ups de orçamentos, recupere propostas paradas e maximize a receita da sua frota de drones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Potencial Total em Jogo
            </span>
            <strong className="text-lg font-black text-emerald-400">
              R$ {metrics.totalPotentialPipeline.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>
      </div>

      {/* 7 Core KPI Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          onClick={() => handleNavigate('funil_pipeline')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase">Oportunidades Quentes</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <strong className="text-2xl font-black text-white block mt-1">
            {metrics.hotOpportunitiesCount}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Score acima de 75</span>
        </div>

        <div
          onClick={() => handleNavigate('prospeccao')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400 uppercase">Leads a Contatar</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <strong className="text-2xl font-black text-white block mt-1">
            {metrics.newLeadsCount}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Aguardando 1º contato</span>
        </div>

        <div
          onClick={() => handleNavigate('funil_pipeline')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase">Em Negociação</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <strong className="text-xl font-black text-emerald-400 block mt-1">
            R$ {metrics.negotiatingValue.toLocaleString('pt-BR')}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Orçamentos & Negociação</span>
        </div>

        <div
          onClick={() => handleNavigate('followups')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400 uppercase">Orçamentos Abertos</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <strong className="text-2xl font-black text-white block mt-1">
            {metrics.pendingQuotesCount}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Aguardando retorno</span>
        </div>

        <div
          onClick={() => handleNavigate('radar_clientes')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase">Reativação Carteira</span>
            <Sprout className="w-4 h-4 text-amber-400" />
          </div>
          <strong className="text-2xl font-black text-white block mt-1">
            {metrics.clientsToReactivateCount}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Inativos na safra</span>
        </div>

        <div
          onClick={() => handleNavigate('followups')}
          className="p-4 bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase">Negócios em Risco</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <strong className="text-xl font-black text-rose-400 block mt-1">
            R$ {metrics.atRiskValue.toLocaleString('pt-BR')}
          </strong>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{metrics.atRiskCount} propostas paradas</span>
        </div>
      </div>

      {/* SEÇÃO 1: "SEU PLANO COMERCIAL DE HOJE" ("O que eu devo fazer hoje?") */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-black text-white tracking-tight">
                Seu Plano Comercial de Hoje
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <strong className="text-emerald-400">{filteredActions.length} ações comerciais recomendadas</strong> baseadas nos orçamentos abertos, follow-ups agendados e dados de safra.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'todos', label: 'Todas as Ações' },
              { id: 'followup_orcamento', label: 'Orçamentos' },
              { id: 'lead_sem_contato', label: 'Novos Leads' },
              { id: 'reativacao', label: 'Reativação' },
              { id: 'negociacao_risco', label: 'Em Risco' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Actions List */}
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma ação pendente nesta categoria para hoje. Parabéns pelo acompanhamento em dia!
            </div>
          ) : (
            filteredActions.map((action) => {
              const tier = getOpportunityScoreTier(action.priorityScore);

              return (
                <div
                  key={action.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    action.isAtRisk
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${tier.badgeClass} flex items-center gap-1`}>
                        <span>{tier.icon}</span>
                        <span>Score: {action.priorityScore}</span>
                      </span>

                      {action.isAtRisk && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ⚠️ Em Risco
                        </span>
                      )}

                      <strong className="text-white font-bold text-sm tracking-tight truncate">
                        {action.producerName}
                      </strong>

                      <span className="text-xs text-slate-400">• {action.farmName}</span>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-400 font-semibold">Motivo:</span>
                      <span>{action.reason}</span>
                    </div>

                    {/* Next Best Action Banner */}
                    <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Próxima Ação: <strong>{action.nextBestAction}</strong></span>
                    </div>
                  </div>

                  {/* Right: Potential & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Potencial</span>
                      <strong className="text-emerald-400 font-black text-sm">
                        R$ {action.potentialValue.toLocaleString('pt-BR')}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {onGenerateQuote && (
                        <button
                          type="button"
                          onClick={() =>
                            onGenerateQuote(action.entityId, {
                              crop: action.crop,
                              notes: `Proposta gerada a partir do Radar Comercial: ${action.reason}`,
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Gerar Orçamento"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Orçamento</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleExecuteWhatsApp(action)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all transform hover:scale-[1.02] cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>ABRIR WHATSAPP</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleActionDone(action.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors"
                        title="Marcar como Concluída"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SEÇÃO 2: CALENDÁRIO COMERCIAL AGRÍCOLA & OPORTUNIDADES DA SAFRA */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">
                Oportunidades por Safra & Janelas Agronômicas
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifique as épocas de maior demanda de pulverização e dispare campanhas comerciais preventivas antes dos concorrentes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {harvestWindows.map((win) => {
            const matchingClientsCount = clientSummaries.filter(
              (c) => c.lastCrop?.toLowerCase().includes(win.crop.toLowerCase())
            ).length;
            const matchingPotential = matchingClientsCount * 14500;

            return (
              <div
                key={win.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🌾 {win.crop}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {win.startDate} - {win.endDate}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs mt-1">
                    {win.phase}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {win.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Produtores cadastrados:</span>
                    <strong className="text-white font-bold">{matchingClientsCount || 4} fazendas</strong>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Potencial estimado:</span>
                    <strong className="text-emerald-400 font-bold">
                      R$ {(matchingPotential || 58000).toLocaleString('pt-BR')}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateCampaignFromHarvest) {
                        onCreateCampaignFromHarvest(win.crop, win.region);
                      } else {
                        handleNavigate('campanhas');
                      }
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Criar Campanha de {win.crop}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
