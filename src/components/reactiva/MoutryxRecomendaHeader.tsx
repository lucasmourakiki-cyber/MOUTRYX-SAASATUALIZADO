import React from 'react';
import {
  Target,
  Sparkles,
  Flame,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ReactivationMetricsSummary,
} from '../../types';

interface MoutryxRecomendaHeaderProps {
  metrics: ReactivationMetricsSummary;
  clientSummaries: ReactivationClientSummary[];
  onOpenWhoToContactModal: () => void;
  onFilterRiskClients: () => void;
  onOpenCreateCampaignWithRecommended: () => void;
}

export const MoutryxRecomendaHeader: React.FC<MoutryxRecomendaHeaderProps> = ({
  metrics,
  clientSummaries,
  onOpenWhoToContactModal,
  onFilterRiskClients,
  onOpenCreateCampaignWithRecommended,
}) => {
  const oppMetrics = metrics.opportunityMetrics;
  const recommendedCount = oppMetrics?.recommendedCount ?? 0;
  const recommendedPotential = oppMetrics?.recommendedPotentialRevenue ?? 0;
  const highPriorityCount = oppMetrics?.maximumPriorityCount ?? 0;
  const atRiskCount = oppMetrics?.atRiskCount ?? 0;
  const unworkedRevenue = oppMetrics?.unworkedPotentialRevenue ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-6 shadow-xl">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Brand / Title / Pitch */}
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>MOUTRYX RECOMENDA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Quem você deveria contatar hoje?
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            A MOUTRYX analisou seu histórico operacional e comercial para encontrar as oportunidades de aplicação com maior probabilidade de conversão e maior potencial de retorno financeiro.
          </p>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={onOpenWhoToContactModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>QUEM CONTATAR HOJE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCreateCampaignWithRecommended}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Campanha Rápida ({recommendedCount})</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-slate-800/80">
        {/* Metric 1: Oportunidades Hoje */}
        <div
          onClick={onOpenWhoToContactModal}
          className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-emerald-300 transition-colors">
              🎯 Oportunidades Hoje
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
              {recommendedCount}
            </span>
            <span className="text-[10px] text-slate-400">clientes indicados</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">Score &ge; 70</span>
        </div>

        {/* Metric 2: Potencial Estimado */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              💰 Potencial Estimado
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-400">
              R$ {recommendedPotential.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Nas contas recomendadas</span>
        </div>

        {/* Metric 3: Alta Prioridade */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              🔥 Prioridade Máxima
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Flame className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400">
              {highPriorityCount}
            </span>
            <span className="text-[10px] text-slate-400">clientes urgentes</span>
          </div>
          <span className="text-[10px] text-amber-300 font-medium">Score 85 a 100</span>
        </div>

        {/* Metric 4: Clientes em Risco */}
        <div
          onClick={onFilterRiskClients}
          className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-rose-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-rose-300 transition-colors">
              🚨 Risco de Perda
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-400">
              {atRiskCount}
            </span>
            <span className="text-[10px] text-slate-400">clientes em desvio</span>
          </div>
          <span className="text-[10px] text-rose-300 font-medium group-hover:underline">Clique para filtrar</span>
        </div>
      </div>

      {/* Estimativa de Receita Potencial Não Trabalhada */}
      <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Receita Potencial Não Trabalhada:</span>
              <span className="text-amber-300 font-black text-sm">
                R$ {unworkedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                Estimativa
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Estimativa calculada sobre clientes recorrentes atualmente fora do intervalo esperado de contratação.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWhoToContactModal}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
        >
          <span>Explorar Oportunidades</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
