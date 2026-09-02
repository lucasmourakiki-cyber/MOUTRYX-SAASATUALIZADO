import React, { useState } from 'react';
import {
  Flame,
  DollarSign,
  Sparkles,
  Clock,
  ArrowRight,
  MessageCircle,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  CommercialQuadrant,
} from '../../types';

interface CommercialOpportunityMatrixProps {
  clientSummaries: ReactivationClientSummary[];
  onOpenDirectWhatsApp: (client: ReactivationClientSummary) => void;
  onGenerateQuote: (clientId: string) => void;
  onOpenCreateCampaign: (clients: ReactivationClientSummary[]) => void;
}

export const CommercialOpportunityMatrix: React.FC<CommercialOpportunityMatrixProps> = ({
  clientSummaries = [],
  onOpenDirectWhatsApp,
  onGenerateQuote,
  onOpenCreateCampaign,
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<CommercialQuadrant | 'all'>('all');

  const altoAltoClients = clientSummaries.filter((c) => c.quadrantClassification === 'alto_alto');
  const altoBaixoClients = clientSummaries.filter((c) => c.quadrantClassification === 'alto_baixo');
  const baixoAltoClients = clientSummaries.filter((c) => c.quadrantClassification === 'baixo_alto');
  const baixoBaixoClients = clientSummaries.filter((c) => c.quadrantClassification === 'baixo_baixo');

  const sumRevenue = (clients: ReactivationClientSummary[]) =>
    clients.reduce((acc, c) => acc + c.estimatedPotentialRevenue, 0);

  const displayedClients =
    selectedQuadrant === 'all'
      ? clientSummaries
      : clientSummaries.filter((c) => c.quadrantClassification === selectedQuadrant);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase">
            <span>Matriz Comercial</span>
          </div>
          <h3 className="text-lg font-black text-white mt-1">
            Matriz de Oportunidades: Potencial Financeiro x Probabilidade
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distribuição estratégica da sua carteira para tomada de decisão de prospecção e abordagem comercial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedQuadrant('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedQuadrant === 'all'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ver Todos ({clientSummaries.length})
          </button>
        </div>
      </div>

      {/* 2x2 Matrix Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quadrant 1: Alto Potencial + Alta Probabilidade */}
        <div
          onClick={() => setSelectedQuadrant('alto_alto')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedQuadrant === 'alto_alto'
              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
              : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wide block">
                  Alto Potencial + Alta Probabilidade
                </span>
                <h4 className="text-base font-black text-white">
                  🔥 "Contate Agora"
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black">
              {altoAltoClients.length} clientes
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-3">
            Clientes com grande área/ticket que estão no momento exato da janela de aplicação.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Potencial Estimado:</span>
            <span className="font-black text-emerald-400 text-sm">
              R$ {sumRevenue(altoAltoClients).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Quadrant 2: Alto Potencial + Baixa Probabilidade */}
        <div
          onClick={() => setSelectedQuadrant('alto_baixo')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedQuadrant === 'alto_baixo'
              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
              : 'bg-slate-900/90 border-slate-800 hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wide block">
                  Alto Potencial + Baixa Probabilidade
                </span>
                <h4 className="text-base font-black text-white">
                  💰 "Abordagem Estratégica"
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black">
              {altoBaixoClients.length} clientes
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-3">
            Contas de grande porte que estão frias ou necessitam de contato consultivo e visita técnica.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Potencial Estimado:</span>
            <span className="font-black text-emerald-400 text-sm">
              R$ {sumRevenue(altoBaixoClients).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Quadrant 3: Baixo Potencial + Alta Probabilidade */}
        <div
          onClick={() => setSelectedQuadrant('baixo_alto')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedQuadrant === 'baixo_alto'
              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
              : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide block">
                  Baixo Potencial + Alta Probabilidade
                </span>
                <h4 className="text-base font-black text-white">
                  🟢 "Oportunidade Rápida"
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
              {baixoAltoClients.length} clientes
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-3">
            Áreas menores ou produtores pontuais fáceis de fechar rapidamente via mensagem WhatsApp.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Potencial Estimado:</span>
            <span className="font-black text-emerald-400 text-sm">
              R$ {sumRevenue(baixoAltoClients).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Quadrant 4: Baixo Potencial + Baixa Probabilidade */}
        <div
          onClick={() => setSelectedQuadrant('baixo_baixo')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedQuadrant === 'baixo_baixo'
              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/40 border-slate-500 ring-2 ring-slate-500/40 shadow-xl'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                  Baixo Potencial + Baixa Probabilidade
                </span>
                <h4 className="text-base font-black text-white">
                  ⚪ "Baixa Prioridade"
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black">
              {baixoBaixoClients.length} clientes
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-3">
            Clientes sem histórico recente de recorrência; manter em campanhas gerais automáticas.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Potencial Estimado:</span>
            <span className="font-black text-slate-300 text-sm">
              R$ {sumRevenue(baixoBaixoClients).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Quadrant Clients List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white">
              {selectedQuadrant === 'all'
                ? 'Todos os Clientes na Matriz'
                : selectedQuadrant === 'alto_alto'
                ? '🔥 Clientes: Alto Potencial + Alta Probabilidade'
                : selectedQuadrant === 'alto_baixo'
                ? '💰 Clientes: Alto Potencial + Baixa Probabilidade'
                : selectedQuadrant === 'baixo_alto'
                ? '🟢 Clientes: Baixo Potencial + Alta Probabilidade'
                : '⚪ Clientes: Baixa Prioridade'}
            </h4>
            <span className="text-xs text-slate-400">
              ({displayedClients.length} clientes)
            </span>
          </div>

          {displayedClients.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenCreateCampaign(displayedClients)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Criar Campanha com Este Quadrante</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
          {displayedClients.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum cliente classificado neste quadrante.
            </div>
          ) : (
            displayedClients.map((client) => (
              <div
                key={client.clientId}
                className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {client.clientName}
                    </span>
                    <span className="text-slate-400">({client.contactName})</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-semibold">
                      Score: {client.opportunityScore}/100
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-1">
                    <span>🌾 {client.lastCrop || 'Soja'}</span>
                    <span>•</span>
                    <span>{client.daysSinceLastService} dias sem aplicar</span>
                    <span>•</span>
                    <span>Intervalo médio: {client.averageServiceIntervalDays}d</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-emerald-400 font-black text-sm block">
                      R$ {client.estimatedPotentialRevenue.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-500">potencial</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onGenerateQuote(client.clientId)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                      title="Gerar Orçamento"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDirectWhatsApp(client)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
