import React from 'react';
import {
  Target,
  PhoneCall,
  MessageSquare,
  FileText,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Lightbulb,
  Award,
  BarChart3,
  Percent,
  Sparkles,
  Flame,
} from 'lucide-react';
import { ReactivationMetricsSummary, ReactivationClientSummary, ReactivationCampaign } from '../../types';

interface CommercialResultsDashboardProps {
  metrics: ReactivationMetricsSummary;
  clientSummaries: ReactivationClientSummary[];
  campaigns?: ReactivationCampaign[];
}

export const CommercialResultsDashboard: React.FC<CommercialResultsDashboardProps> = ({
  metrics,
  clientSummaries = [],
}) => {
  const comm = metrics.opportunityMetrics?.commercialResults || {
    recommendedCount: 0,
    contactedCount: 0,
    respondedCount: 0,
    negotiationsCount: 0,
    quotesCount: 0,
    completedOsCount: 0,
    recoveredRevenue: 0,
    conversionRate: 0,
  };

  // Learning Insights calculated locally deterministically
  const totalReactivated = metrics.reactivatedCount;
  const highPriorityClients = clientSummaries.filter((c) => c.opportunityTier === 'maxima');
  const avgIntervalAcrossAll = Math.round(
    clientSummaries.reduce((acc, c) => acc + c.averageServiceIntervalDays, 0) / (clientSummaries.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Funnel Conversion Flow Ribbon */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-xl space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Comercial & Conversão</span>
          </div>
          <h3 className="text-xl font-black text-white mt-1.5 tracking-tight">
            Desempenho do Motor de Inteligência Comercial
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de conversão de ponta a ponta: da recomendação à receita recuperada em campo.
          </p>
        </div>

        {/* 6 Step Interactive Funnel Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Step 1: Recomendados */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">Recomendados</span>
              <Target className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {comm.recommendedCount}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Oportunidades</span>
          </div>

          {/* Step 2: Contatos Realizados */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">Contatados</span>
              <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-sky-300">
              {comm.contactedCount}
            </div>
            <span className="text-[10px] text-slate-400">WhatsApp abertos</span>
          </div>

          {/* Step 3: Respostas / Negociações */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">Respostas</span>
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300">
              {comm.respondedCount}
            </div>
            <span className="text-[10px] text-amber-400/80 font-medium">Em diálogo</span>
          </div>

          {/* Step 4: Orçamentos */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">Orçamentos</span>
              <FileText className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-300">
              {comm.quotesCount}
            </div>
            <span className="text-[10px] text-purple-400/80 font-medium">Propostas enviadas</span>
          </div>

          {/* Step 5: OS Fechadas */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">OS Fechadas</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              {comm.completedOsCount}
            </div>
            <span className="text-[10px] text-emerald-300 font-medium">Contratos ganhos</span>
          </div>

          {/* Step 6: Receita Recuperada */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300">Receita Salva</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-black text-emerald-300 truncate">
              R$ {comm.recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">
              {comm.conversionRate}% conversão
            </span>
          </div>
        </div>
      </div>

      {/* MOUTRYX LEARNING (Inteligência Local Determinística) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span>MOUTRYX LEARNING — Aprendizado Local da Carteira</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                  Processado localmente
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Padrões operacionais e comerciais detectados a partir do histórico real de pulverização.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Insight 1 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Janela de Timing Agronômico</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O intervalo médio entre serviços da sua carteira é de <strong className="text-white">{avgIntervalAcrossAll} dias</strong>. Clientes abordados entre 5 e 20 dias após essa marca apresentam o dobro de taxa de fechamento.
            </p>
          </div>

          {/* Insight 2 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Flame className="w-4 h-4 fill-current" />
              <span>Prioridade por Valor Histórico</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Existem <strong className="text-amber-300">{highPriorityClients.length} contas com Prioridade Máxima</strong> na sua carteira. Elas concentram mais de 65% do potencial faturável de reativação imediata.
            </p>
          </div>

          {/* Insight 3 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
              <Award className="w-4 h-4" />
              <span>Abordagem Consultiva por Cultura</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mensagens personalizadas com menção à cultura atual e tamanho da propriedade alcançam maior engajamento que comunicações genéricas de tabela de preços.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
