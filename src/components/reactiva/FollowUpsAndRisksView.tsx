import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  MessageCircle,
  Phone,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  DollarSign,
  X,
  Zap,
} from 'lucide-react';
import {
  FollowUpItem,
  CommercialOpportunity,
  Company,
} from '../../types';
import { buildWhatsAppLink } from '../../utils/reactivationEngine';

interface FollowUpsAndRisksViewProps {
  followUps: FollowUpItem[];
  opportunities: CommercialOpportunity[];
  company: Company;
  responsibleName?: string;
  onAddFollowUp: (item: FollowUpItem) => void;
  onUpdateFollowUp: (id: string, updates: Partial<FollowUpItem>) => void;
  onDeleteFollowUp: (id: string) => void;
}

export const FollowUpsAndRisksView: React.FC<FollowUpsAndRisksViewProps> = ({
  followUps = [],
  opportunities = [],
  company,
  responsibleName = 'Lucas Moura',
  onAddFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp,
}) => {
  const [activeTab, setActiveTab] = useState<'hoje' | 'atrasados' | 'proximos' | 'riscos'>('hoje');
  const [isNewFollowUpModalOpen, setIsNewFollowUpModalOpen] = useState(false);

  // New FollowUp Form
  const [formData, setFormData] = useState({
    producerName: '',
    farmName: '',
    whatsapp: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    reason: '',
    priority: 'alta' as 'alta' | 'media' | 'baixa',
    notes: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Grouped Follow-ups
  const categorized = useMemo(() => {
    const overdue = followUps.filter((f) => f.status === 'pendente' && f.scheduledDate < todayStr);
    const today = followUps.filter((f) => f.status === 'pendente' && f.scheduledDate === todayStr);
    const upcoming = followUps.filter((f) => f.status === 'pendente' && f.scheduledDate > todayStr);
    const completed = followUps.filter((f) => f.status === 'realizado');

    // At risk opportunities
    const atRiskOpps = opportunities.filter((o) => o.isAtRisk && o.stage !== 'fechado' && o.stage !== 'perdido');
    const atRiskTotalValue = atRiskOpps.reduce((acc, o) => acc + (o.estimatedPotentialValue || 0), 0);

    return {
      overdue,
      today,
      upcoming,
      completed,
      atRiskOpps,
      atRiskTotalValue,
    };
  }, [followUps, opportunities, todayStr]);

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producerName.trim() || !formData.reason.trim()) return;

    const newItem: FollowUpItem = {
      id: `fu-${Date.now()}`,
      companyId: company.id,
      producerName: formData.producerName,
      farmName: formData.farmName || `Fazenda ${formData.producerName}`,
      whatsapp: formData.whatsapp || '(66) 99999-0000',
      scheduledDate: formData.scheduledDate,
      reason: formData.reason,
      priority: formData.priority,
      status: 'pendente',
      notes: formData.notes,
    };

    onAddFollowUp(newItem);
    setIsNewFollowUpModalOpen(false);
    setFormData({
      producerName: '',
      farmName: '',
      whatsapp: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      reason: '',
      priority: 'alta',
      notes: '',
    });
  };

  const handleOpenWhatsApp = (item: FollowUpItem) => {
    const contactName = item.producerName.split('/')[0].trim();
    const msg = `Olá, ${contactName}! Tudo bem? Aqui é o ${responsibleName} da ${company.tradeName || company.name}.\n\nEstou entrando em contato para dar seguimento ao nosso alinhamento sobre ${item.reason}. Como estão as coisas na ${item.farmName}?`;
    const url = buildWhatsAppLink(item.whatsapp, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              CENTRAL DE FOLLOW-UP & GESTÃO DE RISCO
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-1">
            Acompanhamento de Contatos & Retornos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Nenhum orçamento ou oportunidade fica sem resposta. Agende ligações, envie lembretes e evite perdas de contratos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewFollowUpModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Follow-up</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab('atrasados')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'atrasados'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-lg'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase">Atrasados</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <strong className="text-2xl font-black text-white mt-1 block">
            {categorized.overdue.length}
          </strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Precisam de contato urgente</span>
        </div>

        <div
          onClick={() => setActiveTab('hoje')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'hoje'
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase">Para Hoje</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <strong className="text-2xl font-black text-white mt-1 block">
            {categorized.today.length}
          </strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Programados para hoje</span>
        </div>

        <div
          onClick={() => setActiveTab('proximos')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'proximos'
              ? 'bg-sky-950/40 border-sky-500/60 shadow-lg'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400 uppercase">Próximos Dias</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <strong className="text-2xl font-black text-white mt-1 block">
            {categorized.upcoming.length}
          </strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Agenda futura</span>
        </div>

        <div
          onClick={() => setActiveTab('riscos')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'riscos'
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400 uppercase">Valor em Risco</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <strong className="text-lg font-black text-purple-400 mt-1 block truncate">
            R$ {categorized.atRiskTotalValue.toLocaleString('pt-BR')}
          </strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{categorized.atRiskOpps.length} propostas paradas</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-sm">
        {activeTab === 'riscos' ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Diagnóstico de Oportunidades Comerciais em Risco
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Propostas e negociações com mais de 4 dias sem resposta ou retorno cadastrado.
              </p>
            </div>

            <div className="space-y-3">
              {categorized.atRiskOpps.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                  Nenhuma oportunidade em risco no momento. Seu funil está fluindo muito bem!
                </div>
              ) : (
                categorized.atRiskOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm font-bold">{opp.producerName}</strong>
                        <span className="text-xs text-slate-400">• {opp.farmName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {opp.stage.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {opp.riskReason || 'Orçamento sem retorno há vários dias.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <strong className="text-emerald-400 font-bold text-sm">
                        R$ {opp.estimatedPotentialValue.toLocaleString('pt-BR')}
                      </strong>

                      <button
                        type="button"
                        onClick={() => {
                          const url = buildWhatsAppLink(
                            opp.whatsapp || opp.phone,
                            `Olá, ${opp.producerName}! Sou o ${responsibleName} da ${company.tradeName || company.name}. Gostaria de alinhar nosso orçamento de pulverização para a ${opp.farmName}. Ficou alguma dúvida sobre os valores ou janelas?`
                          );
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Reativar Contato</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Lista de Follow-ups (
              {activeTab === 'atrasados' ? 'Atrasados' : activeTab === 'hoje' ? 'Hoje' : 'Próximos'})
            </h4>

            {(() => {
              const list =
                activeTab === 'atrasados'
                  ? categorized.overdue
                  : activeTab === 'hoje'
                  ? categorized.today
                  : categorized.upcoming;

              if (list.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                    Nenhum follow-up cadastrado nesta lista.
                  </div>
                );
              }

              return list.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm font-bold">{item.producerName}</strong>
                      <span className="text-xs text-slate-400">• {item.farmName}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        📅 {item.scheduledDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Motivo: <strong className="text-emerald-400">{item.reason}</strong>
                    </p>

                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic">"{item.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(item)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFollowUp(item.id, {
                          status: 'realizado',
                          completedAt: new Date().toISOString(),
                        })
                      }
                      className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950/50 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors"
                      title="Marcar como Realizado"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* NEW FOLLOW-UP MODAL */}
      {isNewFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Agendar Novo Follow-up</h3>
              <button
                type="button"
                onClick={() => setIsNewFollowUpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome do Produtor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={formData.producerName}
                  onChange={(e) => setFormData({ ...formData, producerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome da Fazenda</label>
                <input
                  type="text"
                  placeholder="Ex: Fazenda Santa Luzia"
                  value={formData.farmName}
                  onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(66) 99999-0000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Data Agendada *</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Motivo do Contato *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Retorno do orçamento de dessecação"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Ligar à tarde após a vistoria de campo..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewFollowUpModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
