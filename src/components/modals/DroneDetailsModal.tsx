import React from 'react';
import { useApp } from '../../context/AppContext';
import { Drone, Battery, MaintenanceRecord } from '../../types';
import {
  X,
  Plane,
  BatteryCharging,
  Wrench,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Clock,
  MapPin,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface DroneDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drone: Drone | null;
  onEdit: (drone: Drone) => void;
  onDelete: (drone: Drone) => void;
  onAddMaintenance: (drone: Drone) => void;
  onSelectBattery: (battery: Battery) => void;
}

export const DroneDetailsModal: React.FC<DroneDetailsModalProps> = ({
  isOpen,
  onClose,
  drone,
  onEdit,
  onDelete,
  onAddMaintenance,
  onSelectBattery,
}) => {
  const { batteries, maintenanceRecords } = useApp();

  if (!isOpen || !drone) return null;

  // Baterias vinculadas a este drone
  const linkedBatteries = batteries.filter((b) => b.droneId === drone.id);

  // Manutenções deste drone
  const droneMaintenances = maintenanceRecords.filter(
    (m) => m.droneId === drone.id || m.droneModel === drone.model
  );

  const getStatusBadge = () => {
    const s = drone.status as string;
    if (s === 'em_operacao') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Em Operação (Voo)
        </span>
      );
    }
    if (s === 'em_manutencao') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Em Manutenção
        </span>
      );
    }
    if (s === 'parado' || s === 'inativo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Inativo / Parado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Ativo / Disponível
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header com Foto de Capa / Resumo */}
        <div className="relative bg-linear-to-r from-slate-900 via-[#111827] to-slate-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-24 w-28 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
              {drone.photoUrl ? (
                <img
                  src={drone.photoUrl}
                  alt={drone.name || drone.model}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Plane className="h-10 w-10 text-white/50" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#667085] bg-white/10 px-2 py-0.5 rounded-md">
                  {drone.assetTag}
                </span>
                {getStatusBadge()}
              </div>

              <h2 className="text-xl font-black text-white">
                {drone.name || drone.model}
              </h2>

              <p className="text-xs text-slate-300">
                {drone.manufacturer} • {drone.model} • SN: <span className="font-mono text-[#667085]">{drone.serialNumber}</span>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-center">
              <button
                onClick={() => {
                  onClose();
                  onEdit(drone);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete(drone);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold transition-all border border-red-500/30 cursor-pointer"
                title="Excluir drone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Grid de 4 KPIs rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Horas de Voo
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {drone.flightHours || 0}h
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Área Aplicada
              </span>
              <span className="text-lg font-black text-[#05521F] mt-0.5 block">
                {(drone.accumulatedHectares || 0).toLocaleString('pt-BR')} ha
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Capacidade Tanque
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {drone.tankCapacityLiters || 40} Litros
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Ano do Modelo
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {drone.year || 2026}
              </span>
            </div>
          </div>

          {/* 1. Informações Gerais & Especificações */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Layers className="h-4 w-4 text-[#05521F]" /> Informações Gerais do Equipamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Fabricante & Modelo</span>
                <span className="font-bold text-slate-900">{drone.manufacturer} • {drone.model}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Número de Série</span>
                <span className="font-mono font-bold text-slate-900">{drone.serialNumber}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data de Aquisição</span>
                <span className="font-semibold text-slate-800">
                  {drone.purchaseDate ? new Date(drone.purchaseDate).toLocaleDateString('pt-BR') : 'Não informada'}
                </span>
              </div>

              {drone.anacRegistration && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Registro ANAC / SISANT</span>
                  <span className="font-mono font-bold text-slate-900">{drone.anacRegistration}</span>
                </div>
              )}

              {drone.nextMaintenanceHours && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Próxima Revisão Prevista</span>
                  <span className="font-bold text-slate-900">{drone.nextMaintenanceHours}h de voo</span>
                </div>
              )}
            </div>

            {drone.notes && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Observações:</span>
                <p className="text-slate-700">{drone.notes}</p>
              </div>
            )}
          </div>

          {/* 2. Baterias Vinculadas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                <BatteryCharging className="h-4 w-4 text-[#05521F]" /> Baterias Vinculadas ({linkedBatteries.length})
              </h3>
            </div>

            {linkedBatteries.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Nenhuma bateria vinculada diretamente a esta aeronave no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedBatteries.map((bat) => (
                  <div
                    key={bat.id}
                    onClick={() => {
                      onClose();
                      onSelectBattery(bat);
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#05521F] hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-xs text-slate-900 group-hover:text-[#05521F] transition-colors flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          {bat.identifier}
                        </h4>
                        <span className="text-[11px] text-slate-500">{bat.model}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {bat.cycles} ciclos
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span>Saúde: <strong className="text-slate-900">{bat.healthPercent}%</strong></span>
                      <span className="text-[#05521F] font-bold flex items-center gap-0.5 group-hover:underline">
                        Ver Bateria <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Histórico de Manutenções */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#05521F]" /> Histórico de Manutenções ({droneMaintenances.length})
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onAddMaintenance(drone);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#05521F] hover:text-[#2E7D32] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Manutenção
              </button>
            </div>

            {droneMaintenances.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Nenhum registro de manutenção para este drone até o momento.
              </div>
            ) : (
              <div className="space-y-2">
                {droneMaintenances.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{m.description}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {m.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {m.date} • Oficina: {m.provider}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 text-xs">
                      R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
