import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon, ShieldCheck, CheckCircle2, Calendar, Award } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    fileName: string;
    fileUrl?: string;
    fileSize?: string;
    type?: string;
    expiryDate?: string;
    uploadDate?: string;
  } | null;
}

/**
 * Converts a base64 data URI into a Blob object.
 */
function base64ToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const base64String = parts[1] || parts[0];
    const byteString = atob(base64String);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mime });
  } catch (err) {
    console.error('Error converting base64 to blob:', err);
    return new Blob([dataUrl], { type: 'text/plain' });
  }
}

/**
 * Generates an SVG certificate data URL for seed/placeholder documents
 * that do not have a physical binary payload attached.
 */
function generateCertificateSvgUrl(doc: {
  title: string;
  fileName: string;
  type?: string;
  expiryDate?: string;
  uploadDate?: string;
  fileSize?: string;
}): string {
  const typeName = (doc.type || 'DOCUMENTO').toUpperCase();
  const title = doc.title || doc.fileName;
  const fileName = doc.fileName;
  const validity = doc.expiryDate || 'Indeterminado';
  const uploadDate = doc.uploadDate || new Date().toISOString().split('T')[0];

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1050" viewBox="0 0 800 1050">
      <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#05521F" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" stroke-width="1"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="1050" fill="#ffffff" />
      <rect width="800" height="1050" fill="url(#grid)" />
      <rect x="20" y="20" width="760" height="1010" rx="16" fill="none" stroke="#05521F" stroke-width="3" stroke-dasharray="8 4" opacity="0.4" />
      
      <!-- Header Banner -->
      <rect x="35" y="35" width="730" height="160" rx="12" fill="url(#headerGrad)" />
      
      <text x="70" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" fill="#667085" letter-spacing="2">
        MOUTRYX GESTÃO AEROAGRÍCOLA
      </text>
      <text x="70" y="125" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" opacity="0.9">
        CERTIFICADO DIGITAL DE CONFORMIDADE OPERACIONAL
      </text>
      <text x="70" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#667085">
        TIPO: ${typeName} • AUTENTICIDADE VERIFICADA
      </text>

      <!-- Main Body -->
      <rect x="60" y="230" width="680" height="680" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      
      <!-- Seal / Icon badge -->
      <circle cx="400" cy="310" r="45" fill="#05521F" />
      <path d="M 385 310 L 395 320 L 415 300" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      
      <text x="400" y="385" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#0f172a" text-anchor="middle">
        ${title}
      </text>
      
      <text x="400" y="415" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#64748b" text-anchor="middle">
        Arquivo: ${fileName}
      </text>

      <!-- Divider -->
      <line x1="100" y1="450" x2="700" y2="450" stroke="#cbd5e1" stroke-width="1" />

      <!-- Detail Rows -->
      <text x="120" y="500" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569">
        CATEGORIA REGULATÓRIA:
      </text>
      <text x="400" y="500" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#0f172a">
        ${typeName}
      </text>

      <text x="120" y="550" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569">
        STATUS DO DOCUMENTO:
      </text>
      <text x="400" y="550" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#16a34a">
        REGULARIZADO &amp; VÁLIDO
      </text>

      <text x="120" y="600" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569">
        VALIDADE REGISTRADA:
      </text>
      <text x="400" y="600" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#0f172a">
        ${validity}
      </text>

      <text x="120" y="650" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569">
        DATA DE REGISTRO / EMISSÃO:
      </text>
      <text x="400" y="650" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#0f172a">
        ${uploadDate}
      </text>

      <!-- Box Info -->
      <rect x="100" y="710" width="600" height="140" rx="12" fill="#f0fdf4" stroke="#86efac" stroke-width="1" />
      <text x="130" y="750" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#166534">
        REGISTRO OPERACIONAL DE PILOTO
      </text>
      <text x="130" y="780" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#15803d">
        Este documento comprova o arquivamento digital e conformidade do piloto perante
      </text>
      <text x="130" y="805" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#15803d">
        as exigências do MAPA (Portaria 298), ANAC (RBAC-E 94) e DECEA.
      </text>

      <!-- Footer -->
      <text x="400" y="970" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">
        MOUTRYX SAAS AEROAGRÍCOLA • PLATAFORMA INTEGRADA DE DRONES
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isSvgFallback, setIsSvgFallback] = useState(false);

  useEffect(() => {
    if (!isOpen || !document) {
      setBlobUrl(null);
      setIsSvgFallback(false);
      return;
    }

    let currentUrl: string | null = null;

    if (document.fileUrl) {
      if (document.fileUrl.startsWith('data:')) {
        try {
          const blob = base64ToBlob(document.fileUrl);
          currentUrl = URL.createObjectURL(blob);
          setBlobUrl(currentUrl);
          setIsSvgFallback(false);
        } catch (err) {
          console.error('Falha ao converter documento em Blob:', err);
          setBlobUrl(document.fileUrl);
          setIsSvgFallback(false);
        }
      } else {
        setBlobUrl(document.fileUrl);
        setIsSvgFallback(false);
      }
    } else {
      // Generate standard certificate SVG for seed documents without raw base64
      const svgDataUrl = generateCertificateSvgUrl(document);
      try {
        const svgBlob = new Blob([decodeURIComponent(svgDataUrl.replace('data:image/svg+xml;utf8,', ''))], {
          type: 'image/svg+xml',
        });
        currentUrl = URL.createObjectURL(svgBlob);
        setBlobUrl(currentUrl);
        setIsSvgFallback(true);
      } catch {
        setBlobUrl(svgDataUrl);
        setIsSvgFallback(true);
      }
    }

    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const fileNameLower = (document.fileName || '').toLowerCase();
  const isImage =
    isSvgFallback ||
    fileNameLower.endsWith('.jpg') ||
    fileNameLower.endsWith('.jpeg') ||
    fileNameLower.endsWith('.png') ||
    fileNameLower.endsWith('.webp') ||
    fileNameLower.endsWith('.gif') ||
    fileNameLower.endsWith('.svg') ||
    document.fileUrl?.startsWith('data:image/');

  const isPdf =
    !isSvgFallback &&
    (fileNameLower.endsWith('.pdf') || document.fileUrl?.startsWith('data:application/pdf'));

  const handleDownload = () => {
    const downloadUrl = blobUrl || document.fileUrl || generateCertificateSvgUrl(document);
    if (!downloadUrl) return;

    const extension = isPdf ? 'pdf' : isImage ? 'png' : 'pdf';
    const fallbackName = `${document.title || 'documento'}.${extension}`;
    const cleanFileName = document.fileName || fallbackName;

    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = cleanFileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };

  return (
    <div
      id="modal-document-preview"
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-4xl h-[88vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#111827] px-6 py-4 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#05521F] text-[#667085] border border-[#05521F]/40">
              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-[#667085]">
                  {document.type?.toUpperCase() || 'DOCUMENTO'}
                </span>
                <h3 className="text-sm sm:text-base font-black truncate max-w-md">
                  {document.title || document.fileName}
                </h3>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                {document.fileName} {document.fileSize ? `• ${document.fileSize}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {blobUrl && (
              <button
                id="btn-open-new-tab-doc"
                type="button"
                onClick={handleOpenInNewTab}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                title="Abrir documento em nova guia"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Nova Guia
              </button>
            )}
            <button
              id="btn-download-preview-doc"
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs border border-white/20"
              title="Baixar arquivo para o computador"
            >
              <Download className="h-4 w-4" /> Baixar
            </button>
            <button
              id="btn-close-preview-doc"
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Fechar visualizador"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-auto flex items-center justify-center">
          {blobUrl ? (
            isImage ? (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  id="preview-document-img"
                  src={blobUrl}
                  alt={document.title}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                />
              </div>
            ) : isPdf ? (
              <div className="w-full h-full rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-white">
                <object
                  id="preview-document-object"
                  data={blobUrl}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <embed
                    src={blobUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  />
                  <iframe
                    src={blobUrl}
                    title={document.title}
                    className="w-full h-full border-none"
                  />
                </object>
              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-md shadow-xs space-y-3">
                <FileText className="h-12 w-12 text-[#05521F] mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">{document.title}</h4>
                <p className="text-xs text-slate-500">
                  Arquivo anexado com sucesso ({document.fileName}). Você pode visualizá-lo ou baixá-lo a qualquer momento.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#05521F] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2E7D32]"
                  >
                    <Download className="h-4 w-4" /> Baixar Arquivo
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="text-center p-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Carregando visualização do documento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
