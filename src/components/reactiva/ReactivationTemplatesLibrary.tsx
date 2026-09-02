import React, { useState } from 'react';
import {
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Send,
} from 'lucide-react';
import { REACTIVATION_TEMPLATES } from '../../data/reactivationTemplates';
import { ReactivationMessageTemplate, Company, ReactivationClientSummary } from '../../types';
import { formatReactivationMessage } from '../../utils/reactivationEngine';

interface ReactivationTemplatesLibraryProps {
  company: Company;
  responsibleName?: string;
}

export const ReactivationTemplatesLibrary: React.FC<ReactivationTemplatesLibraryProps> = ({
  company,
  responsibleName = 'Lucas Moura',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sample mock client for preview purposes
  const sampleClient: ReactivationClientSummary = {
    clientId: 'sample',
    clientName: 'Fazenda Boa Esperança / Agro Guimarães',
    contactName: 'Rogério Guimarães',
    phone: '(66) 99822-4411',
    whatsapp: '(66) 99822-4411',
    city: 'Ipiranga do Norte',
    state: 'MT',
    rating: 5,
    totalHectares: 3400,
    totalRevenue: 112000,
    lastServiceDate: '2026-06-03',
    lastServiceName: 'Aplicação Fungicida Milho',
    lastCrop: 'Milho Safrinha',
    lastPropertyName: 'Fazenda Boa Esperança',
    daysSinceLastService: 75,
    averageServiceIntervalDays: 45,
    totalCompletedOrders: 3,
    totalQuotesCount: 1,
    reactivationScore: 88,
    scoreTier: 'alta_prioridade' as const,
    scoreReasons: ['Janela ideal de retorno'],
    opportunityScore: 92,
    opportunityTier: 'maxima' as const,
    opportunityReasons: ['30 dias além do ciclo habitual', 'Histórico de alto faturamento'],
    nextBestAction: 'Oferecer dessecação pré-plantio ou fungicida safrinha com condições preferenciais.',
    recommendedMessage: 'Olá Rogério, tudo bem? Notamos que já fazem 75 dias da última dessecação na Fazenda Boa Esperança...',
    averageTicket: 37333,
    daysPastExpectedCadence: 30,
    isAtRiskOfChurn: false,
    quadrantClassification: 'alto_alto' as const,
    simplePriority: 'alta',
    simplePriorityExplanation: 'Cliente recorrente (3 serviços). Está há 75 dias sem contratar.',
    simpleStatus: 'a_contatar',
    estimatedPotentialRevenue: 15800,
    funnelStage: 'selecionado' as const,
  };

  const filteredTemplates = REACTIVATION_TEMPLATES.filter((tpl) => {
    if (selectedCategory !== 'all' && tpl.category !== selectedCategory) return false;
    if (searchTerm) {
      const match =
        tpl.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.templateText.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Copywriting Agrícola de Alta Conversão
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Biblioteca de Modelos de Mensagens para WhatsApp
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Estruturas validadas para contato comercial direto com produtores rurais e agrônomos. 
          Todas as variáveis dinâmicas como <code className="text-emerald-400 font-mono text-[11px]">{'{NOME_CONTATO}'}</code>, <code className="text-emerald-400 font-mono text-[11px]">{'{NOME_FAZENDA}'}</code> e <code className="text-emerald-400 font-mono text-[11px]">{'{DIAS_SEM_APLICAR}'}</code> são substituídas em tempo real.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos os Modelos' },
            { id: 'fungicida', label: '🌾 Fungicida / Inseticida' },
            { id: 'dessecacao', label: '🌱 Dessecação & Pré-Plantio' },
            { id: 'plantao_chuva', label: '🌧️ Pós-Chuva / Resgate' },
            { id: 'exclusivo_fiel', label: '⭐ Cliente Fiel' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const liveFormatted = formatReactivationMessage(
            template.templateText,
            sampleClient,
            company,
            responsibleName,
            'DJI Agras T100 / T50'
          );

          const isCopied = copiedId === template.id;

          return (
            <div
              key={template.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {template.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {template.description}
                    </p>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase shrink-0">
                    {template.tone}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {template.categoryLabel || 'Safra Geral'}
                  </span>
                </div>

                {/* Message Box */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                  {liveFormatted}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Exemplo pré-visualizado com dados dinâmicos
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(template.id, liveFormatted)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Modelo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
