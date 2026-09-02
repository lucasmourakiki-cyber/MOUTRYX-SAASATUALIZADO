import React, { useState, useEffect } from 'react';
import { Camera, ChevronLeft, ChevronRight, X, Image as ImageIcon, CheckCircle2, Clock, User, ShieldCheck } from 'lucide-react';
import { OperationPhoto } from '../../../utils/fieldOfflineStore';

interface FieldPhotoGalleryProps {
  photos: OperationPhoto[];
  onAddPhoto?: () => void;
  isReadOnly?: boolean;
  osNumber?: string;
  clientName?: string;
}

export const FieldPhotoGallery: React.FC<FieldPhotoGalleryProps> = ({
  photos,
  onAddPhoto,
  isReadOnly = false,
  osNumber,
  clientName,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

  const activePhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#111827] text-[#667085]">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#111827] leading-tight">
              Fotos da Operação
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              {photos.length === 0
                ? 'Nenhuma foto registrada'
                : `${photos.length} ${photos.length === 1 ? 'foto registrada e salva offline' : 'fotos registradas e salvas offline'}`}
            </p>
          </div>
        </div>

        {!isReadOnly && onAddPhoto && (
          <button
            type="button"
            onClick={onAddPhoto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Adicionar Foto</span>
          </button>
        )}
      </div>

      {/* Grid or Empty state */}
      {photos.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 space-y-2">
          <ImageIcon className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Nenhuma foto vinculada a esta operação.
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Fotos capturadas durante o voo ficam salvas permanentemente neste aparelho e vinculadas a esta OS.
          </p>
          {!isReadOnly && onAddPhoto && (
            <button
              type="button"
              onClick={onAddPhoto}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111827] text-white text-xs font-extrabold shadow-sm hover:bg-[#111827] cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Tirar Primeira Foto</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              onClick={() => setSelectedIndex(index)}
              className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer aspect-4/3 shadow-2xs hover:shadow-md transition-all hover:scale-[1.02]"
            >
              <img
                src={photo.photoBase64}
                alt={photo.caption || `Foto ${index + 1}`}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                loading="lazy"
              />

              {/* Timestamp & Type Badge Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 text-white">
                <span className="text-[10px] font-black text-emerald-300 block truncate">
                  {photo.displayTime} • {photo.displayDate || 'Hoje'}
                </span>
                {photo.caption && (
                  <p className="text-[10px] text-white/90 truncate leading-tight mt-0.5 font-medium">
                    {photo.caption}
                  </p>
                )}
              </div>

              {/* Source tag if occurrence */}
              {photo.source === 'occurrence' && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-rose-600/90 text-white text-[9px] font-black uppercase shadow-xs">
                  Ocorrência
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activePhoto && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[92vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60 text-white border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#05521F] text-white text-[10px] font-black">
                  Foto {selectedIndex + 1} de {photos.length}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {osNumber || activePhoto.osNumber || 'Ordem de Serviço'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Image Area with Navigation Arrows */}
            <div className="relative flex-1 flex items-center justify-center bg-black/90 min-h-[280px] max-h-[65vh] p-2">
              <img
                src={activePhoto.photoBase64}
                alt={activePhoto.caption || 'Foto ampliada'}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg select-none"
              />

              {/* Prev Button */}
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : photos.length - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 shadow-lg cursor-pointer transition-transform active:scale-95"
                  title="Foto anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Next Button */}
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((prev) =>
                      prev !== null && prev < photos.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 shadow-lg cursor-pointer transition-transform active:scale-95"
                  title="Próxima foto"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Metadata Footer */}
            <div className="p-4 bg-slate-950 text-white space-y-2 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h5 className="font-extrabold text-sm text-emerald-300">
                    {activePhoto.caption || 'Registro Fotográfico em Campo'}
                  </h5>
                  <p className="text-slate-400 text-xs">
                    {clientName || activePhoto.pilotName ? `Piloto: ${activePhoto.pilotName}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    📅 {activePhoto.displayDate} às {activePhoto.displayTime}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ✓ Salva localmente
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
