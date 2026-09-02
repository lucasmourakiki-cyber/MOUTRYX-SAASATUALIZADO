import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Sparkles,
  Send,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Flame,
  ArrowRight,
  CheckCheck,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  Company,
  SimpleReactivationStatus,
} from '../../types';
import {
  REACTIVATION_CATEGORIES,
  ReactivationMessageTemplateItem,
  INITIAL_REACTIVATION_TEMPLATES,
} from '../../data/reactivationTemplates';
import {
  formatReactivationMessage,
  buildWhatsAppLink,
  formatPhoneForWhatsApp,
} from '../../utils/reactivationEngine';

interface ReactivationFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientsQueue: ReactivationClientSummary[];
  company: Company;
  responsibleName?: string;
  customTemplates?: ReactivationMessageTemplateItem[];
  onUpdateClientStatus: (
    clientId: string,
    newStatus: SimpleReactivationStatus,
    messageSent?: string
  ) => void;
  onOpenNewQuote?: (clientId: string) => void;
}

export const ReactivationFlowModal: React.FC<ReactivationFlowModalProps> = ({
  isOpen,
  onClose,
  clientsQueue,
  company,
  responsibleName = 'Lucas Moura',
  customTemplates = [],
  onUpdateClientStatus,
  onOpenNewQuote,
}) => {
  // Merge system and custom templates
  const allTemplates = useMemo(() => {
    const customIds = new Set(customTemplates.map((t) => t.id));
    const activeSys = INITIAL_REACTIVATION_TEMPLATES.filter((t) => !customIds.has(t.id));
    return [...customTemplates, ...activeSys].filter((t) => t.isActive !== false);
  }, [customTemplates]);

  // Queue Index State
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentClient = clientsQueue[currentIndex] || clientsQueue[0];

  // Step 1: Selected Category Approach
  const [selectedCategory, setSelectedCategory] = useState<string>('reativacao_natural');
  
  // Step 2: Selected Template Index within that category
  const [templateIndexInCategory, setTemplateIndexInCategory] = useState<number>(0);
  
  // Step 3: Editable Message Content for current client
  const [editedMessage, setEditedMessage] = useState<string>('');
  
  // Real-time status map for immediate visual reactivity
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, SimpleReactivationStatus>>({});
  
  // UI states
  const [isCopied, setIsCopied] = useState(false);
  const [hasSentCurrent, setHasSentCurrent] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Filter templates for current selected category
  const categoryTemplates = useMemo(() => {
    const list = allTemplates.filter((t) => t.category === selectedCategory);
    return list.length > 0 ? list : allTemplates.slice(0, 4);
  }, [allTemplates, selectedCategory]);

  const currentTemplate = categoryTemplates[templateIndexInCategory % categoryTemplates.length] || categoryTemplates[0];

  // Auto-personalize message whenever client or template changes
  useEffect(() => {
    if (currentClient && currentTemplate) {
      const personalized = formatReactivationMessage(
        currentTemplate.templateText,
        currentClient,
        company,
        responsibleName
      );
      setEditedMessage(personalized);
      setHasSentCurrent(false);
    }
  }, [currentIndex, currentClient, currentTemplate, company, responsibleName]);

  // Reset indices when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setTemplateIndexInCategory(0);
      setHasSentCurrent(false);
      setLocalStatusMap({});
    }
  }, [isOpen]);

  if (!isOpen || !currentClient) return null;

  const currentClientStatus = localStatusMap[currentClient.clientId] || currentClient.simpleStatus || 'a_contatar';
  const totalInQueue = clientsQueue.length;
  const isMultiple = totalInQueue > 1;

  // Handle Cycling to "🔄 OUTRA MENSAGEM" in the same category without immediate repetition
  const handleShuffleOtherMessage = () => {
    if (categoryTemplates.length <= 1) return;
    const nextIdx = (templateIndexInCategory + 1) % categoryTemplates.length;
    setTemplateIndexInCategory(nextIdx);
  };

  // Open WhatsApp in new tab and auto-mark as contacted
  const handleOpenWhatsApp = () => {
    const rawPhone = currentClient.whatsapp || currentClient.phone;
    if (!rawPhone) {
      alert('Telefone ou WhatsApp do cliente não encontrado.');
      return;
    }
    const url = buildWhatsAppLink(rawPhone, editedMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Automatically transition to 'contatado' upon opening WhatsApp if still 'a_contatar'
    if (currentClientStatus === 'a_contatar') {
      handleMarkAsSent('contatado');
    }
  };

  // Mark as sent and record status
  const handleMarkAsSent = (targetStatus: SimpleReactivationStatus = 'contatado') => {
    setLocalStatusMap((prev) => ({ ...prev, [currentClient.clientId]: targetStatus }));
    onUpdateClientStatus(currentClient.clientId, targetStatus, editedMessage);
    setHasSentCurrent(true);
  };

  // Advance to next client in queue
  const handleNextClient = () => {
    if (currentIndex < totalInQueue - 1) {
      setCurrentIndex((prev) => prev + 1);
      setHasSentCurrent(false);
    } else {
      onClose();
    }
  };

  // Previous client in queue
  const handlePrevClient = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setHasSentCurrent(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedCategoryObj = REACTIVATION_CATEGORIES.find((c) => c.id === selectedCategory) || REACTIVATION_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="reactivation-flow-modal"
      >
        {/* MODAL TOP HEADER */}
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between border-b border-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Reativação de Cliente
                </h2>
                {isMultiple && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    Fila: {currentIndex + 1} de {totalInQueue}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Selecione a abordagem, personalize a mensagem e envie via WhatsApp.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUEUE PROGRESS BAR (if multiple) */}
        {isMultiple && (
          <div className="bg-[#111827] px-5 py-2.5 flex items-center justify-between border-b border-[#111827] text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <span className="font-semibold text-emerald-400">
                Cliente {currentIndex + 1} de {totalInQueue}:
              </span>
              <span className="font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                {currentClient.clientName}
              </span>
              {currentClient.lastPropertyName && (
                <span className="text-stone-400 hidden sm:inline">
                  • {currentClient.lastPropertyName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentIndex + 1) / totalInQueue) * 100}%`,
                  }}
                />
              </div>
              <span className="text-stone-400 font-mono">
                {Math.round(((currentIndex + 1) / totalInQueue) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F7F8F7]">
          {/* CLIENT SUMMARY CARD */}
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-900 text-base">
                  {currentClient.contactName || currentClient.clientName}
                </span>
                {currentClient.lastPropertyName && (
                  <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    Fazenda {currentClient.lastPropertyName}
                  </span>
                )}
                {currentClient.city && (
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {currentClient.city}{currentClient.state ? `/${currentClient.state}` : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <strong>
                    {currentClient.daysSinceLastService >= 999
                      ? 'Sem serviços recentes'
                      : `${currentClient.daysSinceLastService} dias sem contratar`}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Último serviço:{' '}
                  <strong>{currentClient.lastServiceName || 'Pulverização'}</strong>
                  {currentClient.lastCrop && ` (${currentClient.lastCrop})`}
                </span>
                {currentClient.totalCompletedOrders > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">
                      {currentClient.totalCompletedOrders} serviço(s) realizado(s)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Client Priority Badge */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {currentClient.simplePriority === 'alta' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs">
                  🔥 Alta Prioridade
                </span>
              )}
              {currentClient.simplePriority === 'media' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shadow-xs">
                  🟡 Média Prioridade
                </span>
              )}
              {currentClient.simplePriority === 'baixa' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold">
                  ⚪ Baixa Prioridade
                </span>
              )}
            </div>
          </div>

          {/* APPROACH CATEGORY SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Escolha uma abordagem:</span>
              </label>

              <button
                type="button"
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="text-xs text-emerald-700 font-bold hover:text-emerald-800 transition-colors sm:hidden"
              >
                {showCategorySelector ? 'Recolher abordagens' : 'Ver todas (10)'}
              </button>
            </div>

            {/* Horizontal / Grid Category Buttons */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-5 gap-2 ${
                showCategorySelector ? 'block' : 'hidden sm:grid'
              }`}
            >
              {REACTIVATION_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const countInCat = allTemplates.filter((t) => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setTemplateIndexInCategory(0);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg">{cat.icon}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          isSelected
                            ? 'bg-emerald-200/70 text-emerald-900'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {countInCat}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`text-xs font-bold block leading-tight truncate ${
                          isSelected ? 'text-emerald-950' : 'text-stone-800'
                        }`}
                      >
                        {cat.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE TEMPLATE CONTROLS & REPEAT SHUFFLE */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedCategoryObj.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    {currentTemplate.title}
                  </h4>
                  <p className="text-xs text-stone-500">
                    {currentTemplate.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {categoryTemplates.length > 1 && (
                  <button
                    type="button"
                    onClick={handleShuffleOtherMessage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all border border-stone-300 cursor-pointer shadow-2xs hover:scale-102"
                    title="Alternar para outro modelo da mesma categoria"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-emerald-700 animate-spin-once" />
                    <span>🔄 Outra Mensagem</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      ({(templateIndexInCategory % categoryTemplates.length) + 1}/{categoryTemplates.length})
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium transition-colors border border-stone-200"
                  title="Copiar texto da mensagem"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LIVE EDITABLE TEXTAREA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-medium flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Mensagem personalizada pronta para envio:
                </span>
                <span className="text-[11px] text-stone-400">
                  {editedMessage.length} caracteres
                </span>
              </div>

              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={7}
                className="w-full rounded-xl border border-stone-300 p-3.5 text-sm text-stone-900 font-sans focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-stone-50/50 resize-y leading-relaxed outline-none"
                placeholder="A mensagem personalizada será gerada aqui..."
              />
              <p className="text-[11px] text-stone-400">
                Você pode fazer pequenos ajustes manuais no texto antes de enviar.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER WITH DIRECT ACTION BUTTONS */}
        <div className="bg-white px-5 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          {/* Left / Secondary Action: Status Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              Status:
            </span>
            <select
              value={currentClientStatus}
              onChange={(e) => {
                const val = e.target.value as SimpleReactivationStatus;
                setLocalStatusMap((prev) => ({ ...prev, [currentClient.clientId]: val }));
                onUpdateClientStatus(currentClient.clientId, val, editedMessage);
                if (val === 'contatado' || val === 'respondeu' || val === 'orcamento' || val === 'reativado') {
                  setHasSentCurrent(true);
                }
              }}
              className="text-xs font-semibold bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-2 text-stone-800 focus:ring-1 focus:ring-emerald-500 outline-none w-full sm:w-auto cursor-pointer"
            >
              <option value="a_contatar">⚪ A contatar</option>
              <option value="contatado">💬 Contatado (Mensagem enviada)</option>
              <option value="respondeu">🤝 Respondeu / Em conversa</option>
              <option value="orcamento">📋 Orçamento aberto</option>
              <option value="reativado">✅ Reativado (Novo serviço)</option>
              <option value="sem_resposta">⏳ Sem resposta</option>
            </select>

            {onOpenNewQuote && (
              <button
                type="button"
                onClick={() => {
                  onOpenNewQuote(currentClient.clientId);
                  onClose();
                }}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-2 rounded-lg border border-stone-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                + Novo Orçamento
              </button>
            )}
          </div>

          {/* Right / Primary Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Step 1: Open WhatsApp (wa.me) */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-102 cursor-pointer"
              id="btn-open-whatsapp"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Abrir WhatsApp</span>
            </button>

            {/* Step 2: Mark as Sent */}
            <button
              type="button"
              onClick={() => handleMarkAsSent('contatado')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
                hasSentCurrent
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
              }`}
            >
              {hasSentCurrent ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>Enviado!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-stone-600" />
                  <span>Marcar como Enviado</span>
                </>
              )}
            </button>

            {/* Step 3: Next Client in Queue (or Close) */}
            {isMultiple ? (
              <button
                type="button"
                onClick={handleNextClient}
                className="inline-flex items-center justify-center gap-1.5 bg-[#111827] hover:bg-[#111827] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow transition-all cursor-pointer"
              >
                <span>
                  {currentIndex < totalInQueue - 1 ? 'Próximo Cliente' : 'Concluir Fila'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-stone-800 hover:bg-stone-900 text-white transition-all cursor-pointer"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
