import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Target,
  Sparkles,
  Users,
  DollarSign,
  MessageCircle,
  Calendar,
  Check,
  ArrowRight,
  ArrowLeft,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Flame,
  Clock,
  Send,
  Zap,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ReactivationCampaign,
  ReactivationMessageTemplate,
  Company,
} from '../../types';
import { REACTIVATION_TEMPLATES } from '../../data/reactivationTemplates';
import {
  formatReactivationMessage,
  generateIntelligentContextualMessage,
  buildWhatsAppLink,
} from '../../utils/reactivationEngine';

interface ReactivationCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: ReactivationClientSummary[];
  companyId: string;
  company?: Company;
  responsibleName?: string;
  onCreateCampaign: (campaign: Omit<ReactivationCampaign, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ReactivationCampaignModal: React.FC<ReactivationCampaignModalProps> = ({
  isOpen,
  onClose,
  selectedClients,
  companyId,
  company,
  responsibleName = 'Lucas Moura',
  onCreateCampaign,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('Janela de Fungicida e Dessecação Safrinha');
  const [targetCrop, setTargetCrop] = useState('Milho Safrinha / Soja');
  const [targetRegion, setTargetRegion] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(REACTIVATION_TEMPLATES[0].id);
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');

  // Per-client customized message state
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Fallback company if not fully supplied
  const effectiveCompany: Company = company || {
    id: companyId,
    name: 'Moutryx Drones Agrícolas',
    tradeName: 'Moutryx Agro Drones',
    cnpj: '',
    email: 'contato@moutryx.com.br',
    phone: '(66) 99988-7766',
    whatsapp: '5566999887766',
    city: 'Sorriso',
    state: 'MT',
    address: 'Av. Brasil, 1500',
  };

  const selectedTemplate =
    REACTIVATION_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    REACTIVATION_TEMPLATES[0];

  // Set default title and region when opening or when template changes
  useEffect(() => {
    if (isOpen) {
      if (!title) {
        setTitle(`Campanha ${selectedTemplate.title.split('(')[0].replace(/[🌾🌱🌧️🎯💰🔥📋🆕🔄✍️⭐]/g, '').trim()} - ${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`);
      }
      if (!targetRegion) {
        targetRegionSet: {
          const cities = Array.from(new Set(selectedClients.map((c) => c.city).filter(Boolean)));
          if (cities.length === 1) setTargetRegion(cities[0]);
          else if (cities.length > 1) setTargetRegion(`${cities.slice(0, 2).join(', ')} e região`);
          else setTargetRegion(effectiveCompany.city || 'Médio-Norte MT');
        }
      }
    }
  }, [isOpen, selectedTemplate, selectedClients, effectiveCompany.city]);

  // Recalculate per-client generated messages whenever template or clients change
  useEffect(() => {
    if (!selectedTemplate) return;
    const initialMap: Record<string, string> = {};
    selectedClients.forEach((client) => {
      // If user hasn't typed a custom override yet, format with current template
      initialMap[client.clientId] = formatReactivationMessage(
        selectedTemplate.templateText,
        client,
        effectiveCompany,
        responsibleName
      );
    });
    setCustomMessages(initialMap);
  }, [selectedTemplateId, selectedClients, responsibleName]);

  if (!isOpen) return null;

  const totalEstimatedValue = selectedClients.reduce(
    (acc, c) => acc + (c.estimatedPotentialRevenue || 0),
    0
  );

  const quickObjectives = [
    'Janela de Fungicida e Dessecação',
    'Plantão Pós-Chuva / Solo Encharcado',
    'Reativação de Produtores Inativos',
    'Follow-up de Orçamentos Pendentes',
    'Condição Especial para Produtores VIP',
  ];

  const quickCrops = [
    'Milho Safrinha',
    'Soja',
    'Algodão',
    'Cana-de-Açúcar',
    'Pastagem',
    'Café',
  ];

  const handleUpdateClientMessage = (clientId: string, newMsg: string) => {
    setCustomMessages((prev) => ({
      ...prev,
      [clientId]: newMsg,
    }));
  };

  const handleTestWhatsAppOpen = (client: ReactivationClientSummary) => {
    const msg = customMessages[client.clientId] || formatReactivationMessage(
      selectedTemplate.templateText,
      client,
      effectiveCompany,
      responsibleName
    );
    const url = buildWhatsAppLink(client.whatsapp || client.phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (startImmediately: boolean = false) => {
    if (!title.trim()) return;

    const campaignClients = selectedClients.map((client) => {
      const clientMessage =
        customMessages[client.clientId] ||
        formatReactivationMessage(
          selectedTemplate.templateText,
          client,
          effectiveCompany,
          responsibleName
        );

      return {
        clientId: client.clientId,
        clientName: client.clientName,
        contactName: client.contactName || client.clientName.split('/')[0].trim(),
        whatsapp: client.whatsapp || client.phone,
        city: client.city || effectiveCompany.city,
        lastCrop: client.lastCrop || targetCrop,
        daysInactive: client.daysSinceLastService,
        reactivationScore: client.opportunityScore || client.reactivationScore,
        funnelStage: 'selecionado' as const,
        customMessage: clientMessage,
        isIgnored: false,
      };
    });

    onCreateCampaign({
      companyId,
      title: title.trim(),
      objective: objective.trim() || 'Reativação Comercial de Safra',
      targetCrop: targetCrop.trim() || 'Soja / Milho',
      targetRegion: targetRegion.trim() || effectiveCompany.city,
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      baseMessage: selectedTemplate.templateText,
      clients: campaignClients,
      status: 'em_andamento',
      totalSelected: selectedClients.length,
      totalContacted: 0,
      totalInterested: 0,
      totalQuotes: 0,
      totalReactivated: 0,
      estimatedPotentialValue: totalEstimatedValue,
      recoveredValue: 0,
    });

    onClose();
  };

  const filteredReviewClients = selectedClients.filter((c) => {
    if (!reviewSearchTerm.trim()) return true;
    const term = reviewSearchTerm.toLowerCase();
    return (
      c.clientName.toLowerCase().includes(term) ||
      (c.contactName && c.contactName.toLowerCase().includes(term)) ||
      (c.city && c.city.toLowerCase().includes(term)) ||
      (c.lastPropertyName && c.lastPropertyName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Steps */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {currentStep === 1
                    ? '1. Configuração da Campanha de Reativação'
                    : '2. Revisão & Personalização por Produtor'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Passo {currentStep} de 2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentStep === 1
                  ? 'Defina o objetivo, cultura e modelo base para a frota de drones'
                  : 'Confira as mensagens geradas automaticamente para cada produtor antes de iniciar'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Metric Bar */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">
                <strong className="text-white font-bold">{selectedClients.length}</strong> produtores selecionados
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">
                Potencial Comercial: <strong className="text-emerald-400 font-bold">R$ {totalEstimatedValue.toLocaleString('pt-BR')}</strong>
              </span>
            </div>
          </div>

          {/* Stepper pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currentStep === 1
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Dados & Modelo
            </button>
            <button
              type="button"
              onClick={() => {
                if (title.trim()) setCurrentStep(2);
              }}
              disabled={!title.trim()}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currentStep === 2
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40'
              }`}
            >
              2. Revisão Individual ({selectedClients.length})
            </button>
          </div>
        </div>

        {/* Step 1: Configuration Form */}
        {currentStep === 1 && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nome da Campanha *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Reativação Fungicida Safrinha 2026 - Clientes V6 Sorriso"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
              />
            </div>

            {/* Objective & Season */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Objetivo Comercial / Agronômico
                </label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Janela de Fungicida e Dessecação"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors mb-2"
                />
                <div className="flex flex-wrap gap-1">
                  {quickObjectives.map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setObjective(obj)}
                      className="px-2 py-1 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                    >
                      + {obj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Cultura & Região Alvo
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={targetCrop}
                    onChange={(e) => setTargetCrop(e.target.value)}
                    placeholder="Ex: Milho Safrinha"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    placeholder="Ex: Sorriso / Região"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {quickCrops.map((crop) => (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => setTargetCrop(crop)}
                      className="px-2 py-1 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                    >
                      🌾 {crop}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Modelo Base de Mensagem (WhatsApp)
                </label>
                <span className="text-xs text-emerald-400 font-medium">
                  {REACTIVATION_TEMPLATES.length} modelos especializados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                {REACTIVATION_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-xs font-bold text-white block">
                          {tpl.title}
                        </strong>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Base Template Preview */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Estrutura do Texto Base (com tags dinâmicas):
                </span>
                <span className="text-[10px] text-slate-400">
                  {'{NOME_CONTATO}'}, {'{NOME_FAZENDA}'}, {'{CIDADE}'}, {'{DIAS_SEM_SERVICO}'}...
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono whitespace-pre-line bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedTemplate.templateText}
              </p>
            </div>

            {/* Bottom Step 1 Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!title.trim()}
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Revisar Mensagens Individuais ({selectedClients.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Individual Message Review Screen */}
        {currentStep === 2 && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 flex flex-col">
            {/* Search & Stats inside review */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por produtor, fazenda ou cidade..."
                  value={reviewSearchTerm}
                  onChange={(e) => setReviewSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Exibindo <strong>{filteredReviewClients.length}</strong> de {selectedClients.length} mensagens preparadas</span>
              </div>
            </div>

            {/* Individual Client Cards List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
              {filteredReviewClients.map((client, idx) => {
                const currentMsg =
                  customMessages[client.clientId] ||
                  formatReactivationMessage(
                    selectedTemplate.templateText,
                    client,
                    effectiveCompany,
                    responsibleName
                  );

                const isEditing = editingClientId === client.clientId;

                return (
                  <div
                    key={client.clientId}
                    className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition-all space-y-3"
                  >
                    {/* Client Header Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {idx + 1}
                        </div>
                        <div>
                          <strong className="text-white text-xs font-bold block">
                            {client.clientName}
                          </strong>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>👤 {client.contactName || 'Produtor'}</span>
                            <span>•</span>
                            <span>🏡 {client.lastPropertyName || 'Fazenda'}</span>
                            <span>•</span>
                            <span>📍 {client.city || effectiveCompany.city}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          Score: {client.opportunityScore || client.reactivationScore}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-300 border border-slate-700">
                          ⏳ {client.daysSinceLastService}d inativo
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          R$ {(client.estimatedPotentialRevenue || 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Message Area */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          Mensagem Pronta para WhatsApp:
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setEditingClientId(isEditing ? null : client.clientId)
                          }
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditing ? 'Concluir Edição' : 'Editar Mensagem'}</span>
                        </button>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={currentMsg}
                          onChange={(e) =>
                            handleUpdateClientMessage(client.clientId, e.target.value)
                          }
                          className="w-full bg-slate-900 border border-emerald-500/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono leading-relaxed"
                        />
                      ) : (
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono whitespace-pre-line leading-relaxed">
                          {currentMsg}
                        </div>
                      )}
                    </div>

                    {/* Quick WhatsApp Test Trigger */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Destinatário: <strong className="text-slate-300">{client.whatsapp || client.phone || 'Telefone não cadastrado'}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleTestWhatsAppOpen(client)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Testar Link WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Step 2 Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar aos Parâmetros</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
                >
                  Salvar Campanha
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" />
                  <span>CRIAR CAMPANHA E INICIAR DISPARO ASSISTIDO ({selectedClients.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
