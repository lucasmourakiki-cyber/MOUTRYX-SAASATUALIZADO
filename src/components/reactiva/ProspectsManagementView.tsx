import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Upload,
  Search,
  Filter,
  Phone,
  MapPin,
  Building2,
  Calendar,
  MessageCircle,
  FileText,
  Trash2,
  CheckCircle2,
  Flame,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  DollarSign,
  UserCheck,
  Tag,
  X,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';
import {
  Prospect,
  LeadSource,
  CommercialFunnelStage,
  Company,
  LostReason,
} from '../../types';
import {
  buildWhatsAppLink,
  getOpportunityScoreTier,
  parseProspectsCsv,
} from '../../utils/reactivationEngine';

interface ProspectsManagementViewProps {
  prospects: Prospect[];
  company: Company;
  responsibleName?: string;
  onAddProspect: (prospect: Prospect) => void;
  onUpdateProspect: (id: string, updates: Partial<Prospect>) => void;
  onDeleteProspect: (id: string) => void;
  onConvertToClient: (prospect: Prospect) => void;
  onGenerateQuote?: (clientId?: string, quoteData?: any) => void;
}

export const ProspectsManagementView: React.FC<ProspectsManagementViewProps> = ({
  prospects = [],
  company,
  responsibleName = 'Lucas Moura',
  onAddProspect,
  onUpdateProspect,
  onDeleteProspect,
  onConvertToClient,
  onGenerateQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'novos' | 'em_contato' | 'orcamento' | 'convertidos' | 'descartados'>('todos');
  const [sourceFilter, setSourceFilter] = useState<string>('todos');

  // Modals
  const [isNewProspectModalOpen, setIsNewProspectModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedProspectForLossModal, setSelectedProspectForLossModal] = useState<Prospect | null>(null);

  // New Prospect Form State
  const [formData, setFormData] = useState({
    producerName: '',
    farmName: '',
    phone: '',
    whatsapp: '',
    city: company.city || '',
    state: company.state || '',
    region: 'Médio-Norte',
    approximateAreaHa: 500,
    crops: 'Soja, Milho',
    interestedServices: 'Pulverização Agrícola, Dessecação',
    leadSource: 'indicacao' as LeadSource,
    referredBy: '',
    notes: '',
    estimatedPotentialValue: 22500,
  });

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState('');
  const [csvValidationResult, setCsvValidationResult] = useState<{
    validProspects: Prospect[];
    errors: { row: number; reason: string }[];
  } | null>(null);

  // Computed metrics
  const metrics = useMemo(() => {
    const total = prospects.length;
    const novos = prospects.filter((p) => p.stage === 'novo_lead' && p.status === 'ativo').length;
    const emContato = prospects.filter((p) => (p.stage === 'primeiro_contato' || p.stage === 'contato_realizado' || p.stage === 'interesse') && p.status === 'ativo').length;
    const emOrcamento = prospects.filter((p) => (p.stage === 'orcamento' || p.stage === 'negociacao') && p.status === 'ativo').length;
    const convertidos = prospects.filter((p) => p.status === 'convertido').length;
    const descartados = prospects.filter((p) => p.status === 'descartado').length;
    const totalPotential = prospects
      .filter((p) => p.status === 'ativo')
      .reduce((acc, p) => acc + (p.estimatedPotentialValue || 0), 0);
    const conversionRate = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    return {
      total,
      novos,
      emContato,
      emOrcamento,
      convertidos,
      descartados,
      totalPotential,
      conversionRate,
    };
  }, [prospects]);

  // Filtered prospects list
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.producerName.toLowerCase().includes(term);
        const matchesFarm = p.farmName.toLowerCase().includes(term);
        const matchesCity = p.city.toLowerCase().includes(term);
        const matchesCrop = p.crops.some((c) => c.toLowerCase().includes(term));
        if (!matchesName && !matchesFarm && !matchesCity && !matchesCrop) return false;
      }

      // Status
      if (statusFilter === 'novos' && (p.stage !== 'novo_lead' || p.status !== 'ativo')) return false;
      if (statusFilter === 'em_contato' && (p.stage !== 'primeiro_contato' && p.stage !== 'contato_realizado' && p.stage !== 'interesse')) return false;
      if (statusFilter === 'orcamento' && (p.stage !== 'orcamento' && p.stage !== 'negociacao')) return false;
      if (statusFilter === 'convertidos' && p.status !== 'convertido') return false;
      if (statusFilter === 'descartados' && p.status !== 'descartado') return false;

      // Source
      if (sourceFilter !== 'todos' && p.leadSource !== sourceFilter) return false;

      return true;
    });
  }, [prospects, searchTerm, statusFilter, sourceFilter]);

  // Handle create prospect
  const handleSaveProspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producerName.trim()) return;

    const newProspect: Prospect = {
      id: `prosp-${Date.now()}`,
      companyId: company.id,
      producerName: formData.producerName,
      farmName: formData.farmName || `Fazenda ${formData.producerName}`,
      phone: formData.phone || formData.whatsapp,
      whatsapp: formData.whatsapp || formData.phone,
      city: formData.city,
      state: formData.state,
      region: formData.region,
      approximateAreaHa: Number(formData.approximateAreaHa) || 500,
      crops: formData.crops.split(',').map((c) => c.trim()),
      interestedServices: formData.interestedServices.split(',').map((s) => s.trim()),
      leadSource: formData.leadSource,
      referredBy: formData.referredBy,
      notes: formData.notes,
      responsibleName: responsibleName,
      status: 'ativo',
      stage: 'novo_lead',
      opportunityScore: 75,
      estimatedPotentialValue: Number(formData.estimatedPotentialValue) || 22500,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      nextFollowUpReason: 'Primeiro contato de apresentação de frota',
    };

    onAddProspect(newProspect);
    setIsNewProspectModalOpen(false);
    setFormData({
      producerName: '',
      farmName: '',
      phone: '',
      whatsapp: '',
      city: company.city || '',
      state: company.state || '',
      region: 'Médio-Norte',
      approximateAreaHa: 500,
      crops: 'Soja, Milho',
      interestedServices: 'Pulverização Agrícola, Dessecação',
      leadSource: 'indicacao',
      referredBy: '',
      notes: '',
      estimatedPotentialValue: 22500,
    });
  };

  // CSV Validation
  const handleValidateCsv = () => {
    if (!csvRawText.trim()) return;
    const result = parseProspectsCsv(csvRawText, company.id);
    setCsvValidationResult(result);
  };

  // Confirm CSV Import
  const handleConfirmCsvImport = () => {
    if (!csvValidationResult || csvValidationResult.validProspects.length === 0) return;
    csvValidationResult.validProspects.forEach((p) => onAddProspect(p));
    setIsCsvModalOpen(false);
    setCsvRawText('');
    setCsvValidationResult(null);
  };

  // Handle Loss Reason Registration
  const handleConfirmLoss = (reason: LostReason, details: string) => {
    if (!selectedProspectForLossModal) return;
    onUpdateProspect(selectedProspectForLossModal.id, {
      status: 'descartado',
      stage: 'perdido',
      lostReason: reason,
      lostReasonDetails: details,
    });
    setSelectedProspectForLossModal(null);
  };

  // WhatsApp link
  const handleOpenWhatsApp = (prospect: Prospect) => {
    const message = `Olá, ${prospect.producerName}! Tudo bem? Sou o ${responsibleName} da ${company.tradeName || company.name}.\n\nTrabalhamos com prestação de serviços agrícolas especializados com drones de alta capacidade (DJI Agras). Gostaria de apresentar nossas soluções para a ${prospect.farmName}. Como está seu planejamento para a safra de ${prospect.crops[0] || 'Soja'}?`;
    const url = buildWhatsAppLink(prospect.whatsapp || prospect.phone, message);
    onUpdateProspect(prospect.id, {
      stage: prospect.stage === 'novo_lead' ? 'primeiro_contato' : prospect.stage,
      lastContactAt: new Date().toISOString().split('T')[0],
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
              <Users className="w-3 h-3 text-sky-400" />
              CENTRAL DE PROSPECÇÃO & LEADS
            </span>
            <span className="text-xs text-slate-400">Novos Produtores & Oportunidades</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            Gestão de Prospectos & Novos Clientes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Cadastre novos produtores, importe listas de eventos/feiras, qualifique áreas e converta contatos em contratos de pulverização.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Importar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewProspectModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Prospecto</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Leads</span>
          <strong className="text-2xl font-black text-white mt-1 block">{metrics.total}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Cadastrados</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-sky-400 uppercase block">Sem Contato</span>
          <strong className="text-2xl font-black text-sky-400 mt-1 block">{metrics.novos}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Novos leads</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-amber-400 uppercase block">Em Contato</span>
          <strong className="text-2xl font-black text-amber-400 mt-1 block">{metrics.emContato}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Qualificação</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-purple-400 uppercase block">Orçamentos</span>
          <strong className="text-2xl font-black text-purple-400 mt-1 block">{metrics.emOrcamento}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Propostas</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-400 uppercase block">Convertidos</span>
          <strong className="text-2xl font-black text-emerald-400 mt-1 block">{metrics.convertidos}</strong>
          <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">{metrics.conversionRate}% conversão</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-400 uppercase block">Potencial Total</span>
          <strong className="text-lg font-black text-emerald-400 mt-1 block truncate">
            R$ {metrics.totalPotential.toLocaleString('pt-BR')}
          </strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Em negociação</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar produtor, fazenda, cidade, cultura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'novos', label: 'Novos' },
              { id: 'em_contato', label: 'Em Contato' },
              { id: 'orcamento', label: 'Orçamentos' },
              { id: 'convertidos', label: 'Convertidos' },
              { id: 'descartados', label: 'Descartados' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="todos">Todas as Origens</option>
            <option value="indicacao">Indicação</option>
            <option value="instagram">Instagram</option>
            <option value="feira">Feira / Evento</option>
            <option value="visita_comercial">Visita Comercial</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>

      {/* Prospects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProspects.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">Nenhum prospecto encontrado</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cadastre novos contatos ou importe sua planilha para começar o trabalho de prospecção comercial.
            </p>
            <button
              type="button"
              onClick={() => setIsNewProspectModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Lead</span>
            </button>
          </div>
        ) : (
          filteredProspects.map((prospect) => {
            const scoreTier = getOpportunityScoreTier(prospect.opportunityScore);

            return (
              <div
                key={prospect.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${scoreTier.badgeClass} inline-flex items-center gap-1 mb-1`}>
                        <span>{scoreTier.icon}</span>
                        <span>Score: {prospect.opportunityScore}</span>
                      </span>

                      <h4 className="font-extrabold text-white text-sm tracking-tight line-clamp-1">
                        {prospect.producerName}
                      </h4>
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {prospect.farmName}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-800 px-2 py-0.5 rounded-md">
                      {prospect.leadSource}
                    </span>
                  </div>

                  {/* Location & Crop badges */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      <MapPin className="w-3 h-3" />
                      {prospect.city} - {prospect.state}
                    </span>

                    <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      🌾 {prospect.crops.join(', ')}
                    </span>

                    <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300 font-semibold">
                      📐 {prospect.approximateAreaHa} ha
                    </span>
                  </div>

                  {/* Notes / Reason */}
                  {prospect.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-3 line-clamp-2">
                      "{prospect.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom stats & action buttons */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Potencial Estimado</span>
                      <strong className="text-emerald-400 font-black text-sm">
                        R$ {prospect.estimatedPotentialValue.toLocaleString('pt-BR')}
                      </strong>
                    </div>

                    <select
                      value={prospect.stage}
                      onChange={(e) =>
                        onUpdateProspect(prospect.id, {
                          stage: e.target.value as CommercialFunnelStage,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none"
                    >
                      <option value="novo_lead">🎯 Novo Lead</option>
                      <option value="primeiro_contato">📞 1º Contato</option>
                      <option value="contato_realizado">💬 Contatado</option>
                      <option value="interesse">⭐ Interesse</option>
                      <option value="orcamento">📄 Orçamento</option>
                      <option value="negociacao">🤝 Negociação</option>
                      <option value="fechado">🏆 Fechado</option>
                      <option value="perdido">🚫 Perdido</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(prospect)}
                      className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp</span>
                    </button>

                    {prospect.status !== 'convertido' ? (
                      <button
                        type="button"
                        onClick={() => onConvertToClient(prospect)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Converter em Cliente Ativo"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Virar Cliente</span>
                      </button>
                    ) : (
                      <span className="py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                        ✓ Cliente Ativo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Resp: {prospect.responsibleName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProspectForLossModal(prospect)}
                      className="text-slate-500 hover:text-rose-400 transition-colors text-[10px]"
                    >
                      Descartar Lead
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: NOVO PROSPECTO */}
      {isNewProspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Cadastrar Novo Prospecto</h3>
                <p className="text-xs text-slate-400">Adicione um novo produtor rural ao pipeline comercial</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProspectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProspect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nome do Produtor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Batista"
                    value={formData.producerName}
                    onChange={(e) => setFormData({ ...formData, producerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nome da Fazenda</label>
                  <input
                    type="text"
                    placeholder="Ex: Fazenda Primavera"
                    value={formData.farmName}
                    onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(66) 99999-0000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    placeholder="Sorriso / MT"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Área Aprox. (ha)</label>
                  <input
                    type="number"
                    value={formData.approximateAreaHa}
                    onChange={(e) => setFormData({ ...formData, approximateAreaHa: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Culturas</label>
                  <input
                    type="text"
                    placeholder="Soja, Milho, Algodão"
                    value={formData.crops}
                    onChange={(e) => setFormData({ ...formData, crops: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Origem do Lead</label>
                  <select
                    value={formData.leadSource}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value as LeadSource })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="indicacao">Indicação</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="feira">Feira / Show Safra</option>
                    <option value="visita_comercial">Visita Comercial</option>
                    <option value="produtor_conhecido">Produtor Conhecido</option>
                    <option value="whatsapp">WhatsApp Direto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Observações & Diagnóstico Agronômico</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Talhões com relevo acidentado; produtor busca drone para dessecação rápida sem amassamento..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewProspectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Salvar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORTAÇÃO CSV */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Importar Lista de Prospectos via CSV
                </h3>
                <p className="text-xs text-slate-400">Cole ou importe seu arquivo CSV com dados de produtores</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <strong className="text-slate-200 block">Formato esperado das colunas (separadas por vírgula):</strong>
                <code>Nome, Fazenda, Telefone, Cidade, Estado, Cultura, Area, Servico, Observacao</code>
              </div>

              <textarea
                rows={7}
                placeholder={`Nome, Fazenda, Telefone, Cidade, Estado, Cultura, Area, Servico, Observacao\nJoão Batista, Fazenda Alvorada, (66) 99881-2244, Sorriso, MT, Soja;Milho, 850, Pulverização, Interesse em dessecação`}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 font-mono text-xs text-slate-100 p-3 rounded-2xl focus:outline-none focus:border-emerald-500"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleValidateCsv}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
                >
                  Validar Dados
                </button>

                {csvValidationResult && (
                  <span className="text-xs font-bold text-emerald-400">
                    ✓ {csvValidationResult.validProspects.length} registros válidos encontrados
                  </span>
                )}
              </div>

              {csvValidationResult && csvValidationResult.validProspects.length > 0 && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <span>Pronto para importar {csvValidationResult.validProspects.length} novos prospectos para o CRM.</span>
                  <button
                    type="button"
                    onClick={handleConfirmCsvImport}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    Confirmar Importação
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MOTIVO DE PERDA / DESCARTAR LEAD */}
      {selectedProspectForLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white">
              Por que este negócio / lead foi perdido?
            </h3>
            <p className="text-xs text-slate-400">
              Registrar o motivo é fundamental para aprimorar os preços e argumentos comerciais da frota.
            </p>

            <div className="space-y-2">
              {(
                [
                  { id: 'preco', label: 'Preço / Achou caro' },
                  { id: 'escolheu_concorrente', label: 'Escolheu concorrente' },
                  { id: 'nao_respondeu', label: 'Sem resposta após contatos' },
                  { id: 'area_inadequada', label: 'Área ou relevo inadequado' },
                  { id: 'mudanca_planejamento', label: 'Mudança de planejamento na fazenda' },
                  { id: 'outro', label: 'Outro motivo' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleConfirmLoss(m.id, m.label)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedProspectForLossModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
