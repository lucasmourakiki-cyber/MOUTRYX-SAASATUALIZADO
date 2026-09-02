import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatHectares, formatPercent, formatCurrency, formatNumber } from '../../utils/formatters';
import {
  Sparkles,
  Plane,
  TrendingUp,
  DollarSign,
  Layers,
  ChevronRight,
  Play,
  Bot,
  Calendar,
  BatteryCharging,
  ArrowUpRight,
  Target,
  MessageCircle,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenCopilot: () => void;
  onOpenIntelligence: () => void;
  onOpenNewQuote: () => void;
  onOpenNewOS: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCopilot,
  onOpenIntelligence,
  onOpenNewQuote,
  onOpenNewOS,
}) => {
  const {
    currentCompany,
    metrics,
    droneIAScore,
    drones,
    batteries,
    serviceOrders,
    setActiveTab,
    setIsFieldMode,
  } = useApp();

  const operatingDrones = useMemo(() => drones.filter((d) => d.status === 'em_operacao'), [drones]);
  const availableDrones = useMemo(() => drones.filter((d) => d.status === 'disponivel'), [drones]);

  const todayOS = useMemo(
    () => {
      const todayStr = new Date().toISOString().split('T')[0];
      return serviceOrders
        .filter((os) => os.scheduledDate === todayStr || os.status === 'em_operacao' || os.status === 'agendado')
        .slice(0, 5);
    },
    [serviceOrders]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. LIGHT CLEAN AGROTECH HERO SUMMARY BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E2E8E5] bg-white p-5 sm:p-6 shadow-2xs text-[#263238]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#05521F]" />
              <span className="text-xs font-bold text-[#05521F] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Centro de Operações
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-extrabold text-[#263238] tracking-tight">
              Olá, {currentCompany?.ownerName ? currentCompany.ownerName.split(' ')[0] : 'Gestor'}. Operação com{' '}
              <span className="text-[#05521F]">{formatHectares(metrics.totalHectaresApplied)}</span> aplicados
              {metrics.hasRealCosts && metrics.averageMarginPercent !== null ? (
                <> e margem média de <span className="text-[#2E7D32]">{formatPercent(metrics.averageMarginPercent)}</span>.</>
              ) : (
                <>.</>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={onOpenIntelligence}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#0B6B32] text-white px-4 py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
              <span>Análise Estratégica</span>
            </button>
            <button
              onClick={onOpenCopilot}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-[#D5E0DA] bg-white hover:bg-[#F0F4F1] hover:text-[#05521F] text-[#52636B] px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Bot className="h-3.5 w-3.5 text-[#05521F]" />
              <span>Copiloto</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CORE METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#52636B] font-semibold">
            <span>Área Aplicada</span>
            <Layers className="h-4 w-4 text-[#05521F]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#263238] tracking-tight">
            {formatNumber(metrics.totalHectaresApplied, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs text-[#718096] font-normal">ha</span>
          </p>
          <p className="mt-1 text-[11px] text-[#05521F] font-bold flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> {metrics.completedServicesCount} {metrics.completedServicesCount === 1 ? 'serviço concluído' : 'serviços concluídos'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#52636B] font-semibold">
            <span>Faturamento</span>
            <DollarSign className="h-4 w-4 text-[#05521F]" />
          </div>
          <p className="mt-2 text-xl font-black text-[#263238] tracking-tight">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-[#718096]">
            {metrics.completedServicesCount > 0
              ? `Ticket Médio: ${formatCurrency(metrics.ticketMedio)}`
              : 'Sem faturamento realizado'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#52636B] font-semibold">
            <span>Custo Médio / ha</span>
            <TrendingUp className="h-4 w-4 text-[#E6A817]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#263238] tracking-tight">
            {metrics.hasRealCosts && metrics.averageCostPerHa !== null && metrics.totalHectaresApplied > 0
              ? formatCurrency(metrics.averageCostPerHa)
              : '--'}
          </p>
          <p className="mt-1 text-[11px] text-[#718096]">
            {metrics.hasRealCosts && metrics.averageMarginPerHa !== null && metrics.totalHectaresApplied > 0
              ? `Margem: ${formatCurrency(metrics.averageMarginPerHa)}/ha`
              : metrics.totalHectaresApplied > 0
              ? 'Custos não registrados'
              : 'Aguardando aplicações'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#52636B] font-semibold">
            <span>Frota em Operação ({drones.length})</span>
            <Plane className="h-4 w-4 text-[#05521F]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#263238] tracking-tight">
            {formatPercent(metrics.fleetUtilizationPercent)} <span className="text-xs text-[#718096] font-normal">em voo agora</span>
          </p>
          <p className="mt-1 text-[11px] text-[#05521F] font-bold">
            {operatingDrones.length} em voo • {availableDrones.length} livres
          </p>
        </div>
      </div>

      {/* 3. OPERATIONAL PIPELINE & DRONE IA SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Operational Pipeline */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8E5] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-sm text-[#263238]">Status dos Serviços</h2>
              <button
                onClick={() => setActiveTab('ordens_servico')}
                className="text-xs font-bold text-[#05521F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver Todas as OS <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#F0F4F1] p-3 border border-[#E2E8E5]">
                <span className="text-[11px] font-semibold text-[#52636B]">Agendados</span>
                <p className="text-xl font-black text-[#263238] mt-1">{metrics.scheduledServicesCount}</p>
                <span className="text-[10px] text-[#718096]">Prontos p/ campo</span>
              </div>
              <div className="rounded-xl bg-[#E8F3EC] p-3 border border-[#B7D8C1]">
                <span className="text-[11px] font-bold text-[#0B6B32]">Em Operação</span>
                <p className="text-xl font-black text-[#0B6B32] mt-1">{metrics.activeServicesCount}</p>
                <span className="text-[10px] text-[#0B6B32]">Pilotos em voo</span>
              </div>
              <div className="rounded-xl bg-[#FFF8E6] p-3 border border-[#FDE68A]">
                <span className="text-[11px] font-semibold text-[#B77900]">Faturados</span>
                <p className="text-xl font-black text-[#B77900] mt-1">
                  {serviceOrders.filter((os) => os.status === 'faturado').length}
                </p>
                <span className="text-[10px] text-[#B77900]">A receber</span>
              </div>
              <div className="rounded-xl bg-[#E8F3EC] p-3 border border-[#B7D8C1]">
                <span className="text-[11px] font-semibold text-[#16A34A]">Pagos / Liquidados</span>
                <p className="text-xl font-black text-[#16A34A] mt-1">
                  {serviceOrders.filter((os) => os.status === 'pago').length}
                </p>
                <span className="text-[10px] text-[#16A34A]">Comissões liberadas</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex items-center justify-between text-xs text-[#718096]">
            <span>Total a receber em aberto: <strong className="text-[#263238]">{formatCurrency(metrics.totalReceivablePending + metrics.totalReceivableOverdue)}</strong></span>
            <button
              onClick={() => setActiveTab('financeiro')}
              className="text-[#05521F] font-bold hover:underline cursor-pointer"
            >
              Fluxo de Caixa →
            </button>
          </div>
        </div>

        {/* Right: MOUTRYX Score */}
        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#05521F] uppercase tracking-wider">Índice Operacional</span>
                <h2 className="font-black text-base text-[#263238]">SCORE OPERACIONAL</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F3EC] text-[#05521F] font-black text-lg shadow-2xs border border-[#B7D8C1]">
                {droneIAScore.overallScore !== null ? droneIAScore.overallScore : '--'}
              </div>
            </div>

            {/* Score Bars */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[#52636B] font-medium">Produtividade</span>
                  <span className="font-bold text-[#263238]">{droneIAScore.productivityScore !== null ? formatPercent(droneIAScore.productivityScore) : '--'}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0F4F1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#05521F]" style={{ width: `${droneIAScore.productivityScore || 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[#52636B] font-medium">Margem Operacional</span>
                  <span className="font-bold text-[#263238]">{droneIAScore.marginScore !== null ? formatPercent(droneIAScore.marginScore) : 'Não apurada'}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0F4F1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#2E7D32]" style={{ width: `${droneIAScore.marginScore || 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[#52636B] font-medium">Frota & Baterias</span>
                  <span className="font-bold text-[#263238]">{droneIAScore.fleetUtilizationScore !== null ? formatPercent(droneIAScore.fleetUtilizationScore) : '--'}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0F4F1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3FA34D]" style={{ width: `${droneIAScore.fleetUtilizationScore || 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('drone_score')}
            className="mt-4 w-full rounded-xl bg-white hover:bg-[#F0F4F1] hover:text-[#05521F] text-[#52636B] text-xs font-bold py-2 transition-colors flex items-center justify-center gap-1.5 border border-[#D5E0DA] cursor-pointer"
          >
            Ver Detalhes do Score <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* MOUTRYX REATIVA BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 text-[#263238] shadow-2xs border border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F3EC] text-[#05521F] font-black shrink-0 border border-[#B7D8C1]">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#05521F] bg-[#E8F3EC] px-2 py-0.5 rounded border border-[#B7D8C1]">
                REATIVAÇÃO COMERCIAL
              </span>
              <h3 className="text-sm font-black text-[#263238]">MOUTRYX REATIVA</h3>
            </div>
            <p className="text-xs text-[#52636B] mt-1">
              Recupere clientes inativos na carteira com mensagens estratégicas prontas para WhatsApp oficial.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('reativa')}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#0B6B32] text-white px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          <MessageCircle className="h-4 w-4" /> Abrir Radar de Reativação
        </button>
      </div>

      {/* 4. TODAY'S FIELD OPERATIONS & FLEET STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Operations */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8E5] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#05521F]" />
              <h2 className="font-extrabold text-sm text-[#263238]">Operações do Dia</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNewOS}
                className="rounded-xl bg-[#05521F] hover:bg-[#0B6B32] text-white text-xs font-bold px-3.5 py-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                + Nova OS
              </button>
              <button
                onClick={onOpenNewQuote}
                className="rounded-xl bg-white hover:bg-[#F0F4F1] hover:text-[#05521F] text-[#52636B] text-xs font-bold px-3.5 py-1.5 transition-colors cursor-pointer border border-[#D5E0DA]"
              >
                + Orçamento
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {todayOS.map((os) => (
              <div
                key={os.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[#E2E8E5] bg-[#F0F4F1]/60 p-3 hover:bg-white hover:border-[#05521F]/30 transition-colors gap-2.5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                      os.status === 'em_operacao'
                        ? 'bg-[#05521F] text-white animate-pulse'
                        : os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago'
                        ? 'bg-[#05521F] text-white'
                        : 'bg-[#F0F4F1] text-[#52636B]'
                    }`}
                  >
                    {os.status === 'em_operacao' ? 'VOO' : 'OS'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-[#263238]">{os.osNumber}</span>
                      <span className="text-xs font-semibold text-[#263238]">• {os.clientName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          os.status === 'em_operacao'
                            ? 'bg-[#E8F3EC] text-[#0B6B32] border border-[#B7D8C1]'
                            : os.status === 'faturado'
                            ? 'bg-[#FFF8E6] text-[#B77900] border border-[#FDE68A]'
                            : os.status === 'pago'
                            ? 'bg-[#E8F3EC] text-[#16A34A] border border-[#B7D8C1]'
                            : 'bg-[#F0F4F1] text-[#718096] border border-[#E2E8E5]'
                        }`}
                      >
                        {os.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-[#718096] mt-0.5">
                      {os.propertyName} • {os.crop} ({formatHectares(os.areaHa)}) • Piloto: <strong className="text-[#263238]">{os.pilotName}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setIsFieldMode(true);
                      setActiveTab('modo_campo');
                    }}
                    className="flex items-center gap-1 rounded-xl bg-[#E8F3EC] hover:bg-[#B7D8C1]/40 text-[#05521F] border border-[#B7D8C1] px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Play className="h-3 w-3" /> Modo Campo
                  </button>
                  <button
                    onClick={() => setActiveTab('ordens_servico')}
                    className="rounded-xl border border-[#D5E0DA] bg-white hover:bg-[#F0F4F1] px-2.5 py-1 text-xs font-semibold text-[#52636B] transition-colors cursor-pointer"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Fleet & Battery Health */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-sm text-[#263238]">Drones em Campo ({drones.length})</h2>
              <button onClick={() => setActiveTab('drones')} className="text-xs text-[#05521F] font-bold hover:underline cursor-pointer">
                Gerenciar
              </button>
            </div>

            <div className="space-y-2">
              {drones.map((drone) => (
                <div key={drone.id} className="flex items-center justify-between rounded-xl bg-[#F0F4F1] p-2.5 border border-[#E2E8E5]">
                  <div className="flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-[#05521F]" />
                    <span className="font-bold text-xs text-[#263238]">{drone.model} ({drone.assetTag})</span>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      drone.status === 'em_operacao'
                        ? 'bg-[#E8F3EC] text-[#0B6B32] border border-[#B7D8C1]'
                        : drone.status === 'em_manutencao'
                        ? 'bg-[#FFF8E6] text-[#B77900] border border-[#FDE68A]'
                        : 'bg-[#E8F3EC] text-[#16A34A] border border-[#B7D8C1]'
                    }`}
                  >
                    {drone.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[#B77900] font-bold text-xs">
                <BatteryCharging className="h-4 w-4 text-[#E6A817]" />
                <span>Ciclos de Bateria</span>
              </div>
              <button onClick={() => setActiveTab('drones')} className="text-[10px] text-[#B77900] font-semibold hover:underline cursor-pointer">
                Ver todas
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {batteries.slice(0, 2).map((bat) => (
                <div key={bat.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#FDE68A]">
                  <span className="font-semibold text-[#263238]">{bat.identifier} ({bat.cycles} ciclos)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8F3EC] text-[#16A34A] border border-[#B7D8C1]">
                    {formatPercent(bat.healthPercent)} Saúde
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
