import React, { useState } from 'react';
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
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ReactivationFunnelStage,
  Company,
} from '../../types';

interface ReactivationKanbanFunnelProps {
  clientSummaries: ReactivationClientSummary[];
  company: Company;
  onOpenDirectWhatsApp: (client: ReactivationClientSummary) => void;
  onUpdateFunnelStage: (clientId: string, newStage: ReactivationFunnelStage) => void;
  onGenerateQuote: (clientId: string) => void;
}

interface FunnelColumnDef {
  id: ReactivationFunnelStage;
  title: string;
  badgeColor: string;
  headerBg: string;
  icon: React.ReactNode;
}

export const ReactivationKanbanFunnel: React.FC<ReactivationKanbanFunnelProps> = ({
  clientSummaries,
  company,
  onOpenDirectWhatsApp,
  onUpdateFunnelStage,
  onGenerateQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const columns: FunnelColumnDef[] = [
    {
      id: 'selecionado',
      title: '🎯 A Contatar',
      badgeColor: 'border-slate-700 bg-slate-800/80 text-slate-300',
      headerBg: 'from-slate-800/40 to-slate-900',
      icon: <Users className="w-4 h-4 text-slate-400" />,
    },
    {
      id: 'whatsapp_aberto',
      title: '📲 WhatsApp Aberto',
      badgeColor: 'border-sky-500/40 bg-sky-950/40 text-sky-300',
      headerBg: 'from-sky-950/30 to-slate-900',
      icon: <MessageCircle className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'contatado',
      title: '✉️ Mensagem Enviada',
      badgeColor: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
      headerBg: 'from-blue-950/30 to-slate-900',
      icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
    },
    {
      id: 'interessado',
      title: '💬 Em Negociação',
      badgeColor: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
      headerBg: 'from-amber-950/30 to-slate-900',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'orcamento',
      title: '📄 Orçamento Enviado',
      badgeColor: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
      headerBg: 'from-purple-950/30 to-slate-900',
      icon: <FileText className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'reativado_contratado',
      title: '🏆 Reativado / Fechou OS',
      badgeColor: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
      headerBg: 'from-emerald-950/40 to-slate-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    },
  ];

  const filteredClients = clientSummaries.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.clientName.toLowerCase().includes(term) ||
      (c.contactName && c.contactName.toLowerCase().includes(term)) ||
      (c.city && c.city.toLowerCase().includes(term)) ||
      (c.lastPropertyName && c.lastPropertyName.toLowerCase().includes(term))
    );
  });

  const totalFunnelPotential = filteredClients.reduce(
    (acc, c) => acc + (c.estimatedPotentialRevenue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              PIPELINE COMERCIAL DE REATIVAÇÃO
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-1">
            Funil Visual Kanban de Oportunidades
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Acompanhe a jornada de cada produtor rural desde a identificação e primeiro disparo no WhatsApp até a emissão do orçamento e fechamento da Ordem de Serviço.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Volume Total em Pipeline:</span>
            <strong className="text-emerald-400 font-bold text-sm">
              R$ {totalFunnelPotential.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
        {columns.map((col) => {
          const colClients = filteredClients.filter((c) => {
            // Map legacy or unmapped stages gracefully
            if (col.id === 'selecionado') {
              return c.funnelStage === 'selecionado' || !c.funnelStage;
            }
            return c.funnelStage === col.id;
          });

          const colTotalPotential = colClients.reduce(
            (acc, c) => acc + (c.estimatedPotentialRevenue || 0),
            0
          );

          return (
            <div
              key={col.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col min-h-[560px] shadow-sm overflow-hidden"
            >
              {/* Column Header */}
              <div className={`p-3.5 bg-gradient-to-b ${col.headerBg} border-b border-slate-800 flex items-center justify-between`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {col.icon}
                  <span className="font-bold text-xs text-white tracking-tight truncate">
                    {col.title}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {colClients.length}
                </span>
              </div>

              {/* Column Potential Subtitle */}
              <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Volume:</span>
                <strong className="text-emerald-400 font-bold">
                  R$ {colTotalPotential.toLocaleString('pt-BR')}
                </strong>
              </div>

              {/* Column Cards List */}
              <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[620px]">
                {colClients.length === 0 ? (
                  <div className="py-10 text-center text-slate-600 text-xs italic">
                    Nenhum produtor
                  </div>
                ) : (
                  colClients.map((client) => (
                    <div
                      key={client.clientId}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm space-y-2 group"
                    >
                      {/* Top info */}
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <strong className="text-white text-xs font-bold block line-clamp-1">
                            {client.clientName}
                          </strong>
                          <span className="text-[11px] text-emerald-400 font-medium line-clamp-1">
                            {client.contactName}
                          </span>
                        </div>

                        {client.reactivationScore >= 70 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                            <Flame className="w-2.5 h-2.5 fill-current" />
                            {client.reactivationScore}
                          </span>
                        )}
                      </div>

                      {/* Inactivity & Location */}
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          ⏳ {client.daysSinceLastService}d
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          🌾 {client.lastCrop || 'Soja'}
                        </span>
                        {client.city && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            📍 {client.city}
                          </span>
                        )}
                      </div>

                      {/* Value & Actions */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold text-[11px]">
                          R$ {(client.estimatedPotentialRevenue || 0).toLocaleString('pt-BR')}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onGenerateQuote(client.clientId)}
                            className="p-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                            title="Gerar Orçamento / Proposta"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDirectWhatsApp(client)}
                            className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                            title="Abrir WhatsApp Oficial"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {col.id !== 'reativado_contratado' && (
                            <select
                              value={client.funnelStage || 'selecionado'}
                              onChange={(e) =>
                                onUpdateFunnelStage(
                                  client.clientId,
                                  e.target.value as ReactivationFunnelStage
                                )
                              }
                              className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:outline-none max-w-[80px]"
                              title="Mover de estágio"
                            >
                              <option value="selecionado">A Contatar</option>
                              <option value="whatsapp_aberto">WhatsApp Aberto</option>
                              <option value="contatado">Enviado</option>
                              <option value="interessado">Negociação</option>
                              <option value="orcamento">Orçamento</option>
                              <option value="reativado_contratado">🏆 Reativado</option>
                              <option value="sem_resposta">Sem Resposta</option>
                              <option value="declinado">Declinou</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
