import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { MoutryxXSymbol } from '../common/MoutryxXSymbol';
import {
  Sparkles,
  Bot,
  Send,
  X,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Plane,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Zap,
  ExternalLink,
  MapPin,
} from 'lucide-react';

interface DroneIAIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'intelligence' | 'copilot' | 'recommendations';
}

function parseLineTokens(line: string): React.ReactNode {
  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      elements.push(line.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // Markdown link: [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      const isMaps =
        linkUrl.includes('google.com/maps') ||
        linkUrl.includes('waze.com') ||
        linkText.includes('Maps') ||
        linkText.includes('Waze') ||
        linkText.includes('Rota');

      elements.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 my-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-all no-underline ${
            isMaps
              ? 'bg-[#05521F]/40 text-[#667085] border border-[#05521F]/40 hover:bg-[#05521F]/60 hover:text-white shadow-xs'
              : 'bg-[#05521F]/40 text-[#667085] border border-[#05521F]/40 hover:bg-[#05521F]/60 hover:text-white'
          }`}
        >
          {isMaps && <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
          <span>{linkText}</span>
          <ExternalLink className="h-3 w-3 inline-block ml-0.5 opacity-80 shrink-0" />
        </a>
      );
    } else if (match[4]) {
      // Bold: **text**
      elements.push(
        <strong key={`bold-${match.index}`} className="font-bold text-white">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      // Inline code: `code`
      elements.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-emerald-300 font-mono text-[11px]"
        >
          {match[7]}
        </code>
      );
    } else if (match[8]) {
      // Italic: *text*
      elements.push(
        <em key={`italic-${match.index}`} className="italic text-slate-300">
          {match[9]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    elements.push(line.substring(lastIndex));
  }

  return elements.length > 0 ? <>{elements}</> : line;
}

function FormattedAIMessage({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1 text-xs leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const isHeader = trimmed.startsWith('#') || trimmed.startsWith('📍') || trimmed.startsWith('🤖') || trimmed.startsWith('🌾') || trimmed.startsWith('💰') || trimmed.startsWith('🚁');

        return (
          <div
            key={idx}
            className={`${isBullet ? 'pl-2 flex items-start gap-1.5' : ''} ${isHeader ? 'font-medium text-slate-100' : ''}`}
          >
            {parseLineTokens(line)}
          </div>
        );
      })}
    </div>
  );
}

export const DroneIAIntelligenceModal: React.FC<DroneIAIntelligenceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'intelligence',
}) => {
  const {
    currentCompany,
    metrics,
    droneIAScore,
    aiRecommendations,
    getCompanyContextForAI,
    drones,
  } = useApp();

  const { isAuthenticated } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'intelligence' | 'copilot' | 'recommendations'>(initialTab);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Olá, ${currentCompany.ownerName.split(' ')[0]}! Sou a inteligência **MOUTRYX**, sua aliada operacional e financeira.

Analisei em tempo real os dados da **${currentCompany.tradeName || currentCompany.name}**:
• Realizamos **${metrics.totalHectaresApplied.toFixed(1)} ha** registrados em ordens concluídas.
${metrics.hasRealCosts && metrics.averageMarginPercent !== null ? `• Margem média operacional apurada de **${metrics.averageMarginPercent}%** com resultado líquido de **R$ ${metrics.netResult?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.` : '• Lance despesas e contas a pagar para cálculo detalhado de margem líquida real.'}
• Contas a receber pendentes: **R$ ${metrics.totalReceivablePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.

Como posso te ajudar agora? Escolha uma das perguntas rápidas abaixo ou digite sua dúvida.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) setActiveSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const quickQuestions = [
    '🗺️ Onde fica a Fazenda Rio Bonito?',
    '📍 Localização de todas as fazendas',
    '🌾 Quais talhões estão cadastrados?',
    '🚁 Status e horas de voo do DJI Agras T100',
    '💰 Quanto lucrei e o que tenho a receber?',
    '⚠️ Quais contas estão vencidas?',
    '👨‍✈️ Produtividade e comissões dos pilotos',
    '🧪 Dosagem do Fox Xpro para Soja',
    '🔋 Ciclos e saúde das baterias',
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else if (contentType.includes('text/event-stream')) {
        const text = await res.text();
        // Parse SSE chunks if returned
        const lines = text.split('\n');
        let fullReply = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.chunk) fullReply += parsed.chunk;
              else if (parsed.reply) fullReply += parsed.reply;
            } catch {
              // Ignore non-json chunk
            }
          }
        }
        data = { reply: fullReply || text };
      } else {
        const text = await res.text().catch(() => '');
        console.error('[MOUTRYX CHAT] Resposta não-JSON recebida:', res.status, text.substring(0, 100));
        throw new Error(`Erro inesperado no servidor (${res.status}). Não foi possível processar a consulta.`);
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sessão expirada ou não autenticada. Por favor, faça login novamente.');
        } else if (res.status === 403) {
          throw new Error(data.error || 'Acesso negado. Seu perfil de usuário não possui permissão para consultar a MOUTRYX Intelligence.');
        } else {
          throw new Error(data.error || `Erro no servidor (${res.status}). Não foi possível processar a consulta.`);
        }
      }

      const aiReply = data.reply || 'Não foi possível gerar a resposta no momento.';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error: any) {
      console.error('Error calling /api/chat:', error);
      const errorMsg = error?.message || 'Não foi possível contactar o servidor de IA.';
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **Aviso:** ${errorMsg}\n\n• **Faturamento:** R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• **Resultado Líquido:** R$ ${metrics.netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• **Margem Média:** ${metrics.averageMarginPercent}%`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[820px] rounded-2xl border border-[#05521F]/50 bg-[#111827] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#05521F]/30 px-6 py-4 bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-md border border-[#05521F]/40 overflow-hidden">
              <MoutryxXSymbol className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-wide">MOUTRYX INTELLIGENCE</h3>
                <span className="rounded-full bg-[#05521F] px-2.5 py-0.5 text-[10px] font-bold text-[#667085] border border-[#05521F]/30 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[#667085]" /> IA Ativa
                </span>
              </div>
              <p className="text-xs text-[#667085]/80 font-medium">Inteligência Operacional, Financeira & Agronômica</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-300 hover:bg-[#05521F]/30 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#05521F]/30 bg-[#111827]/80 px-6 pt-2">
          <button
            onClick={() => setActiveSubTab('intelligence')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'intelligence'
                ? 'border-[#667085] text-[#667085]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Raio-X Executivo
          </button>

          <button
            onClick={() => setActiveSubTab('copilot')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'copilot'
                ? 'border-[#667085] text-[#667085]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4" />
            Pergunte à MOUTRYX
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'recommendations'
                ? 'border-[#667085] text-[#667085]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            Motor de Recomendações ({aiRecommendations.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#111827]/40">
          {/* TAB 1: EXECUTIVE INTELLIGENCE */}
          {activeSubTab === 'intelligence' && (
            <div className="space-y-6">
              {/* Executive Briefing Banner */}
              <div className="rounded-2xl border border-[#05521F]/40 bg-gradient-to-r from-[#111827] via-[#111827] to-[#111827] p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#05521F] text-[#667085] font-black text-xl shrink-0 shadow-md border border-[#05521F]/40">
                    {droneIAScore.overallScore}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-base text-white">
                        Diagnóstico Geral: {currentCompany.tradeName || currentCompany.name}
                      </h4>
                      <span className="text-xs font-bold text-[#667085] bg-[#05521F]/60 border border-[#05521F]/40 px-2.5 py-1 rounded-full">
                        MOUTRYX Score: {droneIAScore.overallScore !== null ? `${droneIAScore.overallScore}/100` : 'Em apuração'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Sua empresa possui <strong className="text-white">{metrics.totalHectaresApplied.toFixed(1)} ha</strong> aplicados registrados em ordens concluídas
                      {metrics.hasRealCosts && metrics.averageMarginPercent !== null ? (
                        <> com margem média de <strong className="text-emerald-400">{metrics.averageMarginPercent}%</strong></>
                      ) : null}
                      . Faturamento realizado: <strong className="text-emerald-400">R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. Existem <strong className="text-amber-400">R$ {metrics.totalReceivablePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> a receber.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Pillars of Intelligence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#05521F]/30 bg-[#111827] p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Produtividade</span>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="mt-2 font-black text-xl text-white">{droneIAScore.productivityScore !== null ? `${droneIAScore.productivityScore}/100` : '--'}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{metrics.completedServicesCount} de {metrics.completedServicesCount + metrics.scheduledServicesCount} missões concluídas</p>
                </div>

                <div className="rounded-xl border border-[#05521F]/30 bg-[#111827] p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Margem / Hectare</span>
                    <DollarSign className="h-4 w-4 text-[#667085]" />
                  </div>
                  <p className="mt-2 font-black text-xl text-white">
                    {metrics.hasRealCosts && metrics.averageMarginPerHa !== null ? `R$ ${metrics.averageMarginPerHa.toFixed(2)}/ha` : '--'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {metrics.hasRealCosts && metrics.averageCostPerHa !== null ? `Custo real: R$ ${metrics.averageCostPerHa.toFixed(2)}/ha` : 'Custos não registrados'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#05521F]/30 bg-[#111827] p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Utilização da Frota</span>
                    <Plane className="h-4 w-4 text-[#05521F]" />
                  </div>
                  <p className="mt-2 font-black text-xl text-white">{metrics.fleetUtilizationPercent}%</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {drones.filter((d) => d.status === 'em_operacao').length} em operação • {drones.filter((d) => d.status === 'em_manutencao').length} em manutenção
                  </p>
                </div>

                <div className="rounded-xl border border-[#05521F]/30 bg-[#111827] p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Controle Financeiro</span>
                    <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <p className="mt-2 font-black text-xl text-white">{droneIAScore.financialControlScore !== null ? `${droneIAScore.financialControlScore}/100` : '--'}</p>
                  <p className="mt-1 text-[11px] text-amber-400/90 font-medium">R$ {metrics.totalReceivableOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencidos</p>
                </div>
              </div>

              {/* Strengths & Critical Attention Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Pontos Fortes Identificados
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    {droneIAScore.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/30">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{str.replace('✓ ', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Gargalos & Pontos de Atenção
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    {droneIAScore.attentionPoints.map((att, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/30">
                        <span className="text-amber-400 font-bold">⚠</span>
                        <span>{att.replace('⚠ ', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COPILOT CHAT */}
          {activeSubTab === 'copilot' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[440px]">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 shrink-0 shadow-md border border-[#05521F]/40 overflow-hidden">
                        <MoutryxXSymbol className="h-full w-full object-contain" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#05521F] text-white rounded-tr-xs whitespace-pre-wrap'
                          : 'bg-[#111827] text-slate-200 border border-[#05521F]/40 rounded-tl-xs shadow-md'
                      }`}
                    >
                      {msg.sender === 'ai' ? (
                        <FormattedAIMessage text={msg.text} />
                      ) : (
                        <p>{msg.text}</p>
                      )}
                      <span className="mt-2 block text-[10px] text-slate-400 text-right">{msg.time}</span>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white font-bold text-xs shrink-0">
                        {currentCompany.ownerName.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 shrink-0 animate-pulse border border-[#05521F]/40 overflow-hidden">
                      <MoutryxXSymbol className="h-full w-full object-contain" />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs border border-[#05521F]/40 bg-[#111827] p-4 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-[#667085]" />
                        <span>Analisando sua operação...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-[#667085] mb-2 uppercase tracking-wider">
                  Perguntas Sugeridas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      disabled={isLoading}
                      className="rounded-full border border-[#05521F]/40 bg-[#05521F]/20 px-3 py-1 text-[11px] text-slate-200 hover:border-[#05521F]/60 hover:bg-[#05521F]/40 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-2 border-t border-[#05521F]/30 pt-3">
                <input
                  type="text"
                  placeholder="Pergunte sobre rentabilidade, drones, clientes, custos por hectare..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-[#05521F]/40 bg-[#111827] px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer border border-[#05521F]/40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: RECOMMENDATIONS ENGINE */}
          {activeSubTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#05521F]/20 border border-[#05521F]/40 p-3.5 text-xs text-slate-300">
                <p className="font-bold text-white mb-1">Princípio do Motor de Recomendações MOUTRYX:</p>
                <p className="text-slate-300">
                  Toda recomendação é baseada na fórmula: <strong className="text-[#667085]">DADO</strong> → <strong className="text-[#667085]">ANÁLISE</strong> → <strong className="text-[#667085]">MOTIVO</strong> → <strong className="text-[#667085]">AÇÃO SUGERIDA</strong>.
                </p>
              </div>

              <div className="space-y-3">
                {aiRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-[#05521F]/40 bg-[#111827] p-4.5 space-y-3 hover:border-[#05521F]/60 transition-colors shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            rec.impactLevel === 'alto'
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                              : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                          }`}
                        >
                          Impacto {rec.impactLevel}
                        </span>
                        <h4 className="font-bold text-sm text-white">{rec.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-[#667085] bg-[#05521F]/40 border border-[#05521F]/40 px-2.5 py-1 rounded-md">
                        {rec.potentialGain}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1 bg-[#111827]/60 p-2.5 rounded-lg border border-[#05521F]/30">
                        <p className="font-bold text-[#667085] text-[10px] uppercase">📊 Dado Real</p>
                        <p className="text-slate-200">{rec.dataPoint}</p>
                      </div>

                      <div className="space-y-1 bg-[#111827]/60 p-2.5 rounded-lg border border-[#05521F]/30">
                        <p className="font-bold text-[#667085] text-[10px] uppercase">🔍 Diagnóstico / Motivo</p>
                        <p className="text-slate-200">{rec.reason}</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-950/40 border border-emerald-900/50 p-3 text-xs">
                      <p className="font-bold text-emerald-300 text-[10px] uppercase flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Ação Sugerida
                      </p>
                      <p className="text-slate-200">{rec.suggestedAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
