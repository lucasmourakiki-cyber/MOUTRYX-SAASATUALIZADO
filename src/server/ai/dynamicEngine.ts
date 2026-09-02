import { getCompanyRepository } from '../auth/repositoryFactory';
import {
  clientRepository,
  propertyRepository,
  talhaoRepository,
  droneRepository,
  batteryRepository,
  pilotRepository,
  maintenanceRepository,
  catalogRepository,
} from '../db/repositories/operationalRepositories';
import {
  serviceOrderRepository,
  receivableRepository,
  payableRepository,
  receiptNoteRepository,
  commissionRepository,
} from '../db/repositories/financialCommercialRepositories';
import {
  getTemporalContext,
  resolveTemporalContext,
  parseTemporalQuery,
  TemporalContext,
  extractItemDate,
} from '../../utils/temporalEngine';

export function safeDateStr(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  if (d instanceof Date) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d).split('T')[0];
}

export function normalizeSearchText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Build server-side authoritative company context strictly from PostgreSQL / repositories
export async function buildServerSideCompanyContext(companyId: string) {
  if (!companyId || typeof companyId !== 'string') {
    return null;
  }
  try {
    const companyRepo = getCompanyRepository();
    const company = await companyRepo.findById(companyId);
    if (!company) {
      return null;
    }

    const [
      clients,
      properties,
      talhoes,
      drones,
      batteries,
      pilots,
      serviceOrders,
      receivables,
      payables,
      receipts,
      maintenances,
      commissions,
      products,
      crops,
    ] = await Promise.all([
      clientRepository.getByCompany(companyId),
      propertyRepository.getByCompany(companyId),
      talhaoRepository.getByCompany(companyId),
      droneRepository.getByCompany(companyId),
      batteryRepository.getByCompany(companyId),
      pilotRepository.getByCompany(companyId),
      serviceOrderRepository.getByCompany(companyId),
      receivableRepository.getByCompany(companyId),
      payableRepository.getByCompany(companyId),
      receiptNoteRepository.getByCompany(companyId),
      maintenanceRepository.getByCompany(companyId),
      commissionRepository.getByCompany(companyId),
      catalogRepository.getProducts(),
      catalogRepository.getCrops(),
    ]);

    // Financial & Operational Metrics strictly calculated from server data
    const temporalCtx = getTemporalContext();
    const todayDateStr = temporalCtx.todayStr;

    const validOS = serviceOrders.filter((os) => (os.status as string) !== 'cancelado');
    const completedOS = validOS.filter((os) => {
      const st = (os.status as string) || '';
      return st === 'concluido' || st === 'concluida' || st === 'faturado' || st === 'faturada' || st === 'pago' || st === 'realizada';
    });
    const inProgressOS = validOS.filter((os) => {
      const st = (os.status as string) || '';
      return st === 'em_operacao' || st === 'em_deslocamento' || st === 'agendado' || st === 'agendada' || st === 'em_andamento' || st === 'pendente' || st === 'pausado';
    });

    const totalHectaresApplied = completedOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);
    const inProgressHectares = inProgressOS.reduce((acc, os) => acc + (Number(os.areaHa) || 0), 0);
    const totalRevenue = completedOS.reduce((acc, os) => acc + (Number(os.finalAmount) || 0), 0);
    const inProgressRevenue = inProgressOS.reduce((acc, os) => acc + (Number(os.finalAmount) || 0), 0);

    const totalReceived = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return st === 'pago' || st === 'liquidado' || st === 'recebido';
      })
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const totalReceivableOverdue = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return st === 'vencido' || ((st === 'aberto' || st === 'pendente' || st === 'vencendo') && safeDateStr(r.dueDate) && safeDateStr(r.dueDate) < todayDateStr);
      })
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const totalReceivablePending = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return (st === 'aberto' || st === 'pendente' || st === 'vencendo') && (!safeDateStr(r.dueDate) || safeDateStr(r.dueDate) >= todayDateStr);
      })
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const totalPayable = payables
      .filter((p) => {
        const st = (p.status as string) || '';
        return st === 'aberto' || st === 'vencido' || st === 'vencendo' || st === 'pendente';
      })
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Real paid costs: strictly accounts payable with status 'pago'
    const paidPayables = payables.filter((p) => {
      const st = (p.status as string) || '';
      return st === 'pago' || st === 'liquidado';
    });
    const paidPayablesAmount = paidPayables.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Real paid receipts: corporate card, invoiced to company, or reimbursed pilot expenses
    const paidReceipts = receipts.filter((r) => {
      const method = (r.paymentMethod as string) || '';
      const reimb = (r.reimbursementStatus as string) || '';
      return method === 'cartao_corporativo' || method === 'faturado_empresa' || reimb === 'reembolsado' || reimb === 'pago';
    });
    const paidReceiptsAmount = paidReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

    const hasRealCosts = paidPayables.length > 0 || paidReceipts.length > 0;
    const totalCost = hasRealCosts ? (paidPayablesAmount + paidReceiptsAmount) : 0;
    const totalEstimatedCost = completedOS.reduce((acc, os) => acc + (Number(os.estimatedCost) || 0), 0);
    const totalReceiptsSpent = receipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
    const totalReimbursementsPending = receipts
      .filter((r) => (r.paymentMethod === 'dinheiro_piloto' || r.paymentMethod === 'pix_piloto') && r.reimbursementStatus === 'pendente')
      .reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

    const netResult = hasRealCosts ? totalRevenue - totalCost : null;
    const averageMarginPercent = (hasRealCosts && totalRevenue > 0 && netResult !== null)
      ? Math.round(((netResult / totalRevenue) * 100) * 10) / 10
      : null;
    const averageMarginPerHa = (hasRealCosts && totalHectaresApplied > 0 && netResult !== null)
      ? Math.round((netResult / totalHectaresApplied) * 100) / 100
      : null;
    const averageCostPerHa = (hasRealCosts && totalHectaresApplied > 0)
      ? Math.round((totalCost / totalHectaresApplied) * 100) / 100
      : null;

    const operationalDrones = drones.filter((d) => d.status === 'em_operacao').length;
    const fleetUtilizationPercent = drones.length > 0 ? Math.round((operationalDrones / drones.length) * 100) : 0;

    // Pilot metrics for current month
    const pilotsWithMonthlyStats = pilots.map((p) => {
      const pilotOS = validOS.filter((os: any) => os.pilotId === p.id || (os.pilot && normalizeSearchText(os.pilot).includes(normalizeSearchText(p.name))) || (os.pilotName && normalizeSearchText(os.pilotName).includes(normalizeSearchText(p.name))));
      const currentMonthOS = pilotOS.filter((os: any) => {
        const d = extractItemDate(os) || safeDateStr(os.scheduledDate || os.date);
        return d && d.startsWith(temporalCtx.currentMonthStr);
      });
      const completedCurrentMonthOS = currentMonthOS.filter((os) => {
        const st = (os.status as string) || '';
        return st === 'concluido' || st === 'concluida' || st === 'faturado' || st === 'pago' || st === 'realizada';
      });

      const monthHectares = completedCurrentMonthOS.reduce((acc, os) => {
        const actualHa = Number(os.actualAreaSprayedHa);
        return acc + (actualHa > 0 ? actualHa : 0);
      }, 0);

      const pilotComms = commissions.filter((c) => c.pilotId === p.id);
      const currentMonthComms = pilotComms.filter((c: any) => {
        const d = extractItemDate(c) || safeDateStr(c.createdAt || c.date);
        return d && d.startsWith(temporalCtx.currentMonthStr);
      });

      const monthCommissionTotal = currentMonthComms.reduce((acc, c) => acc + (Number(c.commissionAmount) || 0), 0);
      const monthReleasedCommission = currentMonthComms
        .filter((c: any) => c.status === 'liberada' || c.status === 'paga')
        .reduce((acc, c) => acc + (Number(c.commissionAmount) || 0), 0);
      const monthPendingCommission = currentMonthComms
        .filter((c: any) => (c.status as string) === 'pendente' || (c.status as string) === 'aguardando_recebimento')
        .reduce((acc, c) => acc + (Number(c.commissionAmount) || 0), 0);

      return {
        ...p,
        monthHectares,
        monthCommissionTotal,
        monthReleasedCommission,
        monthPendingCommission,
        activeOrdersCount: currentMonthOS.length,
      };
    });

    // Receipt Expenses Summary by Pilot
    const pilotsExpenseSummary = pilots.map((p) => {
      const pReceipts = receipts.filter((r) => r.pilotId === p.id || (r.pilotName && normalizeSearchText(r.pilotName).includes(normalizeSearchText(p.name))));
      const totalSpent = pReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const fuelReceipts = pReceipts.filter((r) => r.category === 'combustivel');
      const fuelSpent = fuelReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const fuelLiters = fuelReceipts.reduce((acc, r) => acc + (Number(r.fuelDetails?.liters) || 0), 0);
      const foodSpent = pReceipts.filter((r) => r.category === 'alimentacao').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const marketSpent = pReceipts.filter((r) => r.category === 'mercado').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const maintenanceSpent = pReceipts.filter((r) => r.category === 'manutencao_pecas').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const reimbursementPending = pReceipts
        .filter((r) => (r.paymentMethod === 'dinheiro_piloto' || r.paymentMethod === 'pix_piloto') && r.reimbursementStatus === 'pendente')
        .reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const reimbursementPaid = pReceipts
        .filter((r) => (r.reimbursementStatus as string) === 'reembolsado' || (r.reimbursementStatus as string) === 'pago')
        .reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

      return {
        pilotId: p.id,
        pilotName: p.name,
        totalNotesCount: pReceipts.length,
        totalSpent,
        fuelSpent,
        fuelLiters,
        foodSpent,
        marketSpent,
        maintenanceSpent,
        reimbursementPending,
        reimbursementPaid,
      };
    });

    // Overdue and Pending receivables detail
    const overdueItems = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return st === 'vencido' || ((st === 'aberto' || st === 'pendente' || st === 'vencendo') && safeDateStr(r.dueDate) && safeDateStr(r.dueDate) < todayDateStr);
      })
      .map((r: any) => ({
        client: r.clientName || 'Cliente',
        amount: Number(r.amount) || 0,
        due: safeDateStr(r.dueDate),
        status: 'vencido',
        os: r.serviceOrderNumber || r.osNumber || 'OS',
      }));

    const pendingItems = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return (st === 'aberto' || st === 'pendente' || st === 'vencendo') && (!safeDateStr(r.dueDate) || safeDateStr(r.dueDate) >= todayDateStr);
      })
      .map((r: any) => ({
        client: r.clientName || 'Cliente',
        amount: Number(r.amount) || 0,
        due: safeDateStr(r.dueDate),
        status: 'aberto',
        os: r.serviceOrderNumber || r.osNumber || 'OS',
      }));

    return {
      companyId: company.id,
      companyName: company.name,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
      city: company.city,
      state: company.state,
      ownerName: (company as any).ownerName,
      metrics: {
        totalHectaresApplied,
        inProgressHectares,
        completedServiceOrders: completedOS.length,
        inProgressServiceOrders: inProgressOS.length,
        totalRevenue,
        inProgressRevenue,
        totalReceived,
        totalReceivablePending,
        totalReceivableOverdue,
        totalPayable,
        hasRealCosts,
        totalCost,
        totalEstimatedCost,
        totalReceiptsSpent,
        totalReimbursementsPending,
        netResult,
        averageMarginPercent,
        averageMarginPerHa,
        averageCostPerHa,
        fleetUtilizationPercent,
      },
      drones,
      batteries,
      pilots: pilotsWithMonthlyStats,
      clients,
      properties,
      talhoes,
      serviceOrders: validOS,
      accountsReceivable: receivables,
      accountsPayable: payables,
      receiptNotes: receipts,
      maintenances,
      commissions,
      products,
      crops,
      financials: {
        overdueItems,
        pendingItems,
      },
      receiptExpensesSummary: {
        totalReceiptsSpent,
        totalReimbursementsPending,
        pilotsExpenseSummary,
        recentReceipts: receipts.slice(0, 10).map((r) => ({
          date: safeDateStr(r.date),
          pilot: r.pilotName,
          establishment: r.establishmentName,
          category: r.category,
          amount: Number(r.totalAmount) || 0,
          status: r.reimbursementStatus,
          fuelLiters: r.fuelDetails?.liters,
        })),
      },
    };
  } catch (err: any) {
    console.error('Error building authoritative company context:', err);
    return null;
  }
}

// Comprehensive Dynamic Context Intelligence Engine
export function generateDynamicContextAIAnswer(message: string, context: any, temporalContext?: TemporalContext): string {
  const rawMsg = message || '';
  const normMsg = normalizeSearchText(rawMsg);
  const temporal = temporalContext || resolveTemporalContext(context) || getTemporalContext();
  const parsedTemporal = parseTemporalQuery(rawMsg, temporal);

  const metrics = context.metrics || {};
  const drones = (context.drones || []) as any[];
  const batteries = (context.batteries || []) as any[];
  const pilots = (context.pilots || []) as any[];
  const clients = (context.clients || []) as any[];
  const properties = (context.properties || []) as any[];
  const talhoes = (context.talhoes || []) as any[];
  const serviceOrders = (context.serviceOrders || []) as any[];
  const products = (context.products || []) as any[];
  const financials = context.financials || {};
  const documents = (context.documents || []) as any[];
  const accountsPayable = (context.accountsPayable || []) as any[];
  const receiptNotes = (context.receiptNotes || []) as any[];

  const getOrderDate = (os: any): string => {
    return extractItemDate(os) || safeDateStr(os.date || os.scheduledDate || os.completedDate) || '';
  };

  const getPilotComputedStats = (pilot: any, targetMonthStr?: string) => {
    const pId = pilot.id;
    const pNameNorm = normalizeSearchText(pilot.name);
    const pilotOS = serviceOrders.filter(
      (os) => os.pilotId === pId || (os.pilot && normalizeSearchText(os.pilot).includes(pNameNorm))
    );
    const monthFilter = targetMonthStr || temporal.currentMonthStr;
    const thisMonthOS = pilotOS.filter((os) => {
      const d = getOrderDate(os);
      return d ? d.startsWith(monthFilter) : false;
    });

    const isCompletedStatus = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'concluido' || s === 'concluida' || s === 'finalizado' || s === 'finalizada' || s === 'faturado' || s === 'pago' || s === 'completed';
    };

    const isCurrentMonth = monthFilter === temporal.currentMonthStr;
    const monthHa = isCurrentMonth && pilot.monthHectares !== undefined
      ? pilot.monthHectares
      : thisMonthOS.filter(os => isCompletedStatus(os.status)).reduce((acc, curr) => {
          const actualHa = Number(curr.actualAreaSprayedHa);
          return acc + (actualHa > 0 ? actualHa : 0);
        }, 0);

    const totalAccumulatedHa = pilot.totalHectares ?? pilot.ha ?? pilot.totalHectaresSprayed ?? 0;
    const flightHours = pilot.totalFlightHours ?? pilot.hours ?? pilot.flightHours ?? 0;

    const monthCommission = isCurrentMonth && pilot.monthCommissionTotal !== undefined
      ? pilot.monthCommissionTotal
      : thisMonthOS.reduce((acc, curr) => acc + (curr.commission || curr.calculatedPilotCommission || 0), 0);

    const monthReleasedCommission = isCurrentMonth && pilot.monthReleasedCommission !== undefined
      ? pilot.monthReleasedCommission
      : thisMonthOS.filter(os => os.commissionStatus === 'liberada').reduce((acc, curr) => acc + (curr.commission || curr.calculatedPilotCommission || 0), 0);

    const monthPendingCommission = isCurrentMonth && pilot.monthPendingCommission !== undefined
      ? pilot.monthPendingCommission
      : thisMonthOS.filter(os => os.commissionStatus !== 'liberada').reduce((acc, curr) => acc + (curr.commission || curr.calculatedPilotCommission || 0), 0);

    return {
      pilot,
      pilotOS,
      thisMonthOS,
      monthHa,
      totalAccumulatedHa,
      flightHours,
      monthCommission,
      monthReleasedCommission,
      monthPendingCommission,
    };
  };

  // -------------------------------------------------------------
  // TOP PRIORITY: PERIOD COMPARISON QUERY
  // -------------------------------------------------------------
  if (parsedTemporal.filterType === 'comparacao_meses' || (normMsg.includes('faturei mais') && (normMsg.includes('mes passado') || normMsg.includes('este mes')))) {
    const isCompletedStatus = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'concluido' || s === 'concluida' || s === 'finalizado' || s === 'finalizada' || s === 'faturado' || s === 'pago' || s === 'completed';
    };

    const curMonthOS = serviceOrders.filter(os => isCompletedStatus(os.status) && getOrderDate(os).startsWith(temporal.currentMonthStr));
    const curRevenue = curMonthOS.reduce((acc, os) => acc + (Number(os.finalAmount) || Number(os.totalAmount) || 0), 0);
    const curHectares = curMonthOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);

    const prevMonthOS = serviceOrders.filter(os => isCompletedStatus(os.status) && getOrderDate(os).startsWith(temporal.previousMonthStr));
    const prevRevenue = prevMonthOS.reduce((acc, os) => acc + (Number(os.finalAmount) || Number(os.totalAmount) || 0), 0);
    const prevHectares = prevMonthOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);

    const diffRev = curRevenue - prevRevenue;
    const diffHa = curHectares - prevHectares;
    const pctRev = prevRevenue > 0 ? ((diffRev / prevRevenue) * 100).toFixed(1) : (curRevenue > 0 ? '+100' : '0.0');

    let verdict = '';
    if (diffRev > 0) {
      verdict = `🏆 **Você faturou mais este mês (${temporal.currentPeriodLabel})!** Houve um crescimento de **+R$ ${diffRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (+${pctRev}%) em relação a ${temporal.previousPeriodLabel}.`;
    } else if (diffRev < 0) {
      verdict = `📉 **Você faturou mais no mês passado (${temporal.previousPeriodLabel}).** O faturamento deste mês está **R$ ${Math.abs(diffRev).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** abaixo (${pctRev}%).`;
    } else {
      verdict = `⚖️ **O faturamento foi equivalente** entre ${temporal.currentPeriodLabel} e ${temporal.previousPeriodLabel} (R$ ${curRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
    }

    return `📊 **Comparativo de Faturamento: ${temporal.currentPeriodLabel} vs ${temporal.previousPeriodLabel}**

${verdict}

• **${temporal.currentPeriodLabel} (Mês Atual):**
   - Faturamento: **R$ ${curRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
   - Área Pulverizada: **${curHectares.toFixed(1)} ha** (${curMonthOS.length} OS concluídas)

• **${temporal.previousPeriodLabel} (Mês Anterior):**
   - Faturamento: **R$ ${prevRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
   - Área Pulverizada: **${prevHectares.toFixed(1)} ha** (${prevMonthOS.length} OS concluídas)

📈 **Variação Operacional:** ${diffHa >= 0 ? `+${diffHa.toFixed(1)} ha` : `${diffHa.toFixed(1)} ha`}`;
  }

  // -------------------------------------------------------------
  // TEMPORAL REVENUE & OPERATIONAL PERIOD FILTER
  // -------------------------------------------------------------
  const isPeriodFilterQuery =
    parsedTemporal.filterType !== 'geral_acumulado' &&
    (normMsg.includes('fatur') ||
      normMsg.includes('receita') ||
      normMsg.includes('hectare') ||
      normMsg.includes('desempenho') ||
      normMsg.includes('periodo') ||
      normMsg.includes('resultado') ||
      normMsg.includes('quanto fiz') ||
      normMsg.includes('quanto apliquei') ||
      normMsg.includes('este mes') ||
      normMsg.includes('mes passado') ||
      normMsg.includes('ultimos 30') ||
      normMsg.includes('ultimos 7') ||
      normMsg.includes('esta semana'));

  if (
    isPeriodFilterQuery &&
    !normMsg.includes('pilot') &&
    !normMsg.includes('quem') &&
    !normMsg.includes('ranking') &&
    !normMsg.includes('pagar') &&
    !normMsg.includes('receber') &&
    !normMsg.includes('drone')
  ) {
    const isCompletedStatus = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'concluido' || s === 'concluida' || s === 'finalizado' || s === 'finalizada' || s === 'faturado' || s === 'pago' || s === 'completed';
    };

    const completedFilteredOS = serviceOrders.filter((os) => {
      const isComp = isCompletedStatus(os.status);
      const d = getOrderDate(os);
      if (!isComp || !d) return false;
      if (parsedTemporal.targetMonthStr) {
        return d.startsWith(parsedTemporal.targetMonthStr);
      }
      if (parsedTemporal.startDate && parsedTemporal.endDate) {
        return d >= parsedTemporal.startDate && d <= parsedTemporal.endDate;
      }
      return true;
    });

    const periodRevenue = completedFilteredOS.reduce((acc, os) => acc + (Number(os.finalAmount) || Number(os.totalAmount) || 0), 0);
    const periodHectares = completedFilteredOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);

    const matchPeriodDate = (dateStr: string): boolean => {
      if (!dateStr) return false;
      const d = dateStr.substring(0, 10);
      if (parsedTemporal.targetMonthStr) {
        return d.startsWith(parsedTemporal.targetMonthStr);
      }
      if (parsedTemporal.startDate && parsedTemporal.endDate) {
        if (d.length === 7) {
          return d >= parsedTemporal.startDate.substring(0, 7) && d <= parsedTemporal.endDate.substring(0, 7);
        }
        return d >= parsedTemporal.startDate && d <= parsedTemporal.endDate;
      }
      return true;
    };

    const periodPaidPayables = accountsPayable.filter((p) => {
      const st = ((p.status as string) || '').toLowerCase();
      const isPaid = st === 'pago' || st === 'liquidado';
      const d = safeDateStr(p.paymentDate || p.dueDate);
      return isPaid && d && matchPeriodDate(d);
    });
    const periodPaidPayablesAmount = periodPaidPayables.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const periodPaidReceipts = receiptNotes.filter((r) => {
      const method = ((r.paymentMethod as string) || '').toLowerCase();
      const reimb = ((r.reimbursementStatus as string) || '').toLowerCase();
      const isPaid = method === 'cartao_corporativo' || method === 'faturado_empresa' || reimb === 'reembolsado' || reimb === 'pago';
      const d = safeDateStr(r.date || r.createdAt);
      return isPaid && d && matchPeriodDate(d);
    });
    const periodPaidReceiptsAmount = periodPaidReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

    const hasPeriodRealCosts = periodPaidPayables.length > 0 || periodPaidReceipts.length > 0;
    const periodCost = hasPeriodRealCosts ? (periodPaidPayablesAmount + periodPaidReceiptsAmount) : null;
    const periodNet = hasPeriodRealCosts
      ? (periodRevenue > 0 ? periodRevenue - periodCost! : -periodCost!)
      : null;
    const periodMargin = (hasPeriodRealCosts && periodRevenue > 0 && periodNet !== null)
      ? ((periodNet / periodRevenue) * 100).toFixed(1)
      : null;

    if (periodRevenue === 0 && periodHectares === 0 && completedFilteredOS.length === 0) {
      return `📊 **Desempenho Operacional & Financeiro (${parsedTemporal.label}):**

• **Faturamento Bruto:** **R$ 0,00**
• **Hectares Pulverizados:** **0 ha**
• **Ordens de Serviço Executadas:** **0 OS**

ℹ️ Não há ordens de serviço ou receitas registradas no período solicitado (**${parsedTemporal.label}**) para a empresa ativa.`;
    }

    const osList = completedFilteredOS.slice(0, 5).map(os => {
      const actualHa = Number(os.actualAreaSprayedHa);
      const haText = actualHa > 0 ? `${actualHa.toFixed(1)} ha aplicados` : `${os.areaHa || 0} ha planejados`;
      return `  • **${os.osNumber}** (${getOrderDate(os) || 'Data não inf.'}): ${os.client || 'Cliente'} - ${haText} | **R$ ${(Number(os.totalAmount) || Number(os.finalAmount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${(os.status || '').toUpperCase()})`;
    }).join('\n');

    return `📊 **Desempenho Operacional & Financeiro (${parsedTemporal.label}):**

💰 **Faturamento Bruto:** **R$ ${periodRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
🌾 **Área Pulverizada:** **${periodHectares.toFixed(1)} hectares**
📋 **Ordens de Serviço:** **${completedFilteredOS.length} OS concluídas**
💵 **Resultado Operacional Líquido:** ${hasPeriodRealCosts && periodNet !== null ? `**R$ ${periodNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (Margem: **${periodMargin}%**)` : `*Não apurado (sem custos reais registrados no período)*`}

${osList ? `📋 **Ordens de Serviço do Período:**\n${osList}\n` : ''}`;
  }

  // -------------------------------------------------------------
  // DIRECT PAYABLES QUERY
  // -------------------------------------------------------------
  const isDirectPayablesQuery =
    (normMsg.includes('quanto tenho a pagar') ||
     normMsg.includes('o que tenho a pagar') ||
     normMsg.includes('total a pagar') ||
     normMsg.includes('valor a pagar') ||
     normMsg.includes('contas a pagar') ||
     (normMsg.includes('a pagar') && !normMsg.includes('receber')));

  if (isDirectPayablesQuery) {
    const payNum = Number(metrics.totalPayable ?? 0);
    const pay = payNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const payablesList = (context.accountsPayable || [])
      .filter((p: any) => p.status === 'aberto' || p.status === 'vencido' || p.status === 'vencendo' || p.status === 'pendente')
      .slice(0, 5)
      .map((p: any) => `  • **${p.supplier || p.description || 'Fornecedor'}**: R$ ${(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vencimento: ${p.dueDate || 'Não inf.'})`)
      .join('\n');

    return `💳 **Contas a Pagar da Empresa (${temporal.currentPeriodLabel}):**

• **Total a Pagar (Aberto/Vencido):** **R$ ${pay}**

${payablesList ? `📋 **Principais Contas a Pagar:**\n${payablesList}\n` : '• *Nenhuma conta a pagar em aberto no momento.*'}`;
  }

  // -------------------------------------------------------------
  // DIRECT RECEIVABLES QUERY
  // -------------------------------------------------------------
  const isDirectReceivablesQuery =
    (normMsg.includes('quanto tenho a receber') ||
     normMsg.includes('o que tenho a receber') ||
     normMsg.includes('valor a receber') ||
     normMsg.includes('total a receber') ||
     (normMsg.includes('a receber') && !normMsg.includes('pagar') && !normMsg.includes('pilot') && !normMsg.includes('comiss')));

  if (isDirectReceivablesQuery) {
    const pendNum = Number(metrics.totalReceivablePending ?? 0);
    const overNum = Number(metrics.totalReceivableOverdue ?? 0);
    const pendingItems = (financials.pendingItems || []) as any[];
    const overdueItems = (financials.overdueItems || []) as any[];

    if (pendNum === 0 && overNum === 0 && pendingItems.length === 0 && overdueItems.length === 0) {
      return `💰 **Contas a Receber da Empresa:**\n\nNão há contas a receber em aberto cadastradas para a empresa atualmente selecionada (**${context.tradeName || context.companyName || 'empresa ativa'}**) (R$ 0,00).`;
    }

    const itemsList = [
      ...overdueItems.map((i: any) => `  • ⚠️ **${i.client}**: R$ ${(i.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vencida em: ${i.due || 'Data não inf.'})`),
      ...pendingItems.map((i: any) => `  • ⏳ **${i.client}**: R$ ${(i.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vence em: ${i.due || 'Data não inf.'})`),
    ].slice(0, 5).join('\n');

    return `💰 **Contas a Receber da Empresa (${temporal.currentPeriodLabel}):**

• **Total em Aberto:** **R$ ${pendNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Total Vencido:** **R$ ${overNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** ${overNum > 0 ? '⚠️ *(Prioridade de cobrança)*' : '✅ *(Sem inadimplência)*'}

${itemsList ? `📋 **Detalhamento dos Títulos:**\n${itemsList}` : ''}`;
  }

  // -------------------------------------------------------------
  // DIRECT FLEET COUNT QUERY
  // -------------------------------------------------------------
  if (normMsg.includes('quantos drones') || normMsg.includes('quantas aeronaves') || (normMsg.includes('drones') && (normMsg.includes('quant') || normMsg.includes('total de drone') || normMsg.includes('tamanho da frota')))) {
    if (drones.length === 0) {
      return `🚁 **Frota de Drones:**\n\nNão há drones cadastrados para a empresa atualmente selecionada (**${context.tradeName || context.companyName || 'empresa ativa'}**).`;
    }

    const list = drones.map((d, i) => `  ${i + 1}. **${d.model}** (${d.tag || 'TAG'}): ${d.hours ?? 0}h de voo | ${d.ha ?? 0} ha aplicados | Status: **${(d.status || 'OPERACIONAL').toUpperCase()}**`).join('\n');

    return `🚁 **Frota de Drones da Empresa (${context.tradeName || context.companyName || 'empresa ativa'}):**

A empresa possui **${drones.length}** drone(s) cadastrado(s) na frota ativa:

${list}

• **Taxa de Utilização da Frota:** **${metrics.fleetUtilizationPercent ?? 0}%**`;
  }

  // -------------------------------------------------------------
  // PILOT RANKING & TEAM PRODUCTIVITY
  // -------------------------------------------------------------
  const isAskingPilotRanking =
    normMsg.includes('qual piloto') ||
    normMsg.includes('quem fez mais') ||
    normMsg.includes('quem aplicou mais') ||
    normMsg.includes('quem voou mais') ||
    normMsg.includes('ranking') ||
    normMsg.includes('melhor piloto') ||
    normMsg.includes('mais produtivo') ||
    (normMsg.includes('pilot') && (normMsg.includes('mais') || normMsg.includes('maior')));

  if (isAskingPilotRanking) {
    if (pilots.length === 0) {
      return '👨‍✈️ **Ranking de Produtividade dos Pilotos:**\n\nNão há pilotos cadastrados para a empresa atualmente selecionada.';
    }

    const targetMonthStr = parsedTemporal.targetMonthStr || temporal.currentMonthStr;
    const periodLabel = parsedTemporal.filterType === 'mes_passado'
      ? temporal.previousPeriodLabel
      : parsedTemporal.filterType === 'mes_especifico' && parsedTemporal.targetMonthName
      ? `${parsedTemporal.targetMonthName}/${parsedTemporal.targetYear}`
      : temporal.currentPeriodLabel;

    const computedPilots = pilots.map((p) => getPilotComputedStats(p, targetMonthStr));
    computedPilots.sort((a, b) => b.monthHa - a.monthHa);

    const rankingLines = computedPilots.map((cp, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      return `${medal} **${idx + 1}º ${cp.pilot.name}** (${(cp.pilot.contract || 'CLT').toUpperCase()}):
   • **Hectares no Período (${periodLabel}):** **${cp.monthHa.toFixed(2)} ha** (${cp.thisMonthOS.length} OS)
   • **Total Acumulado:** **${cp.totalAccumulatedHa.toLocaleString('pt-BR')} ha** | **${cp.flightHours}h de voo**
   • **Comissão Gerada no Período:** R$ ${cp.monthCommission.toFixed(2)}`;
    });

    const topPilot = computedPilots[0];
    return `🏆 **Ranking de Produtividade dos Pilotos (${periodLabel}):**

${rankingLines.join('\n\n')}

📌 **Destaque:** **${topPilot.pilot.name}** lidera as aplicações com **${topPilot.monthHa.toFixed(2)} hectares** realizados no período.`;
  }

  // -------------------------------------------------------------
  // SPECIFIC PILOT QUERY & MISSING PILOT DETECTION
  // -------------------------------------------------------------
  const matchedPilot = pilots.find((p) => {
    const pName = normalizeSearchText(p.name);
    const parts = pName.split(' ').filter(Boolean);
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return (
      normMsg.includes(pName) ||
      (firstName && firstName.length > 2 && normMsg.includes(firstName)) ||
      (lastName && lastName.length > 3 && normMsg.includes(lastName))
    );
  });

  if (!matchedPilot && (normMsg.includes('piloto ') || normMsg.includes('pilot '))) {
    const pilotMatch = message.match(/(?:piloto|pilot)\s+([a-zA-ZÀ-ÿ0-9\-]+)/i);
    if (pilotMatch) {
      const searchedPilotName = pilotMatch[1].trim();
      const ignoredWords = ['de', 'da', 'do', 'em', 'para', 'com', 'que', 'mais', 'menos', 'qual', 'este', 'ranking', 'equipe'];
      if (searchedPilotName.length >= 3 && !ignoredWords.includes(searchedPilotName.toLowerCase())) {
        return `👨‍✈️ **Consulta de Piloto:**\n\nO piloto **"${searchedPilotName}"** não foi encontrado no quadro de colaboradores da empresa ativa (**${context.tradeName || context.companyName || 'empresa ativa'}**).\n\n${pilots.length > 0 ? `Pilotos cadastrados nesta empresa:\n${pilots.map(p => `• **${p.name}**`).join('\n')}` : 'Não há pilotos cadastrados nesta empresa.'}`;
      }
    }
  }

  if (matchedPilot) {
    const targetMonthStr = parsedTemporal.targetMonthStr || temporal.currentMonthStr;
    const stats = getPilotComputedStats(matchedPilot, targetMonthStr);
    const periodLabel = parsedTemporal.filterType === 'mes_passado'
      ? temporal.previousPeriodLabel
      : parsedTemporal.filterType === 'mes_especifico' && parsedTemporal.targetMonthName
      ? `${parsedTemporal.targetMonthName}/${parsedTemporal.targetYear}`
      : temporal.currentPeriodLabel;

    const isAskingHectaresOrArea =
      normMsg.includes('hectare') ||
      normMsg.includes(' ha') ||
      normMsg.includes('area') ||
      normMsg.includes('aplicou') ||
      normMsg.includes('fez') ||
      normMsg.includes('pulveriz') ||
      normMsg.includes('produ') ||
      normMsg.includes('rendimento') ||
      normMsg.includes('este mes') ||
      normMsg.includes('no mes') ||
      normMsg.includes('quanto');

    const isAskingCommission =
      normMsg.includes('comiss') ||
      normMsg.includes('ganha') ||
      normMsg.includes('receber') ||
      normMsg.includes('taxa') ||
      normMsg.includes('salario') ||
      normMsg.includes('valor');

    const isAskingHours =
      normMsg.includes('hora') ||
      normMsg.includes('tempo de voo') ||
      normMsg.includes('voou');

    const isAskingDocOrContact =
      normMsg.includes('caar') ||
      normMsg.includes('anac') ||
      normMsg.includes('licenca') ||
      normMsg.includes('telefone') ||
      normMsg.includes('whatsapp') ||
      normMsg.includes('contato') ||
      normMsg.includes('email');

    const isAskingExpensesOrReceipts =
      normMsg.includes('notinha') ||
      normMsg.includes('recibo') ||
      normMsg.includes('gasto') ||
      normMsg.includes('despesa') ||
      normMsg.includes('combustivel') ||
      normMsg.includes('gasolina') ||
      normMsg.includes('diesel') ||
      normMsg.includes('alimentacao') ||
      normMsg.includes('almoco') ||
      normMsg.includes('mercado') ||
      normMsg.includes('reembolso');

    if (isAskingExpensesOrReceipts) {
      const pId = matchedPilot.id;
      const pNameNorm = normalizeSearchText(matchedPilot.name);
      const summaryList = (context.receiptExpensesSummary?.pilotsExpenseSummary || []) as any[];
      const pilotSummary = summaryList.find((s: any) => s.pilotId === pId || normalizeSearchText(s.pilotName).includes(pNameNorm));
      const recentReceipts = ((context.receiptExpensesSummary?.recentReceipts || []) as any[]).filter(
        (r: any) => normalizeSearchText(r.pilot).includes(pNameNorm)
      );

      const totalSpent = Number(pilotSummary?.totalSpent ?? 0);
      const fuelSpent = Number(pilotSummary?.fuelSpent ?? 0);
      const fuelLiters = Number(pilotSummary?.fuelLiters ?? 0);
      const foodSpent = Number(pilotSummary?.foodSpent ?? 0);
      const marketSpent = Number(pilotSummary?.marketSpent ?? 0);
      const pendingReimbursement = Number(pilotSummary?.reimbursementPending ?? 0);
      const paidReimbursement = Number(pilotSummary?.reimbursementPaid ?? 0);

      if (totalSpent === 0 && recentReceipts.length === 0) {
        return `🧾 **Relatório de Notinhas e Gastos do Piloto ${matchedPilot.name}:**

Nenhuma despesa ou notinha de campo registrada para o piloto **${matchedPilot.name}** neste período (${periodLabel}).`;
      }

      const receiptsListStr = recentReceipts.length > 0
        ? recentReceipts.map((r: any) => `  • **${r.date || 'Data não inf.'}** - ${r.establishment || 'Estabelecimento'} (${(r.category || 'GERAL').toUpperCase()}): **R$ ${(Number(r.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** | Status: **${(r.status || 'PENDENTE').toUpperCase()}** ${r.fuelLiters ? `(${r.fuelLiters}L)` : ''}`).join('\n')
        : '  • *Nenhum comprovante individual listado.*';

      return `🧾 **Relatório de Notinhas e Gastos do Piloto ${matchedPilot.name} (${periodLabel}):**

💰 **Total Geral Gasto no Período:** **R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${pilotSummary?.totalNotesCount || recentReceipts.length} notinhas registradas)

⛽ **Combustível / Abastecimento:** **R$ ${fuelSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (*${fuelLiters.toFixed(1)} Litros* de combustível para gerador e apoio)
🍽️ **Alimentação / Refeições:** **R$ ${foodSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
🛒 **Mercado / Hidratação:** **R$ ${marketSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
🔧 **Peças / Reparos de Campo:** **R$ ${(Number(pilotSummary?.maintenanceSpent) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**

🔄 **Situação dos Reembolsos:**
• **Aguardando Aprovação/Pagamento:** **R$ ${pendingReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Já Reembolsado / Liquidado:** **R$ ${paidReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**

📋 **Últimas Notinhas Registradas:**
${receiptsListStr}`;
    }

    if (isAskingHectaresOrArea && !isAskingCommission) {
      const osListStr = stats.thisMonthOS.length > 0
        ? stats.thisMonthOS
            .map(
              (os: any) =>
                `  • **${os.osNumber}** (${getOrderDate(os) || periodLabel}): **${(Number(os.areaHa) || 0).toFixed(1)} ha** na *${os.property || os.propertyName || 'Fazenda'}* (${os.client || os.clientName || 'Cliente'}) | Cultura: **${os.crop || 'Cultura'}** | Status: **${(os.status || '').toUpperCase()}**`
            )
            .join('\n')
        : `  • *Nenhuma ordem de serviço registrada para este piloto no período (${periodLabel}).*`;

      return `👨‍✈️ **Produtividade do Piloto ${matchedPilot.name}:**

🌾 **Hectares Realizados no Período (${periodLabel}):** **${stats.monthHa.toFixed(2)} hectares**
Total de Ordens de Serviço no período: **${stats.thisMonthOS.length} OS**

📋 **Detalhamento das OS de ${periodLabel}:**
${osListStr}

📊 **Histórico Geral na Empresa:**
• **Total Acumulado na Carreira:** **${stats.totalAccumulatedHa.toLocaleString('pt-BR')} hectares**
• **Horas de Voo Totais:** **${stats.flightHours} horas**
• **Status Operacional:** ${matchedPilot.status === 'em_voo' ? '🟢 Em Voo / Operando em Campo' : '✅ Disponível'}

💼 **Comissão Gerada no Período:** **R$ ${stats.monthCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** *(Modelo: ${(matchedPilot.model || 'por hectare').replace('_', ' ')} • ${matchedPilot.ratePerHa ? `R$ ${matchedPilot.ratePerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ha` : matchedPilot.percentRate ? `${matchedPilot.percentRate}% sobre OS` : ''})*`;
    }

    if (isAskingCommission) {
      return `💰 **Comissões do Piloto ${matchedPilot.name}:**

• **Regime Contratual:** ${(matchedPilot.contract || 'CLT').toUpperCase()}
• **Modelo de Comissionamento:** ${(matchedPilot.model || 'Por hectare').replace('_', ' ')} ${matchedPilot.ratePerHa ? `(R$ ${matchedPilot.ratePerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por hectare)` : matchedPilot.percentRate ? `(${matchedPilot.percentRate}% sobre o valor da OS)` : ''}
• **Comissão Total no Período (${periodLabel}):** **R$ ${stats.monthCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${stats.monthHa.toFixed(2)} ha aplicados)
  - **Liberada para Pagamento:** **R$ ${stats.monthReleasedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
  - **Aguardando Liquidação do Cliente:** **R$ ${stats.monthPendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**

🔒 **Regra de Liberação Financeira:** As comissões referentes às Ordens de Serviço só são liberadas para pagamento após a liquidação do recebimento pelo cliente, protegendo o fluxo de caixa.`;
    }

    if (isAskingHours) {
      return `⏱️ **Horas de Voo do Piloto ${matchedPilot.name}:**

• **Total Acumulado de Voo:** **${stats.flightHours} horas de voo**
• **Hectares Pulverizados na Carreira:** **${stats.totalAccumulatedHa.toLocaleString('pt-BR')} hectares**
• **Hectares Realizados no Período (${periodLabel}):** **${stats.monthHa.toFixed(2)} ha**
• **Status Atual:** ${matchedPilot.status === 'em_voo' ? '🟢 Em voo' : '✅ Disponível'}`;
    }

    if (isAskingDocOrContact) {
      return `📜 **Documentação & Contato do Piloto ${matchedPilot.name}:**

• **Certificado CAAR (MAPA):** ${matchedPilot.caarNumber || 'Não informado'} | Validade: **${matchedPilot.caarValidity || 'Não informada'}**
• **Registro ANAC / SISANT:** ${matchedPilot.anacNumber || 'Não informado'}
• **Telefone / WhatsApp:** 📞 ${matchedPilot.phone || matchedPilot.whatsapp || 'Não informado'}
• **E-mail:** 📧 ${matchedPilot.email || 'Não informado'}
• **Cidade Base:** ${matchedPilot.city || 'Não informada'}`;
    }

    return `👨‍✈️ **Ficha Operacional Completa: ${matchedPilot.name}**

• **Regime Contratual:** ${(matchedPilot.contract || 'CLT').toUpperCase()} (${(matchedPilot.model || 'por hectare').replace('_', ' ')})
• **Neste Período (${periodLabel}):** **${stats.monthHa.toFixed(2)} ha** (${stats.thisMonthOS.length} OS) | Comissão: **R$ ${stats.monthCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Histórico Acumulado:** **${stats.totalAccumulatedHa.toLocaleString('pt-BR')} ha** aplicados | **${stats.flightHours}h de voo**
• **Certificado CAAR:** ${matchedPilot.caarNumber || 'Não informado'} (Validade: ${matchedPilot.caarValidity || 'Não informada'})
• **Registro ANAC:** ${matchedPilot.anacNumber || 'Não informado'}
• **Contato:** 📞 ${matchedPilot.phone || matchedPilot.whatsapp || 'Não informado'} | 📧 ${matchedPilot.email || 'Não informado'}`;
  }

  // -------------------------------------------------------------
  // TEAM PRODUCTIVITY OVERVIEW
  // -------------------------------------------------------------
  if (normMsg.includes('pilot') || normMsg.includes('equipe') || normMsg.includes('operador')) {
    if (pilots.length === 0) {
      return '👨‍✈️ **Equipe de Pilotos:**\n\nNão há pilotos cadastrados para a empresa atualmente selecionada.';
    }

    const targetMonthStr = parsedTemporal.targetMonthStr || temporal.currentMonthStr;
    const periodLabel = parsedTemporal.filterType === 'mes_passado'
      ? temporal.previousPeriodLabel
      : parsedTemporal.filterType === 'mes_especifico' && parsedTemporal.targetMonthName
      ? `${parsedTemporal.targetMonthName}/${parsedTemporal.targetYear}`
      : temporal.currentPeriodLabel;

    const computedPilots = pilots.map((p) => getPilotComputedStats(p, targetMonthStr));
    const pilotsList = computedPilots
      .map(
        (cp) =>
          `• **${cp.pilot.name}** (${(cp.pilot.contract || 'CLT').toUpperCase()}): **${cp.monthHa.toFixed(2)} ha (${periodLabel})** | Total: ${cp.totalAccumulatedHa.toLocaleString('pt-BR')} ha (${cp.flightHours}h) | Comissão: R$ ${cp.monthCommission.toFixed(2)}`
      )
      .join('\n');

    return `👨‍✈️ **Produtividade da Equipe de Pilotos (${periodLabel}):**
Total de pilotos ativos: **${pilots.length}**

${pilotsList}

🔒 **Regra de Comissionamento:**
As comissões permanecem *Aguardando Recebimento* e **só são liberadas para pagamento após a liquidação financeira da Ordem de Serviço pelo cliente**.`;
  }

  // -------------------------------------------------------------
  // SPECIFIC FARM / PROPERTY LOCATION & ROUTES
  // -------------------------------------------------------------
  const matchedProperty = properties.find((p) => {
    const pName = normalizeSearchText(p.name);
    const pClient = normalizeSearchText(p.client);
    return normMsg.includes(pName) || (pClient && normMsg.includes(pClient));
  });

  if (!matchedProperty && (normMsg.includes('fazenda ') || normMsg.includes('propriedade ') || normMsg.includes('sitio ') || normMsg.includes('estancia '))) {
    const propMatch = message.match(/(?:fazenda|propriedade|sitio|estancia)\s+([a-zA-ZÀ-ÿ0-9\-\s]+)/i);
    if (propMatch) {
      const rawName = propMatch[1].replace(/(\?|\.|\!|\,)/g, '').trim();
      const searchedPropName = rawName.split(/ e | ou | como | onde /i)[0].trim();
      const ignoredPropWords = ['de', 'da', 'do', 'em', 'para', 'com', 'que', 'qual', 'como', 'onde'];
      if (searchedPropName.length >= 3 && !ignoredPropWords.includes(searchedPropName.toLowerCase())) {
        return `📍 **Localização de Propriedade:**\n\nA propriedade **"${searchedPropName}"** não foi encontrada no cadastro da empresa ativa (**${context.tradeName || context.companyName || 'empresa ativa'}**).\n\n${properties.length > 0 ? `Propriedades cadastradas na empresa ativa:\n${properties.map(p => `• **${p.name}** (${p.city || 'Cidade não inf.'})`).join('\n')}` : 'Não há propriedades cadastradas nesta empresa.'}`;
      }
    }
  }

  if (matchedProperty) {
    const lat = matchedProperty.latitude;
    const lng = matchedProperty.longitude;
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    const gMapsUrl = hasCoordinates ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
    const wazeUrl = hasCoordinates ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;

    const propTalhoes = (matchedProperty.talhoes && matchedProperty.talhoes.length > 0)
      ? matchedProperty.talhoes
      : talhoes.filter((t) => normalizeSearchText(t.property).includes(normalizeSearchText(matchedProperty.name)));

    const talhoesListStr = propTalhoes.length > 0
      ? propTalhoes.map((t: any) => `  • **${t.name}**: ${t.ha || 0} ha | Cultura: **${t.crop || 'Ativa'}** (${t.stage || 'Fase vegetativa'})`).join('\n')
      : '  • *Nenhum talhão individual delimitado no momento.*';

    return `📍 **Localização & Dados da ${matchedProperty.name}:**

🏢 **Cliente / Proprietário:** ${matchedProperty.client || 'Não informado'}
📐 **Área Total:** **${matchedProperty.ha ?? 0} hectares**
📌 **Endereço:** ${matchedProperty.address || matchedProperty.city || 'Não informado'}
🏙️ **Município:** ${matchedProperty.city || 'Não informado'}
👤 **Responsável / Gerente:** ${matchedProperty.manager || 'Não informado'} | 📞 **Telefone:** ${matchedProperty.phone || 'Não informado'}
🌐 **Coordenadas GPS:** ${hasCoordinates ? `\`${lat.toFixed(5)}, ${lng.toFixed(5)}\`` : '*A localização geográfica / coordenadas GPS não estão cadastradas para esta propriedade.*'}

${hasCoordinates ? `🗺️ **Links Diretos para Navegação em Campo:**\n• [🗺️ Abrir Rota no Google Maps](${gMapsUrl})\n• [🚗 Abrir Navegação no Waze](${wazeUrl})\n\n` : ''}🌱 **Glebas & Talhões Mapeados:**
${talhoesListStr}

💡 **Notas Operacionais & Acesso:**
${matchedProperty.notes || 'Sem observações adicionais.'}`;
  }

  // -------------------------------------------------------------
  // SPECIFIC TALHÃO QUERY
  // -------------------------------------------------------------
  const matchedTalhao = talhoes.find((t) => {
    const tName = normalizeSearchText(t.name);
    return normMsg.includes(tName) || (normMsg.includes('talhao') && normMsg.includes(tName.replace('talhao', '').trim()));
  });

  if (matchedTalhao) {
    const lat = matchedTalhao.latitude ?? matchedTalhao.center?.lat;
    const lng = matchedTalhao.longitude ?? matchedTalhao.center?.lng;
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
    const gMapsUrl = hasCoordinates ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
    const wazeUrl = hasCoordinates ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;

    return `🌾 **Detalhes Georreferenciados: ${matchedTalhao.name}**

🏡 **Fazenda:** ${matchedTalhao.property || 'Não informada'} (Cliente: ${matchedTalhao.client || 'Não informado'})
📐 **Área:** **${matchedTalhao.ha ?? 0} hectares**
🌱 **Cultura:** **${matchedTalhao.crop || 'Não informada'}** | **Estádio Fenológico:** ${matchedTalhao.stage || 'Fase ativa'}
🗓️ **Última Aplicação:** ${matchedTalhao.lastApplicationDate || 'Sem aplicação recente registrada'}
🧭 **Coordenadas Centrais:** ${hasCoordinates ? `\`${lat.toFixed(5)}, ${lng.toFixed(5)}\`` : '*Não cadastradas*'}
${hasCoordinates ? `🗺️ **Rotas GPS:** [🗺️ Google Maps](${gMapsUrl}) | [🚗 Waze](${wazeUrl})` : ''}
📝 **Notas:** ${matchedTalhao.notes || 'Sem observações adicionais.'}`;
  }

  // -------------------------------------------------------------
  // GENERAL "ONDE FICA" / "LOCALIZAÇÃO DAS FAZENDAS"
  // -------------------------------------------------------------
  if (normMsg.includes('localizacao') || normMsg.includes('onde fica') || normMsg.includes('como chegar') || (normMsg.includes('mapa') && !normMsg.includes('registro mapa')) || normMsg.includes('coordenada') || normMsg.includes('gps') || normMsg.includes('fazenda') || normMsg.includes('propriedade')) {
    if (properties.length === 0) {
      return '📍 **Localização das Fazendas:**\n\nNão há fazendas cadastradas para a empresa atualmente selecionada.';
    }

    const propertiesList = properties
      .map((p) => {
        const hasCoords = typeof p.latitude === 'number' && typeof p.longitude === 'number';
        const gUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}` : null;
        return `• **${p.name}** (${p.city || 'Cidade não inf.'}): ${p.ha || 0} ha | Gerente: ${p.manager || 'Não inf.'} (${p.phone || 's/ tel'})${hasCoords ? `\n  GPS: \`${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}\` → [🗺️ Ver no Google Maps](${gUrl})` : ''}`;
      })
      .join('\n\n');

    return `📍 **Guia de Localização e Acesso às Fazendas Cadastradas:**

${propertiesList}

💡 *Dica MOUTRYX:* Você pode me perguntar o nome de qualquer fazenda específica para obter a ficha operacional completa e links de navegação.`;
  }

  // -------------------------------------------------------------
  // DEFENSIVOS, PRODUTOS & AGROFIT / MAPA
  // -------------------------------------------------------------
  const matchedProduct = products.find((pr) => {
    const cName = normalizeSearchText(pr.commercialName);
    const aIng = normalizeSearchText(pr.activeIngredient);
    return normMsg.includes(cName) || (aIng && normMsg.includes(aIng));
  });

  if (matchedProduct) {
    return `🧪 **Informações Técnicas & AGROFIT/MAPA:**
• **Produto Comercial:** **${matchedProduct.commercialName}** (${matchedProduct.manufacturer || 'Fabricante Homologado'})
• **Classe Agronômica:** ${matchedProduct.class || 'Defensivo Agrícola'} (${matchedProduct.formulation || 'SC'})
• **Princípio Ativo:** *${matchedProduct.activeIngredient || 'Não informado'}*
• **Registro MAPA:** **${matchedProduct.mapa || 'Não informado'}**
• **Dosagem Recomendada:** **${matchedProduct.doseRange || 'Conforme bula'}**
• **Volume de Calda Recomendado (Drone):** **${matchedProduct.volumeCalda || '10'} L/ha**
• **Culturas Autorizadas:** ${(matchedProduct.crops || []).join(', ') || 'Culturas autorizadas em bula'}
• **Alvos Principais:** ${(matchedProduct.targetPests || []).join(', ') || 'Pragas/doenças alvo'}
• **Classificação Toxicológica:** ${matchedProduct.toxicologicalClass || 'IV - Pouco Tóxico'}

⚠️ *Ressalva Obrigatória:* Confirme a dosagem exata no receituário agronômico e com o Responsável Técnico antes de preparar a calda.`;
  }

  if (normMsg.includes('defensiv') || normMsg.includes('agrofit') || normMsg.includes('mapa') || normMsg.includes('produto') || normMsg.includes('quimic') || normMsg.includes('soja') || normMsg.includes('milho') || normMsg.includes('lagarta') || normMsg.includes('ferrugem') || normMsg.includes('fungicid') || normMsg.includes('inseticid') || normMsg.includes('herbicid')) {
    if (products.length === 0) {
      return '🧪 **Catálogo Fitossanitário:**\n\nNão há produtos fitossanitários cadastrados no momento.';
    }

    const prodList = products
      .slice(0, 6)
      .map(
        (p) =>
          `• **${p.commercialName}** (${p.class}): *${p.activeIngredient || 'Princípio Ativo'}* | Reg. MAPA: ${p.mapa || 'Ativo'} | Dose: **${p.doseRange}** | Calda Drone: **${p.volumeCalda || 10} L/ha**`
      )
      .join('\n');

    return `🧪 **Catálogo Fitossanitário Oficial (AGROFIT/MAPA & Anvisa):**
Produtos cadastrados e calibrados para aplicação aeroagrícola:

${prodList}

⚠️ *Ressalva Obrigatória:* Toda aplicação deve seguir estritamente o receituário agronômico emitido por profissional habilitado.`;
  }

  // -------------------------------------------------------------
  // DRONES, AERONAVES & FROTA
  // -------------------------------------------------------------
  const matchedDrone = drones.find((d) => {
    const model = normalizeSearchText(d.model);
    const tag = normalizeSearchText(d.tag);
    return normMsg.includes(model) || (tag && normMsg.includes(tag));
  });

  if (!matchedDrone && (normMsg.includes('drone ') || normMsg.includes('t999') || normMsg.includes('t100') || normMsg.includes('t50') || normMsg.includes('t40') || normMsg.includes('t30') || normMsg.includes('t25') || normMsg.includes('p100') || normMsg.includes('v40'))) {
    const droneMatch = message.match(/(?:drone|modelo|aeronave)\s+([a-zA-ZÀ-ÿ0-9\-\s]+)/i);
    const searchedDrone = droneMatch ? droneMatch[1].replace(/(\?|\.|\!|\,)/g, '').trim() : (normMsg.includes('t999') ? 'DJI Agras T999' : '');
    const ignoredDroneWords = ['de', 'da', 'do', 'em', 'para', 'com', 'que', 'qual', 'quanto', 'como', 'onde'];
    if (searchedDrone && searchedDrone.length >= 3 && !ignoredDroneWords.includes(searchedDrone.toLowerCase())) {
      return `🚁 **Consulta de Aeronave:**\n\nO drone/modelo **"${searchedDrone}"** não foi encontrado na frota cadastrada da empresa ativa (**${context.tradeName || context.companyName || 'empresa ativa'}**).\n\n${drones.length > 0 ? `Drones disponíveis na frota:\n${drones.map(d => `• **${d.model}** (${d.tag || 'TAG'})`).join('\n')}` : 'Não há drones cadastrados nesta empresa.'}`;
    }
  }

  if (matchedDrone) {
    return `🚁 **Ficha Técnica da Aeronave: ${matchedDrone.model}**
• **Identificação / TAG:** ${matchedDrone.tag || 'TAG'} | Nº Série: \`${matchedDrone.serialNumber || 'Não informado'}\`
• **Registro ANAC / SISANT:** ${matchedDrone.anac || 'Não informado'}
• **Horas de Voo Acumuladas:** **${matchedDrone.hours ?? 0} horas**
• **Hectares Pulverizados:** **${matchedDrone.ha ?? 0} ha**
• **Capacidade do Tanque:** **${matchedDrone.tankL ?? 0} Litros**
• **Largura de Faixa Operacional:** ${matchedDrone.sprayWidthM ?? 0} metros
• **Próxima Manutenção Preventiva:** em **${matchedDrone.nextMaintenanceHours ?? 0} horas**
• **Status Atual:** **${(matchedDrone.status || 'em_operacao').toUpperCase()}**
• **Notas:** ${matchedDrone.notes || 'Sem observações adicionais.'}`;
  }

  if (normMsg.includes('drone') || normMsg.includes('frota') || normMsg.includes('aeronave')) {
    if (drones.length === 0) {
      return '🚁 **Frota de Drones:**\n\nNão há drones cadastrados para a empresa atualmente selecionada.';
    }

    const dronesList = drones
      .map(
        (d) =>
          `• **${d.model}** (${d.tag || 'TAG'}): ${d.hours ?? 0}h de voo | ${d.ha ?? 0} ha aplicados | Tanque: ${d.tankL ?? 0}L | Status: **${(d.status || '').toUpperCase()}**`
      )
      .join('\n');

    return `🚁 **Status & Capacidade da Frota de Drones:**
Total de aeronaves: **${drones.length}** | Utilização da frota: **${metrics.fleetUtilizationPercent ?? 0}%**

${dronesList}`;
  }

  // -------------------------------------------------------------
  // BATERIAS & CICLOS DE CARGA
  // -------------------------------------------------------------
  if (normMsg.includes('bateri') || normMsg.includes('ciclo') || normMsg.includes('saude') || normMsg.includes('carga') || normMsg.includes('voltagem')) {
    if (batteries.length === 0) {
      return '🔋 **Baterias & Ciclos:**\n\nNão há baterias cadastradas para a empresa atualmente selecionada.';
    }

    const batList = batteries
      .map(
        (b) =>
          `• **${b.identifier || b.model}**: ${b.cycles || 0}/${b.maxCycles || 500} ciclos (${b.healthPercent || 100}% de saúde) | Voltagem: ${b.voltageV || 52.2}V | Condição: **${(b.condition || 'excelente').toUpperCase()}**`
      )
      .join('\n');

    return `🔋 **Gestão de Baterias & Ciclos de Carga:**
Total de baterias monitoradas: **${batteries.length}**

${batList}

⚡ *Recomendação Operacional:* Para prolongar a vida útil, evite recargas em baterias com temperatura superior a 45°C imediatamente após o voo.`;
  }

  // -------------------------------------------------------------
  // CLIENTES & CONTRATOS
  // -------------------------------------------------------------
  const matchedClient = clients.find((c) => {
    const cName = normalizeSearchText(c.name);
    const cContact = normalizeSearchText(c.contact);
    return normMsg.includes(cName) || (cContact && normMsg.includes(cContact));
  });

  if (matchedClient) {
    const clientProps = properties.filter((p) => p.clientId === matchedClient.id || normalizeSearchText(p.client).includes(normalizeSearchText(matchedClient.name)));
    return `👥 **Ficha Cadastral 360º: ${matchedClient.name}**
• **Contato Titular:** ${matchedClient.contact || 'Não informado'}
• **CNPJ / CPF:** \`${matchedClient.doc || 'Não inf.'}\`
• **Telefone / WhatsApp:** 📞 ${matchedClient.phone || matchedClient.whatsapp || 'Não informado'}
• **E-mail:** 📧 ${matchedClient.email || 'Não informado'}
• **Município:** ${matchedClient.city || 'Não informado'}
• **Área Total Atendida:** **${matchedClient.totalHa || 0} hectares**
• **Faturamento Acumulado:** **R$ ${(matchedClient.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Fazendas Vinculadas:** ${clientProps.map((p) => p.name).join(', ') || 'Nenhuma fazenda vinculada'}
• **Histórico / Observações:** ${matchedClient.notes || 'Sem observações adicionais.'}`;
  }

  if (normMsg.includes('cliente') || normMsg.includes('contrato') || normMsg.includes('carteira')) {
    if (clients.length === 0) {
      return '👥 **Carteira de Clientes:**\n\nNão há clientes cadastrados para a empresa atualmente selecionada.';
    }

    const clientList = clients
      .map(
        (c) =>
          `• **${c.name}** (${c.city || 'Cidade não inf.'}): ${c.totalHa || 0} ha | Faturamento: **R$ ${(c.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** | Contato: ${c.contact || c.phone || 'Não inf.'}`
      )
      .join('\n');

    return `👥 **Carteira de Clientes & Fazendas Atendidas:**
Total de clientes cadastrados: **${clients.length}**

${clientList}`;
  }

  // -------------------------------------------------------------
  // ORDENS DE SERVIÇO (OS) ESPECÍFICA
  // -------------------------------------------------------------
  const matchedOS = serviceOrders.find((os) => {
    const osNum = normalizeSearchText(os.osNumber);
    return normMsg.includes(osNum) || normMsg.includes(osNum.replace('os-', ''));
  });

  if (matchedOS) {
    return `📋 **Ordem de Serviço: ${matchedOS.osNumber}**
• **Cliente:** ${matchedOS.client} | **Fazenda:** ${matchedOS.property} (${matchedOS.talhao || 'Gleba Principal'})
• **Cultura:** ${matchedOS.crop || 'Não informada'} | **Alvo:** ${matchedOS.serviceType || 'Aplicação'}
• **Área:** **${matchedOS.areaHa || 0} ha** | **Preço:** R$ ${(matchedOS.pricePerHa || 0).toFixed(2)}/ha
• **Valor Total:** **R$ ${(matchedOS.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Margem de Lucro:** **${matchedOS.marginPercent || 0}%** (Líquido: R$ ${(matchedOS.margin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
• **Piloto:** ${matchedOS.pilot || 'Não atribuído'} | **Drone:** ${matchedOS.drone || 'Não atribuído'}
• **Data do Voo:** ${getOrderDate(matchedOS) || 'Não informada'} | **Status:** **${(matchedOS.status || '').toUpperCase()}**
• **Condições Climáticas:** Vento: ${matchedOS.weather?.windSpeed || 0} km/h | Temp: ${matchedOS.weather?.temperature || 0}°C | UR: ${matchedOS.weather?.humidity || 0}%`;
  }

  if (normMsg.includes('ordem') || normMsg.includes('os') || normMsg.includes('servico') || normMsg.includes('aplicacao') || normMsg.includes('agendad') || normMsg.includes('voo')) {
    if (serviceOrders.length === 0) {
      return '📋 **Ordens de Serviço:**\n\nNão há ordens de serviço cadastradas para a empresa atualmente selecionada.';
    }

    const osList = serviceOrders
      .slice(0, 5)
      .map(
        (os) =>
          `• **${os.osNumber}** - ${os.client} (${os.property} • ${os.crop}): ${os.areaHa || 0} ha | R$ ${(os.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Status: **${(os.status || '').toUpperCase()}**`
      )
      .join('\n');

    return `📋 **Ordens de Serviço (OS) & Execuções:**
Total de ordens cadastradas: **${serviceOrders.length}**

${osList}`;
  }

  // -------------------------------------------------------------
  // NOTINHAS, DESPESAS DE CAMPO & REEMBOLSOS DOS PILOTOS
  // -------------------------------------------------------------
  if (
    normMsg.includes('notinha') ||
    normMsg.includes('recibo') ||
    normMsg.includes('gasto') ||
    normMsg.includes('despesa') ||
    normMsg.includes('combustivel') ||
    normMsg.includes('reembolso') ||
    normMsg.includes('gasolina') ||
    normMsg.includes('diesel')
  ) {
    const summaryList = (context.receiptExpensesSummary?.pilotsExpenseSummary || []) as any[];
    const totalSpentNum = Number(context.receiptExpensesSummary?.totalReceiptsSpent ?? 0);
    const pendingReimbNum = Number(context.receiptExpensesSummary?.totalReimbursementsPending ?? 0);

    if (totalSpentNum === 0 && summaryList.length === 0) {
      return `🧾 **Relatório de Notinhas & Despesas de Campo:**\n\nNão há comprovantes ou despesas de campo registradas para a empresa atual no período (**${temporal.currentPeriodLabel}**).\n\nPara registrar, acesse a aba **"Notinhas"** e realize o envio de fotos dos recibos.`;
    }

    const totalSpent = totalSpentNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pendingReimb = pendingReimbNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const pilotsBreakdown = summaryList.length > 0
      ? summaryList
          .map(
            (p: any) =>
              `• **${p.pilotName}**: R$ ${p.totalSpent.toFixed(2)} total (⛽ R$ ${p.fuelSpent.toFixed(2)} [${p.fuelLiters}L] • 🍽️ R$ ${p.foodSpent.toFixed(2)} • 🛒 R$ ${p.marketSpent.toFixed(2)}) | Pendente Reembolso: **R$ ${p.reimbursementPending.toFixed(2)}**`
          )
          .join('\n')
      : '• *Nenhum gasto por piloto registrado.*';

    return `🧾 **Relatório Mensal de Notinhas & Despesas de Campo (${temporal.currentPeriodLabel}):**

💰 **Total Gasto com Notinhas no Mês:** **R$ ${totalSpent}**
🔄 **Total Pendente de Reembolso aos Pilotos:** **R$ ${pendingReimb}**

👨‍✈️ **Detalhamento Consolidado por Piloto:**
${pilotsBreakdown}

📸 **Leitura Inteligente por Foto:**
Você pode cadastrar e auditar notinhas tirando fotos com a câmera do celular ou subindo o arquivo na aba **"Notinhas"**.`;
  }

  // -------------------------------------------------------------
  // FINANCEIRO, CONTAS A RECEBER, PAGAR & INADIMPLÊNCIA
  // -------------------------------------------------------------
  if (normMsg.includes('financeir') || normMsg.includes('receber') || normMsg.includes('pagar') || normMsg.includes('inadimpl') || normMsg.includes('vencid') || normMsg.includes('fluxo') || normMsg.includes('caixa') || normMsg.includes('conta')) {
    const pendNum = Number(metrics.totalReceivablePending ?? 0);
    const overNum = Number(metrics.totalReceivableOverdue ?? 0);
    const payNum = Number(metrics.totalPayable ?? 0);
    const recNum = Number(metrics.totalReceived ?? 0);
    const hasRealCosts = !!metrics.hasRealCosts;
    const netNum = metrics.netResult !== null && metrics.netResult !== undefined ? Number(metrics.netResult) : null;

    const pend = pendNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const over = overNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pay = payNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const rec = recNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const netStr = hasRealCosts && netNum !== null ? `**R$ ${netNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**` : '*Não apurado (sem custos reais registrados)*';

    const overdueList = (financials.overdueItems || [])
      .map((item: any) => `  ⚠️ **${item.client}**: R$ ${(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Venceu em: ${item.due || 'Data não inf.'} • ${item.os || 'OS'})`)
      .join('\n');

    return `💰 **Raio-X Financeiro & Contas da Empresa (${temporal.currentPeriodLabel}):**
• **Total Já Liquidado no Mês:** **R$ ${rec}**
• **Contas a Receber (Em Aberto):** R$ ${pend}
• **Contas a Receber (Vencidas):** **R$ ${over}** ${overNum > 0 ? '⚠️ *(Ação de cobrança prioritária)*' : '✅ *(Sem inadimplência)*'}
• **Contas a Pagar (Fornecedores & Peças):** R$ ${pay}
• **Resultado Operacional Líquido:** ${netStr}

${overdueList ? `📋 **Contas Vencidas em Detalhe:**\n${overdueList}\n` : ''}
🔔 *Regra MOUTRYX:* A liquidação do recebimento no financeiro dispara automaticamente a liberação da comissão do piloto da OS correspondente.`;
  }

  // -------------------------------------------------------------
  // LUCRO, MARGEM & RENTABILIDADE
  // -------------------------------------------------------------
  if (normMsg.includes('lucr') || normMsg.includes('margem') || normMsg.includes('resultado') || normMsg.includes('rentab') || normMsg.includes('custo') || normMsg.includes('fatur')) {
    const revNum = Number(metrics.totalRevenue ?? 0);
    const hasRealCosts = !!metrics.hasRealCosts;
    const costNum = hasRealCosts ? Number(metrics.totalCost ?? 0) : null;
    const netNum = hasRealCosts && metrics.netResult !== null && metrics.netResult !== undefined ? Number(metrics.netResult) : null;
    const marginPct = hasRealCosts && metrics.averageMarginPercent !== null && metrics.averageMarginPercent !== undefined ? Number(metrics.averageMarginPercent) : null;
    const marginHa = hasRealCosts && metrics.averageMarginPerHa !== null && metrics.averageMarginPerHa !== undefined ? Number(metrics.averageMarginPerHa) : null;
    const costHa = hasRealCosts && metrics.averageCostPerHa !== null && metrics.averageCostPerHa !== undefined ? Number(metrics.averageCostPerHa) : null;

    if (revNum === 0 && !hasRealCosts) {
      return `📊 **Análise de Rentabilidade & Margem Operacional (${temporal.currentPeriodLabel}):**\n• **Faturamento Bruto:** R$ 0,00\n• **Custos Operacionais:** Custos reais não registrados\n• **Resultado Líquido:** Não apurado\n• **Margem Média:** Não apurada\n\nℹ️ *Não há ordens de serviço concluídas ou custos reais registrados para calcular a rentabilidade da empresa atual.*`;
    }

    const rev = revNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    if (!hasRealCosts) {
      return `📊 **Análise de Rentabilidade & Margem Operacional (${temporal.currentPeriodLabel}):**
• **Faturamento Bruto:** **R$ ${rev}**
• **Custos Operacionais Totais:** *Custos reais não registrados*
• **Resultado Líquido Apurado:** *Não apurado (sem despesas reais vinculadas)*
• **Margem Média da Empresa:** *Não apurada*
• **Margem Líquida por Hectare:** *Não apurada*
• **Custo Médio por Hectare:** *Não registrado*`;
    }

    const cost = costNum!.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const net = netNum!.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return `📊 **Análise de Rentabilidade & Margem Operacional (${temporal.currentPeriodLabel}):**
• **Faturamento Bruto:** **R$ ${rev}**
• **Custos Operacionais Totais:** R$ ${cost}
• **Resultado Líquido Apurado:** **R$ ${net}**
• **Margem Média da Empresa:** **${marginPct!.toFixed(1)}%**
• **Margem Líquida por Hectare:** **${marginHa !== null ? `R$ ${marginHa.toFixed(2)} / ha` : 'Não apurada'}**
• **Custo Médio por Hectare:** ${costHa !== null ? `R$ ${costHa.toFixed(2)} / ha` : 'Não apurado'}`;
  }

  // -------------------------------------------------------------
  // DOCUMENTOS, ALVARÁS, CAAR E LICENÇAS
  // -------------------------------------------------------------
  if (normMsg.includes('document') || normMsg.includes('certidao') || normMsg.includes('alvara') || normMsg.includes('licenca') || normMsg.includes('anac') || normMsg.includes('mapa')) {
    if (documents.length === 0) {
      return '📑 **Documentos & Licenças:**\n\nNão há documentos regulatórios cadastrados para a empresa atualmente selecionada.';
    }

    const docList = documents
      .map((d: any) => `• **${d.title}** (${d.category}): Nº ${d.number || '001'} | Órgão: ${d.issuingEntity || 'MAPA/ANAC'} | Validade: **${d.expiryDate || 'Vigente'}**`)
      .join('\n');

    return `📑 **Documentos, Alvarás & Conformidade Regulatória:**
${docList}`;
  }

  // -------------------------------------------------------------
  // DEFAULT GENERAL OVERVIEW
  // -------------------------------------------------------------
  const compName = context.tradeName || context.companyName || 'sua empresa';
  return `🤖 **MOUTRYX - Copiloto Inteligente & Central de Dados:**
Tenho acesso em tempo real aos dados da sua empresa (**${compName}**):

📍 **Fazendas & Rotas:** Localização exata, gerentes, contatos e rotas Google Maps/Waze para todas as propriedades cadastradas.
🌾 **Talhões & Glebas:** Delimitação de áreas, culturas, estádios fenológicos e histórico agronômico.
🚁 **Drones & Baterias:** Horas de voo, produtividade da frota, ciclos de baterias e manutenções.
👨‍✈️ **Pilotos & Equipe:** Hectares aplicados neste mês e acumulados, horas de voo, comissões e licenças CAAR.
🧪 **AGROFIT / MAPA:** Dosagens, princípios ativos, volume de calda por hectare e calibrações.
💰 **Financeiro Completo:** Contas a receber em aberto, vencidas, contas a pagar, faturamento e margens líquidas.
📋 **Ordens de Serviço:** Status de voos, misturas de calda e parâmetros meteorológicos.

💡 **Exemplos de perguntas:**
• *"Quantos hectares o piloto João Pedro fez este mês?"*
• *"Qual piloto realizou mais hectares em ${temporal.currentMonthName.toLowerCase()}?"*
• *"Faturei mais este mês ou mês passado?"*
• *"Quanto faturei nos últimos 30 dias?"*
• *"Quais contas estão vencidas no financeiro?"*
• *"Onde fica a Fazenda Rio Bonito e como chegar?"*

Como posso te ajudar agora?`;
}
