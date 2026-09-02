import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PilotCommissionRecord } from '../../types';
import {
  Percent,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  CreditCard,
  User,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CommissionsView: React.FC = () => {
  const {
    pilotCommissions,
    updateCommissionStatus,
    pilots,
    accountsReceivable,
    currentCompany,
  } = useApp();

  const [selectedPilot, setSelectedPilot] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredCommissions = pilotCommissions.filter((c) => {
    if (selectedPilot !== 'all' && c.pilotId !== selectedPilot) return false;
    if (selectedRole !== 'all') {
      const isPilot = !c.professionalRole || c.professionalRole === 'piloto';
      if (selectedRole === 'piloto' && !isPilot) return false;
      if (selectedRole === 'auxiliar_caldista' && isPilot) return false;
    }
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (
      search &&
      !c.pilotName.toLowerCase().includes(search.toLowerCase()) &&
      !c.osNumber.toLowerCase().includes(search.toLowerCase()) &&
      !c.clientName.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalAwaitingPayment = pilotCommissions
    .filter((c) => c.status === 'aguardando_pagamento_cliente' || c.status === 'prevista')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const totalLiberated = pilotCommissions
    .filter((c) => c.status === 'liberada')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const totalApproved = pilotCommissions
    .filter((c) => c.status === 'aprovada')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const totalPaid = pilotCommissions
    .filter((c) => c.status === 'paga')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const handleApprove = (id: string) => {
    updateCommissionStatus(id, 'aprovada');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  const handlePay = (id: string) => {
    updateCommissionStatus(id, 'paga');
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Percent className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Comissões de Pilotos & Equipe</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Motor de comissionamento automático com trava de segurança vinculada à liquidação do cliente (Valores reais)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            Trava de Segurança: Comissão liberada somente após pagamento do cliente
          </span>
        </div>
      </div>

      {/* 7-Step Lifecycle Rule Visual Stepper */}
      <div className="rounded-2xl border border-[#05521F]/30 bg-[#111827] p-4 text-white shadow-md">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#667085] block mb-2">
          Ciclo de Vida da Comissão (Fluxo Operacional Seguro MOUTRYX)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Passo 1</span>
            <span className="font-bold text-slate-200">Serviço Realizado</span>
          </div>
          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Passo 2</span>
            <span className="font-bold text-slate-200">OS Faturada</span>
          </div>
          <div className="p-2 bg-amber-950/40 rounded-lg border border-amber-800/50">
            <span className="text-amber-400 block text-[10px]">Passo 3</span>
            <span className="font-bold text-amber-200">Aguardando Cliente</span>
          </div>
          <div className="p-2 bg-blue-950/40 rounded-lg border border-blue-800/50">
            <span className="text-blue-400 block text-[10px]">Passo 4</span>
            <span className="font-bold text-blue-200">Cliente Paga OS</span>
          </div>
          <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
            <span className="text-[#667085] block text-[10px]">Passo 5</span>
            <span className="font-bold text-emerald-200">Liberada</span>
          </div>
          <div className="p-2 bg-teal-950/40 rounded-lg border border-teal-800/50">
            <span className="text-teal-400 block text-[10px]">Passo 6</span>
            <span className="font-bold text-teal-200">Aprovada Gestor</span>
          </div>
          <div className="p-2 bg-[#05521F] rounded-lg border border-[#05521F]">
            <span className="text-[#667085] block text-[10px]">Passo 7</span>
            <span className="font-bold text-white">Paga (Liquidada)</span>
          </div>
        </div>
      </div>

      {/* KPI Cards (100% real dynamic data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>Aguardando Cliente</span>
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-black text-amber-900">
            R$ {totalAwaitingPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-amber-700">
            {totalAwaitingPayment === 0 ? 'Todas as OS foram liquidadas' : 'Bloqueadas até liquidação da OS'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Liberadas para Aprovação</span>
            <Unlock className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-black text-emerald-900">
            R$ {totalLiberated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-700">Cliente já quitou</span>
        </div>

        <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/50">
          <div className="flex items-center justify-between text-xs text-teal-700 font-semibold">
            <span>Aprovadas</span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-2 text-xl font-black text-teal-900">
            R$ {totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-teal-700">Prontas para repasse bancário</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Já Pago</span>
            <CreditCard className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500">Histórico de comissões quitadas</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por profissional, OS, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todas as Funções</option>
            <option value="piloto">Pilotos</option>
            <option value="auxiliar_caldista">Auxiliares / Caldistas</option>
          </select>

          <select
            value={selectedPilot}
            onChange={(e) => setSelectedPilot(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Profissionais</option>
            {pilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.professionalType === 'auxiliar_caldista' ? '(Caldista)' : '(Piloto)'}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="prevista">Prevista / Bloqueada</option>
            <option value="aguardando_pagamento_cliente">Aguardando Cliente</option>
            <option value="liberada">Liberada</option>
            <option value="aprovada">Aprovada</option>
            <option value="paga">Paga</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">{filteredCommissions.length} registros</span>
      </div>

      {/* Commissions Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Profissional</th>
                <th className="py-3 px-4">OS / Cliente</th>
                <th className="py-3 px-4">Área Aplicada</th>
                <th className="py-3 px-4">Regra de Cálculo</th>
                <th className="py-3 px-4">Valor da Comissão</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma comissão encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => {
                  const commAmount = typeof comm.commissionAmount === 'number' ? comm.commissionAmount : 0;
                  const areaHa = typeof comm.areaSprayedHa === 'number' ? comm.areaSprayedHa : 0;
                  const ruleApplied = comm.commissionRuleApplied || 'Regra Padrão';
                  const isCaldista = comm.professionalRole === 'auxiliar_caldista' || comm.professionalType === 'auxiliar_caldista';

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-extrabold text-slate-900 block">{comm.pilotName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                                  isCaldista
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isCaldista ? 'Caldista' : 'Piloto'}
                              </span>
                              <span className="text-[10px] text-slate-400">{comm.serviceDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#05521F] block">{comm.osNumber}</span>
                        <span className="text-slate-600">{comm.clientName}</span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {areaHa} ha
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                          {ruleApplied}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-sm text-slate-900">
                        R$ {commAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            comm.status === 'aguardando_pagamento_cliente' || comm.status === 'prevista'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : comm.status === 'liberada'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : comm.status === 'aprovada'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {(comm.status === 'aguardando_pagamento_cliente' || comm.status === 'prevista') && <Lock className="h-3 w-3" />}
                          {comm.status === 'liberada' && <Unlock className="h-3 w-3" />}
                          {comm.status === 'aprovada' && <CheckCircle2 className="h-3 w-3" />}
                          {comm.status === 'paga' && <CreditCard className="h-3 w-3" />}
                          {comm.status === 'prevista' ? 'Prevista (Bloqueada)' : comm.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {comm.status === 'liberada' && (
                          <button
                            onClick={() => handleApprove(comm.id)}
                            className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            Aprovar
                          </button>
                        )}

                        {comm.status === 'aprovada' && (
                          <button
                            onClick={() => handlePay(comm.id)}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            Pagar (Liquidada)
                          </button>
                        )}

                        {(comm.status === 'aguardando_pagamento_cliente' || comm.status === 'prevista') && (
                          <span className="text-[11px] text-amber-700 font-semibold italic">
                            Bloqueada (Cliente Pendente)
                          </span>
                        )}

                        {comm.status === 'paga' && (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            ✓ Paga {comm.paidDate ? `em ${comm.paidDate}` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
