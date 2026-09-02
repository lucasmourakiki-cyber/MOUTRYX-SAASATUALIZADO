import React from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, Drone } from '../../types';
import {
  X,
  BatteryCharging,
  Zap,
  Plane,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface BatteryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  battery: Battery | null;
  onEdit: (battery: Battery) => void;
  onDelete: (battery: Battery) => void;
  onSelectDrone: (drone: Drone) => void;
}

export const BatteryDetailsModal: React.FC<BatteryDetailsModalProps> = ({
  isOpen,
  onClose,
  battery,
  onEdit,
  onDelete,
  onSelectDrone,
}) => {
  const { drones, updateBatteryCycles } = useApp();

  if (!isOpen || !battery) return null;

  const linkedDrone = drones.find((d) => d.id === battery.droneId);

  const getStatusBadge = () => {
    const s = (battery.status as string) || (battery.condition as string);
    if (s === 'em_uso') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Em Uso
        </span>
      );
    }
    if (s === 'em_carregamento') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" />
          Em Carregamento
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
    if (s === 'inativa' || s === 'limite_atingido') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-red-100 text-red-800 border border-red-200">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Inativa / Limite
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Disponível
      </span>
    );
  };

  const cyclePercent = Math.min(
    ((battery.cycles || 0) / (battery.maxRecommendedCycles || 500)) * 100,
    100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="relative bg-linear-to-r from-slate-900 via-[#111827] to-slate-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <BatteryCharging className="h-8 w-8 text-[#667085]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-[#667085] bg-white/10 px-2 py-0.5 rounded-md">
                    {battery.model}
                  </span>
                  {getStatusBadge()}
                </div>
                <h2 className="text-xl font-black text-white">{battery.identifier}</h2>
                <p className="text-xs text-slate-300">
                  {battery.manufacturer} • SN: <span className="font-mono text-[#667085]">{battery.serialNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-center">
              <button
                onClick={() => {
                  onClose();
                  onEdit(battery);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete(battery);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold transition-all border border-red-500/30 cursor-pointer"
                title="Excluir bateria"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Health & Cycles Bar */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Ciclos de Carga</span>
                <h3 className="text-2xl font-black text-slate-900">
                  {battery.cycles || 0}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    / {battery.maxRecommendedCycles || 500} máx.
                  </span>
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-bold text-slate-500 uppercase">Saúde Estimada</span>
                <h3
                  className={`text-2xl font-black ${
                    (battery.healthPercent || 100) > 80
                      ? 'text-emerald-700'
                      : (battery.healthPercent || 100) > 50
                      ? 'text-blue-700'
                      : 'text-amber-700'
                  }`}
                >
                  {battery.healthPercent || 100}%
                </h3>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="space-y-1">
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
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
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>0 ciclos</span>
                <span>{Math.round(cyclePercent)}% da vida útil</span>
                <span>{battery.maxRecommendedCycles || 500} ciclos</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Ação rápida operacional:</span>
              <button
                onClick={() => updateBatteryCycles(battery.id, (battery.cycles || 0) + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> +1 Ciclo de Voo
              </button>
            </div>
          </div>

          {/* Drone Vinculado */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Plane className="h-4 w-4 text-[#05521F]" /> Drone Vinculado
            </h4>

            {linkedDrone ? (
              <div
                onClick={() => {
                  onClose();
                  onSelectDrone(linkedDrone);
                }}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#05521F] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {linkedDrone.photoUrl ? (
                      <img
                        src={linkedDrone.photoUrl}
                        alt={linkedDrone.name || linkedDrone.model}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Plane className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-black text-xs text-slate-900 group-hover:text-[#05521F] transition-colors">
                      {linkedDrone.name || linkedDrone.model}
                    </h5>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {linkedDrone.assetTag} • {linkedDrone.model}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#05521F] flex items-center gap-1 group-hover:underline">
                  Ver Drone <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Esta bateria não está vinculada a nenhuma aeronave específica (bateria avulsa/reserva).</span>
              </div>
            )}
          </div>

          {/* Especificações Técnicas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Layers className="h-4 w-4 text-[#05521F]" /> Especificações Técnicas
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Capacidade Nominal</span>
                <span className="font-bold text-slate-900">{battery.capacity || '30.000 mAh'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data de Aquisição</span>
                <span className="font-semibold text-slate-800">
                  {battery.purchaseDate ? new Date(battery.purchaseDate).toLocaleDateString('pt-BR') : 'Não informada'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Horas Estimadas em Voo</span>
                <span className="font-bold text-slate-900">{battery.hours || Math.round((battery.cycles || 0) * 0.4)}h</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Número de Série</span>
                <span className="font-mono font-bold text-slate-900">{battery.serialNumber}</span>
              </div>
            </div>

            {battery.notes && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Observações:</span>
                <p className="text-slate-700">{battery.notes}</p>
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
