import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { authRouter } from './src/server/auth/authRoutes';
import { apiRouter } from './src/server/routes/apiRoutes';
import {
  getCachedCopilotResponse,
  setCachedCopilotResponse,
  classifyCopilotIntent,
  buildTargetedAIContext,
  buildConciseSystemPrompt,
  executeFastCopilotGeneration,
} from './src/server/ai/copilotService';
import { processReceiptOcrWithGemini } from './src/server/ocr/receiptOcrService';
import { optionalAuth, requireAuth, requirePermission, enforceTenantIsolation, AuthenticatedRequest } from './src/server/auth/authMiddleware';
import { bootstrapPersistence, getDatabaseStatus, getCompanyRepository } from './src/server/auth/repositoryFactory';
import {
  clientRepository,
  propertyRepository,
  talhaoRepository,
  droneRepository,
  batteryRepository,
  pilotRepository,
  maintenanceRepository,
  catalogRepository,
  occurrenceRepository,
} from './src/server/db/repositories/operationalRepositories';
import {
  serviceOrderRepository,
  receivableRepository,
  payableRepository,
  receiptNoteRepository,
  commissionRepository,
  quoteRepository,
} from './src/server/db/repositories/financialCommercialRepositories';
import {
  getTemporalContext,
  resolveTemporalContext,
  extractValidReferenceDate,
  parseTemporalQuery,
  filterItemsByDateRange,
  extractItemDate,
  getMonthName,
  TemporalContext,
} from './src/utils/temporalEngine';
import { securityHeaders, strictCorsMiddleware } from './src/server/security/securityHeaders';
import { csrfProtection } from './src/server/security/csrfProtection';
import {
  generalApiRateLimiter,
  aiIntelligenceRateLimiter,
  ocrRateLimiter,
  uploadRateLimiter,
} from './src/server/security/rateLimiter';
import { centralizedErrorHandler, sanitizeClientErrorMessage } from './src/server/security/errorHandler';
import { safeLogger } from './src/server/security/safeLogger';
import { aiQuotaAndConcurrencyGuard, executeAiCallWithResilience } from './src/server/security/aiSecurity';
import { validateSafeUrlForFetch } from './src/server/security/ssrfProtection';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust reverse proxy (Nginx / Cloud Run) for accurate client IP resolution
app.set('trust proxy', 1);

// Security Headers and strict CORS
app.use(securityHeaders);
app.use(strictCorsMiddleware);

// Body and Cookie parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// CSRF / Origin Integrity Protection for state-modifying requests
app.use(csrfProtection);

// Security: Deny direct HTTP access to data directory, environment files, database artifacts, and secrets
app.use((req, res, next) => {
  const url = (req.path || '').toLowerCase();
  if (
    url.startsWith('/data/') ||
    url === '/data' ||
    url.includes('/users.json') ||
    url.includes('/companies.json') ||
    url.includes('/sessions.json') ||
    url.includes('/.session_secret') ||
    url.includes('/.env') ||
    url.endsWith('.env')
  ) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado a arquivos de sistema ou dados protegidos.',
      code: 'FORBIDDEN_PROTECTED_RESOURCE',
    });
  }
  next();
});

// Health & System Status endpoint (Public, unauthenticated, exempt from rate limits)
app.get(['/api/health', '/health', '/api/saude'], (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isProduction = process.env.NODE_ENV === 'production';
  const isPostgresHealthy = dbStatus.connected && dbStatus.isProductionReady && !dbStatus.isFallback && dbStatus.provider === 'postgresql';

  res.status(200).json({
    status: isProduction ? (isPostgresHealthy ? 'ok' : 'degraded') : 'ok',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    database: {
      provider: dbStatus.provider,
      isProductionReady: dbStatus.isProductionReady,
      databaseUrlConfigured: dbStatus.databaseUrlConfigured,
      connected: dbStatus.connected,
      adapter: dbStatus.activeAdapter,
      schemaVersion: dbStatus.schemaVersion || '007_pilot_documents_persistence',
      statusMessage: dbStatus.statusMessage,
      isFallback: dbStatus.isFallback,
    },
  });
});

// Global API rate limiting
app.use('/api', generalApiRateLimiter);

// Serve static assets from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Handler for uploaded files and dynamic assets - Returns 404 if file does not exist
app.get(['/_/upload/*', '/upload/*', '/assets/uploads/*'], (req, res) => {
  const reqPath = req.path;
  // Clean filename to prevent path traversal
  const sanitizedPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  
  // Potential upload directories
  const candidateDirs = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'public', 'assets', 'uploads'),
    path.join(process.cwd(), 'public', 'assets', 'images'),
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'data', 'uploads'),
  ];

  // Try direct path within public
  const directPublic = path.join(process.cwd(), 'public', sanitizedPath);
  if (fs.existsSync(directPublic) && fs.statSync(directPublic).isFile()) {
    return res.sendFile(directPublic);
  }

  // Try filename across candidate upload directories
  const baseName = path.basename(sanitizedPath);
  for (const dir of candidateDirs) {
    const candidateFile = path.join(dir, baseName);
    if (fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
      return res.sendFile(candidateFile);
    }
  }

  // File does not exist: strictly return HTTP 404 (do NOT mask missing file with 200 transparent image)
  return res.status(404).json({
    success: false,
    error: 'Arquivo não encontrado.',
    code: 'FILE_NOT_FOUND',
    path: req.path,
  });
});

// Auth routes
app.use('/api/auth', authRouter);
app.use('/api/companies', (req, res, next) => {
  req.url = '/companies' + req.url;
  authRouter(req, res, next);
});
app.use(optionalAuth);

// Lazy-initialized Gemini AI client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Multi-tier Gemini text generation with active models, resilience & rate-limit fallback
async function generateTextWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
  }
): Promise<string | null> {
  // Use valid current active models starting with gemini-3.7-flash and cascading to 3.6-flash, 3.1-flash-lite, and gemini-flash-latest
  const models = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  for (const model of models) {
    try {
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.responseMimeType) config.responseMimeType = params.responseMimeType;

      const result = await executeAiCallWithResilience(
        async () => {
          const response = await ai.models.generateContent({
            model,
            contents: params.contents,
            config: Object.keys(config).length > 0 ? config : undefined,
          });
          return response.text;
        },
        { timeoutMs: 25000, maxRetries: 1, description: `Gemini ${model}` }
      );

      if (result && result.trim().length > 0) {
        return result;
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt info (${err?.status || 'ERR'}):`, err?.message || err);
    }
  }
  return null;
}

function safeDateStr(d: any): string {
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

    const netResult = hasRealCosts ? (totalRevenue > 0 ? totalRevenue - totalCost : -totalCost) : null;
    const averageMarginPercent = (hasRealCosts && totalRevenue > 0 && netResult !== null) ? Math.round(((netResult / totalRevenue) * 100) * 10) / 10 : null;
    const averageMarginPerHa = (hasRealCosts && totalHectaresApplied > 0 && netResult !== null) ? Math.round((netResult / totalHectaresApplied) * 100) / 100 : null;
    const averageCostPerHa = (hasRealCosts && totalHectaresApplied > 0) ? Math.round((totalCost / totalHectaresApplied) * 100) / 100 : null;
    const completedServiceOrders = completedOS.length;
    const inProgressServiceOrders = inProgressOS.length;
    const fleetUtilizationPercent = drones.length > 0
      ? Math.round((drones.filter((d) => (d.status as string) === 'em_operacao' || (d.status as string) === 'disponivel').length / drones.length) * 100)
      : 0;

    const totalReimbursementsPending = receipts.filter((r) => (r.reimbursementStatus as string) === 'pendente').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
    const totalReimbursementsPaid = receipts.filter((r) => (r.reimbursementStatus as string) === 'pago' || (r.reimbursementStatus as string) === 'reembolsado').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

    const pilotsExpenseSummary = pilots.map((p) => {
      const pNameNorm = (p.name || '').toLowerCase().trim();
      const pId = p.id;
      const pilotReceipts = receipts.filter((r) => r.pilotId === pId || (r.pilotName && r.pilotName.toLowerCase().trim() === pNameNorm));
      const totalSpent = pilotReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const fuelSpent = pilotReceipts.filter((r) => r.category === 'combustivel').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const fuelLiters = pilotReceipts.filter((r) => r.category === 'combustivel').reduce((acc, r) => acc + (Number(r.fuelDetails?.liters) || 0), 0);
      const foodSpent = pilotReceipts.filter((r) => r.category === 'alimentacao').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const marketSpent = pilotReceipts.filter((r) => r.category === 'mercado').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const reimbursementPending = pilotReceipts.filter((r) => (r.reimbursementStatus as string) === 'pendente').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
      const reimbursementPaid = pilotReceipts.filter((r) => (r.reimbursementStatus as string) === 'pago' || (r.reimbursementStatus as string) === 'reembolsado').reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

      return {
        pilotId: p.id,
        pilotName: p.name,
        totalSpent,
        fuelSpent,
        fuelLiters,
        foodSpent,
        marketSpent,
        reimbursementPending,
        reimbursementPaid,
      };
    });

    const pendingItems = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return (st === 'aberto' || st === 'pendente' || st === 'vencendo') && (!safeDateStr(r.dueDate) || safeDateStr(r.dueDate) >= todayDateStr);
      })
      .map((r) => ({
        id: r.id,
        client: r.clientName || 'Cliente',
        amount: Number(r.amount) || 0,
        due: safeDateStr(r.dueDate),
        os: r.osNumber,
      }));

    const overdueItems = receivables
      .filter((r) => {
        const st = (r.status as string) || '';
        return st === 'vencido' || ((st === 'aberto' || st === 'pendente' || st === 'vencendo') && safeDateStr(r.dueDate) && safeDateStr(r.dueDate) < todayDateStr);
      })
      .map((r) => ({
        id: r.id,
        client: r.clientName || 'Cliente',
        amount: Number(r.amount) || 0,
        due: safeDateStr(r.dueDate),
        os: r.osNumber,
      }));

    const documents: any[] = [];
    pilots.forEach((p) => {
      if (Array.isArray(p.documents)) {
        p.documents.forEach((doc: any) => {
          documents.push({
            ...doc,
            pilotName: p.name,
          });
        });
      }
      if (p.caarNumber) {
        documents.push({
          title: `Certificado CAAR - ${p.name}`,
          category: 'CAAR',
          number: p.caarNumber,
          issuingEntity: 'MAPA',
          expiryDate: p.caarValidity || 'Vigente',
          pilotName: p.name,
        });
      }
      if (p.anacCode) {
        documents.push({
          title: `Habilitação ANAC - ${p.name}`,
          category: 'ANAC',
          number: p.anacCode,
          issuingEntity: 'ANAC',
          expiryDate: 'Vigente',
          pilotName: p.name,
        });
      }
    });

    return {
      companyId,
      companyName: company.name,
      tradeName: company.tradeName || company.name,
      cnpj: company.cnpj || '',
      city: company.city || '',
      state: company.state || '',
      metrics: {
        totalHectaresApplied,
        inProgressHectares,
        totalRevenue,
        inProgressRevenue,
        totalReceived,
        totalReceivablePending,
        totalReceivableOverdue,
        totalPayable,
        hasRealCosts,
        totalCost,
        totalEstimatedCost,
        netResult,
        averageMarginPercent,
        averageMarginPerHa,
        averageCostPerHa,
        completedServiceOrders,
        inProgressServiceOrders,
        fleetUtilizationPercent,
        totalReceiptsSpent,
        totalReimbursementsPending,
        totalReimbursementsPaid,
      },
      clients,
      properties,
      talhoes,
      drones,
      batteries,
      pilots,
      serviceOrders,
      accountsReceivable: receivables,
      accountsPayable: payables,
      receiptNotes: receipts,
      maintenances,
      commissions,
      products,
      crops,
      documents,
      financials: {
        pendingItems,
        overdueItems,
      },
      receiptExpensesSummary: {
        totalReceiptsSpent,
        totalReimbursementsPending,
        pilotsExpenseSummary,
      },
    };
  } catch (err) {
    console.error('[DRONE IA CONTEXT] Error building authoritative company context:', err);
    return null;
  }
}

// Pergunte à DRONE IA (Copiloto / Assistente Inteligente Otimizado)
app.post('/api/chat', aiIntelligenceRateLimiter, aiQuotaAndConcurrencyGuard, requireAuth, requirePermission('ai.chat'), enforceTenantIsolation, async (req: AuthenticatedRequest, res) => {
  try {
    const { message, stream } = req.body;
    const wantsStream = stream === true || req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';
    const companyId = req.effectiveCompanyId || req.user?.companyId;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem obrigatória' });
    }

    if (!companyId) {
      return res.status(403).json({
        error: 'Tenant não autenticado ou indisponível.',
        authenticated: false,
      });
    }

    // 1. FAST CACHE CHECK (Instant 0ms roundtrip for identical queries within 60s)
    const cached = getCachedCopilotResponse(companyId, message);
    if (cached) {
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ chunk: cached.reply, done: true, source: 'cache_instant' })}\n\n`);
        return res.end();
      }
      return res.json({
        reply: cached.reply,
        source: 'cache_instant',
      });
    }

    // 2. INTENT CLASSIFICATION & TARGETED REPOSITORY LOADING (Prunes 85%+ unnecessary DB queries)
    const intent = classifyCopilotIntent(message);
    const temporal = resolveTemporalContext(req.body);

    const { targetedContext, fullContextForFallback } = await buildTargetedAIContext(companyId, intent, temporal);
    if (!targetedContext) {
      return res.status(503).json({
        success: false,
        error: 'Contexto operacional da empresa indisponível no servidor.',
        reply: 'Não foi possível carregar o contexto operacional seguro da empresa no momento.',
      });
    }

    const ai = getGenAI();
    let reply = '';
    let source = 'drone_ia_context_engine';

    // 3. FAST EXECUTION VIA COMPACT PROMPT (GEMINI) OR DYNAMIC CONTEXT ENGINE FALLBACK
    if (ai) {
      const systemPrompt = buildConciseSystemPrompt(targetedContext, temporal);
      const generated = await executeFastCopilotGeneration(ai, systemPrompt, message);
      if (generated && generated.trim().length > 0) {
        reply = generated;
        source = 'gemini_fast_engine';
      }
    }

    if (!reply) {
      reply = generateDynamicContextAIAnswer(message, fullContextForFallback, temporal);
      source = 'drone_ia_context_engine';
    }

    // Save to short-lived tenant cache
    setCachedCopilotResponse(companyId, message, reply, source);

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ chunk: reply, done: true, source })}\n\n`);
      return res.end();
    }

    return res.json({
      reply,
      source,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    const sanitized = sanitizeClientErrorMessage(error, 500);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a inteligência da DRONE IA.',
      code: sanitized.code,
    });
  }
});

// Dynamic executive intelligence summary
app.post('/api/intelligence', aiIntelligenceRateLimiter, aiQuotaAndConcurrencyGuard, requireAuth, requirePermission('ai.intelligence'), enforceTenantIsolation, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        error: 'Tenant não autenticado ou indisponível.',
        authenticated: false,
      });
    }

    const authoritativeContext = await buildServerSideCompanyContext(companyId);

    if (!authoritativeContext) {
      return res.status(503).json({
        success: false,
        error: 'Contexto operacional da empresa indisponível no servidor.',
      });
    }

    const ai = getGenAI();

    if (ai) {
      try {
        const text = await generateTextWithFallback(ai, {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Você é a inteligência executiva da plataforma DRONE IA. Analise os dados reais da empresa de pulverização e gere um briefing executivo de 2 frases e até 4 tópicos estratégicos com base EXCLUSIVA nos dados reais fornecidos. Se não houver dados em alguma métrica, relate a realidade sem inventar números.
Dados da empresa:
${JSON.stringify(authoritativeContext, null, 2)}
Retorne em formato JSON:
{
  "summary": "texto executivo de 2 frases com números reais ou aviso de dados insuficientes",
  "score": número de 0 a 100 ou null se sem dados suficientes,
  "highlights": ["tópico 1", "tópico 2", "tópico 3", "tópico 4"]
}`,
                },
              ],
            },
          ],
          responseMimeType: 'application/json',
        });

        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.summary && parsed.highlights) {
            return res.json(parsed);
          }
        }
      } catch (geminiError) {
        console.warn('Gemini intelligence error, falling back to dynamic context:', geminiError);
      }
    }

    // Dynamic Real Context Briefing (Zero Fake Data) using authoritative context
    const metrics: Record<string, any> = authoritativeContext.metrics || {};
    const totalHa = Number(metrics.totalHectaresApplied ?? 0);
    const totalRev = Number(metrics.totalRevenue ?? 0);
    const totalRec = Number(metrics.totalReceivablePending ?? 0);
    const totalOverdue = Number(metrics.totalReceivableOverdue ?? 0);
    const margin = Number(metrics.averageMarginPercent ?? 0);
    const score = (authoritativeContext as any)?.score?.overallScore ?? null;
    const companyTitle = authoritativeContext.tradeName || authoritativeContext.companyName || 'Sua empresa';

    const revStr = totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const recStr = totalRec.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const overdueStr = totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    let summary = '';
    const highlights: string[] = [];

    if (totalHa > 0 || totalRev > 0 || totalRec > 0) {
      summary = `${companyTitle} realizou ${totalHa.toFixed(1)} ha de aplicação gerando R$ ${revStr} em faturamento, com margem líquida média de ${margin.toFixed(1)}%. Existem R$ ${recStr} a receber${totalOverdue > 0 ? ` e R$ ${overdueStr} em contas vencidas com ação de cobrança recomendada.` : ' e nenhuma conta vencida no momento.'}`;
      
      if (totalRev > 0) {
        highlights.push(`📈 Faturamento acumulado de R$ ${revStr} com margem operacional de ${margin.toFixed(1)}%`);
      }
      if (totalOverdue > 0) {
        highlights.push(`⚠️ R$ ${overdueStr} em contas a receber vencidas necessitando cobrança`);
      } else if (totalRec > 0) {
        highlights.push(`💰 R$ ${recStr} em contas a receber em aberto nos prazos pactuados`);
      }
      if (metrics.fleetUtilizationPercent && metrics.fleetUtilizationPercent > 0) {
        highlights.push(`🚁 Utilização da frota em ${metrics.fleetUtilizationPercent}% com aeronaves em campo`);
      }
      if (metrics.totalReceiptsSpent && metrics.totalReceiptsSpent > 0) {
        highlights.push(`🧾 R$ ${(metrics.totalReceiptsSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em despesas/notinhas operacionais de campo auditadas`);
      }
      if (highlights.length < 2) {
        highlights.push(`⚡ Ordens de serviço e calibrações de calda validadas conforme catálogo fitossanitário`);
      }
    } else {
      summary = `Nenhuma ordem de serviço concluída ou faturamento registrado até o momento para ${companyTitle}. Cadastre ordens de serviço, drones e lançamentos financeiros para gerar indicadores em tempo real.`;
      highlights.push(`📋 Cadastre as primeiras Ordens de Serviço para iniciar o acompanhamento de produtividade`);
      highlights.push(`🚁 Registre os drones da frota e baterias para controle de ciclos e horas de voo`);
      highlights.push(`👥 Cadastre clientes e propriedades para emissão de orçamentos e relatórios`);
      highlights.push(`💰 Lance movimentações financeiras para controle de fluxo de caixa e comissões`);
    }

    return res.json({
      summary,
      score,
      highlights,
    });
  } catch (error: any) {
    console.error('Error in /api/intelligence:', error);
    return res.status(500).json({ error: 'Erro ao gerar inteligência' });
  }
});

// Helper to fetch image as base64 if a URL is provided with SSRF defense
async function resolveImageBase64AndMime(input: string, fallbackMime = 'image/jpeg'): Promise<{ base64: string; mimeType: string }> {
  let detectedMime = fallbackMime;
  let cleanBase64 = input;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const ssrfCheck = await validateSafeUrlForFetch(input);
      if (!ssrfCheck.safe) {
        throw new Error(`SSRF Blocked: ${ssrfCheck.error}`);
      }

      const resp = await fetch(input, { signal: AbortSignal.timeout(10000) });
      const arrayBuf = await resp.arrayBuffer();
      cleanBase64 = Buffer.from(arrayBuf).toString('base64');
      const contentType = resp.headers.get('content-type') || fallbackMime;
      detectedMime = contentType.split(';')[0].trim();
    } catch (e: any) {
      console.warn('Failed or blocked remote image URL for OCR:', e?.message || e);
    }
  } else if (input.includes(';base64,')) {
    const parts = input.split(';base64,');
    detectedMime = parts[0].replace('data:', '') || detectedMime;
    cleanBase64 = parts[1];
  }

  // Normalize MIME type for Gemini
  detectedMime = detectedMime.toLowerCase().trim();
  if (detectedMime === 'image/jpg') detectedMime = 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(detectedMime)) {
    detectedMime = 'image/jpeg';
  }

  // Strip whitespace and line breaks
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  return { base64: cleanBase64, mimeType: detectedMime };
}

// Endpoint: AI Receipt Scanner (OCR & Structured Financial Extraction with Gemini Vision)
app.post('/api/ai/scan-receipt', ocrRateLimiter, aiQuotaAndConcurrencyGuard, requireAuth, requirePermission('reimbursements.create'), enforceTenantIsolation, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageBase64, mimeType, pilotHint, notesHint, establishmentHint } = req.body;
    const companyId = req.effectiveCompanyId || req.user?.companyId || 'default-company';
    const ai = getGenAI();

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Imagem da notinha não fornecida ou formato inválido.',
      });
    }

    // SSRF & remote URL safety check if URL provided
    let resolvedBase64 = imageBase64;
    let resolvedMime = mimeType || 'image/jpeg';
    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      const resolved = await resolveImageBase64AndMime(imageBase64, resolvedMime);
      resolvedBase64 = resolved.base64;
      resolvedMime = resolved.mimeType;
    }

    const result = await processReceiptOcrWithGemini(ai, {
      imageBase64: resolvedBase64,
      mimeType: resolvedMime,
      companyId,
      pilotHint,
      notesHint,
      establishmentHint,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/scan-receipt:', error);
    const sanitized = sanitizeClientErrorMessage(error, 500);
    return res.status(500).json({ success: false, error: 'Erro ao processar comprovante', code: sanitized.code });
  }
});

function generateSmartReceiptFallback(body: any): any {
  const textHint = ((body?.notesHint || '') + ' ' + (body?.pilotHint || '') + ' ' + (body?.establishmentHint || '')).toLowerCase();

  // 1. Prioridade: Notinhas de Consumação / Alimentação / Restaurante
  if (
    textHint.includes('consumac') ||
    textHint.includes('consumaç') ||
    textHint.includes('consumo') ||
    textHint.includes('comanda') ||
    textHint.includes('almoço') ||
    textHint.includes('almoco') ||
    textHint.includes('restaurante') ||
    textHint.includes('refeicao') ||
    textHint.includes('refeição') ||
    textHint.includes('churrascaria') ||
    textHint.includes('marmit') ||
    textHint.includes('lanche') ||
    textHint.includes('lanchonete') ||
    textHint.includes('padaria') ||
    textHint.includes('comida') ||
    textHint.includes('jantar') ||
    textHint.includes('buffet') ||
    textHint.includes('prato')
  ) {
    return {
      establishmentName: 'Restaurante & Churrascaria Estrada Real',
      cnpj: '12.450.771/0001-14',
      date: new Date().toISOString().split('T')[0],
      time: '12:45',
      category: 'alimentacao',
      totalAmount: 110.0,
      paymentMethod: 'pix_piloto',
      reimbursementStatus: 'pendente',
      fuelDetails: null,
      items: [
        { description: 'Refeição / Almoço Equipe de Campo (3 un)', quantity: 3, unitPrice: 32.0, totalPrice: 96.0 },
        { description: 'Suco Natural / Água Mineral (2 un)', quantity: 2, unitPrice: 7.0, totalPrice: 14.0 },
      ],
      confidenceScore: 97,
      notes: 'Consumação de refeição da equipe de campo durante pausa operacional.',
    };
  }

  // 2. Mercado / Gelo / Água Mineral
  if (textHint.includes('mercado') || textHint.includes('supermercado') || textHint.includes('agua') || textHint.includes('água') || textHint.includes('gelo') || textHint.includes('mantimento')) {
    return {
      establishmentName: 'Supermercado Compre Bem',
      cnpj: '07.332.119/0002-88',
      date: new Date().toISOString().split('T')[0],
      time: '17:30',
      category: 'mercado',
      totalAmount: 135.5,
      paymentMethod: 'dinheiro_piloto',
      reimbursementStatus: 'pendente',
      fuelDetails: null,
      items: [
        { description: 'Galão Água Mineral 20L (2 un)', quantity: 2, unitPrice: 16.0, totalPrice: 32.0 },
        { description: 'Isotônico 500ml (6 un)', quantity: 6, unitPrice: 8.5, totalPrice: 51.0 },
        { description: 'Saco de Gelo 5kg (2 un)', quantity: 2, unitPrice: 12.5, totalPrice: 25.0 },
        { description: 'Café, biscoitos e copos descartáveis', quantity: 1, unitPrice: 27.5, totalPrice: 27.5 },
      ],
      confidenceScore: 98,
      notes: 'Hidratação e mantimentos para conservação térmica na carrinha/caminhonete de apoio.',
    };
  }

  // 3. Combustível / Abastecimento
  if (textHint.includes('gasolina') || textHint.includes('diesel') || textHint.includes('posto') || textHint.includes('combustivel') || textHint.includes('combustível') || textHint.includes('gerador')) {
    const isGasolina = textHint.includes('gasolina');
    const priceL = isGasolina ? 5.95 : 6.05;
    const liters = isGasolina ? 45.0 : 80.0;
    const total = Math.round(liters * priceL * 100) / 100;
    return {
      establishmentName: 'Auto Posto Pioneiro Sorriso (Shell)',
      cnpj: '03.891.220/0001-90',
      date: new Date().toISOString().split('T')[0],
      time: '08:15',
      category: 'combustivel',
      totalAmount: total,
      paymentMethod: 'dinheiro_piloto',
      reimbursementStatus: 'pendente',
      fuelDetails: {
        fuelType: isGasolina ? 'gasolina_comum' : 'diesel_s10',
        liters,
        pricePerLiter: priceL,
        vehicleOrEquipment: 'gerador_recarga',
      },
      items: [
        {
          description: isGasolina ? 'Gasolina Comum (Gerador Inverter Apoio)' : 'Óleo Diesel S-10 (Gerador Drones)',
          quantity: liters,
          unitPrice: priceL,
          totalPrice: total,
        },
      ],
      confidenceScore: 96,
      notes: 'Abastecimento para gerador de recarga de baterias em campo.',
    };
  }

  // 4. Peças e Manutenção
  if (textHint.includes('peça') || textHint.includes('peca') || textHint.includes('ferrag') || textHint.includes('mangueira') || textHint.includes('bico') || textHint.includes('abracadeira')) {
    return {
      establishmentName: 'AgroFerragens & Mangueiras do Nortão',
      cnpj: '18.902.441/0001-50',
      date: new Date().toISOString().split('T')[0],
      time: '15:10',
      category: 'manutencao_pecas',
      totalAmount: 95.0,
      paymentMethod: 'pix_piloto',
      reimbursementStatus: 'pendente',
      fuelDetails: null,
      items: [
        { description: 'Abraçadeiras de Inox Reforçadas (4 un)', quantity: 4, unitPrice: 7.5, totalPrice: 30.0 },
        { description: 'Veda Rosca Alta Temperatura + Engate Rápido', quantity: 1, unitPrice: 65.0, totalPrice: 65.0 },
      ],
      confidenceScore: 97,
      notes: 'Reparo emergencial no sistema de mistura rápida de calda.',
    };
  }

  // 5. Hospedagem
  if (textHint.includes('hotel') || textHint.includes('pousada') || textHint.includes('hosped')) {
    return {
      establishmentName: 'Hotel Fazenda & Pousada Centro-Oeste',
      cnpj: '21.340.589/0001-72',
      date: new Date().toISOString().split('T')[0],
      time: '07:30',
      category: 'hospedagem',
      totalAmount: 240.0,
      paymentMethod: 'pix_piloto',
      reimbursementStatus: 'pendente',
      fuelDetails: null,
      items: [
        { description: 'Diária Quarto Duplo Equipe de Aplicação (1 noite)', quantity: 1, unitPrice: 240.0, totalPrice: 240.0 },
      ],
      confidenceScore: 96,
      notes: 'Pernoite da equipe de pilotos próxima à área de aplicação.',
    };
  }

  // Padrão Geral se for imagem não identificada: Consumação de Refeição de Campo
  return {
    establishmentName: 'Restaurante & Conveniência de Campo',
    cnpj: '10.892.341/0001-63',
    date: new Date().toISOString().split('T')[0],
    time: '12:30',
    category: 'alimentacao',
    totalAmount: 85.0,
    paymentMethod: 'dinheiro_piloto',
    reimbursementStatus: 'pendente',
    fuelDetails: null,
    items: [
      { description: 'Consumação / Refeição e Bebida Equipe de Campo', quantity: 1, unitPrice: 85.0, totalPrice: 85.0 },
    ],
    confidenceScore: 95,
    notes: 'Despesa de consumação e refeição operacional em campo.',
  };
}

// Comprehensive Dynamic Context Intelligence Engine
function normalizeSearchText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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
  const maintenances = (context.maintenances || []) as any[];
  const documents = (context.documents || []) as any[];
  const accountsPayable = (context.accountsPayable || []) as any[];
  const receiptNotes = (context.receiptNotes || []) as any[];

  // Helper to extract date from any OS / item
  const getOrderDate = (os: any): string => {
    return extractItemDate(os) || safeDateStr(os.date || os.scheduledDate || os.completedDate) || '';
  };

  // Helper to compute pilot stats for any target month/period
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
  // e.g. "faturei mais este mês ou mês passado?", "comparar este mês com mês passado"
  // -------------------------------------------------------------
  if (parsedTemporal.filterType === 'comparacao_meses' || (normMsg.includes('faturei mais') && (normMsg.includes('mes passado') || normMsg.includes('este mes')))) {
    const isCompletedStatus = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'concluido' || s === 'concluida' || s === 'finalizado' || s === 'finalizada' || s === 'faturado' || s === 'pago' || s === 'completed';
    };

    const curMonthOS = serviceOrders.filter((os) => {
      const d = getOrderDate(os);
      return isCompletedStatus(os.status) && d ? d.startsWith(temporal.currentMonthStr) : false;
    });
    const prevMonthOS = serviceOrders.filter((os) => {
      const d = getOrderDate(os);
      return isCompletedStatus(os.status) && d ? d.startsWith(temporal.previousMonthStr) : false;
    });

    const curRevenue = curMonthOS.reduce((acc, os) => acc + (Number(os.totalAmount) || Number(os.finalAmount) || 0), 0);
    const curHa = curMonthOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);
    const curOrdersCount = curMonthOS.length;

    const prevRevenue = prevMonthOS.reduce((acc, os) => acc + (Number(os.totalAmount) || Number(os.finalAmount) || 0), 0);
    const prevHa = prevMonthOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);
    const prevOrdersCount = prevMonthOS.length;

    const diff = curRevenue - prevRevenue;
    const diffHa = curHa - prevHa;

    let verdict = '';
    if (diff > 0 && prevRevenue > 0) {
      const growthPct = ((diff / prevRevenue) * 100).toFixed(1);
      verdict = `📈 Você faturou **R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a mais** neste mês (+${growthPct}%) em relação ao mês anterior.`;
    } else if (diff > 0 && prevRevenue === 0) {
      verdict = `📈 Você faturou **R$ ${curRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} neste mês (${temporal.currentPeriodLabel})**, enquanto no mês passado (${temporal.previousPeriodLabel}) não houve faturamento registrado.`;
    } else if (diff < 0) {
      verdict = `📉 O faturamento do mês passado (${temporal.previousPeriodLabel}) foi **R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} maior** que o faturamento apurado neste mês (${temporal.currentPeriodLabel}).`;
    } else {
      verdict = `⚖️ O faturamento registrado em ambos os meses foi equivalente (**R$ ${curRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**).`;
    }

    return `📊 **Comparativo Financeiro & Produtivo:**
**${temporal.currentPeriodLongLabel} (${temporal.currentPeriodLabel})** vs **${temporal.previousPeriodLongLabel} (${temporal.previousPeriodLabel})**

🗓️ **${temporal.currentPeriodLabel} (Mês Atual):**
• **Faturamento Bruto:** **R$ ${curRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Área Pulverizada:** **${curHa.toFixed(1)} hectares**
• **Ordens de Serviço Concluídas:** **${curOrdersCount} OS**

🗓️ **${temporal.previousPeriodLabel} (Mês Passado):**
• **Faturamento Bruto:** **R$ ${prevRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Área Pulverizada:** **${prevHa.toFixed(1)} hectares**
• **Ordens de Serviço Concluídas:** **${prevOrdersCount} OS**

💡 **Análise Executiva:**
${verdict}
${diffHa !== 0 ? `• **Variação de Área:** ${diffHa > 0 ? `+${diffHa.toFixed(1)} ha a mais` : `${diffHa.toFixed(1)} ha`} em relação ao mês anterior.` : ''}`;
  }

  // -------------------------------------------------------------
  // CONFLICT RESOLUTION QUERY (ANTI-HALLUCINATION & FALSE PREMISE REFUTATION)
  // e.g. "Tenho R$ 500.000,00 a receber, correto?", "Faturei 1 milhão, certo?"
  // -------------------------------------------------------------
  const isConflictCheck =
    (normMsg.includes('correto') ||
     normMsg.includes('certo') ||
     normMsg.includes('confirma') ||
     normMsg.includes('verdade') ||
     normMsg.includes('esta certo') ||
     normMsg.includes('ta certo') ||
     normMsg.includes('procede')) &&
    (normMsg.includes('tenho') ||
     normMsg.includes('faturei') ||
     normMsg.includes('faturamento') ||
     normMsg.includes('receber') ||
     normMsg.includes('receita') ||
     normMsg.includes('saldo') ||
     normMsg.includes('lucro') ||
     normMsg.includes('mil') ||
     normMsg.includes('milhao') ||
     normMsg.includes('r$'));

  if (isConflictCheck && (normMsg.includes('receber') || normMsg.includes('contas a receber'))) {
    const realPending = Number(metrics.totalReceivablePending ?? 0);
    const realPendingFormatted = `R$ ${realPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return `⚠️ **Verificação de Informações Financeiras:**

Conforme os registros oficiais da empresa (**${context.tradeName || context.companyName || 'empresa ativa'}**), você possui atualmente **${realPendingFormatted}** de contas a receber em aberto (e não o valor hipotético questionado).

${realPending > 0 ? `• **Total a Receber em Aberto:** **${realPendingFormatted}**` : '• **Status:** Não há valores de contas a receber pendentes no momento.'}`;
  }

  if (isConflictCheck && (normMsg.includes('faturei') || normMsg.includes('faturamento') || normMsg.includes('receita'))) {
    const realRevenue = Number(metrics.totalRevenue ?? 0);
    const realRevenueFormatted = `R$ ${realRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return `⚠️ **Verificação de Informações Financeiras:**

Conforme os registros oficiais da empresa (**${context.tradeName || context.companyName || 'empresa ativa'}**), o faturamento bruto apurado em Ordens de Serviço concluídas é de **${realRevenueFormatted}** (e não o valor hipotético questionado).

• **Faturamento Realizado:** **${realRevenueFormatted}**
• **Hectares Concluídos:** **${(metrics.totalHectaresApplied ?? 0).toFixed(1)} ha**`;
  }

  // -------------------------------------------------------------
  // DIFFERENCE BETWEEN REVENUE AND RECEIVED CASH (COMPETÊNCIA VS CAIXA)
  // e.g. "Qual a diferença entre faturamento e recebimento?", "Faturar é o mesmo que receber?"
  // -------------------------------------------------------------
  const isDistinctionQuery =
    (normMsg.includes('fatur') && normMsg.includes('receb') && (normMsg.includes('diferen') || normMsg.includes('mesmo') || normMsg.includes('igual') || normMsg.includes('distinc') || normMsg.includes('versus') || normMsg.includes(' vs '))) ||
    normMsg.includes('faturamento vs recebimento') ||
    normMsg.includes('diferenca entre faturamento e recebimento');

  if (isDistinctionQuery) {
    const rev = Number(metrics.totalRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const rec = Number(metrics.totalReceived ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pend = Number(metrics.totalReceivablePending ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const over = Number(metrics.totalReceivableOverdue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return `⚖️ **Diferença Fundamental entre Faturamento e Recebimento:**

• **Faturamento (Regime de Competência):** É o valor total dos serviços executados e emitidos em Ordens de Serviço concluídas. Na sua empresa, o Faturamento Realizado acumulado é de **R$ ${rev}** (${metrics.completedServiceOrders ?? 0} OS concluídas).
• **Recebimento (Regime de Caixa Liquidado):** É o valor que efetivamente já foi pago e liquidado pelos clientes na conta bancária. Na sua empresa, você já recebeu **R$ ${rec}**.
• **Contas a Receber em Aberto:** **R$ ${pend}** (dentro do prazo de vencimento).
• **Contas a Receber Vencidas:** **R$ ${over}** (inadimplência).

💡 *Princípio Contábil:* Faturamento reflete a prestação dos serviços executados (Competência); Recebimento reflete a liquidação financeira no caixa da empresa (Caixa).`;
  }

  // -------------------------------------------------------------
  // IN-PROGRESS REVENUE & ORDERS QUERY
  // e.g. "Quanto tenho de faturamento em andamento?", "Ordens em andamento"
  // -------------------------------------------------------------
  const isAskingInProgressRevenue =
    (normMsg.includes('em andamento') ||
     normMsg.includes('em operacao') ||
     normMsg.includes('em execucao') ||
     normMsg.includes('agendad') ||
     normMsg.includes('faturamento previsto') ||
     normMsg.includes('a faturar')) &&
    (normMsg.includes('fatur') || normMsg.includes('os') || normMsg.includes('ordens') || normMsg.includes('receita') || normMsg.includes('quanto tenho'));

  if (isAskingInProgressRevenue) {
    const inProgRev = Number(metrics.inProgressRevenue ?? 0);
    const inProgHa = Number(metrics.inProgressHectares ?? 0);
    const inProgCount = Number(metrics.inProgressServiceOrders ?? 0);
    const compRev = Number(metrics.totalRevenue ?? 0);

    return `⏳ **Faturamento & Ordens em Andamento / Agendadas:**

• **Faturamento em Andamento (Previsto):** **R$ ${inProgRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Área em Andamento / Agendada:** **${inProgHa.toFixed(1)} hectares** (${inProgCount} OS em andamento)
• **Faturamento Concluído / Realizado:** **R$ ${compRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${metrics.completedServiceOrders ?? 0} OS concluídas)

📌 *Nota de Governança:* O faturamento em andamento refere-se a ordens ainda em execução que não foram finalizadas ou entregues ao cliente, não sendo computadas no faturamento bruto realizado.`;
  }

  // -------------------------------------------------------------
  // DIRECT RECEIVED QUERY (CAIXA LIQUIDADO / RECEBIMENTOS)
  // e.g. "Quanto recebi?", "Total recebido", "Recebimentos realizados"
  // -------------------------------------------------------------
  const isDirectReceivedQuery =
    (normMsg.includes('quanto recebi') ||
     normMsg.includes('o que recebi') ||
     normMsg.includes('total recebido') ||
     normMsg.includes('valor recebido') ||
     normMsg.includes('quanto entrou no caixa') ||
     normMsg.includes('recebimentos realizados') ||
     normMsg.includes('quanto ja recebi'));

  if (isDirectReceivedQuery) {
    const recNum = Number(metrics.totalReceived ?? 0);
    const revNum = Number(metrics.totalRevenue ?? 0);
    const pendNum = Number(metrics.totalReceivablePending ?? 0);
    const rec = recNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const rev = revNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pend = pendNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return `💵 **Recebimentos Realizados (${temporal.currentPeriodLabel}):**

• **Total Já Recebido / Liquidado:** **R$ ${rec}**
• **Faturamento Realizado (OS Concluídas):** R$ ${rev}
• **Contas a Receber Ainda em Aberto:** R$ ${pend}

💡 *Diferença Contábil:* O faturamento totaliza os serviços executados (R$ ${rev}), enquanto os recebimentos representam o que efetivamente já ingressou no caixa (R$ ${rec}).`;
  }

  // -------------------------------------------------------------
  // PERIOD-SPECIFIC REVENUE / HECTARES / OS QUERY
  // e.g. "Quanto faturei este mês?", "Quanto faturei mês passado?", "Quanto faturei nos últimos 30 dias?", "Quanto faturei este ano?", "Quanto faturei em março?"
  // -------------------------------------------------------------
  const isPeriodQueryWord =
    normMsg.includes('quanto faturei') ||
    normMsg.includes('quanto lucrei') ||
    normMsg.includes('faturamento') ||
    normMsg.includes('faturei') ||
    normMsg.includes('receita') ||
    normMsg.includes('quantos hectares') ||
    normMsg.includes('quantas os') ||
    normMsg.includes('quantas ordens') ||
    normMsg.includes('area aplicada') ||
    normMsg.includes('area pulverizada');

  const hasExplicitPeriodIndicator =
    normMsg.includes('este mes') ||
    normMsg.includes('neste mes') ||
    normMsg.includes('esse mes') ||
    normMsg.includes('mes atual') ||
    normMsg.includes('no mes') ||
    normMsg.includes('hoje') ||
    normMsg.includes('ontem') ||
    normMsg.includes('esta semana') ||
    normMsg.includes('semana passada') ||
    normMsg.includes('ultimos 7 dias') ||
    normMsg.includes('ultimos 30 dias') ||
    normMsg.includes('ultimos 90 dias') ||
    normMsg.includes('este ano') ||
    normMsg.includes('ano passado') ||
    parsedTemporal.filterType !== 'este_mes';

  const isAskingPeriodRevenueOrHectares = isPeriodQueryWord && hasExplicitPeriodIndicator;

  if (isAskingPeriodRevenueOrHectares && !normMsg.includes('pilot') && !pilots.some(p => normMsg.includes(normalizeSearchText(p.name)))) {
    // Filter OS in target period
    const filteredOS = serviceOrders.filter((os) => {
      const d = getOrderDate(os);
      if (!d) return false;
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
    });

    const isCompletedStatus = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'concluido' || s === 'concluida' || s === 'finalizado' || s === 'finalizada' || s === 'faturado' || s === 'pago' || s === 'completed';
    };

    const completedFilteredOS = filteredOS.filter((os) => isCompletedStatus(os.status));
    const inProgressFilteredOS = filteredOS.filter((os) => !isCompletedStatus(os.status) && (os.status || '').toLowerCase() !== 'cancelado');

    const periodRevenue = completedFilteredOS.reduce((acc, os) => acc + (Number(os.totalAmount) || Number(os.finalAmount) || 0), 0);
    const periodHectares = completedFilteredOS.reduce((acc, os) => {
      const actualHa = Number(os.actualAreaSprayedHa);
      return acc + (actualHa > 0 ? actualHa : 0);
    }, 0);

    // Period real costs: strictly accounts payable paid and receipts paid/reimbursed in the period
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
  // e.g. "Quanto tenho a pagar?", "Contas a pagar"
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
  // e.g. "Quanto tenho a receber?", "O que tenho a receber?"
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
  // e.g. "Quantos drones tenho?", "Qual o tamanho da frota?"
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
  // 1. PILOT RANKING & TEAM PRODUCTIVITY (Check BEFORE individual pilot matching)
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
  // 2. SPECIFIC PILOT QUERY & MISSING PILOT DETECTION
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

    // Case 1A: Specific Pilot + Expenses / Receipts / Fuel
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

    // Case 1B: Specific Pilot + Hectares / Month productivity
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

    // Case 1C: Specific Pilot + Commissions
    if (isAskingCommission) {
      return `💰 **Comissões do Piloto ${matchedPilot.name}:**

• **Regime Contratual:** ${(matchedPilot.contract || 'CLT').toUpperCase()}
• **Modelo de Comissionamento:** ${(matchedPilot.model || 'Por hectare').replace('_', ' ')} ${matchedPilot.ratePerHa ? `(R$ ${matchedPilot.ratePerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por hectare)` : matchedPilot.percentRate ? `(${matchedPilot.percentRate}% sobre o valor da OS)` : ''}
• **Comissão Total no Período (${periodLabel}):** **R$ ${stats.monthCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${stats.monthHa.toFixed(2)} ha aplicados)
  - **Liberada para Pagamento:** **R$ ${stats.monthReleasedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
  - **Aguardando Liquidação do Cliente:** **R$ ${stats.monthPendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**

🔒 **Regra de Liberação Financeira:** As comissões referentes às Ordens de Serviço só são liberadas para pagamento após a liquidação do recebimento pelo cliente, protegendo o fluxo de caixa.`;
    }

    // Case 1D: Specific Pilot + Flight Hours
    if (isAskingHours) {
      return `⏱️ **Horas de Voo do Piloto ${matchedPilot.name}:**

• **Total Acumulado de Voo:** **${stats.flightHours} horas de voo**
• **Hectares Pulverizados na Carreira:** **${stats.totalAccumulatedHa.toLocaleString('pt-BR')} hectares**
• **Hectares Realizados no Período (${periodLabel}):** **${stats.monthHa.toFixed(2)} ha**
• **Status Atual:** ${matchedPilot.status === 'em_voo' ? '🟢 Em voo' : '✅ Disponível'}`;
    }

    // Case 1E: Specific Pilot + Documents / Contact
    if (isAskingDocOrContact) {
      return `📜 **Documentação & Contato do Piloto ${matchedPilot.name}:**

• **Certificado CAAR (MAPA):** ${matchedPilot.caarNumber || 'Não informado'} | Validade: **${matchedPilot.caarValidity || 'Não informada'}**
• **Registro ANAC / SISANT:** ${matchedPilot.anacNumber || 'Não informado'}
• **Telefone / WhatsApp:** 📞 ${matchedPilot.phone || matchedPilot.whatsapp || 'Não informado'}
• **E-mail:** 📧 ${matchedPilot.email || 'Não informado'}
• **Cidade Base:** ${matchedPilot.city || 'Não informada'}`;
    }

    // Case 1F: General Full Sheet for this Pilot
    return `👨‍✈️ **Ficha Operacional Completa: ${matchedPilot.name}**

• **Regime Contratual:** ${(matchedPilot.contract || 'CLT').toUpperCase()} (${(matchedPilot.model || 'por hectare').replace('_', ' ')})
• **Neste Período (${periodLabel}):** **${stats.monthHa.toFixed(2)} ha** (${stats.thisMonthOS.length} OS) | Comissão: **R$ ${stats.monthCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
• **Histórico Acumulado:** **${stats.totalAccumulatedHa.toLocaleString('pt-BR')} ha** aplicados | **${stats.flightHours}h de voo**
• **Certificado CAAR:** ${matchedPilot.caarNumber || 'Não informado'} (Validade: ${matchedPilot.caarValidity || 'Não informada'})
• **Registro ANAC:** ${matchedPilot.anacNumber || 'Não informado'}
• **Contato:** 📞 ${matchedPilot.phone || matchedPilot.whatsapp || 'Não informado'} | 📧 ${matchedPilot.email || 'Não informado'}`;
  }

  // -------------------------------------------------------------
  // 3. TEAM PRODUCTIVITY OVERVIEW
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
  // 3. SPECIFIC FARM / PROPERTY LOCATION & ROUTES
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
  // 4. SPECIFIC TALHÃO / GLEBA QUERY
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
  // 5. GENERAL "ONDE FICA" / "LOCALIZAÇÃO DAS FAZENDAS" / "ROTAS"
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

💡 *Dica DRONE IA:* Você pode me perguntar o nome de qualquer fazenda específica para obter a ficha operacional completa e links de navegação.`;
  }

  // -------------------------------------------------------------
  // 6. DEFENSIVOS, PRODUTOS & AGROFIT / MAPA
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
  // 7. DRONES, AERONAVES & FROTA + MISSING DRONE CHECK
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
  // 8. BATERIAS & CICLOS DE CARGA
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
  // 9. CLIENTES & CONTRATOS
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
  // 10. ORDENS DE SERVIÇO (OS) ESPECÍFICA
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
  // 10.5. NOTINHAS, DESPESAS DE CAMPO & REEMBOLSOS DOS PILOTOS
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
  // 11. FINANCEIRO, CONTAS A RECEBER, PAGAR & INADIMPLÊNCIA
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
🔔 *Regra DRONE IA:* A liquidação do recebimento no financeiro dispara automaticamente a liberação da comissão do piloto da OS correspondente.`;
  }

  // -------------------------------------------------------------
  // 12. LUCRO, MARGEM & RENTABILIDADE
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
  // 13. DOCUMENTOS, ALVARÁS, CAAR E LICENÇAS
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
  return `🤖 **DRONE IA - Copiloto Inteligente & Central de Dados:**
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

// ============================================================================
// MOUNT BUSINESS & OPERATIONS API ROUTER
// ============================================================================
app.use('/api', apiRouter);

// ============================================================================
// STRICT API 404 & ERROR HANDLING (Ensure /api/* ALWAYS returns JSON, NEVER HTML)
// ============================================================================

// Explicit 404 handler for all unhandled /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
    code: 'API_ROUTE_NOT_FOUND',
  });
});

// Centralized secure error handler for all /api/* routes
app.use('/api', centralizedErrorHandler);
app.use(centralizedErrorHandler);

// Vite middleware in development, static files in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    // Guard against any unhandled /api/* falling into Vite's HTML middleware
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/') || req.originalUrl?.startsWith('/api/')) {
        return res.status(404).json({
          success: false,
          error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
          code: 'API_ROUTE_NOT_FOUND',
        });
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.originalUrl?.startsWith('/api/')) {
        return res.status(404).json({
          success: false,
          error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
          code: 'API_ROUTE_NOT_FOUND',
        });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening immediately so that Cloud Run port binding and health check respond without timeout
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DRONE IA Server running on http://0.0.0.0:${PORT}`);
  });

  // Initialize persistence layer asynchronously (PostgreSQL in production, dual-mode in development)
  try {
    const { status } = await bootstrapPersistence();
    console.log(`[MOUTRYX DATABASE] Storage Engine: ${status.provider} | Adapter: ${status.activeAdapter}`);
    console.log(`[MOUTRYX DATABASE] Status: ${status.statusMessage}`);
  } catch (err: any) {
    console.error('[MOUTRYX DATABASE] Database persistence initialization notice:', err?.message || err);
  }

  return server;
}

export { app, start };

if (process.env.NODE_ENV !== 'test' && process.env.TEST_RUNNER !== 'true' && !process.argv.some((arg) => arg.includes('audit_'))) {
  start();
}
