import React, { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ReactivationMessageTemplate,
  Company,
  ReactivationFunnelStage,
} from '../../types';
import { REACTIVATION_TEMPLATES } from '../../data/reactivationTemplates';
import {
  formatReactivationMessage,
  buildWhatsAppLink,
} from '../../utils/reactivationEngine';

interface ReactivationDirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ReactivationClientSummary | null;
  company: Company;
  responsibleName?: string;
  onUpdateFunnelStage: (clientId: string, newStage: ReactivationFunnelStage, messageSent?: string) => void;
  onGenerateQuote?: (clientId: string) => void;
}

export const ReactivationDirectModal: React.FC<ReactivationDirectModalProps> = ({
  isOpen,
  onClose,
  client,
  company,
  responsibleName = 'Lucas Moura',
  onUpdateFunnelStage,
  onGenerateQuote,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    REACTIVATION_TEMPLATES[0].id
  );
  const [customText, setCustomText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [hasEdited, setHasEdited] = useState<boolean>(false);

  // Auto-select recommended template based on client's last service or inactivity
  React.useEffect(() => {
    if (client) {
      if (client.daysSinceLastService > 180) {
        setSelectedTemplateId('tpl-cliente-fiel');
      } else if (client.lastCrop?.toLowerCase().includes('milho') || client.lastCrop?.toLowerCase().includes('soja')) {
        setSelectedTemplateId('tpl-fungicida-safrinha');
      } else {
        setSelectedTemplateId('tpl-dessecacao-preplantio');
      }
      setHasEdited(false);
    }
  }, [client]);

  const selectedTemplate = useMemo(() => {
    return (
      REACTIVATION_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      REACTIVATION_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  // Compute live formatted message
  const generatedMessage = useMemo(() => {
    if (!client) return '';
    if (hasEdited) return customText;
    return formatReactivationMessage(
      selectedTemplate.templateText,
      client,
      company,
      responsibleName,
      'DJI Agras T100 / T50'
    );
  }, [client, selectedTemplate, company, responsibleName, hasEdited, customText]);

  if (!isOpen || !client) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = buildWhatsAppLink(client.whatsapp || client.phone, generatedMessage);
    // Mark as contacted in funnel
    onUpdateFunnelStage(client.clientId, 'contatado', generatedMessage);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Reativação via WhatsApp Oficial
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sem APIs / Sem Risco
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Abertura direta no aplicativo do WhatsApp com mensagem 100% personalizada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Client Quick Context Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">Cliente / Produtor:</span>
              <strong className="text-white text-sm font-semibold block truncate">
                {client.clientName}
              </strong>
              <span className="text-emerald-400 font-medium">
                Contato: {client.contactName}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Inatividade Agronômica:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <strong className="text-amber-300 font-bold text-sm">
                  {client.daysSinceLastService} dias sem aplicar
                </strong>
              </div>
              <span className="text-slate-400">
                Última cultura: {client.lastCrop || 'Não informada'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Potencial Estimado:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <strong className="text-emerald-300 font-bold text-sm">
                  R$ {client.estimatedPotentialRevenue.toLocaleString('pt-BR')}
                </strong>
              </div>
              <span className="text-slate-400">
                WhatsApp: {client.whatsapp || client.phone || 'Sem número'}
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Selecione a Estratégia de Mensagem</span>
              <span className="text-emerald-400 text-xs font-normal flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Variáveis dinâmicas preenchidas
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REACTIVATION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setHasEdited(false);
                  }}
                  className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    selectedTemplateId === tpl.id
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1 text-white flex items-center justify-between">
                    <span>{tpl.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Live Message Preview & Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Prévia da Mensagem (Editável)
              </label>
              <div className="flex items-center gap-2">
                {hasEdited && (
                  <button
                    type="button"
                    onClick={() => setHasEdited(false)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Restaurar original do modelo
                  </button>
                )}
                <span className="text-[11px] text-slate-400">
                  {generatedMessage.length} caracteres
                </span>
              </div>
            </div>

            <div className="relative rounded-xl border border-slate-700 bg-slate-950/80 p-3 shadow-inner">
              <textarea
                value={generatedMessage}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setHasEdited(true);
                }}
                rows={7}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-y leading-relaxed font-sans"
                placeholder="Escreva a mensagem de reativação..."
              />
            </div>
          </div>

          {/* Quick Funnel Status Change */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Estágio atual no funil de reativação:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'selecionado', label: '🎯 Selecionado' },
                  { id: 'contatado', label: '📲 Contatado' },
                  { id: 'interessado', label: '💬 Interessado' },
                  { id: 'orcamento', label: '📄 Orçamento' },
                  { id: 'reativado_contratado', label: '🏆 Reativado' },
                ] as const
              ).map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onUpdateFunnelStage(client.clientId, stage.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    client.funnelStage === stage.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-all text-xs font-semibold"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Mensagem Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            {onGenerateQuote && (
              <button
                type="button"
                onClick={() => {
                  onGenerateQuote(client.clientId);
                  onClose();
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-semibold"
              >
                <FileText className="w-4 h-4" />
                <span>Gerar Orçamento</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Abrir WhatsApp (wa.me)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
