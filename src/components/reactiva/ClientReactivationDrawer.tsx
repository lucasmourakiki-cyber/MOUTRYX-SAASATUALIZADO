import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Building2,
  Calendar,
  Clock,
  Layers,
  MapPin,
  Flame,
  CheckCircle2,
  Send,
  FileText,
  DollarSign,
  History,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ServiceOrder,
  SimpleReactivationStatus,
  Company,
} from '../../types';
import { buildWhatsAppLink } from '../../utils/reactivationEngine';

interface ClientReactivationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: ReactivationClientSummary | null;
  serviceOrders: ServiceOrder[];
  company: Company;
  onReactivate: (client: ReactivationClientSummary) => void;
  onUpdateStatus: (clientId: string, newStatus: SimpleReactivationStatus) => void;
  onSaveNotes: (clientId: string, notes: string) => void;
  onOpenNewQuote?: (clientId: string) => void;
}

export const ClientReactivationDrawer: React.FC<ClientReactivationDrawerProps> = ({
  isOpen,
  onClose,
  client,
  serviceOrders,
  company,
  onReactivate,
  onUpdateStatus,
  onSaveNotes,
  onOpenNewQuote,
}) => {
  const [notesText, setNotesText] = useState(client?.notes || '');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Sync notes when client changes
  React.useEffect(() => {
    if (client) {
      setNotesText(client.notes || '');
      setIsNotesSaved(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  // Filter completed OS for this client
  const clientOS = serviceOrders
    .filter((os) => os.clientId === client.clientId)
    .sort((a, b) => new Date(b.completedDate || b.scheduledDate || '').getTime() - new Date(a.completedDate || a.scheduledDate || '').getTime());

  const handleSaveNotes = () => {
    onSaveNotes(client.clientId, notesText);
    setIsNotesSaved(true);
    setTimeout(() => setIsNotesSaved(false), 2000);
  };

  const handleDirectWhatsApp = () => {
    const rawPhone = client.whatsapp || client.phone;
    if (!rawPhone) {
      alert('Telefone ou WhatsApp não cadastrado.');
      return;
    }
    const defaultMsg = `Olá, ${client.contactName || client.clientName}! Tudo bem? Aqui é da ${company.tradeName || company.name}.`;
    const url = buildWhatsAppLink(rawPhone, defaultMsg);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (client.simpleStatus === 'a_contatar') {
      onUpdateStatus(client.clientId, 'contatado');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200"
        id="client-reactivation-drawer"
      >
        {/* DRAWER TOP HEADER */}
        <div className="bg-[#111827] text-white p-5 flex items-start justify-between border-b border-[#111827]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white">
                {client.clientName}
              </h3>
              {client.contactName && client.contactName !== client.clientName && (
                <span className="text-xs text-stone-300">
                  (Contato: {client.contactName})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-300 flex-wrap">
              {client.lastPropertyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Fazenda {client.lastPropertyName}
                </span>
              )}
              {client.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {client.city}{client.state ? `/${client.state}` : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F7F8F7]">
          {/* ESSENTIAL STATUS & PRIORITY SUMMARY */}
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Status de Reativação
              </span>

              {/* Priority Badge */}
              {client.simplePriority === 'alta' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  🔥 Alta Prioridade
                </span>
              )}
              {client.simplePriority === 'media' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  🟡 Média Prioridade
                </span>
              )}
              {client.simplePriority === 'baixa' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold">
                  ⚪ Baixa Prioridade
                </span>
              )}
            </div>

            {/* Status Selector */}
            <select
              value={client.simpleStatus || 'a_contatar'}
              onChange={(e) => onUpdateStatus(client.clientId, e.target.value as SimpleReactivationStatus)}
              className="w-full text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="a_contatar">⚪ A contatar (Ainda não contatado)</option>
              <option value="contatado">💬 Contatado (Mensagem enviada)</option>
              <option value="respondeu">🤝 Respondeu (Em conversa)</option>
              <option value="orcamento">📋 Orçamento (Oportunidade aberta)</option>
              <option value="reativado">✅ Reativado (Voltou a contratar)</option>
              <option value="sem_resposta">⏳ Sem resposta</option>
            </select>

            {/* Quick Status Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-stone-500 font-medium">Avançar para:</span>
              {client.simpleStatus === 'a_contatar' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(client.clientId, 'contatado')}
                  className="text-xs px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition-colors cursor-pointer"
                >
                  💬 Contatado
                </button>
              )}
              {client.simpleStatus !== 'respondeu' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(client.clientId, 'respondeu')}
                  className="text-xs px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition-colors cursor-pointer"
                >
                  🤝 Respondeu
                </button>
              )}
              {client.simpleStatus !== 'orcamento' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(client.clientId, 'orcamento')}
                  className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-medium transition-colors cursor-pointer"
                >
                  📋 Orçamento
                </button>
              )}
              {client.simpleStatus !== 'reativado' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(client.clientId, 'reativado')}
                  className="text-xs px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold transition-colors cursor-pointer"
                >
                  ✅ Reativado
                </button>
              )}
            </div>

            {/* Simple Human Explanation */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-950 flex items-start gap-2">
              <span className="text-base mt-[-2px]">💡</span>
              <div>
                <strong>Por que contatar agora:</strong>
                <p className="mt-0.5 text-emerald-900 leading-relaxed">
                  {client.simplePriorityExplanation}
                </p>
              </div>
            </div>
          </div>

          {/* KEY METRICS GRID */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 block">
                Dias sem Contratar
              </span>
              <span className="text-lg font-bold text-stone-900 flex items-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-amber-600" />
                {client.daysSinceLastService >= 999 ? '—' : `${client.daysSinceLastService} dias`}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 block">
                Total de Serviços
              </span>
              <span className="text-lg font-bold text-stone-900 flex items-center gap-1 mt-0.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                {client.totalCompletedOrders} concluído(s)
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 block">
                Área Total Histórica
              </span>
              <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                {client.totalHectares ? `${client.totalHectares.toLocaleString('pt-BR')} ha` : '—'}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 block">
                Faturamento Acumulado
              </span>
              <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                {client.totalRevenue > 0
                  ? `R$ ${client.totalRevenue.toLocaleString('pt-BR')}`
                  : 'R$ 0'}
              </span>
            </div>
          </div>

          {/* ÚLTIMO SERVIÇO */}
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Último Serviço Realizado
            </h4>

            {client.lastServiceDate ? (
              <div className="text-xs text-stone-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    {client.lastServiceName || 'Pulverização com Drone'}
                  </span>
                  <span className="text-stone-500 font-mono">
                    {new Date(client.lastServiceDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  {client.lastCrop && <span>Cultura: <strong>{client.lastCrop}</strong></span>}
                  {client.lastPropertyName && <span>• Fazenda: <strong>{client.lastPropertyName}</strong></span>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">
                Nenhum serviço registrado anteriormente no sistema.
              </p>
            )}
          </div>

          {/* HISTÓRICO DE SERVIÇOS (OS) */}
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-stone-500" />
                Histórico de Ordens de Serviço ({clientOS.length})
              </h4>
            </div>

            {clientOS.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {clientOS.slice(0, 5).map((os) => (
                  <div
                    key={os.id}
                    className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-stone-900 block">
                        {os.serviceType} • {os.crop}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {os.areaHa} ha • Fazenda {os.propertyName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-500 block font-mono">
                        {os.completedDate || os.scheduledDate
                          ? new Date(os.completedDate || os.scheduledDate || '').toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                      <span className="font-bold text-emerald-700 text-xs">
                        R$ {(os.finalAmount || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">
                Sem histórico de ordens de serviço anteriores.
              </p>
            )}
          </div>

          {/* HISTÓRICO DE CONTATOS / MENSAGENS ENVIADAS */}
          {client.contactHistory && client.contactHistory.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                Mensagens & Contatos Anteriores ({client.contactHistory.length})
              </h4>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {client.contactHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="font-semibold text-emerald-800">
                        WhatsApp Enviado
                      </span>
                      <span className="font-mono">{item.date}</span>
                    </div>
                    <p className="text-stone-700 italic text-[11px] line-clamp-2">
                      "{item.messageText}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OBSERVAÇÕES ESPECÍFICAS DE REATIVAÇÃO */}
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                Observações de Reativação
              </label>

              {isNotesSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Salvo!
                </span>
              )}
            </div>

            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleSaveNotes}
              rows={3}
              placeholder="Ex: Produtor comentou que vai dessecar soja no final do mês..."
              className="w-full text-xs text-stone-800 bg-stone-50 border border-stone-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 py-0.5 px-2 rounded transition-colors"
              >
                Salvar notas
              </button>
            </div>
          </div>
        </div>

        {/* DRAWER FOOTER */}
        <div className="bg-white p-4 border-t border-stone-200 flex items-center justify-between gap-2 shadow-inner">
          <button
            type="button"
            onClick={handleDirectWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp Direto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onReactivate(client);
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#111827] hover:bg-[#111827] text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Reativar Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
