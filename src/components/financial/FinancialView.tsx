import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountReceivable, AccountPayable } from '../../types';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Check,
  Percent,
  Sparkles,
  Plane,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FinancialView: React.FC = () => {
  const {
    accountsReceivable,
    accountsPayable,
    maintenanceRecords,
    settleAccountReceivable,
    settleAccountPayable,
    serviceOrders,
    drones,
    clients,
    metrics,
    currentCompany,
    activeTab: globalTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'visao_geral' | 'receber' | 'pagar' | 'rentabilidade'>(() => {
    if (globalTab === 'pagar' || globalTab === 'contas_pagar') return 'pagar';
    if (globalTab === 'receber' || globalTab === 'contas_receber') return 'receber';
    if (globalTab === 'rentabilidade') return 'rentabilidade';
    return 'visao_geral';
  });

  React.useEffect(() => {
    if (globalTab === 'pagar' || globalTab === 'contas_pagar') setActiveTab('pagar');
    else if (globalTab === 'receber' || globalTab === 'contas_receber') setActiveTab('receber');
    else if (globalTab === 'rentabilidade') setActiveTab('rentabilidade');
    else if (globalTab === 'financeiro') setActiveTab('visao_geral');
  }, [globalTab]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredReceivables = accountsReceivable.filter((r) => {
    if (!r) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (
      search &&
      !(r.clientName || '').toLowerCase().includes(search.toLowerCase()) &&
      !(r.osNumber || '').toLowerCase().includes(search.toLowerCase()) &&
      !(r.description || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredPayables = accountsPayable.filter((p) => {
    if (!p) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (
      search &&
      !(p.supplierName || '').toLowerCase().includes(search.toLowerCase()) &&
      !(p.description || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSettleReceivable = (id: string, clientName: string) => {
    settleAccountReceivable(id, 'PIX');
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  const handleSettlePayable = (id: string) => {
    settleAccountPayable(id);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Dynamic profitability by Drone (using real registered expenses & completed sprayed area)
  const droneProfitability = React.useMemo(() => {
    return drones.map((d) => {
      const droneOS = serviceOrders.filter((os) => os.droneId === d.id && os.status !== 'cancelado');
      const completedDroneOS = droneOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');
      const totalHa = completedDroneOS.reduce((acc, os) => {
        const ha = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : 0;
        return acc + ha;
      }, 0);
      const revenue = completedDroneOS.reduce((acc, os) => acc + (os.finalAmount || 0), 0);
      const dronePaidPayables = accountsPayable.filter((p) => p.droneId === d.id && p.status === 'pago');
      const hasDroneCosts = dronePaidPayables.length > 0;
      const realCost = dronePaidPayables.reduce((acc, p) => acc + p.amount, 0);
      const net = hasDroneCosts ? revenue - realCost : null;
      const marginPerHa = (hasDroneCosts && totalHa > 0 && net !== null) ? net / totalHa : null;
      return {
        id: d.id,
        model: d.model,
        code: d.serialNumber || d.model,
        totalHa,
        flightHours: d.flightHours || 0,
        revenue,
        hasDroneCosts,
        realCost,
        net,
        marginPerHa,
        marginPercent: (hasDroneCosts && revenue > 0 && net !== null) ? (net / revenue) * 100 : null,
      };
    });
  }, [drones, serviceOrders, accountsPayable]);

  // Dynamic profitability by Client (using completed revenue and real applied area)
  const clientProfitability = React.useMemo(() => {
    return clients.map((c) => {
      const clientOS = serviceOrders.filter((os) => os.clientId === c.id && os.status !== 'cancelado');
      const completedClientOS = clientOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');
      const totalHa = completedClientOS.reduce((acc, os) => {
        const ha = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : 0;
        return acc + ha;
      }, 0);
      const revenue = completedClientOS.reduce((acc, os) => acc + (os.finalAmount || 0), 0);
      return {
        id: c.id,
        name: c.name,
        city: c.city || 'Regional',
        state: c.state || 'BR',
        totalHa,
        revenue,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [clients, serviceOrders]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Módulo Financeiro & Contas</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de contas a receber, contas a pagar e rentabilidade operacional consolidada
          </p>
        </div>
      </div>

      {/* Financial Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-emerald-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Recebido</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-black text-emerald-700">
            R$ {metrics.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500">Liquidado na conta</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#05521F]/30 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Contas a Receber</span>
            <Clock className="h-4 w-4 text-[#05521F]" />
          </div>
          <p className="mt-2 text-xl font-black text-[#05521F]">
            R$ {metrics.totalReceivablePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500">A vencer nos próximos dias</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>Vencidos (Inadimplência)</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-xl font-black text-rose-700">
            R$ {metrics.totalReceivableOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-rose-600">Ação de cobrança recomendada</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Margem Líquida</span>
            <Percent className="h-4 w-4 text-[#05521F]" />
          </div>
          <p className="mt-2 text-xl font-black text-[#111827]">
            {metrics.hasRealCosts && metrics.averageMarginPercent !== null ? `${metrics.averageMarginPercent}%` : '--'}
          </p>
          <span className="text-[10px] text-slate-500">
            {metrics.hasRealCosts && metrics.averageMarginPerHa !== null ? `R$ ${metrics.averageMarginPerHa.toFixed(2)}/ha margem` : 'Custos não registrados'}
          </span>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('visao_geral');
            setFilterStatus('all');
          }}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'visao_geral' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Visão Geral & Fluxo
        </button>

        <button
          onClick={() => {
            setActiveTab('receber');
            setFilterStatus('all');
          }}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'receber' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          A Receber ({accountsReceivable.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('pagar');
            setFilterStatus('all');
          }}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'pagar' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          A Pagar ({accountsPayable.length})
        </button>

        <button
          onClick={() => setActiveTab('rentabilidade')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rentabilidade' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rentabilidade por Drone & Cliente
        </button>
      </div>

      {/* TAB 0: VISÃO GERAL */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Próximos Recebimentos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-[#111827]">Próximos Recebimentos</h3>
                </div>
                <button
                  onClick={() => setActiveTab('receber')}
                  className="text-xs font-bold text-[#05521F] hover:underline cursor-pointer"
                >
                  Ver todos ({accountsReceivable.filter(r => r.status !== 'pago').length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {accountsReceivable.filter(r => r.status !== 'pago').slice(0, 4).map((rec) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{rec.clientName}</p>
                      <p className="text-[11px] text-slate-500">{rec.osNumber} • Vencimento: {rec.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#05521F]">
                        R$ {rec.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        rec.status === 'vencido' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
                {accountsReceivable.filter(r => r.status !== 'pago').length === 0 && (
                  <p className="py-4 text-xs text-slate-500 text-center">Nenhum recebimento pendente no momento.</p>
                )}
              </div>
            </div>

            {/* Próximos Pagamentos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                  <h3 className="font-extrabold text-sm text-[#111827]">Próximos Pagamentos & Despesas</h3>
                </div>
                <button
                  onClick={() => setActiveTab('pagar')}
                  className="text-xs font-bold text-[#05521F] hover:underline cursor-pointer"
                >
                  Ver todos ({accountsPayable.filter(p => p.status !== 'pago').length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {accountsPayable.filter(p => p.status !== 'pago').slice(0, 4).map((pay) => (
                  <div key={pay.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{pay.supplierName}</p>
                      <p className="text-[11px] text-slate-500">{pay.description} • Vencimento: {pay.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-rose-700">
                        R$ {pay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {pay.category || pay.costCenter || 'Despesa'}
                      </span>
                    </div>
                  </div>
                ))}
                {accountsPayable.filter(p => p.status !== 'pago').length === 0 && (
                  <p className="py-4 text-xs text-slate-500 text-center">Nenhum pagamento pendente no momento.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: CONTAS A RECEBER */}
      {activeTab === 'receber' && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#05521F]" />
              <span>
                <strong>Automação MOUTRYX:</strong> Ao clicar em <strong>"Dar Baixa"</strong> no recebimento de uma OS, a comissão do respectivo piloto é automaticamente liberada para aprovação e repasse!
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, OS ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#05521F] bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {['all', 'aberto', 'vencido', 'pago'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer capitalize ${
                    filterStatus === st
                      ? 'bg-[#111827] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st === 'aberto' ? 'Pendentes' : st === 'vencido' ? 'Vencidos' : 'Recebidos'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Cliente / Descrição</th>
                  <th className="py-3 px-4">OS Vinculada</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceivables.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block">{rec.clientName}</span>
                      <span className="text-[11px] text-slate-500">{rec.description}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#05521F]">{rec.osNumber}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {rec.dueDate}
                    </td>

                    <td className="py-3.5 px-4 font-black text-sm text-slate-900">
                      R$ {rec.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          rec.status === 'pago'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'vencido'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : 'bg-emerald-50 text-[#05521F] border border-emerald-200'
                        }`}
                      >
                        {rec.status === 'pago' ? 'Recebido' : rec.status === 'vencido' ? 'Vencido' : 'Pendente'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {rec.status !== 'pago' ? (
                        <button
                          onClick={() => handleSettleReceivable(rec.id, rec.clientName)}
                          className="rounded-lg bg-[#05521F] hover:bg-[#2E7D32] text-white font-bold px-3 py-1.5 text-xs transition-colors shadow-xs cursor-pointer border border-[#05521F]/30"
                        >
                          Dar Baixa (Recebido)
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Baixado em {rec.paymentDate || 'hoje'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredReceivables.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Nenhum recebimento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONTAS A PAGAR */}
      {activeTab === 'pagar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar fornecedor ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#05521F] bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {['all', 'aberto', 'vencido', 'pago'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer capitalize ${
                    filterStatus === st
                      ? 'bg-[#111827] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st === 'aberto' ? 'Pendentes' : st === 'vencido' ? 'Vencidos' : 'Pagos'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Fornecedor / Favorecido</th>
                  <th className="py-3 px-4">Categoria / Centro de Custo</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayables.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block">{pay.supplierName}</span>
                      <span className="text-[11px] text-slate-500">{pay.description}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 border border-slate-200">
                        {(pay.category || pay.costCenter || 'Despesa').toUpperCase()} • {pay.costCenter || 'Geral'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {pay.dueDate}
                    </td>

                    <td className="py-3.5 px-4 font-black text-sm text-slate-900">
                      R$ {pay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          pay.status === 'pago'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pay.status === 'vencido'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pay.status === 'pago' ? 'Pago' : pay.status === 'vencido' ? 'Vencido' : 'Pendente'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {pay.status !== 'pago' ? (
                        <button
                          onClick={() => handleSettlePayable(pay.id)}
                          className="rounded-lg bg-[#05521F] hover:bg-[#2E7D32] text-white font-bold px-3 py-1.5 text-xs transition-colors shadow-xs cursor-pointer border border-[#05521F]/30"
                        >
                          Registrar Pagamento
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs">✓ Pago em {pay.paymentDate || 'hoje'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayables.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Nenhum pagamento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RENTABILIDADE POR DRONE & CLIENTE */}
      {activeTab === 'rentabilidade' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-[#05521F]" />
              <h3 className="font-extrabold text-sm text-[#111827]">Rentabilidade por Drone</h3>
            </div>
            <div className="space-y-3 text-xs">
              {droneProfitability.map((dp) => (
                <div key={dp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{dp.model} ({dp.code})</p>
                    <p className="text-slate-500">{dp.totalHa.toFixed(1)} ha aplicados • {dp.flightHours}h voo</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-700">
                      {dp.hasDroneCosts && dp.marginPerHa !== null ? `R$ ${dp.marginPerHa.toFixed(2)}/ha margem` : 'Custos não vinculados'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Faturamento: R$ {dp.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#05521F]" />
              <h3 className="font-extrabold text-sm text-[#111827]">Top Clientes por Volume Faturado</h3>
            </div>
            <div className="space-y-3 text-xs">
              {clientProfitability.slice(0, 5).map((cp) => (
                <div key={cp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{cp.name}</p>
                    <p className="text-slate-500">{cp.city}/{cp.state} • {cp.totalHa.toFixed(1)} ha aplicados</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#05521F]">
                      R$ {cp.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                      {cp.totalHa > 0 ? `${cp.totalHa.toFixed(1)} ha` : 'Sem voos concluídos'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
