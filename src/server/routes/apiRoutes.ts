import { Router, Response } from 'express';
import { requireAuth, requirePermission, enforceTenantIsolation, AuthenticatedRequest } from '../auth/authMiddleware';
import { withTransaction } from '../db/postgresClient';
import { ConcurrencyConflictError } from '../db/errors';
import {
  clientRepository,
  propertyRepository,
  talhaoRepository,
  droneRepository,
  batteryRepository,
  maintenanceRepository,
  pilotRepository,
  catalogRepository,
  occurrenceRepository,
  quoteRepository,
  serviceOrderRepository,
  receivableRepository,
  payableRepository,
  commissionRepository,
  receiptNoteRepository,
  auditLogRepository,
  reactivaRepository,
} from '../db/repositories';

import { centralizedErrorHandler, sanitizeClientErrorMessage } from '../security/errorHandler';

export const apiRouter = Router();

// Apply authentication and tenant isolation globally to all business routes in apiRouter
apiRouter.use(requireAuth);
apiRouter.use(enforceTenantIsolation);

/**
 * ============================================================================
 * 0. BOOTSTRAP INITIAL DATA (Single-roundtrip complete tenant state)
 * ============================================================================
 */
apiRouter.get('/bootstrap', async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const [
      clients,
      properties,
      talhoes,
      drones,
      batteries,
      maintenanceRecords,
      pilots,
      crops,
      products,
      occurrences,
      quotes,
      serviceOrders,
      accountsReceivable,
      accountsPayable,
      pilotCommissions,
      receiptNotes,
      auditLogs,
      reactivaData,
    ] = await Promise.all([
      clientRepository.getByCompany(companyId),
      propertyRepository.getByCompany(companyId),
      talhaoRepository.getByCompany(companyId),
      droneRepository.getByCompany(companyId),
      batteryRepository.getByCompany(companyId),
      maintenanceRepository.getByCompany(companyId),
      pilotRepository.getByCompany(companyId),
      catalogRepository.getCrops(),
      catalogRepository.getProducts(),
      occurrenceRepository.getByCompany(companyId),
      quoteRepository.getByCompany(companyId),
      serviceOrderRepository.getByCompany(companyId),
      receivableRepository.getByCompany(companyId),
      payableRepository.getByCompany(companyId),
      commissionRepository.getByCompany(companyId),
      receiptNoteRepository.getByCompany(companyId),
      auditLogRepository.getByCompany(companyId, 50),
      reactivaRepository.getCompanyData(companyId),
    ]);

    return res.json({
      success: true,
      companyId,
      data: {
        clients,
        properties,
        talhoes,
        drones,
        batteries,
        maintenanceRecords,
        pilots,
        crops,
        products,
        occurrences,
        quotes,
        serviceOrders,
        accountsReceivable,
        accountsPayable,
        pilotCommissions,
        receiptNotes,
        auditLogs,
        reactiva: reactivaData,
      },
    });
  } catch (err: any) {
    console.error('[API] /api/bootstrap error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 500);
    return res.status(500).json({ error: 'Erro ao carregar dados operacionais do tenant.', code: sanitized.code });
  }
});

/**
 * ============================================================================
 * 1. COMMERCIAL — QUOTES & PROPOSALS
 * ============================================================================
 */

// GET /api/quotes — List quotes
apiRouter.get('/quotes', requirePermission('quotes.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const quotes = await quoteRepository.getByCompany(companyId);
  return res.json({
    success: true,
    companyId,
    data: quotes,
  });
});

// POST /api/quotes — Create new quote
apiRouter.post('/quotes', requirePermission('quotes.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await quoteRepository.create(req.body, companyId);
    await auditLogRepository.create({
      companyId,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Criação de Orçamento',
      entityType: 'Orçamento',
      entityId: created.quoteNumber,
      details: `Criou orçamento ${created.quoteNumber} para ${created.clientName} (${created.areaHa} ha - R$ ${created.finalAmount.toFixed(2)})`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }, companyId);

    return res.status(201).json({
      success: true,
      quote: created,
      message: 'Orçamento criado com sucesso.',
    });
  } catch (err: any) {
    console.error('[API] /api/quotes create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// GET /api/quotes/:id — Get quote by ID
apiRouter.get('/quotes/:id', requirePermission('quotes.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const quote = await quoteRepository.getById(req.params.id, companyId);
  if (!quote) {
    return res.status(404).json({ error: 'Orçamento não encontrado no tenant ativo.' });
  }
  return res.json({ success: true, companyId, data: quote });
});

// PUT & PATCH /api/quotes/:id — Update quote
apiRouter.put('/quotes/:id', requirePermission('quotes.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const updated = await quoteRepository.update(req.params.id, req.body, companyId);
  if (!updated) {
    return res.status(404).json({ error: 'Orçamento não encontrado no tenant ativo.' });
  }
  return res.json({ success: true, quote: updated });
});

// DELETE /api/quotes/:id — Delete quote
apiRouter.delete('/quotes/:id', requirePermission('quotes.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await quoteRepository.delete(req.params.id, companyId);
  if (!success) {
    return res.status(404).json({ error: 'Orçamento não encontrado no tenant ativo.' });
  }
  return res.json({ success, deletedId: req.params.id });
});

// PATCH /api/quotes/:id/status — Update quote status
apiRouter.patch('/quotes/:id/status', requirePermission('quotes.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { status, approvedAt, sentAt, version, currentVersion } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status do orçamento é obrigatório.' });
  }

  const updated = await quoteRepository.updateStatus(req.params.id, status, companyId, {
    approvedAt,
    sentAt,
    version: version !== undefined ? version : currentVersion,
  });
  if (!updated) {
    return res.status(404).json({ error: 'Orçamento não encontrado no tenant ativo.' });
  }

  return res.json({
    success: true,
    quote: updated,
    quoteId: req.params.id,
    newStatus: status,
    companyId,
    message: `Status do orçamento alterado para ${status}.`,
  });
});

// POST /api/quotes/:id/convert — Convert quote to Service Order (OS)
apiRouter.post('/quotes/:id/convert', requirePermission('quotes.convert'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const quote = await quoteRepository.getById(req.params.id, companyId);
    if (!quote) {
      return res.status(404).json({ error: 'Orçamento não encontrado no tenant ativo.' });
    }

    // Idempotency: If already converted, return the linked OS
    if (quote.status === 'convertido_em_os' && quote.convertedToOsId) {
      const existingOS = await serviceOrderRepository.getById(quote.convertedToOsId, companyId);
      if (existingOS) {
        return res.json({
          success: true,
          serviceOrder: existingOS,
          message: 'Orçamento já foi convertido anteriormente nesta Ordem de Serviço.',
        });
      }
    }

    const currentYear = new Date().getFullYear();
    const osNumber = `OS-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOS = await withTransaction(async (tx) => {
      // Find matching talhao if available for this property
      const talhoes = await talhaoRepository.getByCompany(companyId, tx);
      const matchingTalhao = talhoes.find(
        (t) => t.propertyId === quote.propertyId && (quote.talhaoName ? t.name === quote.talhaoName : true)
      );

      const createdOS = await serviceOrderRepository.create({
        companyId,
        osNumber,
        quoteId: quote.id,
        clientId: quote.clientId,
        clientName: quote.clientName,
        clientWhatsapp: quote.clientWhatsapp || '',
        propertyId: quote.propertyId,
        propertyName: quote.propertyName,
        propertyCoords: { lat: 0, lng: 0 },
        talhaoId: matchingTalhao ? matchingTalhao.id : undefined,
        talhaoName: quote.talhaoName || (matchingTalhao ? matchingTalhao.name : 'Talhão Principal'),
        crop: quote.crop,
        areaHa: quote.areaHa,
        serviceType: quote.serviceType,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '08:00',
        status: 'agendado',
        pilotId: quote.pilotAssignedId || '',
        pilotName: quote.pilotAssignedName || 'Piloto a Definir',
        droneId: '',
        droneModel: quote.droneModelPreferred || 'Drone a Definir',
        products: [],
        pricePerHa: quote.pricePerHa,
        grossAmount: quote.subtotal,
        displacementFee: quote.displacementFee || 0,
        additionalFees: quote.additionalFees || 0,
        discount: quote.discount || 0,
        finalAmount: quote.finalAmount,
        estimatedCost: quote.estimatedCost || 0,
        netMargin: quote.estimatedMargin || 0,
        paymentTerms: quote.paymentTerms || '30 dias após aplicação',
        calculatedPilotCommission: quote.areaHa * 4.5,
        commissionStatus: 'prevista',
        clientSigned: false,
        notes: `Gerada a partir do orçamento ${quote.quoteNumber}.`,
      }, companyId, tx);

      // Update Quote to convertido_em_os with optimistic version check
      await quoteRepository.updateStatus(quote.id, 'convertido_em_os', companyId, {
        convertedToOsId: createdOS.id,
        version: quote.version,
      }, tx);

      // Create Pilot Commission Record if pilot is defined
      if (createdOS.pilotId) {
        await commissionRepository.create({
          companyId,
          pilotId: createdOS.pilotId,
          pilotName: createdOS.pilotName,
          osId: createdOS.id,
          osNumber: createdOS.osNumber,
          clientName: createdOS.clientName,
          serviceDate: createdOS.scheduledDate,
          areaSprayedHa: createdOS.areaHa,
          serviceAmount: createdOS.finalAmount,
          commissionRuleApplied: 'R$ 4.50/ha',
          commissionAmount: createdOS.calculatedPilotCommission,
          status: 'prevista',
          notes: 'Comissão provisionada na geração da OS a partir de orçamento.',
        }, companyId, tx);
      }

      await auditLogRepository.create({
        companyId,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Geração de OS a partir de Orçamento',
        entityType: 'Ordem de Serviço',
        entityId: createdOS.osNumber,
        details: `Converteu ${quote.quoteNumber} em ${createdOS.osNumber} para ${createdOS.clientName}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, companyId, tx);

      return createdOS;
    });

    return res.status(201).json({
      success: true,
      serviceOrder: newOS,
      message: 'Orçamento convertido em Ordem de Serviço com sucesso.',
    });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/quotes/convert-to-os error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 500);
    return res.status(500).json({ error: sanitized.error, code: sanitized.code });
  }
});

/**
 * ============================================================================
 * 2. OPERATIONS — SERVICE ORDERS (OS)
 * ============================================================================
 */

// GET /api/service-orders — List OS
apiRouter.get('/service-orders', requirePermission('serviceOrders.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const orders = await serviceOrderRepository.getByCompany(companyId);
  return res.json({
    success: true,
    companyId,
    data: orders,
  });
});

// POST /api/service-orders — Create OS
apiRouter.post('/service-orders', requirePermission('serviceOrders.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const currentYear = new Date().getFullYear();
    const osNumber = req.body.osNumber || `OS-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const created = await withTransaction(async (tx) => {
      const newOS = await serviceOrderRepository.create({ ...req.body, osNumber }, companyId, tx);

      // Create commission record if pilot is assigned
      if (newOS.pilotId) {
        await commissionRepository.create({
          companyId,
          pilotId: newOS.pilotId,
          pilotName: newOS.pilotName,
          osId: newOS.id,
          osNumber: newOS.osNumber,
          clientName: newOS.clientName,
          serviceDate: newOS.scheduledDate,
          areaSprayedHa: newOS.areaHa,
          serviceAmount: newOS.finalAmount,
          commissionRuleApplied: 'R$ 4.50/ha',
          commissionAmount: newOS.calculatedPilotCommission,
          status: 'prevista',
        }, companyId, tx);
      }

      await auditLogRepository.create({
        companyId,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Criação de Ordem de Serviço',
        entityType: 'Ordem de Serviço',
        entityId: newOS.osNumber,
        details: `Criou OS para ${newOS.clientName} (${newOS.areaHa} ha - ${newOS.serviceType})`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, companyId, tx);

      return newOS;
    });

    return res.status(201).json({
      success: true,
      serviceOrder: created,
      message: 'Ordem de Serviço cadastrada com sucesso.',
    });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/service-orders create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// GET /api/service-orders/:id — Get OS by ID
apiRouter.get('/service-orders/:id', requirePermission('serviceOrders.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const os = await serviceOrderRepository.getById(req.params.id, companyId);
  if (!os) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada no tenant ativo.' });
  }
  return res.json({ success: true, companyId, data: os });
});

// PUT /api/service-orders/:id — Update OS
apiRouter.put('/service-orders/:id', requirePermission('serviceOrders.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const updated = await serviceOrderRepository.update(req.params.id, req.body, companyId);
  if (!updated) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada no tenant ativo.' });
  }
  return res.json({ success: true, serviceOrder: updated });
});

// DELETE /api/service-orders/:id — Delete OS
apiRouter.delete('/service-orders/:id', requirePermission('serviceOrders.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await serviceOrderRepository.delete(req.params.id, companyId);
  if (!success) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada no tenant ativo.' });
  }
  return res.json({ success, deletedId: req.params.id });
});

// PATCH /api/service-orders/:id/status — Update OS status
apiRouter.patch('/service-orders/:id/status', requirePermission('serviceOrders.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { status, extra, version, currentVersion } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status da OS é obrigatório.' });
  }

  const mergedExtra = {
    ...extra,
    version: version !== undefined ? version : (extra?.version !== undefined ? extra.version : currentVersion),
  };

  const today = new Date().toISOString().split('T')[0];

  const updated = await withTransaction(async (tx) => {
    const updatedOS = await serviceOrderRepository.updateStatus(req.params.id, status, companyId, mergedExtra, tx);
    if (!updatedOS) {
      return null;
    }

    // Sync drone & pilot operational status
    if (status === 'em_andamento' || status === 'em_operacao') {
      if (updatedOS.droneId) {
        await droneRepository.updateStatus(updatedOS.droneId, 'em_voo', companyId);
      }
      if (updatedOS.pilotId) {
        await pilotRepository.update(updatedOS.pilotId, { status: 'em_voo' }, companyId, tx);
      }
    } else if (status === 'concluido' || status === 'cancelado' || status === 'pausado') {
      if (updatedOS.droneId && (status === 'concluido' || status === 'cancelado')) {
        await droneRepository.updateStatus(updatedOS.droneId, 'disponivel', companyId);
      }
      if (updatedOS.pilotId && (status === 'concluido' || status === 'cancelado')) {
        await pilotRepository.update(updatedOS.pilotId, { status: 'ativo' }, companyId, tx);
      }
    }

    // If concluded, invoiced, or paid -> generate Account Receivable (always in aberto unless explicitly paid)
    if (status === 'concluido' || status === 'faturado' || status === 'pago') {
      const existingRecs = await receivableRepository.getByCompany(companyId, tx);
      const hasRec = existingRecs.some((r) => r.osId === updatedOS.id);
      if (!hasRec) {
        await receivableRepository.create({
          companyId,
          clientId: updatedOS.clientId,
          clientName: updatedOS.clientName,
          osId: updatedOS.id,
          osNumber: updatedOS.osNumber,
          description: `Serviço ${updatedOS.serviceType} - ${updatedOS.areaHa} ha (${updatedOS.propertyName})`,
          amount: updatedOS.finalAmount,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: status === 'pago' ? 'pago' : 'aberto',
          paymentDate: status === 'pago' ? today : undefined,
          paymentMethod: 'boleto',
          notes: 'Conta a receber gerada ao faturar/concluir a OS.',
        }, companyId, tx);
      }
    }

    // If cancelled, remove unpaid receivables and unpaid commissions
    if (status === 'cancelado') {
      const existingRecs = await receivableRepository.getByCompany(companyId, tx);
      for (const r of existingRecs) {
        if (r.osId === updatedOS.id && r.status !== 'pago') {
          await receivableRepository.delete(r.id, companyId, tx);
        }
      }
      const existingComms = await commissionRepository.getByCompany(companyId, tx);
      for (const c of existingComms) {
        if (c.osId === updatedOS.id && c.status !== 'paga') {
          await commissionRepository.delete(c.id, companyId, tx);
        }
      }
    }

    await auditLogRepository.create({
      companyId,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Atualização de Status de OS',
      entityType: 'Ordem de Serviço',
      entityId: updatedOS.osNumber,
      details: `Alterou status da OS para ${status}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }, companyId, tx);

    return updatedOS;
  });

  if (!updated) {
    return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });
  }

  return res.json({
    success: true,
    serviceOrder: updated,
    message: `Status da OS alterado para ${status}.`,
  });
});

// POST /api/service-orders/:id/complete — Conclude flight execution
apiRouter.post('/service-orders/:id/complete', requirePermission('serviceOrders.complete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { actualHectares, flightHours, batteryCycles, clientSignature, version, currentVersion } = req.body;

  const completed = await withTransaction(async (tx) => {
    const updated = await serviceOrderRepository.updateStatus(req.params.id, 'concluido', companyId, {
      actualAreaSprayedHa: actualHectares !== undefined && actualHectares !== null ? Number(actualHectares) : undefined,
      flightHoursRecorded: flightHours !== undefined && flightHours !== null ? Number(flightHours) : undefined,
      batteryCyclesUsed: batteryCycles !== undefined && batteryCycles !== null ? Number(batteryCycles) : undefined,
      clientSigned: !!clientSignature,
      completedDate: new Date().toISOString().split('T')[0],
      version: version !== undefined ? version : currentVersion,
    }, tx);

    if (!updated) return null;

    // Update drone flight hours and status if drone is assigned
    if (updated.droneId) {
      const drone = await droneRepository.getById(updated.droneId, companyId, tx);
      if (drone) {
        const addedHours = flightHours ? Number(flightHours) : 0;
        const addedHa = actualHectares ? Number(actualHectares) : 0;
        await droneRepository.update(
          drone.id,
          {
            flightHours: (drone.flightHours || 0) + addedHours,
            accumulatedHectares: (drone.accumulatedHectares || 0) + addedHa,
            status: 'disponivel',
          },
          companyId,
          tx
        );
      }
    }

    // Update pilot accumulated statistics if pilot is assigned
    if (updated.pilotId) {
      const pilot = await pilotRepository.getById(updated.pilotId, companyId, tx);
      if (pilot) {
        const addedHours = flightHours ? Number(flightHours) : 0;
        const addedHa = actualHectares ? Number(actualHectares) : 0;
        await pilotRepository.update(
          pilot.id,
          {
            flightHours: (pilot.flightHours || 0) + addedHours,
            totalHectaresSprayed: (pilot.totalHectaresSprayed || 0) + addedHa,
            status: 'ativo',
          },
          companyId,
          tx
        );
      }
    }

    // Create Account Receivable in status 'aberto' if not already created
    const existingRecs = await receivableRepository.getByCompany(companyId, tx);
    const hasRec = existingRecs.some((r) => r.osId === updated.id);
    if (!hasRec) {
      await receivableRepository.create({
        companyId,
        clientId: updated.clientId,
        clientName: updated.clientName,
        osId: updated.id,
        osNumber: updated.osNumber,
        description: `Serviço ${updated.serviceType} - ${updated.areaHa} ha (${updated.propertyName})`,
        amount: updated.finalAmount,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'aberto',
        paymentMethod: 'boleto',
        notes: 'Conta a receber gerada na conclusão da OS.',
      }, companyId, tx);
    }

    await auditLogRepository.create({
      companyId,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Conclusão de Ordem de Serviço',
      entityType: 'Ordem de Serviço',
      entityId: updated.osNumber,
      details: `Concluiu OS ${updated.osNumber}. Área Real: ${updated.actualAreaSprayedHa ?? 'N/I'} ha, Horas: ${updated.flightHoursRecorded ?? 'N/I'}h`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }, companyId, tx);

    return updated;
  });

  if (!completed) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada no tenant ativo.' });
  }

  return res.json({
    success: true,
    serviceOrder: completed,
    message: 'Ordem de Serviço finalizada com sucesso.',
  });
});

/**
 * ============================================================================
 * 3. FINANCIAL — RECEIVABLES, PAYABLES & COMMISSIONS
 * ============================================================================
 */

// GET /api/finance/receivables
apiRouter.get('/finance/receivables', requirePermission('finance.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const receivables = await receivableRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: receivables });
});

// POST /api/finance/receivables
apiRouter.post('/finance/receivables', requirePermission('finance.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const created = await receivableRepository.create(req.body, companyId);
  return res.status(201).json({ success: true, data: created });
});

// POST /api/finance/receivables/:id/settle — Settle and trigger Pilot Commission Liberation
apiRouter.post('/finance/receivables/:id/settle', requirePermission('finance.receive'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { paymentMethod = 'pix', version, currentVersion } = req.body;

  const settled = await withTransaction(async (tx) => {
    const rec = await receivableRepository.settle(
      req.params.id,
      paymentMethod,
      companyId,
      version !== undefined ? version : currentVersion,
      tx
    );
    if (!rec) return null;

    // Release matching pilot and crew commissions
    if (rec.osNumber || rec.osId) {
      const commissions = await commissionRepository.getByCompany(companyId, tx);
      const matchingComms = commissions.filter((c) => (rec.osId && c.osId === rec.osId) || (rec.osNumber && c.osNumber === rec.osNumber));
      for (const matchingComm of matchingComms) {
        if (matchingComm.status === 'aguardando_pagamento_cliente' || matchingComm.status === 'prevista') {
          await commissionRepository.updateStatus(matchingComm.id, 'liberada', companyId, matchingComm.version, tx);
        }
      }

      // Update Service Order status to 'pago'
      if (rec.osId) {
        await serviceOrderRepository.updateStatus(rec.osId, 'pago', companyId, undefined, tx);
      } else if (rec.osNumber) {
        const orders = await serviceOrderRepository.getByCompany(companyId, tx);
        const matchingOS = orders.find((o) => o.osNumber === rec.osNumber);
        if (matchingOS) {
          await serviceOrderRepository.updateStatus(matchingOS.id, 'pago', companyId, undefined, tx);
        }
      }
    }

    await auditLogRepository.create({
      companyId,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Baixa de Conta a Receber',
      entityType: 'Financeiro',
      entityId: rec.osNumber || rec.id,
      details: `Recebeu R$ ${rec.amount.toFixed(2)} do cliente ${rec.clientName} via ${paymentMethod.toUpperCase()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }, companyId, tx);

    return rec;
  });

  if (!settled) {
    return res.status(404).json({ error: 'Conta a receber não encontrada.' });
  }

  return res.json({
    success: true,
    receivable: settled,
    message: 'Conta a receber liquidada e comissão de piloto liberada.',
  });
});

// GET /api/finance/payables
apiRouter.get('/finance/payables', requirePermission('finance.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const payables = await payableRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: payables });
});

// POST /api/finance/payables
apiRouter.post('/finance/payables', requirePermission('finance.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const created = await payableRepository.create(req.body, companyId);
  return res.status(201).json({ success: true, data: created });
});

// POST /api/finance/payables/:id/pay
apiRouter.post('/finance/payables/:id/pay', requirePermission('finance.pay'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const settled = await payableRepository.settle(req.params.id, companyId);
  if (!settled) {
    return res.status(404).json({ error: 'Conta a pagar não encontrada.' });
  }
  return res.json({ success: true, payable: settled, message: 'Conta a pagar liquidada com sucesso.' });
});

// GET /api/commissions
apiRouter.get('/commissions', requirePermission('commissions.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const comms = await commissionRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: comms });
});

// PATCH /api/commissions/:id/status
apiRouter.patch('/commissions/:id/status', requirePermission('commissions.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { status } = req.body;
  const success = await commissionRepository.updateStatus(req.params.id, status, companyId);
  if (!success) return res.status(404).json({ error: 'Comissão não encontrada.' });
  return res.json({ success: true, message: `Status da comissão alterado para ${status}.` });
});

/**
 * ============================================================================
 * 4. RECEIPT NOTES & FIELD REIMBURSEMENTS
 * ============================================================================
 */

// GET /api/reimbursements
apiRouter.get('/reimbursements', requirePermission('reimbursements.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const notes = await receiptNoteRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: notes });
});

// POST /api/reimbursements
apiRouter.post('/reimbursements', requirePermission('reimbursements.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const created = await receiptNoteRepository.create(req.body, companyId);
  return res.status(201).json({ success: true, data: created });
});

// PATCH /api/reimbursements/:id/approve
apiRouter.patch('/reimbursements/:id/approve', requirePermission('reimbursements.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await receiptNoteRepository.updateReimbursement(req.params.id, 'aprovado', companyId);
  if (!success) return res.status(404).json({ error: 'Notinha não encontrada.' });
  return res.json({ success: true, message: 'Reembolso aprovado com sucesso.' });
});

// PATCH /api/reimbursements/:id/reimburse
apiRouter.patch('/reimbursements/:id/reimburse', requirePermission('reimbursements.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await receiptNoteRepository.updateReimbursement(req.params.id, 'reembolsado', companyId);
  if (!success) return res.status(404).json({ error: 'Notinha não encontrada.' });
  return res.json({ success: true, message: 'Reembolso liquidado com sucesso.' });
});

// DELETE /api/reimbursements/:id
apiRouter.delete('/reimbursements/:id', requirePermission('reimbursements.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await receiptNoteRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Reembolso não encontrado no tenant ativo.' });
  return res.json({ success });
});

/**
 * ============================================================================
 * 5. FLEET — DRONES, BATTERIES & MAINTENANCE
 * ============================================================================
 */

// GET /api/drones
apiRouter.get('/drones', requirePermission('drones.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const drones = await droneRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: drones });
});

// GET /api/drones/:id
apiRouter.get('/drones/:id', requirePermission('drones.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const drone = await droneRepository.getById(req.params.id, companyId);
  if (!drone) return res.status(404).json({ error: 'Drone não encontrado no tenant ativo.' });
  return res.json({ success: true, companyId, data: drone });
});

// POST /api/drones
apiRouter.post('/drones', requirePermission('drones.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await droneRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, data: created, drone: created });
  } catch (err: any) {
    console.error('[API] /api/drones create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT /api/drones/:id
apiRouter.put('/drones/:id', requirePermission('drones.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await droneRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Drone não encontrado no tenant ativo.' });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/drones update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/drones/:id
apiRouter.delete('/drones/:id', requirePermission('drones.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await droneRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Drone não encontrado no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

// PATCH /api/drones/:id/status
apiRouter.patch('/drones/:id/status', requirePermission('drones.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { status } = req.body;
  const success = await droneRepository.updateStatus(req.params.id, status, companyId);
  return res.json({ success });
});

// GET /api/batteries
apiRouter.get('/batteries', requirePermission('batteries.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const batteries = await batteryRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: batteries });
});

// GET /api/batteries/:id
apiRouter.get('/batteries/:id', requirePermission('batteries.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const battery = await batteryRepository.getById(req.params.id, companyId);
  if (!battery) return res.status(404).json({ error: 'Bateria não encontrada no tenant ativo.' });
  return res.json({ success: true, companyId, data: battery });
});

// POST /api/batteries
apiRouter.post('/batteries', requirePermission('batteries.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await batteryRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, data: created, battery: created });
  } catch (err: any) {
    console.error('[API] /api/batteries create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT /api/batteries/:id
apiRouter.put('/batteries/:id', requirePermission('batteries.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await batteryRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Bateria não encontrada no tenant ativo.' });
    return res.json({ success: true, data: updated, battery: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/batteries update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/batteries/:id
apiRouter.delete('/batteries/:id', requirePermission('batteries.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await batteryRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Bateria não encontrada no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

// PATCH /api/batteries/:id/cycles
apiRouter.patch('/batteries/:id/cycles', requirePermission('batteries.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { cycles } = req.body;
  const updated = await batteryRepository.updateCycles(req.params.id, Number(cycles || 0), companyId);
  return res.json({ success: !!updated, data: updated });
});

// GET /api/maintenance
apiRouter.get('/maintenance', requirePermission('maintenance.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const records = await maintenanceRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: records });
});

// GET /api/maintenance/:id
apiRouter.get('/maintenance/:id', requirePermission('maintenance.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const record = await maintenanceRepository.getById(req.params.id, companyId);
  if (!record) return res.status(404).json({ error: 'Registro de manutenção não encontrado no tenant ativo.' });
  return res.json({ success: true, companyId, data: record });
});

// POST /api/maintenance
apiRouter.post('/maintenance', requirePermission('maintenance.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await maintenanceRepository.create(req.body, companyId);
    if (created.cost > 0) {
      await payableRepository.create({
        companyId,
        costCenter: 'manutencao',
        supplierName: created.provider,
        description: `Manutenção ${created.type.toUpperCase()}: ${created.droneModel}`,
        amount: created.cost,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'aberto',
        droneId: created.droneId,
        isRecurring: false,
      }, companyId);
    }
    return res.status(201).json({ success: true, data: created, maintenance: created });
  } catch (err: any) {
    console.error('[API] /api/maintenance create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/maintenance/:id
apiRouter.delete('/maintenance/:id', requirePermission('maintenance.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await maintenanceRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Registro de manutenção não encontrado no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

/**
 * ============================================================================
 * 6. PILOTS
 * ============================================================================
 */

// GET /api/pilots
apiRouter.get('/pilots', requirePermission('pilots.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const pilots = await pilotRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: pilots });
});

// GET /api/pilots/:id
apiRouter.get('/pilots/:id', requirePermission('pilots.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const pilot = await pilotRepository.getById(req.params.id, companyId);
  if (!pilot) return res.status(404).json({ error: 'Piloto não encontrado no tenant ativo.' });
  return res.json({ success: true, companyId, data: pilot });
});

// POST /api/pilots
apiRouter.post('/pilots', requirePermission('pilots.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await pilotRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, data: created, pilot: created });
  } catch (err: any) {
    console.error('[API] /api/pilots create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT & PATCH /api/pilots/:id
apiRouter.put('/pilots/:id', requirePermission('pilots.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await pilotRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Piloto não encontrado no tenant ativo.' });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/pilots update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

apiRouter.patch('/pilots/:id', requirePermission('pilots.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await pilotRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Piloto não encontrado no tenant ativo.' });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/pilots patch error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/pilots/:id
apiRouter.delete('/pilots/:id', requirePermission('pilots.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await pilotRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Piloto não encontrado no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

/**
 * ============================================================================
 * 7. CLIENTS, PROPERTIES & TALHOES
 * ============================================================================
 */

// GET /api/clients
apiRouter.get('/clients', requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const clients = await clientRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: clients });
});

// GET /api/clients/:id
apiRouter.get('/clients/:id', requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const client = await clientRepository.getById(req.params.id, companyId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado no tenant ativo.' });
  return res.json({ success: true, companyId, data: client });
});

// POST /api/clients
apiRouter.post('/clients', requirePermission('clients.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await clientRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, client: created, message: 'Cliente cadastrado com sucesso.' });
  } catch (err: any) {
    console.error('[API] /api/clients create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT /api/clients/:id
apiRouter.put('/clients/:id', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await clientRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Cliente não encontrado no tenant ativo.' });
    return res.json({ success: true, client: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/clients update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PATCH /api/clients/:id
apiRouter.patch('/clients/:id', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await clientRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Cliente não encontrado no tenant ativo.' });
    return res.json({ success: true, client: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/clients patch error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/clients/:id
apiRouter.delete('/clients/:id', requirePermission('clients.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await clientRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Cliente não encontrado no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

// GET /api/properties
apiRouter.get('/properties', requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const properties = await propertyRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: properties });
});

// GET /api/properties/:id
apiRouter.get('/properties/:id', requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const property = await propertyRepository.getById(req.params.id, companyId);
  if (!property) return res.status(404).json({ error: 'Propriedade não encontrada no tenant ativo.' });
  return res.json({ success: true, companyId, data: property });
});

// POST /api/properties
apiRouter.post('/properties', requirePermission('properties.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await propertyRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, property: created });
  } catch (err: any) {
    console.error('[API] /api/properties create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT /api/properties/:id
apiRouter.put('/properties/:id', requirePermission('properties.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await propertyRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Propriedade não encontrada no tenant ativo.' });
    return res.json({ success: true, property: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/properties update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/properties/:id
apiRouter.delete('/properties/:id', requirePermission('clients.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await propertyRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Propriedade não encontrada no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

// GET /api/talhoes & GET /api/plots
apiRouter.get(['/talhoes', '/plots'], requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const talhoes = await talhaoRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: talhoes });
});

// GET /api/talhoes/:id & GET /api/plots/:id
apiRouter.get(['/talhoes/:id', '/plots/:id'], requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const talhao = await talhaoRepository.getById(req.params.id, companyId);
  if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado no tenant ativo.' });
  return res.json({ success: true, companyId, data: talhao });
});

// POST /api/talhoes & POST /api/plots
apiRouter.post(['/talhoes', '/plots'], requirePermission('properties.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const created = await talhaoRepository.create(req.body, companyId);
    return res.status(201).json({ success: true, talhao: created, plot: created, data: created });
  } catch (err: any) {
    console.error('[API] /api/talhoes create error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// PUT /api/talhoes/:id & PUT /api/plots/:id
apiRouter.put(['/talhoes/:id', '/plots/:id'], requirePermission('properties.create'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  try {
    const updated = await talhaoRepository.update(req.params.id, req.body, companyId);
    if (!updated) return res.status(404).json({ error: 'Talhão não encontrado no tenant ativo.' });
    return res.json({ success: true, talhao: updated, plot: updated, data: updated });
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError || err?.name === 'ConcurrencyConflictError' || err?.conflict || err?.statusCode === 409) {
      return res.status(409).json({ error: 'O registro foi modificado por outro usuário. Recarregue a página para obter a versão mais recente.', conflict: true, code: 'CONCURRENCY_CONFLICT' });
    }
    console.error('[API] /api/talhoes update error:', err);
    const sanitized = sanitizeClientErrorMessage(err, 400);
    return res.status(400).json({ error: sanitized.error, code: sanitized.code });
  }
});

// DELETE /api/talhoes/:id & DELETE /api/plots/:id
apiRouter.delete(['/talhoes/:id', '/plots/:id'], requirePermission('clients.delete'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const success = await talhaoRepository.delete(req.params.id, companyId);
  if (!success) return res.status(404).json({ error: 'Talhão não encontrado no tenant ativo.' });
  return res.json({ success, deletedId: req.params.id });
});

/**
 * ============================================================================
 * 8. OCCURRENCES & AUDIT LOGS
 * ============================================================================
 */

// POST /api/field/sync-batch — Process batch of offline actions from field mode
apiRouter.post('/field/sync-batch', requirePermission('fieldMode.execute'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { actions } = req.body;

  if (!Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ error: 'Nenhuma ação offline fornecida para sincronização.' });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const action of actions) {
    try {
      // Validate tenant match
      if (action.companyId && action.companyId !== companyId) {
        throw new Error('Incompatibilidade de Tenant (empresa).');
      }

      switch (action.type) {
        case 'START_OPERATION': {
          const res = await serviceOrderRepository.updateStatus(action.osId, 'em_operacao', companyId);
          if (!res) throw new Error('OS não encontrada no tenant ativo.');
          break;
        }
        case 'PAUSE_OPERATION': {
          const res = await serviceOrderRepository.updateStatus(action.osId, 'pausado', companyId);
          if (!res) throw new Error('OS não encontrada no tenant ativo.');
          break;
        }
        case 'RESUME_OPERATION': {
          const res = await serviceOrderRepository.updateStatus(action.osId, 'em_operacao', companyId);
          if (!res) throw new Error('OS não encontrada no tenant ativo.');
          break;
        }
        case 'OCCURRENCE': {
          await occurrenceRepository.create({
            id: action.id,
            companyId,
            osId: action.osId,
            osNumber: action.osNumber,
            pilotId: action.pilotId,
            pilotName: action.pilotName,
            type: action.payload?.occurrenceType || 'outro',
            description: action.payload?.description || 'Ocorrência registrada no campo',
            photoUrl: action.payload?.photoUrl || '',
            timestamp: action.timestamp,
          }, companyId);
          break;
        }
        case 'PHOTO': {
          await occurrenceRepository.create({
            id: action.id,
            companyId,
            osId: action.osId,
            osNumber: action.osNumber,
            pilotId: action.pilotId,
            pilotName: action.pilotName,
            type: 'outro',
            description: action.payload?.photoCaption || 'Registro fotográfico em campo',
            photoUrl: action.payload?.photoBase64 || '',
            timestamp: action.timestamp,
          }, companyId);
          break;
        }
        case 'APPLIED_AREA': {
          const res = await serviceOrderRepository.update(action.osId, {
            actualAreaSprayedHa: action.payload?.appliedAreaHa,
          }, companyId);
          if (!res) throw new Error('OS não encontrada no tenant ativo.');
          break;
        }
        case 'FINISH_OPERATION': {
          const today = action.timestamp ? action.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
          const res = await serviceOrderRepository.updateStatus(action.osId, 'concluido', companyId, {
            actualAreaSprayedHa: action.payload?.appliedAreaHa,
            notes: action.payload?.finalNotes,
            completedDate: today,
          });
          if (!res) throw new Error('OS não encontrada no tenant ativo.');
          break;
        }
      }

      results.push({ id: action.id, success: true });
    } catch (err: any) {
      console.warn(`[BATCH SYNC ERROR] Falha na ação ${action.id}:`, err);
      const sanitized = sanitizeClientErrorMessage(err, 400);
      results.push({ id: action.id, success: false, error: sanitized.error });
    }
  }

  return res.json({
    success: true,
    total: actions.length,
    synced: results.filter((r) => r.success).length,
    results,
  });
});

// GET /api/occurrences
apiRouter.get('/occurrences', requirePermission('serviceOrders.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const occs = await occurrenceRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: occs });
});

// POST /api/occurrences
apiRouter.post('/occurrences', requirePermission('serviceOrders.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const created = await occurrenceRepository.create(req.body, companyId);
  return res.status(201).json({ success: true, data: created });
});

// GET /api/audit-logs
apiRouter.get('/audit-logs', requirePermission('users.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const logs = await auditLogRepository.getByCompany(companyId);
  return res.json({ success: true, companyId, data: logs });
});

// POST /api/audit-logs
apiRouter.post('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const created = await auditLogRepository.create(req.body, companyId);
  return res.status(201).json({ success: true, data: created });
});

/**
 * ============================================================================
 * 9. REPORTS & EXPORTS
 * ============================================================================
 */

// GET /api/reports
apiRouter.get('/reports', requirePermission('reports.read'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    companyId: req.effectiveCompanyId,
    message: 'Consulta de relatórios autorizada.',
  });
});

// POST /api/reports/export
apiRouter.post('/reports/export', requirePermission('reports.export'), (req: AuthenticatedRequest, res: Response) => {
  const { reportType = 'faturamento_mensal', format = 'pdf' } = req.body;
  return res.json({
    success: true,
    exportId: `exp-${Date.now()}`,
    reportType,
    format,
    companyId: req.effectiveCompanyId,
    exportedBy: req.user!.name,
    timestamp: new Date().toISOString(),
    message: `Exportação de relatório (${reportType}) em formato ${format.toUpperCase()} gerada com sucesso.`,
  });
});

/**
 * ============================================================================
 * 10. REATIVA — CLIENT REACTIVATION PERSISTENCE (POSTGRESQL MULTI-TENANT)
 * ============================================================================
 */

// GET /api/reactiva/data — Get all statuses, notes, history and custom templates for tenant
apiRouter.get('/reactiva/data', requirePermission('clients.read'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const data = await reactivaRepository.getCompanyData(companyId);
  return res.json({ success: true, companyId, data });
});

// POST /api/reactiva/status — Update client reactivation status
apiRouter.post('/reactiva/status', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { clientId, status } = req.body;
  if (!clientId || !status) {
    return res.status(400).json({ error: 'clientId e status são obrigatórios.' });
  }
  const updated = await reactivaRepository.upsertStatus(clientId, status, companyId);
  return res.json({ success: true, data: updated });
});

// POST /api/reactiva/notes — Update client reactivation notes
apiRouter.post('/reactiva/notes', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { clientId, notes } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório.' });
  }
  const updated = await reactivaRepository.upsertNotes(clientId, notes || '', companyId);
  return res.json({ success: true, data: updated });
});

// POST /api/reactiva/contact — Record contact interaction and update status
apiRouter.post('/reactiva/contact', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { clientId, messageText, channel = 'whatsapp', statusAfter = 'contatado' } = req.body;
  if (!clientId || !messageText) {
    return res.status(400).json({ error: 'clientId e messageText são obrigatórios.' });
  }
  const record = await reactivaRepository.addContactHistory({
    clientId,
    messageText,
    channel,
    statusAfter,
    userName: req.user?.name,
  }, companyId);
  return res.status(201).json({ success: true, data: record });
});

// POST /api/reactiva/templates — Save custom message templates for tenant
apiRouter.post('/reactiva/templates', requirePermission('clients.update'), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.effectiveCompanyId!;
  const { templates } = req.body;
  if (!Array.isArray(templates)) {
    return res.status(400).json({ error: 'templates deve ser um array.' });
  }
  const saved = await reactivaRepository.saveTemplates(templates, companyId);
  return res.json({ success: true, data: saved });
});

// Global secure error handler for apiRouter
apiRouter.use(centralizedErrorHandler);

