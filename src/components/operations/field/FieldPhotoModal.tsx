import React, { useState } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { compressImageBase64 } from '../../../utils/fieldOfflineStore';

interface FieldPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { photoBase64: string; photoCaption?: string }) => void | Promise<void>;
}

export const FieldPhotoModal: React.FC<FieldPhotoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        try {
          const compressed = await compressImageBase64(raw);
          setPhotoBase64(compressed);
        } catch {
          setPhotoBase64(raw);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = async () => {
    if (!photoBase64) return;
    setIsProcessing(true);
    try {
      let finalPhoto = photoBase64;
      if (finalPhoto.startsWith('data:image')) {
        finalPhoto = await compressImageBase64(finalPhoto);
      }
      await onSave({
        photoBase64: finalPhoto,
        photoCaption: caption.trim() || 'Foto registrada no campo',
      });
      setPhotoBase64(null);
      setCaption('');
      onClose();
    } catch (err) {
      console.error('[ERRO AO SALVAR FOTO]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#111827] font-extrabold text-base">
            <Camera className="h-5 w-5 text-[#05521F]" />
            <span>Foto da Operação</span>
          </div>
          <button
            disabled={isProcessing}
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo Container */}
        {photoBase64 ? (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src={photoBase64}
                alt="Foto do campo"
                className="w-full h-56 object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoBase64(null)}
                className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-full shadow-md hover:bg-slate-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Descrição ou Legenda (Opcional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ex: Condição da calda, talhão antes da aplicação..."
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#05521F]/60 rounded-3xl p-8 cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
              <div className="p-4 rounded-full bg-[#111827] text-[#667085] mb-3 shadow-md">
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8" />
                )}
              </div>
              <span className="text-sm font-extrabold text-[#111827]">
                {isProcessing ? 'Processando imagem...' : 'Tirar Foto com a Câmera'}
              </span>
              <span className="text-xs text-slate-500 mt-1 text-center">
                Toque para abrir a câmera ou selecionar da galeria
              </span>
              <span className="mt-3 px-3 py-1 bg-[#05521F]/10 text-[#05521F] rounded-full text-[11px] font-bold">
                ✓ 100% Offline
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isProcessing}
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-2xl border border-slate-300 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!photoBase64 || isProcessing}
            onClick={handleConfirm}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold shadow-md transition-all cursor-pointer ${
              photoBase64 && !isProcessing
                ? 'bg-[#111827] hover:bg-[#111827] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Salvar Foto
          </button>
        </div>
      </div>
    </div>
  );
};
