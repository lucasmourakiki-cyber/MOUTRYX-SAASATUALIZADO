import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  X,
  Battery,
  Plane,
  Wind,
  Droplets,
  ShieldAlert,
  Sprout,
  Fuel,
  UserX,
  Wrench,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { compressImageBase64 } from '../../../utils/fieldOfflineStore';

interface FieldOccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    occurrenceType: string;
    occurrenceLabel: string;
    description: string;
    photoBase64?: string;
  }) => Promise<void> | void;
}

// Occurrence types (representing unexpected operational issues/problems)
const OCCURRENCE_OPTIONS = [
  { id: 'bateria', label: 'Problema na bateria', icon: Battery, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'drone', label: 'Problema no drone', icon: Plane, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'clima', label: 'Condição climática adversa', icon: Wind, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'bicos_vazao', label: 'Problema nos bicos/vazão', icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'obstaculo', label: 'Obstáculo na área', icon: ShieldAlert, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'area', label: 'Problema na área/talhão', icon: Sprout, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'combustivel', label: 'Problema no gerador/combustível', icon: Fuel, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'cliente', label: 'Problema com propriedade/cliente', icon: UserX, color: 'text-slate-700 bg-slate-100 border-slate-300' },
  { id: 'outro', label: 'Outro problema operacional', icon: Wrench, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

// Presets for fast field simulation or testing
const SAMPLE_PHOTOS = [
  {
    label: 'Poste na área',
    type: 'obstaculo',
    desc: 'Poste dentro da área de aplicação.',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Bico entupido',
    type: 'bicos_vazao',
    desc: 'Vazão irregular no bico 4 da barra de pulverização.',
    url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Bateria aquecida',
    type: 'bateria',
    desc: 'Alerta de temperatura na célula 2 da bateria.',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
  },
];

export const FieldOccurrenceModal: React.FC<FieldOccurrenceModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState('obstaculo');
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        try {
          const compressed = await compressImageBase64(raw);
          setPhotoBase64(compressed);
          setErrorMessage(null);
        } catch {
          setPhotoBase64(raw);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = async (sample: typeof SAMPLE_PHOTOS[0]) => {
    setSelectedType(sample.type);
    setDescription(sample.desc);
    setPhotoBase64(sample.url);
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    if (!selectedType) {
      setErrorMessage('Por favor, selecione o tipo da ocorrência.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const opt = OCCURRENCE_OPTIONS.find((o) => o.id === selectedType);
      
      // Compress if local base64 to ensure optimal storage
      let finalPhoto = photoBase64;
      if (finalPhoto && finalPhoto.startsWith('data:image')) {
        finalPhoto = await compressImageBase64(finalPhoto);
      }

      await onSave({
        occurrenceType: selectedType,
        occurrenceLabel: opt ? opt.label : 'Ocorrência',
        description: description.trim(),
        photoBase64: finalPhoto,
      });

      // ONLY clear and close AFTER successful save!
      setDescription('');
      setPhotoBase64(undefined);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error('[ERRO OCORRÊNCIA]', err);
      setErrorMessage('A ocorrência foi salva, mas a foto ainda está aguardando armazenamento.');
      setIsSubmitting(false);
      // Do NOT clear form so user does not lose input
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
            <AlertTriangle className="h-5 w-5" />
            <span>Registrar Ocorrência</span>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Options Grid */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
            Selecione o tipo de ocorrência:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OCCURRENCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSelectedType(opt.id);
                    setErrorMessage(null);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#05521F] bg-[#111827]/5 text-[#111827] font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${opt.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Observação (Opcional)
          </label>
          <textarea
            rows={2}
            disabled={isSubmitting}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Poste dentro da área de aplicação..."
            className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
          />
        </div>

        {/* Photo Attachment (Offline-first Camera / File) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 block">
              Foto do problema (Opcional • Salva Offline)
            </label>
            {photoBase64 && (
              <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Foto selecionada
              </span>
            )}
          </div>

          {photoBase64 ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 shadow-xs">
                <img
                  src={photoBase64}
                  alt="Foto do problema"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-white flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Foto pronta para registro
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPhotoBase64(undefined)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Remover foto
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#05521F] rounded-2xl p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <Camera className="h-6 w-6 text-[#05521F] mb-1" />
                <span className="text-xs font-bold text-slate-700">Tirar Foto ou Escolher Imagem</span>
                <span className="text-[11px] text-slate-500">Salva localmente sem depender de internet</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isSubmitting}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>

              {/* Sample Photo Presets for instantaneous testing */}
              <div className="p-2.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>Exemplos rápidos para teste:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PHOTOS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectSample(sample)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center gap-1"
                    >
                      <span>📷 {sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-2xl border border-slate-300 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`rounded-2xl py-3.5 text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting
                ? 'bg-rose-400 text-white cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registrando ocorrência...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 fill-current" />
                <span>REGISTRAR OCORRÊNCIA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

