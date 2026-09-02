import React, { useState } from 'react';
import {
  FileText,
  X,
  User,
  Sprout,
  Ruler,
  FileCheck,
  Plane,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Printer,
  Share2,
  Layers,
  Sparkles,
  Maximize2,
  Check,
} from 'lucide-react';
import { OfflineAction, OperationPhoto, calculateAppliedPercentage, deduplicateOperationPhotos } from '../../../utils/fieldOfflineStore';
import { ServiceOrder } from '../../../types';

interface FieldSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrder: ServiceOrder;
  appliedAreaHa: number;
  pilotName?: string;
  osActions: OfflineAction[];
  osPhotos: OperationPhoto[];
}

export const FieldSummaryModal: React.FC<FieldSummaryModalProps> = ({
  isOpen,
  onClose,
  serviceOrder,
  appliedAreaHa,
  pilotName,
  osActions,
  osPhotos,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    title: string;
    description?: string;
    time?: string;
  } | null>(null);

  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!isOpen) return null;

  const appliedPct = calculateAppliedPercentage(appliedAreaHa, serviceOrder.areaHa);
  const resolvedPilot = serviceOrder.pilotName || pilotName || 'Não informado';
  const resolvedDrone = serviceOrder.droneModel || 'Não informado';

  // Extract all occurrences in chronological order
  const occurrenceActions = osActions.filter((a) => a.type === 'OCCURRENCE');

  // Extract or merge all unique photos for this operation with absolute deduplication
  const mergedRawPhotos: OperationPhoto[] = [
    ...osPhotos,
    ...osActions
      .filter((a) => a.type === 'PHOTO' && a.payload.photoBase64)
      .map((a) => ({
        id: a.payload.photoId || `photo_${a.id}`,
        companyId: a.companyId,
        osId: a.osId,
        osNumber: a.osNumber,
        pilotId: a.pilotId,
        pilotName: a.pilotName,
        photoBase64: a.payload.photoBase64!,
        caption: a.payload.photoCaption || 'Registro Fotográfico',
        timestamp: a.timestamp,
        displayTime: a.displayTime,
        displayDate: a.timestamp.split('T')[0].split('-').reverse().join('/'),
        synced: a.synced,
        source: 'photo' as const,
      })),
    ...osActions
      .filter((a) => a.type === 'OCCURRENCE' && (a.payload.photoUrl || a.payload.photoBase64))
      .map((a) => ({
        id: a.payload.photoId || `photo_${a.id}`,
        occurrenceId: a.payload.occurrenceId || a.id,
        companyId: a.companyId,
        osId: a.osId,
        osNumber: a.osNumber,
        pilotId: a.pilotId,
        pilotName: a.pilotName,
        photoBase64: (a.payload.photoUrl || a.payload.photoBase64)!,
        caption: `Ocorrência: ${a.payload.occurrenceLabel || 'Campo'}${a.payload.description ? ` - ${a.payload.description}` : ''}`,
        timestamp: a.timestamp,
        displayTime: a.displayTime,
        displayDate: a.timestamp.split('T')[0].split('-').reverse().join('/'),
        synced: a.synced,
        source: 'occurrence' as const,
      })),
  ];

  const uniqueOperationPhotos = deduplicateOperationPhotos(mergedRawPhotos);

  const allPhotos: Array<{
    id: string;
    url: string;
    caption: string;
    time: string;
    source: 'occurrence' | 'photo';
    occurrenceType?: string;
  }> = uniqueOperationPhotos.map((p) => ({
    id: p.id,
    url: p.photoBase64,
    caption: p.caption || 'Registro Fotográfico',
    time: p.displayTime || '--:--',
    source: (p.source || 'photo') as 'occurrence' | 'photo',
    occurrenceType: p.occurrenceId ? 'Ocorrência' : undefined,
  }));

  // Copy Summary text to clipboard
  const handleCopySummary = () => {
    const text = `COMPROVANTE OPERACIONAL DE CAMPO - MOUTRYX
OS: ${serviceOrder.osNumber}
Cliente: ${serviceOrder.clientName}${serviceOrder.propertyName ? ` / ${serviceOrder.propertyName}` : ''}
Cultura: ${serviceOrder.crop}
Área Contratada: ${serviceOrder.areaHa} ha
Área Aplicada: ${appliedAreaHa} ha (${appliedPct}%)
Piloto: ${resolvedPilot}
Drone: ${resolvedDrone}

Resumo: ${occurrenceActions.length} ocorrências | ${allPhotos.length} fotos registradas.`;

    navigator.clipboard?.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const handlePrint = () => {
    const source = document.querySelector('.fixed.inset-0.z-50 .overflow-y-auto') as HTMLElement | null;
    if (!source) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumo de Campo - ${serviceOrder.osNumber}</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}html,body{background:#fff;color:#111827;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.4}.print-sheet{width:100%;max-width:180mm;margin:0 auto}.print-sheet .overflow-y-auto{overflow:visible!important;max-height:none!important}.print-sheet img{max-width:100%;height:auto;break-inside:avoid;page-break-inside:avoid}.print-sheet button{display:none!important}.print-sheet [class*="sticky"]{position:static!important}</style></head><body><main class="print-sheet">${source.innerHTML}</main></body></html>`);
    printWindow.document.close();
    const images = Array.from(printWindow.document.images);
    let remaining = images.length;
    const printNow = () => { printWindow.focus(); printWindow.print(); };
    if (!remaining) printNow();
    else images.forEach((img) => { const done=()=>{ remaining-=1; if(remaining===0) printNow(); }; if(img.complete) done(); else { img.onload=done; img.onerror=done; } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-[#F7F8F7] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#111827] text-[#667085]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#111827] leading-tight">
                Resumo da Operação • {serviceOrder.osNumber}
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                Comprovante Oficial de Atendimento em Campo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              title="Copiar texto do resumo"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedSuccess ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              title="Imprimir comprovante"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. PRINCIPAL CARD: COMPROVANTE OPERACIONAL DE CAMPO */}
          <div className="rounded-3xl bg-[#111827] text-white p-5 sm:p-6 shadow-md relative overflow-hidden border border-[#05521F]/40 space-y-4">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-[#667085] uppercase tracking-wider block">
                  COMPROVANTE OPERACIONAL DE CAMPO
                </span>
                <span className="text-[11px] text-white/70 font-medium">
                  Moutryx Aero Agrícola • Registro Operacional
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#05521F]/30 border border-[#05521F]/60 text-[#667085] text-[10px] font-black uppercase tracking-wide">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Operação Registrada
              </span>
            </div>

            {/* Core Fields Grid matching specification exactly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Cliente */}
              <div className="space-y-0.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                  <User className="h-3 w-3 text-[#667085]" /> Cliente
                </span>
                <p className="font-extrabold text-sm text-white truncate">
                  {serviceOrder.clientName}
                  {serviceOrder.propertyName ? ` / ${serviceOrder.propertyName}` : ''}
                </p>
              </div>

              {/* Cultura */}
              <div className="space-y-0.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Sprout className="h-3 w-3 text-emerald-400" /> Cultura
                </span>
                <p className="font-extrabold text-sm text-white truncate">
                  {serviceOrder.crop || 'Soja'}
                </p>
              </div>

              {/* Área Contratada */}
              <div className="space-y-0.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-slate-300" /> Área Contratada
                </span>
                <p className="font-extrabold text-sm text-white">
                  {serviceOrder.areaHa.toLocaleString('pt-BR')} ha
                </p>
              </div>

              {/* Área Aplicada */}
              <div className="space-y-0.5 bg-[#05521F]/20 p-2.5 rounded-2xl border border-[#05521F]/40">
                <span className="text-white/80 text-[10px] uppercase font-bold flex items-center gap-1">
                  <FileCheck className="h-3 w-3 text-[#667085]" /> Área Aplicada
                </span>
                <p className="font-black text-sm text-[#667085]">
                  {appliedAreaHa.toLocaleString('pt-BR')} ha ({appliedPct}%)
                </p>
              </div>

              {/* Piloto */}
              <div className="space-y-0.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                  <User className="h-3 w-3 text-amber-300" /> Piloto
                </span>
                <p className="font-extrabold text-sm text-white truncate">
                  {resolvedPilot}
                </p>
              </div>

              {/* Drone */}
              <div className="space-y-0.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Plane className="h-3 w-3 text-sky-400" /> Drone
                </span>
                <p className="font-extrabold text-sm text-white truncate">
                  {resolvedDrone}
                </p>
              </div>
            </div>
          </div>

          {/* 2. REAL METRICS COUNTERS (CONTADORES REAIS) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-black text-slate-500 block">
                Ocorrências
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-700">
                {occurrenceActions.length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-black text-slate-500 block">
                Fotos
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">
                {allPhotos.length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-black text-slate-500 block">
                Área Aplicada
              </span>
              <span className="text-lg sm:text-xl font-black text-[#111827]">
                {appliedAreaHa.toLocaleString('pt-BR')} ha
              </span>
            </div>
          </div>

          {/* 3. LINHA DO TEMPO COMPLETA (CHRONOLOGICAL TIMELINE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#05521F]" />
                Linha do Tempo Registrada
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {osActions.length} eventos
              </span>
            </div>

            {osActions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center text-xs font-medium text-slate-500">
                Nenhum evento registrado nesta operação.
              </div>
            ) : (
              <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                {osActions.map((act, index) => {
                  const hasPhoto = Boolean(act.payload?.photoUrl || act.payload?.photoBase64);
                  const photoSrc = act.payload?.photoUrl || act.payload?.photoBase64;

                  return (
                    <div
                      key={act.id || index}
                      className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Event icon indicator */}
                        <div className="mt-0.5 shrink-0">
                          {act.type === 'START_OPERATION' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                          )}
                          {act.type === 'OCCURRENCE' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                          )}
                          {act.type === 'PHOTO' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                          )}
                          {act.type === 'APPLIED_AREA' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                          )}
                          {act.type === 'PAUSE_OPERATION' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-100" />
                          )}
                          {act.type === 'RESUME_OPERATION' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                          )}
                          {act.type === 'FINISH_OPERATION' && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                          )}
                        </div>

                        {/* Event content */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-800">
                              {act.type === 'START_OPERATION' && '🟢 Início da Operação'}
                              {act.type === 'OCCURRENCE' &&
                                `⚠️ ${act.payload.occurrenceLabel || 'Problema registrado'}`}
                              {act.type === 'PHOTO' && '📷 Registro Fotográfico'}
                              {act.type === 'APPLIED_AREA' &&
                                `📏 Área aplicada: ${act.payload.appliedAreaHa} ha`}
                              {act.type === 'PAUSE_OPERATION' &&
                                `⏸ Pausa da Operação${act.payload.pauseReason ? ` (${act.payload.pauseReason})` : ''}`}
                              {act.type === 'RESUME_OPERATION' && '▶️ Retomada da Operação'}
                              {act.type === 'FINISH_OPERATION' && '🔴 Finalização da OS'}
                            </span>
                          </div>

                          {act.payload?.description && (
                            <p className="text-[11px] text-slate-600 italic">
                              "{act.payload.description}"
                            </p>
                          )}

                          {hasPhoto && photoSrc && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPhoto({
                                  url: photoSrc,
                                  title: act.payload?.occurrenceLabel || 'Foto da Operação',
                                  description: act.payload?.description,
                                  time: act.displayTime,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-black text-[#05521F] hover:text-[#111827] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Camera className="h-3 w-3" />
                              <span>📷 Foto anexada</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Time badge */}
                      <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                        {act.displayTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. OCORRÊNCIAS REGISTRADAS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Ocorrências Registradas
            </h4>

            {occurrenceActions.length === 0 ? (
              <div className="p-4 rounded-3xl bg-white border border-slate-200 text-center space-y-1">
                <div className="inline-flex p-2 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-extrabold text-slate-700">
                  Nenhuma ocorrência registrada.
                </p>
                <p className="text-[11px] text-slate-500">
                  Operação conduzida sem relatos de anomalias ou obstáculos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {occurrenceActions.map((occ) => {
                  const photoUrl = occ.payload.photoUrl || occ.payload.photoBase64;

                  return (
                    <div
                      key={occ.id}
                      className="p-4 rounded-3xl bg-white border border-amber-200/80 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <span className="font-black text-xs text-amber-950">
                            ⚠️ {occ.payload.occurrenceLabel || 'Ocorrência de Campo'}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                          {occ.displayTime}
                        </span>
                      </div>

                      {occ.payload.description && (
                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Observação:
                          </span>
                          <p className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 font-medium leading-relaxed">
                            "{occ.payload.description}"
                          </p>
                        </div>
                      )}

                      {/* Photo linked to this specific occurrence */}
                      {photoUrl && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5 text-amber-700" />
                            Foto do problema:
                          </span>
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() =>
                                setSelectedPhoto({
                                  url: photoUrl,
                                  title: occ.payload.occurrenceLabel || 'Ocorrência',
                                  description: occ.payload.description,
                                  time: occ.displayTime,
                                })
                              }
                              className="relative group w-32 h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer shrink-0 shadow-2xs"
                            >
                              <img
                                src={photoUrl}
                                alt="Foto da ocorrência"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white opacity-90" />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPhoto({
                                  url: photoUrl,
                                  title: occ.payload.occurrenceLabel || 'Ocorrência',
                                  description: occ.payload.description,
                                  time: occ.displayTime,
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <span>Visualizar foto</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. EVIDÊNCIAS FOTOGRÁFICAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#05521F]" />
                Evidências Fotográficas
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {allPhotos.length} fotos
              </span>
            </div>

            {allPhotos.length === 0 ? (
              <div className="p-4 rounded-3xl bg-white border border-slate-200 text-center space-y-1">
                <div className="inline-flex p-2 rounded-full bg-slate-100 text-slate-400 mb-1">
                  <Camera className="h-5 w-5" />
                </div>
                <p className="text-xs font-extrabold text-slate-700">
                  Nenhuma evidência fotográfica registrada.
                </p>
                <p className="text-[11px] text-slate-500">
                  Nenhuma foto anexada durante a execução desta ordem de serviço.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {allPhotos.map((photo, pIdx) => (
                  <div
                    key={photo.id || pIdx}
                    onClick={() =>
                      setSelectedPhoto({
                        url: photo.url,
                        title: photo.caption,
                        time: photo.time,
                      })
                    }
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-4/3 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2 text-white">
                      <div className="flex justify-end">
                        <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-black text-white">
                          {photo.time}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold truncate text-white leading-tight">
                          {photo.caption}
                        </p>
                        <span className="text-[8px] font-bold text-[#667085] uppercase">
                          {photo.source === 'occurrence' ? 'Ocorrência' : 'Registro de Campo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-[#111827] hover:bg-[#111827] active:bg-[#111827] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <span>Fechar Resumo</span>
          </button>
        </div>
      </div>

      {/* Photo Lightbox Popup */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[92vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-white/10 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Camera className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-black text-white truncate">
                    {selectedPhoto.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {serviceOrder.osNumber} • {selectedPhoto.time || '--:--'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-2 min-h-[300px] max-h-[65vh]">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-w-full max-h-[62vh] object-contain rounded-xl"
              />
            </div>

            <div className="px-4 py-3 bg-slate-950/90 border-t border-white/10 text-white flex items-center justify-between gap-4">
              <p className="text-xs text-slate-300 font-medium truncate">
                {selectedPhoto.description || selectedPhoto.title || 'Evidência fotográfica de campo.'}
              </p>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
