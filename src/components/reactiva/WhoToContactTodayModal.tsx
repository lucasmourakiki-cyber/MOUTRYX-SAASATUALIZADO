import React, { useState, useMemo } from 'react';
import {
  X,
  Target,
  Flame,
  Sparkles,
  DollarSign,
  Clock,
  Layers,
  MapPin,
  MessageCircle,
  Copy,
  Check,
  FileText,
  Plus,
  Send,
  Zap,
  CheckCircle2,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  Company,
  ReactivationFunnelStage,
} from '../../types';
import { buildWhatsAppLink } from '../../utils/reactivationEngine';

interface WhoToContactTodayModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSummaries: ReactivationClientSummary[];
  company: Company;
  onUpdateFunnelStage: (
    clientId: string,
    newStage: ReactivationFunnelStage,
    messageSent?: string
  ) => void;
  onGenerateQuote: (clientId: string) => void;
  onOpenCreateCampaign: (selectedClients: ReactivationClientSummary[]) => void;
}

export const WhoToContactTodayModal: React.FC<WhoToContactTodayModalProps> = ({
  isOpen,
  onClose,
  clientSummaries,
  company,
  onUpdateFunnelStage,
  onGenerateQuote,
  onOpenCreateCampaign,
}) => {
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'maxima' | 'alta'>('all');

  // Filter and sort top opportunities by opportunity score
  const recommendedClients = useMemo(() => {
    return clientSummaries
      .filter((c) => c.opportunityScore >= 70 && c.funnelStage !== 'reativado_contratado')
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [clientSummaries]);

  const filteredList = useMemo(() => {
    if (activeFilter === 'maxima') {
      return recommendedClients.filter((c) => c.opportunityTier === 'maxima');
    }
    if (activeFilter === 'alta') {
      return recommendedClients.filter((c) => c.opportunityTier === 'alta');
    }
    return recommendedClients;
  }, [recommendedClients, activeFilter]);

  const totalEstimatedPotential = useMemo(() => {
    return recommendedClients.reduce((acc, c) => acc + c.estimatedPotentialRevenue, 0);
  }, [recommendedClients]);

  if (!isOpen) return null;

  const handleCopyMessage = (clientId: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedClientId(clientId);
    setTimeout(() => setCopiedClientId(null), 2500);
  };

  const handleReactivateNow = (client: ReactivationClientSummary) => {
    const waUrl = buildWhatsAppLink(client.whatsapp || client.phone, client.recommendedMessage);
    // Mark as contatado in funnel
    onUpdateFunnelStage(client.clientId, 'contatado', client.recommendedMessage);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCreateCampaignWithAll = () => {
    onOpenCreateCampaign(recommendedClients);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  🎯 QUEM CONTATAR HOJE
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                  {recommendedClients.length} Oportunidades
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Clientes priorizados deterministicamente pelo MOUTRYX Opportunity Engine.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Potential Highlight & Fast Actions Bar */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Potencial Total Recomendado
              </span>
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                R$ {totalEstimatedPotential.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({recommendedClients.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('maxima')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'maxima'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔥 Prioridade Máxima
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('alta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFilter === 'alta'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Alta Oportunidade
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateCampaignWithAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>REATIVAR TODOS EM CAMPANHA ({recommendedClients.length})</span>
          </button>
        </div>

        {/* Opportunity Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-base font-bold text-white">Nenhum cliente neste filtro!</p>
              <p className="text-xs text-slate-500 mt-1">
                Todas as oportunidades recomendadas de hoje já foram contatadas ou não atendem ao filtro.
              </p>
            </div>
          ) : (
            filteredList.map((client, index) => {
              const isCopied = copiedClientId === client.clientId;
              const isMaxima = client.opportunityTier === 'maxima';

              return (
                <div
                  key={client.clientId}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isMaxima
                      ? 'bg-gradient-to-br from-slate-900 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-emerald-400">
                        #{index + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {client.clientName}
                          </h4>
                          {isMaxima ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <Flame className="w-3 h-3 fill-current" />
                              PRIORIDADE MÁXIMA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <Sparkles className="w-3 h-3" />
                              ALTA OPORTUNIDADE
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-emerald-400 font-semibold">{client.contactName}</span>
                          <span>•</span>
                          <span>{client.lastPropertyName || 'Fazenda Principal'}</span>
                          <span>•</span>
                          <span>{client.city}/{client.state}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score & Potential */}
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Score Oportunidade
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-lg font-black ${isMaxima ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {client.opportunityScore}
                          </span>
                          <span className="text-xs text-slate-500">/100</span>
                        </div>
                      </div>

                      <div className="h-6 w-px bg-slate-800" />

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Potencial Estimado
                        </span>
                        <span className="text-lg font-black text-emerald-400">
                          R$ {client.estimatedPotentialRevenue.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block font-medium">Última Aplicação</span>
                        <span className="text-white font-bold mt-0.5 block">
                          {client.daysSinceLastService >= 999 ? 'Sem OS' : `${client.daysSinceLastService} dias atrás`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Intervalo médio: {client.averageServiceIntervalDays}d
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block font-medium">Histórico Faturado</span>
                        <span className="text-white font-bold mt-0.5 block">
                          R$ {client.totalRevenue.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {client.totalCompletedOrders} serviços realizados
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block font-medium">Cultura / Região</span>
                        <span className="text-emerald-300 font-bold mt-0.5 block truncate">
                          🌾 {client.lastCrop || 'Soja'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          📍 {client.city}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block font-medium">Score Reativação</span>
                        <span className="text-amber-400 font-bold mt-0.5 block">
                          {client.reactivationScore}/100
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Chance de retorno
                        </span>
                      </div>
                    </div>

                    {/* Section: POR QUE A MOUTRYX RECOMENDA? */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Info className="w-3.5 h-3.5 text-emerald-400" />
                        <span>POR QUE A MOUTRYX RECOMENDA?</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                        {client.opportunityReasons.slice(0, 4).map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px] leading-tight">
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section: PRÓXIMA MELHOR AÇÃO */}
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5 text-xs">
                      <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-300 block">
                          🎯 PRÓXIMA MELHOR AÇÃO
                        </span>
                        <p className="text-slate-200 mt-0.5 leading-snug">
                          {client.nextBestAction}
                        </p>
                      </div>
                    </div>

                    {/* Section: MENSAGEM RECOMENDADA */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          MENSAGEM RECOMENDADA PERSONALIZADA
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyMessage(client.clientId, client.recommendedMessage)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/90 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed border border-slate-800/80">
                        {client.recommendedMessage}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onGenerateQuote(client.clientId)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Gerar Orçamento</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenCreateCampaign([client])}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar à Campanha</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReactivateNow(client)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/15 transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                        <span>🔥 REATIVAR AGORA (WhatsApp)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mostrando {filteredList.length} de {recommendedClients.length} oportunidades qualificadas
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
