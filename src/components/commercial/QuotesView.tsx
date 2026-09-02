import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Quote } from '../../types';
import { MoutryxXSymbol } from '../common/MoutryxXSymbol';
import {
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Share2,
  DollarSign,
  ArrowRight,
  X,
  Sparkles,
  ExternalLink,
  Info,
  Check,
  Download,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { downloadElementAsPdf, generateQuotePdfVector, printDirect, openPrintableTab } from '../../utils/printHelper';

interface QuotesViewProps {
  onOpenNewQuote: () => void;
  onNavigateToOS?: (osId: string) => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ onOpenNewQuote, onNavigateToOS }) => {
  const { quotes, clients, serviceOrders, convertQuoteToOS, updateQuoteStatus, currentCompany } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const filteredQuotes = quotes.filter((q) => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (
      search &&
      !q.quoteNumber?.toLowerCase().includes(search.toLowerCase()) &&
      !q.clientName?.toLowerCase().includes(search.toLowerCase()) &&
      !q.serviceType?.toLowerCase().includes(search.toLowerCase()) &&
      !q.propertyName?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleConvert = (quote: Quote) => {
    try {
      const os = convertQuoteToOS(quote.id);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setConversionSuccessMsg(`Ordem de Serviço ${os.osNumber} gerada com sucesso a partir de ${quote.quoteNumber}!`);
      setTimeout(() => {
        setConversionSuccessMsg(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsAppShare = (q: Quote) => {
    const client = clients.find((c) => c.id === q.clientId);
    const cleanPhone = client?.phone ? client.phone.replace(/\D/g, '') : '';
    const phoneTarget = cleanPhone.length >= 10 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';

    const text = encodeURIComponent(
      `🌾 *ORÇAMENTO DE APLICAÇÃO COM DRONE*\n` +
      `*Empresa:* ${currentCompany.tradeName || currentCompany.name}\n` +
      `*CNPJ:* ${currentCompany.cnpj || ''}\n\n` +
      `*Orçamento:* ${q.quoteNumber}\n` +
      `*Cliente:* ${q.clientName}\n` +
      `*Propriedade:* ${q.propertyName}${q.talhaoName ? ` (${q.talhaoName})` : ''}\n` +
      `*Área:* ${q.areaHa} ha • *Cultura:* ${q.crop}\n` +
      `*Serviço:* ${q.serviceType}\n` +
      `*Valor por Hectare:* R$ ${q.pricePerHa.toFixed(2)}/ha\n` +
      (q.displacementFee ? `*Deslocamento/Mobilização:* R$ ${q.displacementFee.toFixed(2)}\n` : '') +
      (q.additionalFees ? `*Taxas Adicionais:* R$ ${q.additionalFees.toFixed(2)}\n` : '') +
      (q.discount ? `*Desconto Concedido:* - R$ ${q.discount.toFixed(2)}\n` : '') +
      `*VALOR TOTAL DA PROPOSTA:* R$ ${q.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `*Condição de Pagamento:* ${q.paymentTerms || 'À vista ou 30 dias'}\n` +
      `*Validade:* ${q.validUntil}\n\n` +
      `_Estamos à disposição para esclarecer qualquer dúvida e agendar a operação!_`
    );
    const url = phoneTarget ? `https://wa.me/${phoneTarget}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Orçamentos Comerciais</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Elaboração de propostas com cálculo de deslocamento, margem líquida e conversão em 1 clique para Ordem de Serviço
          </p>
        </div>

        <button
          onClick={onOpenNewQuote}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-md cursor-pointer border border-[#05521F]/30"
        >
          <Plus className="h-4 w-4" /> Criar Novo Orçamento
        </button>
      </div>

      {/* Success Notification */}
      {conversionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-bold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#05521F] shrink-0" />
            <span>{conversionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setConversionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por orçamento, cliente, serviço, fazenda..."
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
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="aprovado">Aprovado</option>
            <option value="convertido_em_os">Convertido em OS</option>
            <option value="recusado">Recusado</option>
            <option value="expirado">Expirado</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">{filteredQuotes.length} orçamentos listados</span>
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Nenhum orçamento encontrado</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Crie uma nova proposta comercial para seus clientes com cálculo de área, margem e conversão em OS.
            </p>
            <button
              onClick={onOpenNewQuote}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#05521F] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2E7D32] cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Novo Orçamento
            </button>
          </div>
        ) : (
          filteredQuotes.map((q) => {
            const marginAmt = q.estimatedMargin ?? (q.finalAmount - (q.estimatedCost || 0));
            const marginPct = q.estimatedMarginPercent ?? (q.finalAmount > 0 ? Number(((marginAmt / q.finalAmount) * 100).toFixed(1)) : 0);
            const linkedOS = q.convertedToOsId ? serviceOrders.find((os) => os.id === q.convertedToOsId) : null;

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/50 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-[#667085] font-black text-xs border border-[#05521F]/40">
                      ORÇ
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#111827]">{q.quoteNumber}</span>
                        <span className="text-sm font-bold text-slate-800">• {q.clientName}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {q.propertyName} {q.talhaoName ? `(${q.talhaoName})` : ''} • {q.crop} • Válido até {q.validUntil}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        q.status === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.status === 'convertido_em_os'
                          ? 'bg-teal-100 text-teal-800'
                          : q.status === 'enviado'
                          ? 'bg-blue-100 text-blue-800'
                          : q.status === 'recusado'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.status === 'convertido_em_os'
                        ? 'Convertido em OS'
                        : (q.status || 'rascunho').replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      R$ {(q.finalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Área & Preço</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {q.areaHa || 0} ha • R$ {(q.pricePerHa || 0).toFixed(2)}/ha
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Deslocamento</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      R$ {(q.displacementFee || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Margem Estimada</span>
                    <span className="font-bold text-[#05521F] mt-0.5 block">
                      R$ {Number(marginAmt || 0).toFixed(2)} ({marginPct || 0}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Condição Pagamento</span>
                    <span className="font-bold text-slate-800 mt-0.5 block truncate">
                      {q.paymentTerms || '30 dias após aplicação'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {q.status !== 'convertido_em_os' ? (
                      <button
                        onClick={() => handleConvert(q)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-3.5 py-1.5 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#667085]" /> Converter em Ordem de Serviço (OS)
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#05521F]" />
                        <span>Convertido {linkedOS ? `na OS ${linkedOS.osNumber}` : 'em OS'}</span>
                      </div>
                    )}

                    {q.status === 'rascunho' && (
                      <button
                        onClick={() => updateQuoteStatus(q.id, 'enviado')}
                        className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Marcar como Enviado
                      </button>
                    )}

                    {q.status === 'enviado' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuoteStatus(q.id, 'aprovado')}
                          className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Marcar como Aprovado
                        </button>
                        <button
                          onClick={() => updateQuoteStatus(q.id, 'recusado')}
                          className="rounded-xl border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-slate-600 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Recusado
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWhatsAppShare(q)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 text-[#05521F]" /> WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuote(q);
                        setIsPrintModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#05521F]" /> Imprimir / PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PRINT / PDF MODAL */}
      {isPrintModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto p-6 sm:p-8 text-slate-800">
            {/* Modal Actions Bar (hidden during printing) */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
              <div>
                <h3 className="font-black text-base text-[#111827] flex items-center gap-2">
                  <Printer className="h-5 w-5 text-[#05521F]" />
                  Visualização de Impressão — Orçamento {selectedQuote.quoteNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Gere o PDF oficial da Proposta Comercial ou envie direto para a impressora.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openPrintableTab('printable-quote', `Proposta Comercial - ${selectedQuote.quoteNumber}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                  title="Abrir página limpa em nova aba do navegador"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-600" /> Nova Aba
                </button>
                <button
                  onClick={() => printDirect('printable-quote', `Proposta Comercial - ${selectedQuote.quoteNumber}`)}
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
                      generateQuotePdfVector(selectedQuote, currentCompany);
                    } catch (e) {
                      console.warn('Vector PDF fallback to canvas:', e);
                      await downloadElementAsPdf('printable-quote', { filename: `Proposta-${selectedQuote.quoteNumber}` });
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
            <div id="printable-quote" className="printable-document py-6 space-y-6 text-xs bg-white">
              {/* Printable Header with Company Info */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-2xs overflow-hidden">
                    <MoutryxXSymbol size="lg" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#111827]">{currentCompany.tradeName || currentCompany.name}</h3>
                    <p className="text-xs text-slate-600">
                      CNPJ: {currentCompany.cnpj || 'Não informado'} • {currentCompany.city}/{currentCompany.state} • Tel: {currentCompany.phone || 'Não informado'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentCompany.address ? `${currentCompany.address} • ` : ''}{currentCompany.email || ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Data da Proposta</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="text-center py-3 bg-[#F7F8F7] rounded-xl border border-slate-200">
                <h2 className="text-base font-black text-[#111827] tracking-wide uppercase">
                  PROPOSTA COMERCIAL DE APLICAÇÃO AEROAGRÍCOLA COM DRONE
                </h2>
                <p className="text-xs font-black text-[#05521F] mt-0.5">{selectedQuote.quoteNumber}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Dados do Cliente</p>
                  <p className="font-extrabold text-sm text-slate-900">{selectedQuote.clientName}</p>
                  <p className="text-slate-600">WhatsApp/Contato: {selectedQuote.clientWhatsapp || 'Não informado'}</p>
                  <p className="text-slate-600">Fazenda: {selectedQuote.propertyName} {selectedQuote.talhaoName ? `(${selectedQuote.talhaoName})` : ''}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Especificações Técnicas</p>
                  <p className="font-extrabold text-sm text-slate-900">{selectedQuote.serviceType}</p>
                  <p className="text-slate-600">Área Contratada: {selectedQuote.areaHa} hectares</p>
                  <p className="text-slate-600">Cultura Agrícola: {selectedQuote.crop}</p>
                  <p className="text-slate-600">Validade da Proposta: {selectedQuote.validUntil}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 avoid-break">
                <div className="flex justify-between text-slate-700">
                  <span>Aplicação ({selectedQuote.areaHa} ha @ R$ {selectedQuote.pricePerHa.toFixed(2)}/ha):</span>
                  <span className="font-bold text-slate-900">
                    R$ {(selectedQuote.subtotal || (selectedQuote.areaHa * selectedQuote.pricePerHa)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {Boolean(selectedQuote.displacementFee) && (
                  <div className="flex justify-between text-slate-700">
                    <span>Taxa de Mobilização e Deslocamento Técnico:</span>
                    <span className="font-bold text-slate-900">
                      R$ {selectedQuote.displacementFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {Boolean(selectedQuote.additionalFees) && (
                  <div className="flex justify-between text-slate-700">
                    <span>Taxas e Serviços Adicionais:</span>
                    <span className="font-bold text-slate-900">
                      R$ {selectedQuote.additionalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {Boolean(selectedQuote.discount) && (
                  <div className="flex justify-between text-[#DC2626] font-semibold">
                    <span>Desconto Especial Concedido:</span>
                    <span>- R$ {selectedQuote.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-3 text-base font-black text-[#05521F]">
                  <span>VALOR TOTAL DA PROPOSTA:</span>
                  <span>R$ {selectedQuote.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 avoid-break">
                <p className="font-bold text-slate-700 text-[10px] uppercase">Condições de Pagamento</p>
                <p className="text-slate-800 font-semibold">{selectedQuote.paymentTerms || 'Conforme acordado previamente.'}</p>
                {selectedQuote.notes && (
                  <p className="text-slate-600 text-[11px] pt-1">
                    <span className="font-bold">Observações:</span> {selectedQuote.notes}
                  </p>
                )}
              </div>

              {/* Signature lines */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[11px] avoid-break">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">{currentCompany.tradeName || currentCompany.name}</p>
                  <p className="text-slate-500">Operador Aeroagrícola Responsável</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">{selectedQuote.clientName}</p>
                  <p className="text-slate-500">Aceite do Contratante / Produtor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
