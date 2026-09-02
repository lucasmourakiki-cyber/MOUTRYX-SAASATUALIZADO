import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Users,
  Flame,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  MessageCircle,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Layers,
  FileSpreadsheet,
  FilePlus,
  FileText,
  ArrowUpDown,
  Target,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import {
  ReactivationClientSummary,
  ReactivationMetricsSummary,
  ReactivationScoreTier,
  OpportunityScoreTier,
  ReactivationFunnelStage,
  Company,
} from '../../types';
import { MoutryxRecomendaHeader } from './MoutryxRecomendaHeader';

interface ReactivationRadarViewProps {
  clientSummaries: ReactivationClientSummary[];
  metrics: ReactivationMetricsSummary;
  company: Company;
  onOpenDirectWhatsApp: (client: ReactivationClientSummary) => void;
  onOpenCreateCampaign: (selectedClients: ReactivationClientSummary[]) => void;
  onUpdateFunnelStage: (clientId: string, newStage: ReactivationFunnelStage) => void;
  onGenerateQuote: (clientId: string) => void;
  onOpenWhoToContactModal: () => void;
}

export const ReactivationRadarView: React.FC<ReactivationRadarViewProps> = ({
  clientSummaries = [],
  metrics,
  company,
  onOpenDirectWhatsApp,
  onOpenCreateCampaign,
  onUpdateFunnelStage,
  onGenerateQuote,
  onOpenWhoToContactModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedInactivityFilter, setSelectedInactivityFilter] = useState<string>('inactive');
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');
  const [onlyRiskFilter, setOnlyRiskFilter] = useState<boolean>(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'oppScore' | 'reactScore' | 'days' | 'revenue' | 'name'>('oppScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Extract unique crops
  const availableCrops = useMemo(() => {
    const crops = new Set<string>();
    clientSummaries.forEach((c) => {
      if (c.lastCrop) crops.add(c.lastCrop);
    });
    return Array.from(crops);
  }, [clientSummaries]);

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    return clientSummaries
      .filter((client) => {
        // Search
        const matchesSearch =
          client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.lastPropertyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.city.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Inactivity Filter
        if (selectedInactivityFilter === 'inactive' && client.daysSinceLastService < 30) {
          return false;
        } else if (selectedInactivityFilter === '30_60' && (client.daysSinceLastService < 30 || client.daysSinceLastService > 60)) {
          return false;
        } else if (selectedInactivityFilter === '61_120' && (client.daysSinceLastService < 61 || client.daysSinceLastService > 120)) {
          return false;
        } else if (selectedInactivityFilter === '120_plus' && client.daysSinceLastService <= 120) {
          return false;
        }

        // Score Tier Filter
        if (selectedTierFilter !== 'all') {
          if (selectedTierFilter === 'maxima' && client.opportunityTier !== 'maxima') return false;
          if (selectedTierFilter === 'alta' && client.opportunityTier !== 'alta') return false;
          if (selectedTierFilter === 'alta_prioridade' && client.scoreTier !== 'alta_prioridade') return false;
          if (selectedTierFilter === 'oportunidade' && client.scoreTier !== 'oportunidade') return false;
          if (selectedTierFilter === 'risco_perda' && client.scoreTier !== 'risco_perda') return false;
          if (selectedTierFilter === 'frio' && client.scoreTier !== 'frio') return false;
        }

        // Only risk filter
        if (onlyRiskFilter && !client.isAtRiskOfChurn) {
          return false;
        }

        // Crop Filter
        if (selectedCropFilter !== 'all' && client.lastCrop !== selectedCropFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'oppScore') comp = a.opportunityScore - b.opportunityScore;
        else if (sortBy === 'reactScore') comp = a.reactivationScore - b.reactivationScore;
        else if (sortBy === 'days') comp = a.daysSinceLastService - b.daysSinceLastService;
        else if (sortBy === 'revenue') comp = a.estimatedPotentialRevenue - b.estimatedPotentialRevenue;
        else if (sortBy === 'name') comp = a.clientName.localeCompare(b.clientName);
        return sortOrder === 'desc' ? -comp : comp;
      });
  }, [
    clientSummaries,
    searchTerm,
    selectedInactivityFilter,
    selectedTierFilter,
    onlyRiskFilter,
    selectedCropFilter,
    sortBy,
    sortOrder,
  ]);

  // Selection handlers
  const handleToggleSelectClient = (clientId: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(clientId)) next.delete(clientId);
    else next.add(clientId);
    setSelectedClientIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedClientIds.size === filteredClients.length && filteredClients.length > 0) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(filteredClients.map((c) => c.clientId)));
    }
  };

  const handleClearSelection = () => {
    setSelectedClientIds(new Set());
  };

  const selectedClientObjects = useMemo(() => {
    return clientSummaries.filter((c) => selectedClientIds.has(c.clientId));
  }, [clientSummaries, selectedClientIds]);

  const selectedPotentialRevenue = useMemo(() => {
    return selectedClientObjects.reduce((acc, c) => acc + (c.estimatedPotentialRevenue || 0), 0);
  }, [selectedClientObjects]);

  const getOpportunityTierBadge = (tier: OpportunityScoreTier) => {
    switch (tier) {
      case 'maxima':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Flame className="w-3 h-3 fill-rose-400" />
            PRIORIDADE MÁXIMA
          </span>
        );
      case 'alta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            ALTA OPORTUNIDADE
          </span>
        );
      case 'media':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Target className="w-3 h-3 text-amber-400" />
            Oportunidade
          </span>
        );
      case 'baixa':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Baixa Prioridade
          </span>
        );
    }
  };

  const getTierBadge = (tier: ReactivationScoreTier) => {
    switch (tier) {
      case 'alta_prioridade':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
            Alta Prioridade
          </span>
        );
      case 'oportunidade':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Oportunidade
          </span>
        );
      case 'risco_perda':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Risco de Perda
          </span>
        );
      case 'frio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700/60 text-slate-300 border border-slate-600">
            <Clock className="w-3 h-3 text-slate-400" />
            Cliente Frio
          </span>
        );
      case 'reativado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            Reativado na Safra
          </span>
        );
    }
  };

  const getFunnelStageColor = (stage: ReactivationFunnelStage) => {
    switch (stage) {
      case 'selecionado':
        return 'bg-slate-700/60 text-slate-300 border-slate-600';
      case 'contatado':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'interessado':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'orcamento':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'reativado_contratado':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'declinado':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const handleFilterRisk = () => {
    setOnlyRiskFilter((prev) => !prev);
  };

  const handleCreateCampaignWithRecommended = () => {
    const recommended = clientSummaries.filter((c) => c.opportunityScore >= 70 && c.funnelStage !== 'reativado_contratado');
    onOpenCreateCampaign(recommended);
  };

  return (
    <div className="space-y-6">
      {/* 🎯 MOUTRYX RECOMENDA Header Block */}
      <MoutryxRecomendaHeader
        metrics={metrics}
        clientSummaries={clientSummaries}
        onOpenWhoToContactModal={onOpenWhoToContactModal}
        onFilterRiskClients={handleFilterRisk}
        onOpenCreateCampaignWithRecommended={handleCreateCampaignWithRecommended}
      />

      {/* Control Bar: Filters, Search & Mass Action */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produtor, fazenda, contato ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Mass Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <span className="text-xs text-slate-400 font-medium">
              {selectedClientIds.size} de {filteredClients.length} selecionados
            </span>

            <button
              type="button"
              disabled={selectedClientIds.size === 0}
              onClick={() => onOpenCreateCampaign(selectedClientObjects)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                selectedClientIds.size > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar Campanha com Selecionados ({selectedClientIds.size})</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Inactivity Dropdown */}
          <select
            value={selectedInactivityFilter}
            onChange={(e) => setSelectedInactivityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="inactive">⏳ Inativos (&ge; 30 dias)</option>
            <option value="30_60">30 a 60 dias (Janela Retorno)</option>
            <option value="61_120">61 a 120 dias (Momento Ideal)</option>
            <option value="120_plus">+120 dias (Risco Alto / Frios)</option>
            <option value="all">Todos os Cadastrados</option>
          </select>

          {/* Score Tier Dropdown */}
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="all">Todos os Níveis de Prioridade</option>
            <option value="maxima">🔥 Prioridade Máxima (85-100)</option>
            <option value="alta">🟢 Alta Oportunidade (70-84)</option>
            <option value="alta_prioridade">Score Reativação Alto (&ge;80)</option>
            <option value="oportunidade">Score Reativação Médio (60-79)</option>
            <option value="risco_perda">⚠️ Risco de Perda (40-59)</option>
            <option value="frio">❄️ Clientes Frios (&lt;40)</option>
          </select>

          {/* Crop Dropdown */}
          <select
            value={selectedCropFilter}
            onChange={(e) => setSelectedCropFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="all">Todas as Culturas</option>
            {availableCrops.map((crop) => (
              <option key={crop} value={crop}>
                🌾 {crop}
              </option>
            ))}
          </select>

          {/* Toggle Risco de Perda */}
          <button
            type="button"
            onClick={handleFilterRisk}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              onlyRiskFilter
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Apenas Risco de Perda</span>
          </button>

          {/* Order by */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-slate-400 text-xs">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
            >
              <option value="oppScore">Score de Oportunidade</option>
              <option value="reactScore">Score de Reativação</option>
              <option value="days">Dias de Inatividade</option>
              <option value="revenue">Potencial R$</option>
              <option value="name">Nome do Cliente</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 cursor-pointer"
              title="Inverter Ordem"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Mass Selection Action Banner when items are selected */}
      {selectedClientIds.size > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {selectedClientIds.size} {selectedClientIds.size === 1 ? 'produtor selecionado' : 'produtores selecionados'}
                </span>
                <span className="text-xs text-slate-400">
                  (de {filteredClients.length} no filtro atual)
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-medium">
                Potencial comercial em jogo: <strong className="font-extrabold text-white">R$ {selectedPotentialRevenue.toLocaleString('pt-BR')}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedClientIds.size < filteredClients.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Selecionar todos ({filteredClients.length})
              </button>
            )}
            
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              Limpar seleção
            </button>

            <button
              type="button"
              onClick={() => onOpenCreateCampaign(selectedClientObjects)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>CRIAR CAMPANHA COM SELECIONADOS ({selectedClientIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Clients Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      title={selectedClientIds.size === filteredClients.length && filteredClients.length > 0 ? "Desmarcar todos" : "Selecionar todos os filtrados"}
                      className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {selectedClientIds.size === filteredClients.length && filteredClients.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="py-3.5 px-4">Produtor / Fazenda</th>
                <th className="py-3.5 px-4 text-center">Score Oportunidade</th>
                <th className="py-3.5 px-4 text-center">Score Reativação</th>
                <th className="py-3.5 px-4 text-center">Inatividade</th>
                <th className="py-3.5 px-4">Última Aplicação</th>
                <th className="py-3.5 px-4 text-right">Potencial R$</th>
                <th className="py-3.5 px-4 text-center">Estágio Funil</th>
                <th className="py-3.5 px-4 text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-300">
                        Nenhum cliente encontrado com os filtros selecionados.
                      </p>
                      <p className="text-xs text-slate-500">
                        Tente ajustar a busca ou os filtros de inatividade e cultura.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientIds.has(client.clientId);
                  const isExpanded = expandedClientId === client.clientId;
                  const isMaxima = client.opportunityTier === 'maxima';

                  return (
                    <React.Fragment key={client.clientId}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-emerald-950/20' : ''
                        } ${isMaxima ? 'border-l-2 border-l-amber-500' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectClient(client.clientId)}
                            className="text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Client info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm tracking-tight">
                              {client.clientName}
                            </span>
                            {client.isAtRiskOfChurn && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                🚨 Em Risco
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
                            <span className="text-emerald-400 font-medium">
                              {client.contactName}
                            </span>
                            <span>•</span>
                            <span>{client.lastPropertyName || 'Fazenda Principal'}</span>
                            <span>•</span>
                            <span>{client.city}/{client.state}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {getOpportunityTierBadge(client.opportunityTier)}
                            <button
                              type="button"
                              onClick={() => setExpandedClientId(isExpanded ? null : client.clientId)}
                              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer ml-1"
                            >
                              <span>Detalhes</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        {/* NEW: Opportunity Score Gauge */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-base font-black ${
                                  client.opportunityScore >= 85
                                    ? 'text-amber-400'
                                    : client.opportunityScore >= 70
                                    ? 'text-emerald-400'
                                    : client.opportunityScore >= 50
                                    ? 'text-sky-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {client.opportunityScore}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">/100</span>
                            </div>
                            <div className="w-20 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  client.opportunityScore >= 85
                                    ? 'bg-amber-400'
                                    : client.opportunityScore >= 70
                                    ? 'bg-emerald-400'
                                    : client.opportunityScore >= 50
                                    ? 'bg-sky-400'
                                    : 'bg-slate-500'
                                }`}
                                style={{ width: `${client.opportunityScore}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-emerald-400 mt-1 max-w-[130px] truncate text-center font-medium">
                              {client.opportunityTier === 'maxima' ? '🔥 Contatar Hoje' : client.opportunityTier === 'alta' ? '🟢 Oportunidade' : 'Monitorar'}
                            </span>
                          </div>
                        </td>

                        {/* Reactivation Score (Original Preserved) */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-slate-300">
                                {client.reactivationScore}
                              </span>
                              <span className="text-xs text-slate-600">/100</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {client.scoreTier}
                            </span>
                          </div>
                        </td>

                        {/* Inactivity days */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                                client.daysSinceLastService > 120
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : client.daysSinceLastService >= 60
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : client.daysSinceLastService >= 30
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {client.daysSinceLastService >= 999
                                ? 'Sem OS'
                                : `${client.daysSinceLastService} dias`}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                              Cadência: {client.averageServiceIntervalDays}d
                            </span>
                          </div>
                        </td>

                        {/* Last Service Details */}
                        <td className="py-4 px-4">
                          <div className="text-slate-200 font-medium">
                            🌾 {client.lastCrop || 'Não informada'}
                          </div>
                          <div className="text-slate-400 text-[11px] truncate max-w-[150px]">
                            {client.lastServiceName || 'Sem serviço registrado'}
                          </div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            {client.lastServiceDate
                              ? new Date(client.lastServiceDate).toLocaleDateString('pt-BR')
                              : 'Nunca atendeu'}
                          </div>
                        </td>

                        {/* Estimated Revenue */}
                        <td className="py-4 px-4 text-right">
                          <div className="text-emerald-400 font-bold text-sm">
                            R$ {client.estimatedPotentialRevenue.toLocaleString('pt-BR')}
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            Histórico: R$ {client.totalRevenue.toLocaleString('pt-BR')}
                          </div>
                        </td>

                        {/* Funnel Stage Selector */}
                        <td className="py-4 px-4 text-center">
                          <select
                            value={client.funnelStage}
                            onChange={(e) =>
                              onUpdateFunnelStage(
                                client.clientId,
                                e.target.value as ReactivationFunnelStage
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${getFunnelStageColor(
                              client.funnelStage
                            )}`}
                          >
                            <option value="selecionado" className="bg-slate-900 text-white">
                              🎯 Selecionado
                            </option>
                            <option value="contatado" className="bg-slate-900 text-white">
                              📲 Contatado
                            </option>
                            <option value="interessado" className="bg-slate-900 text-white">
                              💬 Interessado
                            </option>
                            <option value="orcamento" className="bg-slate-900 text-white">
                              📄 Orçamento
                            </option>
                            <option
                              value="reativado_contratado"
                              className="bg-slate-900 text-emerald-400 font-bold"
                            >
                              🏆 Reativado (OS)
                            </option>
                            <option value="declinado" className="bg-slate-900 text-rose-400">
                              🛑 Declinado
                            </option>
                          </select>
                        </td>

                        {/* Fast Actions: Quote & WhatsApp */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onGenerateQuote(client.clientId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                              title="Gerar Orçamento formal para este cliente"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Orçamento</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenDirectWhatsApp(client)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
                              title="Preparar e abrir mensagem no WhatsApp Oficial"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Row Details */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={9} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Why recommend? */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>Por que a MOUTRYX recomenda?</span>
                                </div>
                                <ul className="space-y-1 text-[11px] text-slate-300">
                                  {client.opportunityReasons.map((r, i) => (
                                    <li key={i} className="leading-tight">
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Next Best Action */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                  <Target className="w-3.5 h-3.5" />
                                  <span>Próxima Melhor Ação</span>
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed">
                                  {client.nextBestAction}
                                </p>
                              </div>

                              {/* Recommended Message preview */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Mensagem Recomendada
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDirectWhatsApp(client)}
                                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                                  >
                                    Abrir no WhatsApp
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-3 italic">
                                  "{client.recommendedMessage}"
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
