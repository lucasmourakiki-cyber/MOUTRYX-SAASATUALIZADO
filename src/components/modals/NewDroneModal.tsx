import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Drone, DroneStatus } from '../../types';
import {
  X,
  Plane,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Trash2,
} from 'lucide-react';

interface NewDroneModalProps {
  isOpen: boolean;
  onClose: () => void;
  droneToEdit?: Drone | null;
  onSuccess?: (drone: Drone) => void;
}

const DRONE_PRESET_MODELS = [
  { model: 'DJI Agras T50', manufacturer: 'DJI Agriculture', tank: 40, photo: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80' },
  { model: 'DJI Agras T40', manufacturer: 'DJI Agriculture', tank: 40, photo: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80' },
  { model: 'DJI Agras T100', manufacturer: 'DJI Agriculture', tank: 75, photo: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&auto=format&fit=crop&q=80' },
  { model: 'DJI Agras T30', manufacturer: 'DJI Agriculture', tank: 30, photo: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80' },
  { model: 'XAG P100 Pro', manufacturer: 'XAG', tank: 50, photo: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=800&auto=format&fit=crop&q=80' },
  { model: 'XAG V40', manufacturer: 'XAG', tank: 20, photo: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=800&auto=format&fit=crop&q=80' },
  { model: 'Jacto DJB-20S', manufacturer: 'Jacto', tank: 20, photo: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80' },
];

export const NewDroneModal: React.FC<NewDroneModalProps> = ({
  isOpen,
  onClose,
  droneToEdit,
  onSuccess,
}) => {
  const { addDrone, updateDrone, drones } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: 'DJI Agriculture',
    model: 'DJI Agras T50',
    serialNumber: '',
    assetTag: '',
    year: new Date().getFullYear(),
    tankCapacityLiters: 40,
    status: 'disponivel' as DroneStatus,
    flightHours: 0,
    accumulatedHectares: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    anacRegistration: '',
    notes: '',
    photoUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (droneToEdit) {
      setFormData({
        name: droneToEdit.name || droneToEdit.model || '',
        manufacturer: droneToEdit.manufacturer || 'DJI Agriculture',
        model: droneToEdit.model || '',
        serialNumber: droneToEdit.serialNumber || '',
        assetTag: droneToEdit.assetTag || '',
        year: droneToEdit.year || new Date().getFullYear(),
        tankCapacityLiters: droneToEdit.tankCapacityLiters || 40,
        status: droneToEdit.status || 'disponivel',
        flightHours: droneToEdit.flightHours || 0,
        accumulatedHectares: droneToEdit.accumulatedHectares || 0,
        purchaseDate: droneToEdit.purchaseDate || new Date().toISOString().split('T')[0],
        anacRegistration: droneToEdit.anacRegistration || '',
        notes: droneToEdit.notes || '',
        photoUrl: droneToEdit.photoUrl || '',
      });
    } else {
      // Gerar sugestão de tag
      const nextNum = (drones.length + 1).toString().padStart(2, '0');
      setFormData({
        name: `Drone #${nextNum}`,
        manufacturer: 'DJI Agriculture',
        model: 'DJI Agras T50',
        serialNumber: '',
        assetTag: `DRONE-${nextNum}`,
        year: new Date().getFullYear(),
        tankCapacityLiters: 40,
        status: 'disponivel',
        flightHours: 0,
        accumulatedHectares: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        anacRegistration: '',
        notes: '',
        photoUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
      });
    }
    setErrors({});
  }, [droneToEdit, isOpen, drones.length]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof DRONE_PRESET_MODELS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      model: preset.model,
      manufacturer: preset.manufacturer,
      tankCapacityLiters: preset.tank,
      photoUrl: prev.photoUrl || preset.photo,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photoUrl: 'A foto deve ter no máximo 5MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photoUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome ou identificação é obrigatório.';
    if (!formData.model.trim()) newErrors.model = 'Modelo do drone é obrigatório.';
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Número de série é obrigatório.';
    if (!formData.assetTag.trim()) newErrors.assetTag = 'Patrimônio/Tag é obrigatório.';
    if (formData.tankCapacityLiters <= 0) newErrors.tankCapacityLiters = 'Capacidade do tanque deve ser maior que zero.';
    if (formData.flightHours < 0) newErrors.flightHours = 'Horas de voo não podem ser negativas.';
    if (formData.accumulatedHectares < 0) newErrors.accumulatedHectares = 'Área aplicada não pode ser negativa.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (droneToEdit) {
        const updated: Drone = {
          ...droneToEdit,
          name: formData.name.trim(),
          manufacturer: formData.manufacturer.trim(),
          model: formData.model.trim(),
          serialNumber: formData.serialNumber.trim(),
          assetTag: formData.assetTag.trim(),
          year: Number(formData.year),
          tankCapacityLiters: Number(formData.tankCapacityLiters),
          status: formData.status,
          flightHours: Number(formData.flightHours),
          accumulatedHectares: Number(formData.accumulatedHectares),
          purchaseDate: formData.purchaseDate,
          anacRegistration: formData.anacRegistration.trim(),
          notes: formData.notes.trim(),
          photoUrl: formData.photoUrl,
        };
        await updateDrone(updated);
        onSuccess?.(updated);
      } else {
        const created = await addDrone({
          name: formData.name.trim(),
          manufacturer: formData.manufacturer.trim(),
          model: formData.model.trim(),
          serialNumber: formData.serialNumber.trim(),
          assetTag: formData.assetTag.trim(),
          year: Number(formData.year),
          tankCapacityLiters: Number(formData.tankCapacityLiters),
          status: formData.status,
          flightHours: Number(formData.flightHours),
          accumulatedHectares: Number(formData.accumulatedHectares),
          purchaseDate: formData.purchaseDate,
          anacRegistration: formData.anacRegistration.trim(),
          notes: formData.notes.trim(),
          photoUrl: formData.photoUrl,
        });
        onSuccess?.(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar drone:', err);
      setErrors((prev) => ({ ...prev, submit: err?.message || 'Falha ao salvar drone no servidor.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-[#111827] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Plane className="h-5 w-5 text-[#667085]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                {droneToEdit ? 'Editar Drone' : 'Cadastrar Novo Drone'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {droneToEdit
                  ? `Atualizar especificações de ${droneToEdit.name || droneToEdit.model}`
                  : 'Adicione uma nova aeronave à frota operacional da empresa'}
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
          {!droneToEdit && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Modelos Frequentes (Preenchimento Rápido)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DRONE_PRESET_MODELS.slice(0, 5).map((p) => (
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
                    {p.model} ({p.tank}L)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seção 1: Identificação & Modelo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Layers className="h-3.5 w-3.5 text-[#05521F]" /> Identificação da Aeronave
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome / Identificação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Drone Alpha 01, T50 Fazenda Sede"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F] ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patrimônio / Tag <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: DRONE-01, AGR-2026"
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-[#05521F] ${
                    errors.assetTag ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.assetTag && <p className="text-[10px] text-red-500 mt-1">{errors.assetTag}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fabricante <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                >
                  <option value="DJI Agriculture">DJI Agriculture</option>
                  <option value="XAG">XAG</option>
                  <option value="Jacto">Jacto</option>
                  <option value="EFT">EFT</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo do Drone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: DJI Agras T50"
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
                  placeholder="Ex: DJI-T50-BR-99882"
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

          {/* Seção 2: Especificações Técnicas & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Plane className="h-3.5 w-3.5 text-[#05521F]" /> Especificações & Status Operacional
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Inicial <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DroneStatus })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                >
                  <option value="disponivel">🟢 Ativo / Disponível</option>
                  <option value="em_operacao">🔵 Em Operação (Voo)</option>
                  <option value="em_manutencao">🟡 Em Manutenção</option>
                  <option value="parado">⚪ Inativo / Parado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanque (Litros) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={formData.tankCapacityLiters}
                  onChange={(e) => setFormData({ ...formData, tankCapacityLiters: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ano de Fabricação</label>
                <input
                  type="number"
                  min="2018"
                  max="2030"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || 2026 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Horas de Voo (h)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.flightHours}
                  onChange={(e) => setFormData({ ...formData, flightHours: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Área Aplicada (ha)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.accumulatedHectares}
                  onChange={(e) => setFormData({ ...formData, accumulatedHectares: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registro ANAC / SISANT (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: PP-AGR-01 ou PR-998271"
                value={formData.anacRegistration}
                onChange={(e) => setFormData({ ...formData, anacRegistration: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
              />
            </div>
          </div>

          {/* Seção 3: Foto do Drone */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Camera className="h-3.5 w-3.5 text-[#05521F]" /> Foto do Drone
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative h-28 w-36 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Plane className="h-10 w-10 text-slate-400" />
                )}
                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photoUrl: '' })}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-xs"
                    title="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-600" /> Enviar Foto do Dispositivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Ou cole a URL direta de uma imagem..."
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#05521F]"
                />
                <p className="text-[10px] text-slate-400">
                  Formatos aceitos: JPG, PNG ou WebP (máx. 5MB).
                </p>
              </div>
            </div>
          </div>

          {/* Seção 4: Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observações do Equipamento</label>
            <textarea
              rows={2}
              placeholder="Ex: Equipado com bicos centrífugos e radar omnidirecional. Histórico de revisão em dia."
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
              {isSubmitting ? 'Salvando...' : droneToEdit ? 'Salvar Alterações' : 'Concluir Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
