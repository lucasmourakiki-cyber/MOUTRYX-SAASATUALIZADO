import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceOrder } from '../../types';
import { MoutryxXSymbol } from '../common/MoutryxXSymbol';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Plane,
  User,
  MapPin,
  DollarSign,
  Printer,
  Share2,
  Calendar,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Download,
  Loader2,
  SlidersHorizontal,
  Gauge,
  Ruler,
  Droplets,
  Layers,
  CloudSun,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { downloadElementAsPdf, generateServiceOrderPdfVector, printDirect, openPrintableTab } from '../../utils/printHelper';

interface ServiceOrdersViewProps {
  onOpenNewOS: () => void;
}

export const ServiceOrdersView: React.FC<ServiceOrdersViewProps> = ({ onOpenNewOS }) => {
  const {
    serviceOrders,
    updateServiceOrderStatus,
    pilots,
    drones,
    currentCompany,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPilot, setFilterPilot] = useState<string>('all');
  const [filterDrone, setFilterDrone] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const filteredOS = serviceOrders.filter((os) => {
    if (filterStatus !== 'all' && os.status !== filterStatus) return false;
    if (filterPilot !== 'all' && os.pilotId !== filterPilot) return false;
    if (filterDrone !== 'all' && os.droneId !== filterDrone) return false;
    if (
      search &&
      !os.osNumber?.toLowerCase().includes(search.toLowerCase()) &&
      !os.clientName?.toLowerCase().includes(search.toLowerCase()) &&
      !os.serviceType?.toLowerCase().includes(search.toLowerCase()) &&
      !os.propertyName?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleStatusChange = (os: ServiceOrder, newStatus: ServiceOrder['status']) => {
    updateServiceOrderStatus(os.id, newStatus);
    if (newStatus === 'concluido' || newStatus === 'pago') {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }
    if (selectedOS && selectedOS.id === os.id) {
      setSelectedOS({ ...selectedOS, status: newStatus });
    }
  };

  const handleWhatsAppShare = (os: ServiceOrder) => {
    const text = encodeURIComponent(
      `🚁 *ORDEM DE SERVIÇO - ${currentCompany.tradeName || currentCompany.name}*\n\n` +
      `*OS:* ${os.osNumber}\n` +
      `*Cliente:* ${os.clientName}\n` +
      `*Propriedade:* ${os.propertyName} (${os.talhaoName})\n` +
      `*Cultura:* ${os.crop} • *Área:* ${os.areaHa} ha\n` +
      `*Serviço:* ${os.serviceType}\n` +
      `*Piloto:* ${os.pilotName}\n` +
      `*Drone:* ${os.droneModel}\n` +
      `*Data Prevista:* ${os.scheduledDate} às ${os.scheduledTime}\n` +
      `*Valor Total:* R$ ${os.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `*Status:* ${os.status.toUpperCase()}\n\n` +
      `_Gerado pela plataforma MOUTRYX Gestão Aeroagrícola._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Ordens de Serviço (OS)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão operacional de aplicações aéreas, dosagens fitossanitárias, pilotos, drones e ciclo financeiro
          </p>
        </div>

        <button
          onClick={onOpenNewOS}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-md cursor-pointer border border-[#05521F]/30"
        >
          <Plus className="h-4 w-4" /> Nova Ordem de Serviço
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OS, cliente, serviço, fazenda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="agendado">Agendado</option>
            <option value="em_deslocamento">Em Deslocamento</option>
            <option value="em_operacao">Em Operação</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
            <option value="faturado">Faturado</option>
            <option value="pago">Pago</option>
          </select>

          <select
            value={filterPilot}
            onChange={(e) => setFilterPilot(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Pilotos</option>
            {pilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterDrone}
            onChange={(e) => setFilterDrone(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Drones</option>
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.model} ({d.assetTag})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">{filteredOS.length} ordens de serviço</span>
      </div>

      {/* OS List Grid */}
      <div className="space-y-3">
        {filteredOS.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Crie uma nova OS ou converta um orçamento aprovado para iniciar o planejamento operacional.
            </p>
            <button
              onClick={onOpenNewOS}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#05521F] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2E7D32] cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Nova Ordem de Serviço
            </button>
          </div>
        ) : (
          filteredOS.map((os) => (
            <div
              key={os.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/50 transition-all space-y-4"
            >
              {/* Row 1: Number, Client, Date & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-[#667085] font-black text-xs border border-[#05521F]/30">
                    OS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#111827]">{os.osNumber}</span>
                      <span className="text-sm font-bold text-slate-800">• {os.clientName}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {os.propertyName} • {os.talhaoName} ({os.crop})
                      {typeof os.propertyCoords?.lat === 'number' && os.propertyCoords.lat !== 0 && (
                        <span className="ml-2 text-[10px] text-slate-400 inline-flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> GPS ({os.propertyCoords.lat.toFixed(3)}, {(os.propertyCoords.lng || 0).toFixed(3)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      os.status === 'em_operacao'
                        ? 'bg-blue-100 text-[#05521F] border border-blue-200 animate-pulse'
                        : os.status === 'concluido'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : os.status === 'faturado'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : os.status === 'pago'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : os.status === 'em_deslocamento'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : os.status === 'pausado'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {(os.status || 'agendado').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {os.scheduledDate} às {os.scheduledTime}
                  </span>
                </div>
              </div>

              {/* Row 2: Operational Data, Pilot, Drone, Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Área & Aplicação</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{os.areaHa || 0} ha • {os.serviceType}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Drone & Piloto</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {os.droneModel} • {os.pilotName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Faturamento Total</span>
                  <span className="font-extrabold text-[#05521F] mt-0.5 block">
                    R$ {(os.finalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (R$ {(os.pricePerHa || 0).toFixed(2)}/ha)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Comissão do Piloto</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    R$ {(os.calculatedPilotCommission || 0).toFixed(2)} ({((os.commissionStatus as string) || 'prevista').replace(/_/g, ' ')})
                  </span>
                </div>
              </div>

              {/* Application Parameters if present */}
              {os.applicationParameters && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[#05521F] font-bold text-[10px] uppercase flex items-center gap-1.5 mb-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#05521F]" /> Parâmetros de Aplicação:
                  </span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-700 text-[11px]">
                    {os.applicationParameters.flightSpeedKmH !== undefined && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <strong className="text-slate-900">Velocidade:</strong> {os.applicationParameters.flightSpeedKmH} km/h
                      </span>
                    )}
                    {os.applicationParameters.flightHeightMeters !== undefined && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <strong className="text-slate-900">Altura:</strong> {os.applicationParameters.flightHeightMeters} m
                      </span>
                    )}
                    {os.applicationParameters.swathWidthMeters !== undefined && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <strong className="text-slate-900">Faixa:</strong> {os.applicationParameters.swathWidthMeters} m
                      </span>
                    )}
                    {os.applicationParameters.caldaVolumeLPerHa !== undefined && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <strong className="text-slate-900">Volume de Calda:</strong> {os.applicationParameters.caldaVolumeLPerHa} L/ha
                      </span>
                    )}
                    {os.applicationParameters.dropletSize && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <strong className="text-slate-900">Tamanho de Gota:</strong> {os.applicationParameters.dropletSize}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Products Applied list if present */}
              {os.products && os.products.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs">
                  <p className="font-bold text-emerald-900 text-[11px] mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Defensivos Vinculados (Calda Fitossanitária AGROFIT):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {os.products.map((p, idx) => (
                      <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-slate-700 text-[11px]">
                        <strong>{p.commercialName}</strong> ({p.activeIngredient || 'Defensivo'}) • Dose: {p.dosePerHa} {p.unit} • Total: {p.plannedTotalQty} {p.unit.replace('/ha', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: Action Buttons & Status Stepper */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500 text-[11px] font-semibold mr-1">Avançar Etapa:</span>
                  
                  {os.status === 'agendado' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(os, 'em_deslocamento')}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Iniciar Deslocamento
                      </button>
                      <button
                        onClick={() => handleStatusChange(os, 'em_operacao')}
                        className="rounded-lg bg-[#05521F] hover:bg-[#2E7D32] text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Iniciar Operação
                      </button>
                    </>
                  )}

                  {os.status === 'em_deslocamento' && (
                    <button
                      onClick={() => handleStatusChange(os, 'em_operacao')}
                      className="rounded-lg bg-[#05521F] hover:bg-[#2E7D32] text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Iniciar Operação
                    </button>
                  )}

                  {os.status === 'em_operacao' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(os, 'concluido')}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Concluir Aplicação
                      </button>
                      <button
                        onClick={() => handleStatusChange(os, 'pausado')}
                        className="rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Pausar
                      </button>
                    </>
                  )}

                  {os.status === 'pausado' && (
                    <button
                      onClick={() => handleStatusChange(os, 'em_operacao')}
                      className="rounded-lg bg-[#05521F] hover:bg-[#2E7D32] text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Retomar Operação
                    </button>
                  )}

                  {os.status === 'concluido' && (
                    <button
                      onClick={() => handleStatusChange(os, 'faturado')}
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Faturar OS
                    </button>
                  )}

                  {os.status === 'faturado' && (
                    <button
                      onClick={() => handleStatusChange(os, 'pago')}
                      className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Registrar Pagamento
                    </button>
                  )}

                  {os.status === 'pago' && (
                    <span className="text-teal-700 font-bold text-xs bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      Ordem de Serviço 100% Paga e Comissão Liberada
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWhatsAppShare(os)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOS(os);
                      setIsPrintModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-[#05521F]" /> Imprimir / PDF
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PRINTABLE / PDF MODAL */}
      {isPrintModalOpen && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto p-6 sm:p-8 text-slate-800">
            {/* Modal Actions Bar (hidden during printing) */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
              <div>
                <h3 className="font-black text-base text-[#111827] flex items-center gap-2">
                  <Printer className="h-5 w-5 text-[#05521F]" />
                  Visualização de Impressão — OS {selectedOS.osNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Gere o PDF oficial da Ordem de Serviço ou envie direto para a impressora.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openPrintableTab('printable-os', `Ordem de Serviço - ${selectedOS.osNumber}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                  title="Abrir página limpa em nova aba do navegador"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-600" /> Nova Aba
                </button>
                <button
                  onClick={() => printDirect('printable-os', `Ordem de Serviço - ${selectedOS.osNumber}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Imprimir documento oficial em formato A4"
                >
                  <Printer className="h-4 w-4 text-[#05521F]" /> Imprimir
                </button>
                <button
                  disabled={isGeneratingPdf}
                  onClick={async () => {
                    setIsGeneratingPdf(true);
                    try {
                      generateServiceOrderPdfVector(selectedOS, currentCompany);
                    } catch (e) {
                      console.warn('Vector PDF fallback to canvas:', e);
                      await downloadElementAsPdf('printable-os', { filename: `OS-${selectedOS.osNumber}` });
                    }
                    setIsGeneratingPdf(false);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] disabled:bg-slate-400 text-white px-4 py-2 text-xs font-black shadow-sm transition-colors cursor-pointer border border-[#05521F]/30"
                  title="Baixar arquivo PDF no seu computador"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" /> Baixar PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable Container) */}
            <div id="printable-os" className="printable-document py-6 space-y-6 text-xs bg-white">
              {/* Printable Header with Company Info */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-2xs overflow-hidden">
                    <MoutryxXSymbol size="lg" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#111827]">{currentCompany.tradeName || currentCompany.name}</h3>
                    <p className="text-xs text-slate-600">
                      CNPJ: {currentCompany.cnpj || 'Não informado'} • {currentCompany.city}/{currentCompany.state} • Contato: {currentCompany.phone || 'Não informado'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentCompany.address ? `${currentCompany.address} • ` : ''}{currentCompany.email || ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Data de Emissão</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="text-center py-3 bg-slate-50 rounded-xl border border-slate-200">
                <h2 className="text-base font-black text-[#111827] uppercase tracking-wide">
                  ORDEM DE SERVIÇO DE PULVERIZAÇÃO AÉREA AGRÍCOLA
                </h2>
                <p className="text-xs font-black text-[#05521F] mt-0.5">{selectedOS.osNumber}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Dados do Cliente & Local</p>
                  <p className="font-extrabold text-sm text-slate-900">{selectedOS.clientName}</p>
                  <p className="text-slate-600">WhatsApp: {selectedOS.clientWhatsapp || 'Não informado'}</p>
                  <p className="text-slate-600">Propriedade: {selectedOS.propertyName}</p>
                  <p className="text-slate-600">Talhão: {selectedOS.talhaoName}</p>
                  {selectedOS.propertyCoords && selectedOS.propertyCoords.lat !== 0 && (
                    <p className="text-slate-500 text-[11px] mt-1">
                      Coordenadas GPS: {selectedOS.propertyCoords.lat.toFixed(4)}, {selectedOS.propertyCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Dados da Operação</p>
                  <p className="font-extrabold text-sm text-slate-900">{selectedOS.serviceType}</p>
                  <p className="text-slate-600">Cultura: {selectedOS.crop} • Área: {selectedOS.areaHa} {selectedOS.areaHa === 1 ? 'hectare' : 'hectares'}</p>
                  <p className="text-slate-600">Data/Hora Agendada: {selectedOS.scheduledDate} às {selectedOS.scheduledTime}</p>
                  <p className="text-slate-600">Piloto Responsável: {selectedOS.pilotName}</p>
                  <p className="text-slate-600">Drone / Aeronave: {selectedOS.droneModel}</p>
                </div>
              </div>

              {/* Parâmetros de Aplicação Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-[#05521F] uppercase text-[10px] mb-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#05521F]" />
                  Parâmetros de Aplicação (Voo & Pulverização)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Velocidade:</span>
                    <span className="font-bold">
                      {selectedOS.applicationParameters?.flightSpeedKmH !== undefined
                        ? `${selectedOS.applicationParameters.flightSpeedKmH} km/h`
                        : (selectedOS.flightSpeedKmH !== undefined ? `${selectedOS.flightSpeedKmH} km/h` : 'Não informado')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Altura de Voo:</span>
                    <span className="font-bold">
                      {selectedOS.applicationParameters?.flightHeightMeters !== undefined
                        ? `${selectedOS.applicationParameters.flightHeightMeters} m`
                        : (selectedOS.flightHeightMeters !== undefined ? `${selectedOS.flightHeightMeters} m` : 'Não informado')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Faixa de Aplicação:</span>
                    <span className="font-bold">
                      {selectedOS.applicationParameters?.swathWidthMeters !== undefined
                        ? `${selectedOS.applicationParameters.swathWidthMeters} m`
                        : (selectedOS.swathWidthMeters !== undefined ? `${selectedOS.swathWidthMeters} m` : 'Não informado')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Volume de Calda:</span>
                    <span className="font-bold">
                      {selectedOS.applicationParameters?.caldaVolumeLPerHa !== undefined
                        ? `${selectedOS.applicationParameters.caldaVolumeLPerHa} L/ha`
                        : (selectedOS.products?.[0]?.volumeCaldaLPerHa !== undefined
                            ? `${selectedOS.products[0].volumeCaldaLPerHa} L/ha`
                            : 'Não informado')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tamanho de Gota:</span>
                    <span className="font-bold">
                      {selectedOS.applicationParameters?.dropletSize || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Climate Parameters Box */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-700 uppercase text-[10px] mb-2 flex items-center gap-1.5">
                  <CloudSun className="h-3.5 w-3.5 text-slate-500" />
                  Condições Climáticas da Aplicação
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Temperatura:</span>
                    <span className="font-bold">{selectedOS.weatherConditions?.temperatureC || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Umidade Relativa:</span>
                    <span className="font-bold">{selectedOS.weatherConditions?.humidityPercent || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vento / Direção:</span>
                    <span className="font-bold">
                      {selectedOS.weatherConditions?.windSpeedKmH || 'Não informado'}
                      {selectedOS.weatherConditions?.windDirection ? ` (${selectedOS.weatherConditions.windDirection})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Condição do Tempo:</span>
                    <span className="font-bold">{selectedOS.weatherConditions?.notes || 'Normal'}</span>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <p className="font-bold text-slate-700 uppercase text-[10px] mb-2">
                  Produtos Fitossanitários e Dosagens Aplicadas (AGROFIT/MAPA)
                </p>
                {selectedOS.products && selectedOS.products.length > 0 ? (
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <th className="border border-slate-200 p-2">Produto</th>
                        <th className="border border-slate-200 p-2">Ingrediente Ativo</th>
                        <th className="border border-slate-200 p-2">Alvo / Finalidade</th>
                        <th className="border border-slate-200 p-2">Dose / ha</th>
                        <th className="border border-slate-200 p-2">Qtd Planejada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOS.products.map((p, idx) => (
                        <tr key={idx} className="border border-slate-200">
                          <td className="border border-slate-200 p-2 font-bold text-slate-800">{p.commercialName}</td>
                          <td className="border border-slate-200 p-2 text-slate-600">{p.activeIngredient || '-'}</td>
                          <td className="border border-slate-200 p-2 text-slate-600">{p.targetPest || '-'}</td>
                          <td className="border border-slate-200 p-2 text-slate-700">{p.dosePerHa} {p.unit}</td>
                          <td className="border border-slate-200 p-2 font-bold text-slate-900">{p.plannedTotalQty} {p.unit.replace('/ha', '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-slate-400 italic bg-slate-50 p-2.5 rounded-lg text-center">
                    Nenhum produto fitossanitário registrado para esta ordem de serviço.
                  </p>
                )}
              </div>

              {/* Notes & Weather Observations */}
              {(selectedOS.notes || selectedOS.weatherConditions?.notes) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 text-xs space-y-1">
                  <p className="font-bold text-[10px] uppercase text-amber-800">Observações Operacionais / Climáticas</p>
                  {selectedOS.notes && <p><span className="font-semibold">OS:</span> {selectedOS.notes}</p>}
                  {selectedOS.weatherConditions?.notes && <p><span className="font-semibold">Clima:</span> {selectedOS.weatherConditions.notes}</p>}
                </div>
              )}

              {/* Agronomic Disclaimer */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[11px] avoid-break">
                <strong>Ressalva Agronômica Legal:</strong> A aplicação deve seguir estritamente o receituário agronômico oficial e as recomendações do Responsável Técnico. Confirmar condições meteorológicas antes de autorizar a decolagem.
              </div>

              {/* Financial & Payment Box */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3 avoid-break">
                <div>
                  <span className="text-emerald-900 font-bold block text-[10px] uppercase">Forma de Pagamento</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {selectedOS.paymentMethod || selectedOS.paymentTerms || 'PIX'}
                  </p>
                  {selectedOS.paymentMethod === 'PAGAMENTO SAFRA' && selectedOS.harvestPaymentDate && (
                    <span className="text-xs font-semibold text-emerald-800 block mt-0.5">
                      Data prevista para pagamento safra: {selectedOS.harvestPaymentDate.split('-').reverse().join('/')}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Preço/ha: R$ {(selectedOS.pricePerHa || 0).toFixed(2)} • Subtotal: R$ {(selectedOS.grossAmount || 0).toFixed(2)}
                    {selectedOS.displacementFee ? ` • Deslocamento: R$ ${selectedOS.displacementFee.toFixed(2)}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-900 font-bold block text-[10px] uppercase">Valor Total do Serviço</span>
                  <p className="text-xl font-black text-[#05521F]">
                    R$ {selectedOS.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center avoid-break">
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-1" />
                  <p className="font-bold text-slate-800">{selectedOS.pilotName}</p>
                  <p className="text-[10px] text-slate-500">Piloto / Aplicador Aeroagrícola</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-1" />
                  <p className="font-bold text-slate-800">{selectedOS.clientName}</p>
                  <p className="text-[10px] text-slate-500">Contratante / Responsável da Propriedade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
