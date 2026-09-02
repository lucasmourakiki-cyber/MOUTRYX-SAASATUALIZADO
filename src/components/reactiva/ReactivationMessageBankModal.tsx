import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Search,
  Check,
  Power,
  RotateCcw,
  Sparkles,
  BookOpen,
  Filter,
  Eye,
  Building2,
  HelpCircle,
} from 'lucide-react';
import {
  REACTIVATION_CATEGORIES,
  ReactivationMessageTemplateItem,
  INITIAL_REACTIVATION_TEMPLATES,
} from '../../data/reactivationTemplates';
import { Company, ReactivationClientSummary } from '../../types';
import { formatReactivationMessage } from '../../utils/reactivationEngine';

interface ReactivationMessageBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ReactivationMessageTemplateItem[];
  company: Company;
  onSaveTemplates: (updated: ReactivationMessageTemplateItem[]) => void;
  sampleClient?: ReactivationClientSummary;
}

export const ReactivationMessageBankModal: React.FC<ReactivationMessageBankModalProps> = ({
  isOpen,
  onClose,
  templates,
  company,
  onSaveTemplates,
  sampleClient,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<ReactivationMessageTemplateItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [testPreviewTemplate, setTestPreviewTemplate] = useState<ReactivationMessageTemplateItem | null>(null);

  // Default sample client for testing template variables if none provided
  const dummyClient: ReactivationClientSummary = useMemo(() => {
    if (sampleClient) return sampleClient;
    return {
      clientId: 'sample-01',
      clientName: 'João Carlos Silva / Agropecuária Santa Maria',
      contactName: 'João Carlos',
      phone: '(66) 99988-7766',
      whatsapp: '(66) 99988-7766',
      city: 'Sorriso',
      state: 'MT',
      rating: 4.9,
      totalHectares: 1200,
      totalRevenue: 58000,
      lastServiceDate: '2026-01-10',
      lastServiceName: 'Dessecação e Fungicida',
      lastCrop: 'Soja Safra',
      lastPropertyName: 'Fazenda Santa Maria',
      daysSinceLastService: 42,
      averageServiceIntervalDays: 45,
      totalCompletedOrders: 4,
      totalQuotesCount: 1,
      reactivationScore: 88,
      scoreTier: 'alta_prioridade',
      scoreReasons: [],
      simplePriority: 'alta',
      simplePriorityExplanation: 'Cliente recorrente (4 serviços). Está há 42 dias sem contratar.',
      simpleStatus: 'a_contatar',
      opportunityScore: 85,
      opportunityTier: 'alta',
      opportunityReasons: [],
      nextBestAction: 'Entrar em contato',
      recommendedMessage: '',
      averageTicket: 14500,
      daysPastExpectedCadence: 0,
      isAtRiskOfChurn: false,
      quadrantClassification: 'alto_alto',
      estimatedPotentialRevenue: 15000,
      funnelStage: 'selecionado',
    };
  }, [sampleClient]);

  // Filter templates by category and search
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCat = selectedCategory === 'todos' || tpl.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.templateText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Toggle active / inactive
  const handleToggleActive = (templateId: string) => {
    const updated = templates.map((t) => {
      if (t.id === templateId) {
        return { ...t, isActive: !t.isActive };
      }
      return t;
    });
    onSaveTemplates(updated);
  };

  // Duplicate template
  const handleDuplicate = (tpl: ReactivationMessageTemplateItem) => {
    const newTpl: ReactivationMessageTemplateItem = {
      ...tpl,
      id: `custom-${Date.now()}`,
      title: `${tpl.title} (Cópia)`,
      isCustom: true,
      isActive: true,
    };
    onSaveTemplates([newTpl, ...templates]);
  };

  // Delete template
  const handleDelete = (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      const updated = templates.filter((t) => t.id !== templateId);
      onSaveTemplates(updated);
    }
  };

  // Reset to initial 40+ system templates
  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar todos os modelos originais do sistema? Suas mensagens customizadas serão mantidas.')) {
      const customOnes = templates.filter((t) => t.isCustom);
      const merged = [...customOnes, ...INITIAL_REACTIVATION_TEMPLATES];
      onSaveTemplates(merged);
    }
  };

  // Save edited or new template
  const handleSaveTemplateForm = (tpl: ReactivationMessageTemplateItem) => {
    if (isCreatingNew) {
      onSaveTemplates([tpl, ...templates]);
    } else {
      const updated = templates.map((t) => (t.id === tpl.id ? tpl : t));
      onSaveTemplates(updated);
    }
    setEditingTemplate(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="reactivation-message-bank-modal"
      >
        {/* MODAL HEADER */}
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between border-b border-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Banco de Mensagens de Reativação
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  {templates.length} modelos
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Gerencie, personalize e crie abordagens por categoria e tom de conversa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP CONTROLS & SEARCH */}
        <div className="bg-white p-4 border-b border-stone-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mensagem por título, palavra-chave ou conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl border border-stone-200 transition-colors"
                title="Restaurar mensagens padrão do sistema"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setEditingTemplate({
                    id: `custom-${Date.now()}`,
                    title: 'Nova Abordagem Personalizada',
                    category: 'reativacao_natural',
                    categoryLabel: 'Reativação Natural',
                    categoryIcon: '🌱',
                    tone: 'natural',
                    description: 'Descrição curta da abordagem...',
                    templateText: `Olá, [Nome]! Tudo certo?\n\nAqui é da [Nome da empresa de drones]. Estamos organizando a programação para a [Fazenda]...`,
                    isActive: true,
                    isCustom: true,
                  });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#111827] hover:bg-[#111827] px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Nova Mensagem</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'todos'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Todas ({templates.length})
            </button>

            {REACTIVATION_CATEGORIES.map((cat) => {
              const count = templates.filter((t) => t.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEMPLATES LIST / GRID */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F7F8F7] space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-stone-400 stroke-1" />
              <p className="font-semibold text-sm text-stone-700">
                Nenhum modelo encontrado nesta categoria ou busca.
              </p>
              <p className="text-xs text-stone-400">
                Tente ajustar os filtros ou crie uma nova mensagem personalizada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTemplates.map((tpl) => {
                const categoryObj = REACTIVATION_CATEGORIES.find((c) => c.id === tpl.category) || REACTIVATION_CATEGORIES[0];
                const previewFormatted = formatReactivationMessage(
                  tpl.templateText,
                  dummyClient,
                  company
                );

                return (
                  <div
                    key={tpl.id}
                    className={`bg-white rounded-xl border p-4 shadow-2xs transition-all flex flex-col justify-between space-y-3 ${
                      tpl.isActive
                        ? 'border-stone-200 hover:border-emerald-400/80 hover:shadow-xs'
                        : 'border-stone-200 opacity-60 bg-stone-50/70'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryObj.icon}</span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                              {tpl.title}
                            </h4>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                              {categoryObj.label}
                            </span>
                          </div>
                        </div>

                        {/* Status Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tpl.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            tpl.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200'
                          }`}
                          title={tpl.isActive ? 'Mensagem ativa (clique para desativar)' : 'Mensagem inativa (clique para ativar)'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-stone-500 italic">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Message Preview Box */}
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/80 text-xs text-stone-800 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">
                      {tpl.templateText}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                        {tpl.isCustom ? (
                          <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Customizada
                          </span>
                        ) : (
                          <span className="text-stone-500">Sistema</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTestPreviewTemplate(tpl)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Simular visualização com dados reais"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(tpl)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Duplicar modelo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNew(false);
                            setEditingTemplate(tpl);
                          }}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar mensagem"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {tpl.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir mensagem customizada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white px-5 py-3.5 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>
            Variáveis suportadas: <strong>[Nome]</strong>, <strong>[Fazenda]</strong>, <strong>[Região]</strong>, <strong>[Último serviço]</strong>, <strong>[Data do último serviço]</strong>, <strong>[Quantidade de serviços]</strong>, <strong>[Nome da empresa de drones]</strong>.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* EDIT / CREATE TEMPLATE MODAL */}
      {editingTemplate && (
        <TemplateEditModal
          isOpen={true}
          isNew={isCreatingNew}
          template={editingTemplate}
          onClose={() => {
            setEditingTemplate(null);
            setIsCreatingNew(false);
          }}
          onSave={handleSaveTemplateForm}
        />
      )}

      {/* TEST PREVIEW MODAL */}
      {testPreviewTemplate && (
        <TestPreviewModal
          template={testPreviewTemplate}
          sampleClient={dummyClient}
          company={company}
          onClose={() => setTestPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

// Sub-component: Edit or Create Template Form Modal
interface TemplateEditModalProps {
  isOpen: boolean;
  isNew: boolean;
  template: ReactivationMessageTemplateItem;
  onClose: () => void;
  onSave: (tpl: ReactivationMessageTemplateItem) => void;
}

const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  isOpen,
  isNew,
  template,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ReactivationMessageTemplateItem>(template);

  if (!isOpen) return null;

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      templateText: prev.templateText + variable,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Por favor, informe o título da mensagem.');
      return;
    }
    if (!formData.templateText.trim()) {
      alert('Por favor, digite o texto da mensagem.');
      return;
    }
    const catObj = REACTIVATION_CATEGORIES.find((c) => c.id === formData.category) || REACTIVATION_CATEGORIES[0];
    onSave({
      ...formData,
      categoryLabel: catObj.label,
      categoryIcon: catObj.icon,
      isCustom: true,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between border-b border-[#111827]">
          <h3 className="font-bold text-sm sm:text-base text-white">
            {isNew ? 'Criar Nova Mensagem de Reativação' : 'Editar Mensagem de Reativação'}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Nome e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Nome do Modelo:
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Abordagem Leve — Safra Soja"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Categoria de Reativação:
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {REACTIVATION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição Curta */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Descrição Curta (Objetivo da mensagem):
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Ex: Contato suave para sondar novas necessidades sem pressão..."
            />
          </div>

          {/* Inserção Rápida de Variáveis */}
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
              Inserir Variáveis Dinâmicas:
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                '[Nome]',
                '[Fazenda]',
                '[Região]',
                '[Último serviço]',
                '[Data do último serviço]',
                '[Quantidade de serviços]',
                '[Nome da empresa de drones]',
              ].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(` ${v} `)}
                  className="px-2 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 text-stone-700 font-mono text-[11px] rounded border border-stone-200 transition-colors"
                >
                  + {v}
                </button>
              ))}
            </div>
          </div>

          {/* Texto da Mensagem */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Texto da Mensagem:
            </label>
            <textarea
              value={formData.templateText}
              onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
              rows={6}
              className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
              required
            />
          </div>

          {/* Status Ativo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-bold text-stone-800">
              Modelo Ativo no Sistema
            </label>
          </div>

          {/* Footer Form */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
            >
              Salvar Modelo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: Live Test Preview Modal
interface TestPreviewModalProps {
  template: ReactivationMessageTemplateItem;
  sampleClient: ReactivationClientSummary;
  company: Company;
  onClose: () => void;
}

const TestPreviewModal: React.FC<TestPreviewModalProps> = ({
  template,
  sampleClient,
  company,
  onClose,
}) => {
  const formatted = formatReactivationMessage(template.templateText, sampleClient, company);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between border-b border-[#111827]">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Simulação em Tempo Real
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-emerald-950">
            <strong>Dados do Cliente Teste:</strong> {sampleClient.contactName} • Fazenda {sampleClient.lastPropertyName} ({sampleClient.city}) • {sampleClient.daysSinceLastService} dias sem aplicar.
          </div>

          <div>
            <span className="font-bold text-stone-700 block mb-1">
              Como o cliente receberá no WhatsApp:
            </span>
            <div className="bg-emerald-950/5 border border-emerald-500/20 rounded-xl p-4 text-xs text-stone-900 whitespace-pre-wrap leading-relaxed">
              {formatted}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold hover:bg-stone-900"
            >
              Fechar Prévia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
