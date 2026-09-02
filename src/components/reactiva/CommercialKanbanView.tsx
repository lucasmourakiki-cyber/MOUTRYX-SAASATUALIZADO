import React, { useState, useMemo } from 'react';
import {
  Users,
  MessageCircle,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Flame,
  ArrowRight,
  ExternalLink,
  Phone,
  Clock,
  Layers,
  Building2,
  Calendar,
  XCircle,
  Search,
  Filter,
  X,
  Zap,
} from 'lucide-react';
import {
  CommercialFunnelStage,
  CommercialOpportunity,
  Prospect,
  ReactivationClientSummary,
  Company,
  LostReason,
} from '../../types';
import {
  buildWhatsAppLink,
  getOpportunityScoreTier,
} from '../../utils/reactivationEngine';

interface CommercialKanbanViewProps {
  opportunities: CommercialOpportunity[];
  prospects: Prospect[];
  clientSummaries: ReactivationClientSummary[];
  company: Company;
  responsibleName?: string;
  onUpdateOpportunityStage: (
    id: string,
    newStage: CommercialFunnelStage,
    lostReason?: LostReason,
    lostReasonDetails?: string
  ) => void;
  onUpdateProspectStage: (
    id: string,
    newStage: CommercialFunnelStage,
    lostReason?: LostReason,
    lostReasonDetails?: string
  ) => void;
  onOpenDirectWhatsApp: (phone: string, text: string) => void;
  onGenerateQuote?: (clientId?: string, quoteData?: any) => void;
}

interface KanbanUnifiedItem {
  id: string;
  sourceType: 'oportunidade' | 'prospecto' | 'cliente';
  entityId: string;
  title: string;
  producerName: string;
  farmName: string;
  phone: string;
  whatsapp: string;
  city: string;
  crop: string;
  areaHa: number;
  estimatedPotentialValue: number;
  stage: CommercialFunnelStage;
  opportunityScore: number;
  nextBestAction: string;
  isAtRisk?: boolean;
}

interface KanbanColumnDef {
  id: CommercialFunnelStage;
  title: string;
  headerBg: string;
  badgeClass: string;
  icon: React.ReactNode;
}

export const CommercialKanbanView: React.FC<CommercialKanbanViewProps> = ({
  opportunities = [],
  prospects = [],
  clientSummaries = [],
  company,
  responsibleName = 'Lucas Moura',
  onUpdateOpportunityStage,
  onUpdateProspectStage,
  onOpenDirectWhatsApp,
  onGenerateQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemForLossModal, setSelectedItemForLossModal] = useState<KanbanUnifiedItem | null>(null);

  // Kanban Columns Definition (Full Cycle)
  const columns: KanbanColumnDef[] = [
    {
      id: 'novo_lead',
      title: '🎯 Novo Lead',
      headerBg: 'from-slate-800/40 to-slate-900',
      badgeClass: 'border-slate-700 bg-slate-800/80 text-slate-300',
      icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
    },
    {
      id: 'primeiro_contato',
      title: '📞 1º Contato',
      headerBg: 'from-sky-950/30 to-slate-900',
      badgeClass: 'border-sky-500/40 bg-sky-950/40 text-sky-300',
      icon: <Phone className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      id: 'contato_realizado',
      title: '💬 Contatado',
      headerBg: 'from-blue-950/30 to-slate-900',
      badgeClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
      icon: <MessageCircle className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      id: 'interesse',
      title: '⭐ Interesse',
      headerBg: 'from-amber-950/30 to-slate-900',
      badgeClass: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'levantamento_area',
      title: '📐 Lev. de Área',
      headerBg: 'from-indigo-950/30 to-slate-900',
      badgeClass: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300',
      icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" />,
    },
    {
      id: 'orcamento',
      title: '📄 Orçamento',
      headerBg: 'from-purple-950/30 to-slate-900',
      badgeClass: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
      icon: <FileText className="w-3.5 h-3.5 text-purple-400" />,
    },
    {
      id: 'negociacao',
      title: '🤝 Negociação',
      headerBg: 'from-orange-950/30 to-slate-900',
      badgeClass: 'border-orange-500/40 bg-orange-950/40 text-orange-300',
      icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
    },
    {
      id: 'fechado',
      title: '🏆 Fechado',
      headerBg: 'from-emerald-950/40 to-slate-900',
      badgeClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'servico_agendado',
      title: '📅 Agendado',
      headerBg: 'from-teal-950/30 to-slate-900',
      badgeClass: 'border-teal-500/40 bg-teal-950/40 text-teal-300',
      icon: <Calendar className="w-3.5 h-3.5 text-teal-400" />,
    },
    {
      id: 'servico_concluido',
      title: '✓ Concluído',
      headerBg: 'from-green-950/30 to-slate-900',
      badgeClass: 'border-green-500/40 bg-green-950/40 text-green-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
    },
    {
      id: 'pos_venda',
      title: '🔄 Pós-Venda',
      headerBg: 'from-violet-950/30 to-slate-900',
      badgeClass: 'border-violet-500/40 bg-violet-950/40 text-violet-300',
      icon: <Layers className="w-3.5 h-3.5 text-violet-400" />,
    },
  ];

  // Merge items into unified pipeline
  const unifiedItems: KanbanUnifiedItem[] = useMemo(() => {
    const list: KanbanUnifiedItem[] = [];

    // Opportunities
    opportunities.forEach((o) => {
      list.push({
        id: `opp-${o.id}`,
        sourceType: 'oportunidade',
        entityId: o.id,
        title: o.title,
        producerName: o.producerName,
        farmName: o.farmName,
        phone: o.phone || o.whatsapp,
        whatsapp: o.whatsapp || o.phone,
        city: o.city,
        crop: o.crop,
        areaHa: o.areaHa,
        estimatedPotentialValue: o.estimatedPotentialValue || 15000,
        stage: o.stage,
        opportunityScore: o.opportunityScore,
        nextBestAction: o.nextBestAction || 'Realizar follow-up comercial',
        isAtRisk: o.isAtRisk,
      });
    });

    // Prospects not already mapped as standalone opportunity
    prospects.forEach((p) => {
      if (p.status !== 'descartado') {
        list.push({
          id: `prosp-${p.id}`,
          sourceType: 'prospecto',
          entityId: p.id,
          title: `Oportunidade de Prospecção - ${p.producerName}`,
          producerName: p.producerName,
          farmName: p.farmName,
          phone: p.phone || p.whatsapp,
          whatsapp: p.whatsapp || p.phone,
          city: p.city,
          crop: p.crops[0] || 'Soja',
          areaHa: p.approximateAreaHa,
          estimatedPotentialValue: p.estimatedPotentialValue || 20000,
          stage: p.stage,
          opportunityScore: p.opportunityScore,
          nextBestAction: 'Qualificar área e culturas de interesse',
        });
      }
    });

    return list;
  }, [opportunities, prospects]);

  // Filtered
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return unifiedItems;
    const term = searchTerm.toLowerCase();
    return unifiedItems.filter(
      (item) =>
        item.producerName.toLowerCase().includes(term) ||
        item.farmName.toLowerCase().includes(term) ||
        item.city.toLowerCase().includes(term) ||
        item.crop.toLowerCase().includes(term)
    );
  }, [unifiedItems, searchTerm]);

  // Stage update handler
  const handleMoveStage = (item: KanbanUnifiedItem, newStage: CommercialFunnelStage) => {
    if (newStage === 'perdido') {
      setSelectedItemForLossModal(item);
      return;
    }

    if (item.sourceType === 'oportunidade') {
      onUpdateOpportunityStage(item.entityId, newStage);
    } else if (item.sourceType === 'prospecto') {
      onUpdateProspectStage(item.entityId, newStage);
    }
  };

  // Confirm loss
  const handleConfirmLoss = (reason: LostReason, details: string) => {
    if (!selectedItemForLossModal) return;
    if (selectedItemForLossModal.sourceType === 'oportunidade') {
      onUpdateOpportunityStage(selectedItemForLossModal.entityId, 'perdido', reason, details);
    } else if (selectedItemForLossModal.sourceType === 'prospecto') {
      onUpdateProspectStage(selectedItemForLossModal.entityId, 'perdido', reason, details);
    }
    setSelectedItemForLossModal(null);
  };

  // WhatsApp quick launch
  const handleLaunchWhatsApp = (item: KanbanUnifiedItem) => {
    const contactName = item.producerName.split('/')[0].trim();
    const msg = `Olá, ${contactName}! Sou o ${responsibleName} da ${company.tradeName || company.name}.\n\nEstou entrando em contato referente à ${item.farmName}. Estamos organizando nossa escala de voos para pulverização de ${item.crop}. Como está o planejamento da sua lavoura?`;
    const url = buildWhatsAppLink(item.whatsapp || item.phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const totalFunnelPotential = filteredItems
    .filter((i) => i.stage !== 'perdido')
    .reduce((acc, i) => acc + (i.estimatedPotentialValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              PIPELINE COMERCIAL COMPLETO
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-1">
            Funil Comercial & Gestão de Oportunidades
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Acompanhe o ciclo completo de venda da sua empresa de drones: do novo lead até o levantamento de área, orçamento, fechamento e pós-venda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Volume Total em Pipeline:</span>
            <strong className="text-emerald-400 font-black text-base">
              R$ {totalFunnelPotential.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por produtor, fazenda, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredItems.length} oportunidades ativas
        </span>
      </div>

      {/* Multi-Column Horizontal Scrolling Kanban Board */}
      <div className="flex items-start gap-3.5 overflow-x-auto pb-6 pt-1">
        {columns.map((col) => {
          const colItems = filteredItems.filter((item) => item.stage === col.id);
          const colTotalPotential = colItems.reduce(
            (acc, item) => acc + (item.estimatedPotentialValue || 0),
            0
          );

          return (
            <div
              key={col.id}
              className="bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col min-w-[280px] max-w-[280px] min-h-[580px] shadow-sm overflow-hidden shrink-0"
            >
              {/* Column Header */}
              <div className={`p-3 bg-gradient-to-b ${col.headerBg} border-b border-slate-800 flex items-center justify-between`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {col.icon}
                  <span className="font-bold text-xs text-white tracking-tight truncate">
                    {col.title}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {colItems.length}
                </span>
              </div>

              {/* Column Potential Subtitle */}
              <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Total:</span>
                <strong className="text-emerald-400 font-bold">
                  R$ {colTotalPotential.toLocaleString('pt-BR')}
                </strong>
              </div>

              {/* Column Cards List */}
              <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[620px]">
                {colItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 text-xs italic">
                    Nenhuma oportunidade
                  </div>
                ) : (
                  colItems.map((item) => {
                    const scoreTier = getOpportunityScoreTier(item.opportunityScore);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all shadow-sm space-y-2 group ${
                          item.isAtRisk
                            ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                            : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        {/* Top Producer Info */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <strong className="text-white text-xs font-bold block truncate">
                              {item.producerName}
                            </strong>
                            <span className="text-[11px] text-emerald-400 font-medium truncate block">
                              {item.farmName}
                            </span>
                          </div>

                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${scoreTier.badgeClass} flex items-center gap-0.5 shrink-0`}>
                            <span>{scoreTier.icon}</span>
                            <span>{item.opportunityScore}</span>
                          </span>
                        </div>

                        {/* Location & Crop Tags */}
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            🌾 {item.crop}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            📐 {item.areaHa} ha
                          </span>
                        </div>

                        {/* Next Best Action */}
                        <div className="text-[10px] text-emerald-300 bg-emerald-950/50 p-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="line-clamp-1 font-medium">{item.nextBestAction}</span>
                        </div>

                        {/* Value & Actions Toolbar */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                          <strong className="text-emerald-400 font-black text-[11px]">
                            R$ {item.estimatedPotentialValue.toLocaleString('pt-BR')}
                          </strong>

                          <div className="flex items-center gap-1">
                            {onGenerateQuote && (
                              <button
                                type="button"
                                onClick={() => onGenerateQuote(item.entityId, { crop: item.crop, areaHa: item.areaHa })}
                                className="p-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                                title="Gerar Orçamento"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleLaunchWhatsApp(item)}
                              className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors"
                              title="Abrir WhatsApp Oficial"
                            >
                              <MessageCircle className="w-3 h-3 fill-current" />
                            </button>

                            {/* Stage Selector */}
                            <select
                              value={item.stage}
                              onChange={(e) =>
                                handleMoveStage(item, e.target.value as CommercialFunnelStage)
                              }
                              className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:outline-none max-w-[80px]"
                              title="Mover Estágio"
                            >
                              <option value="novo_lead">Novo Lead</option>
                              <option value="primeiro_contato">1º Contato</option>
                              <option value="contato_realizado">Contatado</option>
                              <option value="interesse">Interesse</option>
                              <option value="levantamento_area">Lev. Área</option>
                              <option value="orcamento">Orçamento</option>
                              <option value="negociacao">Negociação</option>
                              <option value="fechado">Fechado</option>
                              <option value="servico_agendado">Agendado</option>
                              <option value="servico_concluido">Concluído</option>
                              <option value="pos_venda">Pós-Venda</option>
                              <option value="perdido">🚫 Perdido</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LOSS REASON MODAL */}
      {selectedItemForLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white">
              Por que a oportunidade com {selectedItemForLossModal.producerName} foi perdida?
            </h3>
            <p className="text-xs text-slate-400">
              Registrar o motivo exato ajuda a melhorar as estratégias de precificação e negociação da frota.
            </p>

            <div className="space-y-2">
              {(
                [
                  { id: 'preco', label: 'Preço / Concorrente cobrou menos' },
                  { id: 'escolheu_concorrente', label: 'Escolheu outro prestador de drone' },
                  { id: 'nao_respondeu', label: 'Não respondeu após contatos de follow-up' },
                  { id: 'area_inadequada', label: 'Área ou topografia inadequada para o drone' },
                  { id: 'mudanca_planejamento', label: 'Produtor mudou o planejamento de pulverização' },
                  { id: 'sem_necessidade', label: 'Sem necessidade no momento' },
                  { id: 'outro', label: 'Outro motivo' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleConfirmLoss(m.id, m.label)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemForLossModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
