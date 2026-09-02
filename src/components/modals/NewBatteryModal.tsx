import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, BatteryStatus } from '../../types';
import {
  X,
  BatteryCharging,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plane,
  Calendar,
  Hash,
} from 'lucide-react';

interface NewBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batteryToEdit?: Battery | null;
  initialDroneId?: string;
  onSuccess?: (battery: Battery) => void;
}

const BATTERY_PRESETS = [
  { model: 'DB1560 (T50)', manufacturer: 'DJI Agriculture', capacity: '30.000 mAh', maxCycles: 500 },
  { model: 'DB2100 (T100)', manufacturer: 'DJI Agriculture', capacity: '40.000 mAh', maxCycles: 600 },
  { model: 'B13960S (T40)', manufacturer: 'DJI Agriculture', capacity: '30.000 mAh', maxCycles: 500 },
  { model: 'B13860S (T30)', manufacturer: 'DJI Agriculture', capacity: '29.000 mAh', maxCycles: 500 },
  { model: 'Smart Battery B13960S', manufacturer: 'XAG', capacity: '20.000 mAh', maxCycles: 500 },
  { model: 'Tattu Plus 1.0 22000mAh', manufacturer: 'Tattu', capacity: '22.000 mAh', maxCycles: 400 },
];

export const NewBatteryModal: React.FC<NewBatteryModalProps> = ({
  isOpen,
  onClose,
  batteryToEdit,
  initialDroneId,
  onSuccess,
}) => {
  const { addBattery, updateBattery, drones, batteries } = useApp();

  const [formData, setFormData] = useState({
    identifier: '',
    manufacturer: 'DJI Agriculture',
    model: 'DB1560 (T50)',
    serialNumber: '',
    droneId: '',
    cycles: 0,
    maxRecommendedCycles: 500,
    capacity: '30.000 mAh',
    status: 'disponivel' as BatteryStatus,
    condition: 'excelente' as BatteryStatus,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (batteryToEdit) {
      setFormData({
        identifier: batteryToEdit.identifier || '',
        manufacturer: batteryToEdit.manufacturer || 'DJI Agriculture',
        model: batteryToEdit.model || '',
        serialNumber: batteryToEdit.serialNumber || '',
        droneId: batteryToEdit.droneId || '',
        cycles: batteryToEdit.cycles || 0,
        maxRecommendedCycles: batteryToEdit.maxRecommendedCycles || 500,
        capacity: batteryToEdit.capacity || '30.000 mAh',
        status: (batteryToEdit.status as BatteryStatus) || 'disponivel',
        condition: batteryToEdit.condition || 'excelente',
        purchaseDate: batteryToEdit.purchaseDate || new Date().toISOString().split('T')[0],
        notes: batteryToEdit.notes || '',
      });
    } else {
      const nextNum = (batteries.length + 1).toString().padStart(2, '0');
      setFormData({
        identifier: `Bateria #${nextNum}`,
        manufacturer: 'DJI Agriculture',
        model: 'DB1560 (T50)',
        serialNumber: `BAT-SN-${Date.now().toString().slice(-4)}`,
        droneId: initialDroneId || (drones[0]?.id || ''),
        cycles: 0,
        maxRecommendedCycles: 500,
        capacity: '30.000 mAh',
        status: 'disponivel',
        condition: 'excelente',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setErrors({});
  }, [batteryToEdit, isOpen, initialDroneId, batteries.length, drones]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof BATTERY_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      model: preset.model,
      manufacturer: preset.manufacturer,
      capacity: preset.capacity,
      maxRecommendedCycles: preset.maxCycles,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.identifier.trim()) newErrors.identifier = 'Identificação da bateria é obrigatória.';
    if (!formData.model.trim()) newErrors.model = 'Modelo da bateria é obrigatório.';
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Número de série é obrigatório.';
    if (formData.cycles < 0) newErrors.cycles = 'Ciclos não podem ser negativos.';
    if (formData.maxRecommendedCycles <= 0) newErrors.maxRecommendedCycles = 'Limite de ciclos deve ser maior que zero.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const max = Number(formData.maxRecommendedCycles) || 500;
      const cyc = Number(formData.cycles) || 0;
      const health = Math.max(10, Math.round(((max - cyc) / max) * 100));

      let computedCondition: BatteryStatus = 'excelente';
      if (formData.status === 'em_manutencao') {
        computedCondition = 'em_manutencao';
      } else if (health <= 25 || cyc >= max) {
        computedCondition = 'limite_atingido';
      } else if (health <= 60) {
        computedCondition = 'atencao';
      } else if (health <= 85) {
        computedCondition = 'boa';
      } else {
        computedCondition = 'excelente';
      }

      if (batteryToEdit) {
        const updated: Battery = {
          ...batteryToEdit,
          identifier: formData.identifier.trim(),
          manufacturer: formData.manufacturer.trim(),
          model: formData.model.trim(),
          serialNumber: formData.serialNumber.trim(),
          droneId: formData.droneId || undefined,
          cycles: cyc,
          maxRecommendedCycles: max,
          capacity: formData.capacity.trim(),
          healthPercent: health,
          condition: computedCondition,
          status: formData.status as any,
          purchaseDate: formData.purchaseDate,
          notes: formData.notes.trim(),
        };
        await updateBattery(updated);
        onSuccess?.(updated);
      } else {
        const created = await addBattery({
          identifier: formData.identifier.trim(),
          manufacturer: formData.manufacturer.trim(),
          model: formData.model.trim(),
          serialNumber: formData.serialNumber.trim(),
          droneId: formData.droneId || undefined,
          cycles: cyc,
          maxRecommendedCycles: max,
          capacity: formData.capacity.trim(),
          hours: Math.round(cyc * 0.4),
          healthPercent: health,
          condition: computedCondition,
          status: formData.status as any,
          purchaseDate: formData.purchaseDate,
          lastTestDate: new Date().toISOString().split('T')[0],
          notes: formData.notes.trim(),
        });
        onSuccess?.(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar bateria:', err);
      setErrors((prev) => ({ ...prev, submit: err?.message || 'Falha ao persistir bateria no servidor.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-[#111827] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <BatteryCharging className="h-5 w-5 text-[#667085]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                {batteryToEdit ? 'Editar Bateria' : 'Cadastrar Nova Bateria'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {batteryToEdit
                  ? `Atualizar especificações da ${batteryToEdit.identifier}`
                  : 'Gerenciamento de ciclos, saúde de células e alocação de drones'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errors.submit && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errors.submit}</span>
            </div>
          )}
          {/* Preset selector for quick fill */}
          {!batteryToEdit && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Modelos Frequentes de Bateria
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BATTERY_PRESETS.map((p) => (
                  <button
                    key={p.model}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      formData.model === p.model
                        ? 'bg-[#05521F] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {p.model}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seção 1: Identificação & Drone Vinculado */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Zap className="h-3.5 w-3.5 text-[#05521F]" /> Dados da Bateria & Alocação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Identificação da Bateria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bateria DB1560 #01, BAT-01"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F] ${
                    errors.identifier ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.identifier && <p className="text-[10px] text-red-500 mt-1">{errors.identifier}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Drone Vinculado
                </label>
                <select
                  value={formData.droneId}
                  onChange={(e) => setFormData({ ...formData, droneId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                >
                  <option value="">-- Nenhuma / Bateria Reserva --</option>
                  {drones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.model} ({d.assetTag}) - {d.manufacturer}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marca / Fabricante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: DJI Agriculture, XAG"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo da Bateria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: DB1560 (T50)"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F] ${
                    errors.model ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.model && <p className="text-[10px] text-red-500 mt-1">{errors.model}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Série <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: BAT-T50-9988"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F] ${
                    errors.serialNumber ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.serialNumber && <p className="text-[10px] text-red-500 mt-1">{errors.serialNumber}</p>}
              </div>
            </div>
          </div>

          {/* Seção 2: Ciclos, Capacidade & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <BatteryCharging className="h-3.5 w-3.5 text-[#05521F]" /> Ciclos, Capacidade & Estado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ciclos de Carga Atuais
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={formData.cycles}
                  onChange={(e) => setFormData({ ...formData, cycles: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Limite Recomendado (Ciclos)
                </label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  value={formData.maxRecommendedCycles}
                  onChange={(e) => setFormData({ ...formData, maxRecommendedCycles: parseInt(e.target.value, 10) || 500 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Capacidade</label>
                <input
                  type="text"
                  placeholder="Ex: 30.000 mAh ou 1.560 Wh"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status da Bateria <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as BatteryStatus })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                >
                  <option value="disponivel">🟢 Disponível</option>
                  <option value="em_uso">🔵 Em Uso</option>
                  <option value="em_carregamento">⚡ Em Carregamento</option>
                  <option value="em_manutencao">🟡 Em Manutenção</option>
                  <option value="inativa">⚪ Inativa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Aquisição</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observações da Bateria</label>
            <textarea
              rows={2}
              placeholder="Ex: Células equilibradas. Evitar carga ultra rápida sob sol forte."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-[#05521F]/30 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Salvando...' : batteryToEdit ? 'Salvar Alterações' : 'Concluir Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
