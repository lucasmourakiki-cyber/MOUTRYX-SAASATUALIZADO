import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from '@google/genai';
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
  quoteRepository,
} from '../db/repositories/financialCommercialRepositories';
import { getCompanyRepository } from '../auth/repositoryFactory';
import {
  getTemporalContext,
  resolveTemporalContext,
  parseTemporalQuery,
  TemporalContext,
} from '../../utils/temporalEngine';
import { executeAiCallWithResilience } from '../security/aiSecurity';
import { generateDynamicContextAIAnswer, buildServerSideCompanyContext } from './dynamicEngine';

// ============================================================================
// 1. TENANT-SAFE RESPONSE CACHE (Short-lived 60s TTL for duplicate queries)
// ============================================================================
interface CacheEntry {
  reply: string;
  source: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 300;

function getCacheKey(tenantId: string, message: string): string {
  const norm = (message || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return `${tenantId}:::${norm}`;
}

export function getCachedCopilotResponse(tenantId: string, message: string): CacheEntry | null {
  const key = getCacheKey(tenantId, message);
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedCopilotResponse(tenantId: string, message: string, reply: string, source: string): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  const key = getCacheKey(tenantId, message);
  responseCache.set(key, {
    reply,
    source,
    timestamp: Date.now(),
  });
}

// ============================================================================
// 2. QUERY INTENT CLASSIFIER & SELECTIVE CONTEXT BUILDER
// ============================================================================
export type CopilotIntent =
  | 'LOCATION_PROPERTIES'
  | 'FLEET_DRONES_BATTERIES'
  | 'FINANCIAL_RECEIVABLES_PAYABLES'
  | 'PILOTS_PRODUCTIVITY'
  | 'AGRONOMIC_PRODUCTS'
  | 'OPERATIONAL_ORDERS'
  | 'GENERAL_EXECUTIVE';

export function classifyCopilotIntent(message: string): CopilotIntent {
  const msg = (message || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Localização / Fazendas / Talhões / Mapas / Waze
  if (
    msg.includes('onde fica') ||
    msg.includes('localizacao') ||
    msg.includes('localizacoes') ||
    msg.includes('coordenada') ||
    msg.includes('fazenda') ||
    msg.includes('propriedade') ||
    msg.includes('talhao') ||
    msg.includes('talhoes') ||
    msg.includes('como chegar') ||
    msg.includes('rota') ||
    msg.includes('maps') ||
    msg.includes('waze') ||
    msg.includes('rio bonito') ||
    msg.includes('santa helena')
  ) {
    return 'LOCATION_PROPERTIES';
  }

  // 2. Frota de Drones / Baterias / Horas de Voo / Manutenção
  if (
    msg.includes('drone') ||
    msg.includes('agras') ||
    msg.includes('t100') ||
    msg.includes('t50') ||
    msg.includes('t40') ||
    msg.includes('t30') ||
    msg.includes('t20') ||
    msg.includes('xag') ||
    msg.includes('bateria') ||
    msg.includes('baterias') ||
    msg.includes('ciclo') ||
    msg.includes('saude') ||
    msg.includes('horas de voo') ||
    msg.includes('frota') ||
    msg.includes('manutencao') ||
    msg.includes('aeronave')
  ) {
    return 'FLEET_DRONES_BATTERIES';
  }

  // 3. Pilotos / Produtividade / Comissões / CAAR / ANAC
  if (
    msg.includes('piloto') ||
    msg.includes('pilotos') ||
    msg.includes('comissao') ||
    msg.includes('comissoes') ||
    msg.includes('produtividade') ||
    msg.includes('ranking') ||
    msg.includes('caar') ||
    msg.includes('anac') ||
    msg.includes('quem voou mais') ||
    msg.includes('quem aplicou mais')
  ) {
    return 'PILOTS_PRODUCTIVITY';
  }

  // 4. Agronômico / Fitossanitário / Produtos / Dosagem / Calda / Pragas / Culturas
  if (
    msg.includes('dosagem') ||
    msg.includes('dose') ||
    msg.includes('calda') ||
    msg.includes('volume') ||
    msg.includes('produto') ||
    msg.includes('fitossanitario') ||
    msg.includes('fox xpro') ||
    msg.includes('fungicida') ||
    msg.includes('inseticida') ||
    msg.includes('herbicida') ||
    msg.includes('soja') ||
    msg.includes('milho') ||
    msg.includes('algodao') ||
    msg.includes('praga') ||
    msg.includes('lagarta') ||
    msg.includes('ferrugem') ||
    msg.includes('bula') ||
    msg.includes('agrofit')
  ) {
    return 'AGRONOMIC_PRODUCTS';
  }

  // 5. Financeiro / Contas a Receber / Contas a Pagar / Lucro / Notinhas / Despesas
  if (
    msg.includes('lucro') ||
    msg.includes('lucro liquido') ||
    msg.includes('faturamento') ||
    msg.includes('faturei') ||
    msg.includes('receber') ||
    msg.includes('pagar') ||
    msg.includes('vencid') ||
    msg.includes('aberto') ||
    msg.includes('caixa') ||
    msg.includes('recebi') ||
    msg.includes('recebimento') ||
    msg.includes('receita') ||
    msg.includes('despesa') ||
    msg.includes('custo') ||
    msg.includes('margem') ||
    msg.includes('notinha') ||
    msg.includes('reembolso') ||
    msg.includes('combustivel') ||
    msg.includes('quanto lucrei') ||
    msg.includes('quanto tenho')
  ) {
    return 'FINANCIAL_RECEIVABLES_PAYABLES';
  }

  // 6. Ordens de Serviço / Aplicação / Hectares
  if (
    msg.includes('ordem de servico') ||
    msg.includes('ordens') ||
    msg.includes(' os ') ||
    msg.startsWith('os ') ||
    msg.includes('aplicacao') ||
    msg.includes('hectares') ||
    msg.includes('servico') ||
    msg.includes('cronograma')
  ) {
    return 'OPERATIONAL_ORDERS';
  }

  return 'GENERAL_EXECUTIVE';
}

/**
 * Builds a highly compact, targeted context payload based strictly on the query intent.
 * Cuts token payload by ~85-90% compared to full DB dumps, speeding up AI response dramatically.
 */
export async function buildTargetedAIContext(
  companyId: string,
  intent: CopilotIntent,
  temporal: TemporalContext
): Promise<{ targetedContext: Record<string, any>; fullContextForFallback: any }> {
  // Always build authoritative base metrics & company profile
  const fullContext = await buildServerSideCompanyContext(companyId);
  if (!fullContext) {
    throw new Error('Empresa ou dados do tenant indisponíveis.');
  }

  const baseCompany = {
    companyId: fullContext.companyId,
    name: fullContext.companyName,
    tradeName: fullContext.tradeName,
    city: fullContext.city,
    state: fullContext.state,
    referenceDate: temporal.todayStr,
    currentPeriod: temporal.currentPeriodLabel,
  };

  let targetedContext: Record<string, any> = {
    company: baseCompany,
    intent,
  };

  switch (intent) {
    case 'LOCATION_PROPERTIES': {
      targetedContext.properties = (fullContext.properties || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        clientName: p.clientName,
        city: p.city,
        state: p.state,
        latitude: p.latitude || p.lat,
        longitude: p.longitude || p.lng,
        hasCoordinates: Boolean(p.latitude && p.longitude),
        totalAreaHa: p.totalAreaHa,
      }));
      targetedContext.talhoes = (fullContext.talhoes || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        propertyName: t.propertyName,
        areaHa: t.areaHa,
        currentCrop: t.currentCrop,
      }));
      targetedContext.clients = (fullContext.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        tradeName: c.tradeName,
        city: c.city,
        state: c.state,
      }));
      break;
    }

    case 'FLEET_DRONES_BATTERIES': {
      targetedContext.drones = (fullContext.drones || []).map((d: any) => ({
        id: d.id,
        model: d.model,
        serialNumber: d.serialNumber,
        prefixAnac: d.prefixAnac || d.prefix,
        totalFlightHours: d.totalFlightHours || d.flightHours,
        totalHectaresApplied: d.totalHectaresApplied,
        status: d.status,
        healthScore: d.healthScore,
      }));
      targetedContext.batteries = (fullContext.batteries || []).map((b: any) => ({
        id: b.id,
        model: b.model,
        serialNumber: b.serialNumber,
        cycleCount: b.cycleCount || b.cycles,
        healthPercentage: b.healthPercentage || b.healthPercent,
        status: b.status,
      }));
      targetedContext.maintenances = (fullContext.maintenances || []).slice(0, 8).map((m: any) => ({
        droneModel: m.droneModel,
        type: m.type,
        date: m.date,
        cost: m.cost,
        description: m.description,
      }));
      break;
    }

    case 'PILOTS_PRODUCTIVITY': {
      targetedContext.pilots = (fullContext.pilots || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        status: p.status,
        anacCode: p.anacCode,
        caarNumber: p.caarNumber,
        caarValidity: p.caarValidity,
        monthHectares: p.monthHectares,
        totalHectares: p.totalHectares,
        flightHours: p.totalFlightHours || p.flightHours,
        monthCommission: p.monthCommissionTotal,
        monthReleasedCommission: p.monthReleasedCommission,
        monthPendingCommission: p.monthPendingCommission,
      }));
      targetedContext.pilotExpenses = fullContext.receiptExpensesSummary?.pilotsExpenseSummary || [];
      break;
    }

    case 'AGRONOMIC_PRODUCTS': {
      targetedContext.products = (fullContext.products || []).map((p: any) => ({
        id: p.id,
        commercialName: p.commercialName || p.name,
        activeIngredient: p.activeIngredient,
        category: p.category,
        recommendedDoseRange: p.recommendedDoseRange || p.doseRange,
        defaultVolumeCaldaLPerHa: p.defaultVolumeCaldaLPerHa || p.volumeCalda,
        authorizedCrops: p.authorizedCrops || p.crops,
        targetPests: p.targetPests,
      }));
      targetedContext.crops = (fullContext.crops || []).map((c: any) => ({
        name: c.name,
        category: c.category,
        commonPests: c.commonPests,
        averageSprayingVolumeLPerHa: c.averageSprayingVolumeLPerHa,
      }));
      break;
    }

    case 'FINANCIAL_RECEIVABLES_PAYABLES': {
      targetedContext.metrics = {
        totalRevenue: fullContext.metrics?.totalRevenue,
        totalReceived: fullContext.metrics?.totalReceived,
        totalReceivablePending: fullContext.metrics?.totalReceivablePending,
        totalReceivableOverdue: fullContext.metrics?.totalReceivableOverdue,
        totalPayable: fullContext.metrics?.totalPayable,
        netResult: fullContext.metrics?.netResult,
        averageMarginPercent: fullContext.metrics?.averageMarginPercent,
        totalReceiptsSpent: fullContext.metrics?.totalReceiptsSpent,
        totalReimbursementsPending: fullContext.metrics?.totalReimbursementsPending,
      };
      targetedContext.overdueReceivables = (fullContext.financials?.overdueItems || []).slice(0, 10);
      targetedContext.pendingReceivables = (fullContext.financials?.pendingItems || []).slice(0, 10);
      targetedContext.accountsPayable = (fullContext.accountsPayable || []).slice(0, 10).map((p: any) => ({
        supplier: p.supplierName,
        category: p.costCenter,
        amount: p.amount,
        due: p.dueDate,
        status: p.status,
      }));
      break;
    }

    case 'OPERATIONAL_ORDERS': {
      targetedContext.metrics = {
        totalHectaresApplied: fullContext.metrics?.totalHectaresApplied,
        inProgressHectares: fullContext.metrics?.inProgressHectares,
        completedServiceOrders: fullContext.metrics?.completedServiceOrders,
        inProgressServiceOrders: fullContext.metrics?.inProgressServiceOrders,
        fleetUtilizationPercent: fullContext.metrics?.fleetUtilizationPercent,
      };
      targetedContext.serviceOrders = (fullContext.serviceOrders || []).slice(0, 12).map((os: any) => ({
        osNumber: os.osNumber,
        client: os.clientName || os.client,
        property: os.propertyName || os.property,
        crop: os.crop,
        areaHa: os.areaHa,
        actualAreaSprayedHa: os.actualAreaSprayedHa,
        status: os.status,
        date: os.scheduledDate || os.date,
        pilot: os.pilotName || os.pilot,
        drone: os.droneModel || os.drone,
      }));
      break;
    }

    case 'GENERAL_EXECUTIVE':
    default: {
      targetedContext.metrics = fullContext.metrics;
      targetedContext.dronesCount = (fullContext.drones || []).length;
      targetedContext.pilotsCount = (fullContext.pilots || []).length;
      targetedContext.clientsCount = (fullContext.clients || []).length;
      targetedContext.propertiesCount = (fullContext.properties || []).length;
      targetedContext.activeOSCount = (fullContext.serviceOrders || []).filter((os: any) => os.status === 'em_andamento').length;
      break;
    }
  }

  return { targetedContext, fullContextForFallback: fullContext };
}

// ============================================================================
// 3. FAST SYSTEM PROMPT BUILDER
// ============================================================================
export function buildConciseSystemPrompt(
  targetedContext: Record<string, any>,
  temporal: TemporalContext
): string {
  const companyName = targetedContext.company?.tradeName || targetedContext.company?.name || 'Sua Empresa';

  return `Você é a inteligência MOUTRYX, copiloto executivo e operacional de gestão aeroagrícola com drones para a empresa "${companyName}".

DATA ATUAL: ${temporal.todayStr} (${temporal.currentPeriodLabel}).

DIRETRIZES DE RESPOSTA (ULTRA RÁPIDAS E OBJETIVAS):
1. SEJA DIRETO: Responda diretamente ao que foi perguntado sem introduções vazias nem repetições da pergunta.
2. ZERO ALUCINAÇÃO: Utilize EXCLUSIVAMENTE os dados autoritativos fornecidos abaixo. Nunca invente dados, fazendas, coordenadas, valores, clientes ou pilotos.
3. LOCALIZAÇÃO E MAPAS:
   - Se a propriedade tiver latitude e longitude numéricas, forneça e crie OBRIGATORIAMENTE os links de rota:
     [🗺️ Abrir no Google Maps](https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE)
     [🚗 Abrir no Waze](https://waze.com/ul?ll=LATITUDE,LONGITUDE&navigate=yes)
   - Se NÃO tiver coordenadas cadastradas, declare expressamente que as coordenadas GPS não estão cadastradas e NÃO invente links.
4. AUSÊNCIA DE DADOS: Se uma entidade (fazenda, drone, piloto, produto) não existir no cadastro, declare categoricamente que não foi encontrada no cadastro da empresa ativa.
5. FITOSSANITÁRIOS: Para produtos, informe dosagem e adicione a ressalva regulatória obrigatória: "Confirme no receituário agronômico e com o RT."
6. FORMATAÇÃO: Use markdown limpo com tópicos (•), números destacados em negrito (**R$ 0,00**, **0,0 ha**) e emojis funcionais.

DADOS AUTORITATIVOS SELECIONADOS:
${JSON.stringify(targetedContext, null, 2)}
`;
}

// ============================================================================
// 4. MULTI-TIER GEMINI GENERATION (Fast thinking & cascading fallback)
// ============================================================================
export async function executeFastCopilotGeneration(
  ai: GoogleGenAI,
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  const models = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    try {
      const is37 = model === 'gemini-3.7-flash';
      const result = await executeAiCallWithResilience(
        async () => {
          const config: any = {
            systemInstruction: systemPrompt,
          };
          // Minimal thinking for lightning-fast latency
          if (is37) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            config,
          });

          return response.text;
        },
        { timeoutMs: 12000, maxRetries: 0, description: `Fast Copilot ${model}` }
      );

      if (result && result.trim().length > 0) {
        return result.trim();
      }
    } catch (err: any) {
      console.warn(`[COPILOT] Model ${model} failed or timed out:`, err?.message || err);
    }
  }

  return null;
}
