import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Drone, Battery, MaintenanceRecord, DroneStatus, BatteryStatus } from '../../types';
import {
  Plane,
  BatteryCharging,
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { NewDroneModal } from '../modals/NewDroneModal';
import { NewBatteryModal } from '../modals/NewBatteryModal';
import { DroneDetailsModal } from '../modals/DroneDetailsModal';
import { BatteryDetailsModal } from '../modals/BatteryDetailsModal';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';

export const FleetManagementView: React.FC = () => {
  const {
    drones,
    batteries,
    droneMaintenances,
    addMaintenanceRecord,
    deleteDrone,
    deleteBattery,
    updateBatteryCycles,
    activeTab: globalTab,
  } = useApp();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'drones' | 'baterias' | 'manutencoes'>(() => {
    if (globalTab === 'baterias') return 'baterias';
    if (globalTab === 'manutencao' || globalTab === 'manutencoes') return 'manutencoes';
    return 'drones';
  });

  React.useEffect(() => {
    if (globalTab === 'baterias') setActiveTab('baterias');
    else if (globalTab === 'manutencao' || globalTab === 'manutencoes') setActiveTab('manutencoes');
    else if (globalTab === 'drones') setActiveTab('drones');
  }, [globalTab]);

  // Search and Filter states
  const [droneSearch, setDroneSearch] = useState('');
  const [droneStatusFilter, setDroneStatusFilter] = useState<'todos' | 'ativos' | 'manutencao' | 'inativos'>('todos');

  const [batterySearch, setBatterySearch] = useState('');
  const [batteryStatusFilter, setBatteryStatusFilter] = useState<'todos' | 'disponiveis' | 'em_uso' | 'carregando' | 'manutencao' | 'inativas'>('todos');

  // Modal states for Drones
  const [isDroneModalOpen, setIsDroneModalOpen] = useState(false);
  const [editingDrone, setEditingDrone] = useState<Drone | null>(null);
  const [viewingDrone, setViewingDrone] = useState<Drone | null>(null);
  const [deletingDrone, setDeletingDrone] = useState<Drone | null>(null);

  // Modal states for Batteries
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [editingBattery, setEditingBattery] = useState<Battery | null>(null);
  const [viewingBattery, setViewingBattery] = useState<Battery | null>(null);
  const [deletingBattery, setDeletingBattery] = useState<Battery | null>(null);
  const [initialDroneForBattery, setInitialDroneForBattery] = useState<string | undefined>(undefined);

  // Maintenance modal
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [maintDroneId, setMaintDroneId] = useState(drones[0]?.id || '');
  const [maintType, setMaintType] = useState<'preventiva' | 'corretiva' | 'inspecao' | 'troca_peca'>('preventiva');
  const [maintCost, setMaintCost] = useState(650);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintProvider, setMaintProvider] = useState('Oficina Especializada DJI Agro');

  // Feedback banner state
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // --------------------------------------------------------------------------
  // 1. KPIS DA FROTA (Calculados em tempo real com base nos dados reais)
  // --------------------------------------------------------------------------
  const fleetKPIs = useMemo(() => {
    const totalDrones = drones.length;
    const activeDrones = drones.filter(
      (d) => d.status === 'disponivel' || d.status === 'em_operacao' || (d.status as string) === 'ativo'
    ).length;
    const maintenanceDrones = drones.filter((d) => d.status === 'em_manutencao').length;

    const totalBatteries = batteries.length;
    const availableBatteries = batteries.filter(
      (b) =>
        b.status === 'disponivel' ||
        b.condition === 'excelente' ||
        b.condition === 'boa' ||
        (!b.status && b.condition !== 'em_manutencao' && b.condition !== 'limite_atingido')
    ).length;
    const maintenanceBatteries = batteries.filter(
      (b) => b.status === 'em_manutencao' || b.condition === 'em_manutencao'
    ).length;

    return {
      totalDrones,
      activeDrones,
      maintenanceDrones,
      totalBatteries,
      availableBatteries,
      maintenanceBatteries,
    };
  }, [drones, batteries]);

  // --------------------------------------------------------------------------
  // 2. FILTRAGEM DE DRONES
  // --------------------------------------------------------------------------
  const filteredDrones = useMemo(() => {
    return drones.filter((d) => {
      const q = droneSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        d.model.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        d.assetTag.toLowerCase().includes(q) ||
        (d.anacRegistration && d.anacRegistration.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (droneStatusFilter === 'ativos') {
        return d.status === 'disponivel' || d.status === 'em_operacao' || (d.status as string) === 'ativo';
      }
      if (droneStatusFilter === 'manutencao') {
        return d.status === 'em_manutencao';
      }
      if (droneStatusFilter === 'inativos') {
        return d.status === 'parado' || (d.status as string) === 'inativo';
      }
      return true;
    });
  }, [drones, droneSearch, droneStatusFilter]);

  // --------------------------------------------------------------------------
  // 3. FILTRAGEM DE BATERIAS
  // --------------------------------------------------------------------------
  const filteredBatteries = useMemo(() => {
    return batteries.filter((b) => {
      const q = batterySearch.toLowerCase().trim();
      const linkedDrone = drones.find((d) => d.id === b.droneId);
      const droneName = linkedDrone ? (linkedDrone.name || linkedDrone.model).toLowerCase() : '';

      const matchesSearch =
        !q ||
        b.identifier.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q) ||
        b.serialNumber.toLowerCase().includes(q) ||
        droneName.includes(q);

      if (!matchesSearch) return false;

      const st = (b.status as string) || (b.condition as string);
      if (batteryStatusFilter === 'disponiveis') {
        return st === 'disponivel' || st === 'excelente' || st === 'boa';
      }
      if (batteryStatusFilter === 'em_uso') {
        return st === 'em_uso';
      }
      if (batteryStatusFilter === 'carregando') {
        return st === 'em_carregamento';
      }
      if (batteryStatusFilter === 'manutencao') {
        return st === 'em_manutencao';
      }
      if (batteryStatusFilter === 'inativas') {
        return st === 'inativa' || st === 'limite_atingido';
      }
      return true;
    });
  }, [batteries, drones, batterySearch, batteryStatusFilter]);

  // --------------------------------------------------------------------------
  // 4. HANDLERS DE EXCLUSÃO
  // --------------------------------------------------------------------------
  const handleConfirmDeleteDrone = () => {
    if (!deletingDrone) return;
    const res = deleteDrone(deletingDrone.id);
    if (res.success) {
      showFeedback(`Drone ${deletingDrone.name || deletingDrone.model} excluído com sucesso.`);
      setDeletingDrone(null);
    } else {
      showFeedback(res.reason || 'Erro ao excluir drone.', 'error');
    }
  };

  const handleConfirmDeleteBattery = () => {
    if (!deletingBattery) return;
    const res = deleteBattery(deletingBattery.id);
    if (res.success) {
      showFeedback(`Bateria ${deletingBattery.identifier} excluída com sucesso.`);
      setDeletingBattery(null);
    } else {
      showFeedback(res.reason || 'Erro ao excluir bateria.', 'error');
    }
  };

  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const drone = drones.find((d) => d.id === maintDroneId);
    if (!drone) return;

    addMaintenanceRecord({
      droneId: maintDroneId,
      droneModel: drone.name || drone.model,
      date: new Date().toISOString().split('T')[0],
      type: maintType,
      cost: maintCost,
      flightHoursAtService: drone.flightHours,
      description: maintDesc || `Manutenção ${maintType} preventiva realizada`,
      provider: maintProvider,
      partsReplaced: ['Hélices CCW', 'Bicos Pulverizadores'],
    });

    setIsAddMaintenanceOpen(false);
    setMaintDesc('');
    showFeedback(`Manutenção registrada com sucesso para ${drone.name || drone.model}.`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-800">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-bounce ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-red-950 text-red-100 border-red-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#111827] text-white flex items-center justify-center shadow-xs">
              <Plane className="h-5 w-5 text-[#667085]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Gestão de Frota, Baterias & Manutenção
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle operacional de aeronaves, monitoramento de ciclos de baterias e histórico de revisões técnicas
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'drones' && (
            <button
              onClick={() => {
                setEditingDrone(null);
                setIsDroneModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer border border-[#05521F]/30"
            >
              <Plus className="h-4 w-4" /> Cadastrar Drone
            </button>
          )}

          {activeTab === 'baterias' && (
            <button
              onClick={() => {
                setEditingBattery(null);
                setInitialDroneForBattery(undefined);
                setIsBatteryModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer border border-[#05521F]/30"
            >
              <Plus className="h-4 w-4" /> Cadastrar Bateria
            </button>
          )}

          {activeTab === 'manutencoes' && (
            <button
              onClick={() => setIsAddMaintenanceOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer border border-[#05521F]/30"
            >
              <Wrench className="h-4 w-4" /> Registrar Manutenção
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. ABA FROTA: VISÃO GERAL DOS EQUIPAMENTOS (6 KPIs 100% REAIS) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total de Drones */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Drones</span>
            <Plane className="h-4 w-4 text-[#05521F]" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{fleetKPIs.totalDrones}</span>
          <span className="text-[10px] text-slate-400 font-medium">Frota cadastrada</span>
        </div>

        {/* KPI 2: Drones Ativos */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Drones Ativos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-[#05521F] block">{fleetKPIs.activeDrones}</span>
          <span className="text-[10px] text-emerald-700 font-medium">Prontos para voo</span>
        </div>

        {/* KPI 3: Drones em Manutenção */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Em Manutenção</span>
            <Wrench className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-[#F59E0B] block">{fleetKPIs.maintenanceDrones}</span>
          <span className="text-[10px] text-amber-700 font-medium">Em revisão técnica</span>
        </div>

        {/* KPI 4: Total de Baterias */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Baterias</span>
            <BatteryCharging className="h-4 w-4 text-[#05521F]" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{fleetKPIs.totalBatteries}</span>
          <span className="text-[10px] text-slate-400 font-medium">Conjunto de células</span>
        </div>

        {/* KPI 5: Baterias Disponíveis */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Baterias Disponíveis</span>
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-[#05521F] block">{fleetKPIs.availableBatteries}</span>
          <span className="text-[10px] text-emerald-700 font-medium">Carga apta para uso</span>
        </div>

        {/* KPI 6: Baterias em Manutenção */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Baterias em Atenção</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-[#F59E0B] block">{fleetKPIs.maintenanceBatteries}</span>
          <span className="text-[10px] text-amber-700 font-medium">Revisão ou limite</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. NAVEGAÇÃO ENTRE ABAS: [ Drones ] [ Baterias ] [ Manutenções ] */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('drones')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'drones'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plane className="h-4 w-4" /> Drones ({drones.length})
        </button>

        <button
          onClick={() => setActiveTab('baterias')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'baterias'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BatteryCharging className="h-4 w-4" /> Baterias ({batteries.length})
        </button>

        <button
          onClick={() => setActiveTab('manutencoes')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'manutencoes'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="h-4 w-4" /> Histórico de Manutenções ({droneMaintenances.length})
        </button>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: DRONES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'drones' && (
        <div className="space-y-4">
          {/* Barra de Busca & Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar drone por nome, modelo, número de série ou tag..."
                value={droneSearch}
                onChange={(e) => setDroneSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#05521F] bg-slate-50/50"
              />
              {droneSearch && (
                <button
                  onClick={() => setDroneSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtros por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setDroneStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  droneStatusFilter === 'todos'
                    ? 'bg-[#05521F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({drones.length})
              </button>
              <button
                onClick={() => setDroneStatusFilter('ativos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  droneStatusFilter === 'ativos'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Ativos ({fleetKPIs.activeDrones})
              </button>
              <button
                onClick={() => setDroneStatusFilter('manutencao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  droneStatusFilter === 'manutencao'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Em Manutenção ({fleetKPIs.maintenanceDrones})
              </button>
              <button
                onClick={() => setDroneStatusFilter('inativos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  droneStatusFilter === 'inativos'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Inativos
              </button>
            </div>
          </div>

          {/* Cards dos Drones */}
          {filteredDrones.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Plane className="h-7 w-7" />
              </div>
              <h3 className="font-black text-base text-slate-800">Nenhum drone encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {droneSearch || droneStatusFilter !== 'todos'
                  ? 'Não há drones correspondentes aos filtros aplicados. Tente limpar a busca.'
                  : 'Comece adicionando a primeira aeronave da frota operacional da empresa.'}
              </p>
              {droneSearch || droneStatusFilter !== 'todos' ? (
                <button
                  onClick={() => {
                    setDroneSearch('');
                    setDroneStatusFilter('todos');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingDrone(null);
                    setIsDroneModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 inline mr-1" /> Cadastrar Drone
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrones.map((drone) => {
                const isOp = drone.status === 'em_operacao';
                const isMaint = drone.status === 'em_manutencao';
                const isInactive = drone.status === 'parado' || (drone.status as string) === 'inativo';

                return (
                  <div
                    key={drone.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/60 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header: Foto + Dados Principais */}
                      <div className="flex items-start gap-3.5">
                        <div className="h-16 w-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {drone.photoUrl ? (
                            <img
                              src={drone.photoUrl}
                              alt={drone.name || drone.model}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Plane className="h-8 w-8 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {drone.manufacturer}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                                isOp
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : isMaint
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isInactive
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {drone.status === 'disponivel' ? 'Ativo' : drone.status.replace('_', ' ')}
                            </span>
                          </div>

                          <h3 className="font-black text-sm text-[#111827] truncate mt-0.5 group-hover:text-[#05521F] transition-colors">
                            {drone.name || drone.model}
                          </h3>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <span className="font-mono font-bold text-[#05521F] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                              {drone.assetTag}
                            </span>
                            <span className="text-slate-500 truncate">{drone.model}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informações Resumidas do Card */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                            Horas de Voo
                          </span>
                          <span className="font-black text-sm text-slate-900 mt-0.5 block">
                            {drone.flightHours || 0}h
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                          <span className="text-emerald-700 font-semibold block text-[10px] uppercase">
                            Área Aplicada
                          </span>
                          <span className="font-black text-sm text-[#05521F] mt-0.5 block">
                            {(drone.accumulatedHectares || 0).toLocaleString('pt-BR')} ha
                          </span>
                        </div>
                      </div>

                      {/* Informação secundária */}
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                        <span>Tanque: <strong className="text-slate-800">{drone.tankCapacityLiters || 40}L</strong></span>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                          SN: {drone.serialNumber}
                        </span>
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setViewingDrone(drone)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-[#05521F] hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver detalhes
                      </button>

                      <button
                        onClick={() => {
                          setEditingDrone(drone);
                          setIsDroneModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Editar drone"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingDrone(drone)}
                        className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                        title="Excluir drone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: BATERIAS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'baterias' && (
        <div className="space-y-4">
          {/* Alerta de Manutenção de Baterias */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              <strong>Monitoramento de Vida Útil:</strong> Baterias com mais de 80% do limite de ciclos recomendado ou saúde abaixo de 75% devem passar por teste de bancada para assegurar máxima segurança nas operações agrícolas.
            </span>
          </div>

          {/* Barra de Busca & Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar bateria por identificação, modelo, marca ou drone vinculado..."
                value={batterySearch}
                onChange={(e) => setBatterySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#05521F] bg-slate-50/50"
              />
              {batterySearch && (
                <button
                  onClick={() => setBatterySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtros por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setBatteryStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  batteryStatusFilter === 'todos'
                    ? 'bg-[#05521F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({batteries.length})
              </button>
              <button
                onClick={() => setBatteryStatusFilter('disponiveis')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  batteryStatusFilter === 'disponiveis'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Disponíveis ({fleetKPIs.availableBatteries})
              </button>
              <button
                onClick={() => setBatteryStatusFilter('em_uso')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  batteryStatusFilter === 'em_uso'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Em Uso
              </button>
              <button
                onClick={() => setBatteryStatusFilter('carregando')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  batteryStatusFilter === 'carregando'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Carregando
              </button>
              <button
                onClick={() => setBatteryStatusFilter('manutencao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  batteryStatusFilter === 'manutencao'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Manutenção ({fleetKPIs.maintenanceBatteries})
              </button>
            </div>
          </div>

          {/* Cards das Baterias */}
          {filteredBatteries.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <BatteryCharging className="h-7 w-7" />
              </div>
              <h3 className="font-black text-base text-slate-800">Nenhuma bateria encontrada</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {batterySearch || batteryStatusFilter !== 'todos'
                  ? 'Não há baterias correspondentes aos filtros selecionados.'
                  : 'Cadastre as baterias dos drones para gerenciar ciclos de carga e saúde celular.'}
              </p>
              {batterySearch || batteryStatusFilter !== 'todos' ? (
                <button
                  onClick={() => {
                    setBatterySearch('');
                    setBatteryStatusFilter('todos');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingBattery(null);
                    setIsBatteryModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 inline mr-1" /> Cadastrar Bateria
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatteries.map((bat) => {
                const linkedDrone = drones.find((d) => d.id === bat.droneId);
                const max = bat.maxRecommendedCycles || 500;
                const cyclePercent = Math.min(((bat.cycles || 0) / max) * 100, 100);
                const st = (bat.status as string) || (bat.condition as string);

                return (
                  <div
                    key={bat.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/60 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3.5">
                      {/* Header do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {bat.manufacturer} • {bat.model}
                          </span>
                          <h3 className="font-black text-base text-[#111827] group-hover:text-[#05521F] transition-colors">
                            {bat.identifier}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                            st === 'em_uso'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : st === 'em_carregamento'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : st === 'em_manutencao'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : st === 'inativa' || st === 'limite_atingido'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {st === 'disponivel' || st === 'excelente' || st === 'boa' ? 'Disponível' : st.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Drone Vinculado */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium flex items-center gap-1.5">
                          <Plane className="h-3.5 w-3.5 text-slate-400" />
                          Drone:
                        </span>
                        {linkedDrone ? (
                          <span className="font-bold text-[#05521F] truncate max-w-[160px]">
                            {linkedDrone.name || linkedDrone.model}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Avulsa / Reserva</span>
                        )}
                      </div>

                      {/* Ciclos de Carga & Barra de Saúde */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-semibold">Ciclos de Carga</span>
                          <span className="text-slate-900 font-bold">
                            {bat.cycles || 0} / {max}
                          </span>
                        </div>

                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              cyclePercent > 80
                                ? 'bg-amber-500'
                                : cyclePercent > 60
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${cyclePercent}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Saúde: <strong className="text-slate-800">{bat.healthPercent || 100}%</strong></span>
                          <span>Capacidade: <strong className="text-slate-800">{bat.capacity || '30.000 mAh'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setViewingBattery(bat)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-[#05521F] hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver detalhes
                      </button>

                      <button
                        onClick={() => {
                          setEditingBattery(bat);
                          setIsBatteryModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Editar bateria"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingBattery(bat)}
                        className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                        title="Excluir bateria"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: HISTÓRICO DE MANUTENÇÕES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'manutencoes' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Registros de Revisão & Oficina
                </h3>
                <p className="text-[11px] text-slate-500">
                  Histórico de manutenções preventivas, corretivas e trocas de componentes
                </p>
              </div>
              <button
                onClick={() => setIsAddMaintenanceOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Novo Registro
              </button>
            </div>

            {droneMaintenances.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Wrench className="h-8 w-8 text-slate-400 mx-auto" />
                <p>Nenhuma manutenção registrada ainda.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Equipamento</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição do Serviço</th>
                    <th className="py-3 px-4">Oficina / Técnico</th>
                    <th className="py-3 px-4 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {droneMaintenances.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {m.date ? new Date(m.date).toLocaleDateString('pt-BR') : m.date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{m.droneModel}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 uppercase border border-slate-200">
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">{m.description}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.provider}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ---------------------------------------------------------------------- */}

      {/* Modal: Cadastrar / Editar Drone */}
      <NewDroneModal
        isOpen={isDroneModalOpen}
        onClose={() => {
          setIsDroneModalOpen(false);
          setEditingDrone(null);
        }}
        droneToEdit={editingDrone}
        onSuccess={(savedDrone) => {
          showFeedback(
            editingDrone
              ? `Drone ${savedDrone.name || savedDrone.model} atualizado com sucesso!`
              : `Drone ${savedDrone.name || savedDrone.model} cadastrado com sucesso!`
          );
        }}
      />

      {/* Modal: Detalhes do Drone */}
      <DroneDetailsModal
        isOpen={!!viewingDrone}
        onClose={() => setViewingDrone(null)}
        drone={viewingDrone}
        onEdit={(d) => {
          setEditingDrone(d);
          setIsDroneModalOpen(true);
        }}
        onDelete={(d) => setDeletingDrone(d)}
        onAddMaintenance={(d) => {
          setMaintDroneId(d.id);
          setIsAddMaintenanceOpen(true);
        }}
        onSelectBattery={(b) => setViewingBattery(b)}
      />

      {/* Modal: Cadastrar / Editar Bateria */}
      <NewBatteryModal
        isOpen={isBatteryModalOpen}
        onClose={() => {
          setIsBatteryModalOpen(false);
          setEditingBattery(null);
          setInitialDroneForBattery(undefined);
        }}
        batteryToEdit={editingBattery}
        initialDroneId={initialDroneForBattery}
        onSuccess={(savedBat) => {
          showFeedback(
            editingBattery
              ? `Bateria ${savedBat.identifier} atualizada com sucesso!`
              : `Bateria ${savedBat.identifier} cadastrada com sucesso!`
          );
        }}
      />

      {/* Modal: Detalhes da Bateria */}
      <BatteryDetailsModal
        isOpen={!!viewingBattery}
        onClose={() => setViewingBattery(null)}
        battery={viewingBattery}
        onEdit={(b) => {
          setEditingBattery(b);
          setIsBatteryModalOpen(true);
        }}
        onDelete={(b) => setDeletingBattery(b)}
        onSelectDrone={(d) => setViewingDrone(d)}
      />

      {/* Modal: Confirmar Exclusão de Drone */}
      <ConfirmDeleteModal
        isOpen={!!deletingDrone}
        onClose={() => setDeletingDrone(null)}
        onConfirm={handleConfirmDeleteDrone}
        title="Excluir Drone"
        itemName={deletingDrone ? `${deletingDrone.name || deletingDrone.model} (${deletingDrone.assetTag})` : ''}
        warningMessage={
          deletingDrone && batteries.some((b) => b.droneId === deletingDrone.id)
            ? 'Atenção: Existem baterias vinculadas a este drone. Ao excluir o drone, as baterias serão mantidas no sistema e realocadas como baterias avulsas/reserva.'
            : undefined
        }
      />

      {/* Modal: Confirmar Exclusão de Bateria */}
      <ConfirmDeleteModal
        isOpen={!!deletingBattery}
        onClose={() => setDeletingBattery(null)}
        onConfirm={handleConfirmDeleteBattery}
        title="Excluir Bateria"
        itemName={deletingBattery ? deletingBattery.identifier : ''}
        warningMessage="Esta ação removerá o registro desta bateria da frota."
      />

      {/* Modal: Registrar Manutenção */}
      {isAddMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#05521F] font-black text-sm">
                <Wrench className="h-5 w-5" /> Registrar Manutenção de Drone
              </div>
              <button
                onClick={() => setIsAddMaintenanceOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Aeronave / Drone</label>
                <select
                  value={maintDroneId}
                  onChange={(e) => setMaintDroneId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-bold focus:border-[#05521F] focus:outline-hidden"
                >
                  {drones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.model} ({d.assetTag}) - {d.flightHours}h
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Serviço</label>
                  <select
                    value={maintType}
                    onChange={(e) =>
                      setMaintType(e.target.value as 'preventiva' | 'corretiva' | 'inspecao' | 'troca_peca')
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold focus:border-[#05521F] focus:outline-hidden"
                  >
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva</option>
                    <option value="inspecao">Inspeção de Rotina</option>
                    <option value="troca_peca">Troca de Peça/Bicos</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    value={maintCost}
                    onChange={(e) => setMaintCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Oficina / Provedor do Serviço</label>
                <input
                  type="text"
                  value={maintProvider}
                  onChange={(e) => setMaintProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-[#05521F] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descrição dos Serviços Realizados</label>
                <textarea
                  rows={3}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Ex: Troca de hélices, calibragem dos bicos e teste em bancada..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-[#05521F] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMaintenanceOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2 text-xs font-bold shadow-md cursor-pointer border border-[#05521F]/30"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
