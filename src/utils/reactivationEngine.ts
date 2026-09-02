import {
  Client,
  ServiceOrder,
  Quote,
  Property,
  Company,
  ReactivationClientSummary,
  ReactivationScoreTier,
  ReactivationFunnelStage,
  ReactivationMetricsSummary,
} from '../types';

/**
 * Calculates days between two date strings (YYYY-MM-DD) or relative to dynamic today
 */
export function calculateDaysBetween(startDateStr?: string | null, endDateStr?: string | Date): number {
  if (!startDateStr) return 999;
  const start = new Date(startDateStr);
  const end = endDateStr instanceof Date ? endDateStr : endDateStr ? new Date(endDateStr) : new Date();
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Formats phone/whatsapp string to international standard for wa.me URL
 * Example: (66) 99988-1212 -> 5566999881212
 */
export function formatPhoneForWhatsApp(rawPhone: string): string {
  const digitsOnly = (rawPhone || '').replace(/\D/g, '');
  if (!digitsOnly) return '';
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
    return digitsOnly;
  }
  return `55${digitsOnly}`;
}

/**
 * Builds the official wa.me link with URL-encoded message text
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Replaces message dynamic template placeholders with client & company context
 * Supports both [Nome], [Fazenda], [Região], [Último serviço], [Data do último serviço],
 * [Quantidade de serviços], [Nome da empresa de drones] and {NOME_CONTATO}, {NOME_FAZENDA}, etc.
 */
export function formatReactivationMessage(
  template: string,
  client: ReactivationClientSummary,
  company: Company,
  responsibleName: string = 'Lucas Moura',
  primaryDroneModel: string = 'DJI Agras T100 / T50'
): string {
  let message = template;

  const contactName = client.contactName || client.clientName.split('/')[0].split('-')[0].trim();
  const farmName = client.lastPropertyName || 'sua propriedade';
  const cropName = client.lastCrop || 'sua lavoura';
  const daysText = client.daysSinceLastService >= 999 ? 'alguns meses' : `${client.daysSinceLastService} dias`;
  const lastDateFormatted = client.lastServiceDate
    ? new Date(client.lastServiceDate).toLocaleDateString('pt-BR')
    : 'nossa última visita';
  const city = client.city || company.city || 'sua região';
  const region = client.state ? `${client.city || company.city} / ${client.state}` : (client.city || company.city || 'sua região');
  const totalRevenueFormatted = client.totalRevenue > 0
    ? `R$ ${client.totalRevenue.toLocaleString('pt-BR')}`
    : 'R$ 0';
  const estimatedTicketFormatted = client.averageTicket > 0
    ? `R$ ${client.averageTicket.toLocaleString('pt-BR')}`
    : `R$ ${(client.estimatedPotentialRevenue || 12000).toLocaleString('pt-BR')}`;
  const lastServiceName = client.lastServiceName || 'pulverização agrícola';
  const companyName = company.tradeName || company.name || 'MOUTRYX';
  const totalServicesCount = client.totalCompletedOrders > 0 ? `${client.totalCompletedOrders}` : 'vários';

  // 1. Bracket Format [Token] (case-insensitive & accent-insensitive)
  message = message.replace(/\[Nome\]/gi, contactName);
  message = message.replace(/\[Empresa\]/gi, farmName);
  message = message.replace(/\[Fazenda\]/gi, farmName);
  message = message.replace(/\[Região\]/gi, region);
  message = message.replace(/\[Regiao\]/gi, region);
  message = message.replace(/\[Cidade\]/gi, city);
  message = message.replace(/\[Último serviço\]/gi, lastServiceName);
  message = message.replace(/\[Ultimo servico\]/gi, lastServiceName);
  message = message.replace(/\[Data do último serviço\]/gi, lastDateFormatted);
  message = message.replace(/\[Data do ultimo servico\]/gi, lastDateFormatted);
  message = message.replace(/\[Quantidade de serviços\]/gi, totalServicesCount);
  message = message.replace(/\[Quantidade de servicos\]/gi, totalServicesCount);
  message = message.replace(/\[Nome da empresa de drones\]/gi, companyName);
  message = message.replace(/\[Empresa de drones\]/gi, companyName);
  message = message.replace(/\[Responsável\]/gi, responsibleName);
  message = message.replace(/\[Responsavel\]/gi, responsibleName);

  // 2. Brace Format {TOKEN}
  message = message.replace(/{NOME_CONTATO}/g, contactName);
  message = message.replace(/{NOME_CLIENTE}/g, client.clientName);
  message = message.replace(/{NOME_FAZENDA}/g, farmName);
  message = message.replace(/{CIDADE}/g, city);
  message = message.replace(/{CIDADE_CLIENTE}/g, city);
  message = message.replace(/{REGIAO}/g, region);
  message = message.replace(/{CULTURA}/g, cropName);
  message = message.replace(/{CULTURA_ANTERIOR}/g, cropName);
  message = message.replace(/{ULTIMA_CULTURA}/g, cropName);
  message = message.replace(/{DIAS_SEM_SERVICO}/g, daysText);
  message = message.replace(/{DIAS_SEM_APLICAR}/g, daysText);
  message = message.replace(/{ULTIMO_SERVICO}/g, lastServiceName);
  message = message.replace(/{VALOR_HISTORICO}/g, totalRevenueFormatted);
  message = message.replace(/{TICKET_ESTIMADO}/g, estimatedTicketFormatted);
  message = message.replace(/{ULTIMA_APLICACAO_DATA}/g, lastDateFormatted);
  message = message.replace(/{QUANTIDADE_SERVICOS}/g, totalServicesCount);
  message = message.replace(/{HECTARES_HISTORICO}/g, `${client.totalHectares || 150} ha`);
  message = message.replace(/{NOME_EMPRESA}/g, companyName);
  message = message.replace(/{NOME_RESPONSAVEL}/g, responsibleName);
  message = message.replace(/{TELEFONE_EMPRESA}/g, company.whatsapp || company.phone || '');
  message = message.replace(/{MODELO_DRONE_PRINCIPAL}/g, primaryDroneModel);

  // Clean any remaining unpopulated braces or brackets safely
  message = message.replace(/\{[A-Z_0-9]+\}/g, '');
  message = message.replace(/\[[A-Za-zÀ-ÿ\s]+\]/g, '');

  return message;
}

/**
 * Generates an intelligent, context-aware personalized approach message based on actual client records
 */
export function generateIntelligentContextualMessage(
  templateBase: string,
  client: ReactivationClientSummary,
  company: Company,
  responsibleName: string = 'Lucas Moura'
): string {
  // 1. If a template is provided, format it
  if (templateBase && templateBase.trim().length > 0) {
    return formatReactivationMessage(templateBase, client, company, responsibleName);
  }

  // 2. Otherwise generate dynamic context-based approach
  const contactName = client.contactName || client.clientName.split('/')[0].trim();
  const farmName = client.lastPropertyName || 'sua fazenda';
  const crop = client.lastCrop || 'Soja';
  const city = client.city || company.city;
  const companyName = company.tradeName || company.name;

  let intro = `Olá, ${contactName}! Tudo bem? Aqui é o ${responsibleName} da ${companyName}.`;
  let contextBody = '';
  let offerCall = '';

  if (client.totalCompletedOrders > 0) {
    // Cliente com histórico de OS
    if (client.daysSinceLastService > 120) {
      contextBody = `Faz algum tempo desde a nossa última operação na ${farmName} (aproximadamente ${client.daysSinceLastService} dias).`;
    } else {
      contextBody = `Estava revisando nosso histórico aqui na ${farmName} e percebi que já fazem aproximadamente ${client.daysSinceLastService} dias desde nossa última operação.`;
    }
  } else if (client.totalQuotesCount > 0) {
    // Cliente que tem orçamento mas ainda sem OS
    contextBody = `Estava revisando os planejamentos e propostas que conversamos anteriormente para a ${farmName}.`;
  } else {
    // Novo cadastro
    contextBody = `Vi que você já possui cadastro conosco na ${companyName} referente à ${farmName}.`;
  }

  if (client.totalHectares >= 1000) {
    offerCall = `Como vocês possuem uma área expressiva na região de ${city}, estamos organizando a programação de pulverização com drones e separamos condições especiais para manejo de ${crop} com zero amassamento.`;
  } else {
    offerCall = `Estamos organizando nossa programação de pulverização para a região de ${city} e queria verificar se vocês já estão planejando alguma aplicação de ${crop} para os próximos dias.`;
  }

  const closing = `Se quiser, posso verificar nossa disponibilidade e preparar uma condição para sua área. Um abraço!`;

  return `${intro}\n\n${contextBody}\n\n${offerCall}\n\n${closing}`;
}

/**
 * Computes individual score, reasons, and summary for each client
 */
export function buildClientReactivationSummary(
  client: Client,
  serviceOrders: ServiceOrder[],
  quotes: Quote[],
  properties: Property[],
  customFunnelStages: Record<string, ReactivationFunnelStage> = {},
  referenceDate?: string | Date
): ReactivationClientSummary {
  // Get all completed / invoiced / paid OS for this client
  const clientOS = serviceOrders
    .filter((os) => os.clientId === client.id && os.status !== 'cancelado')
    .sort((a, b) => new Date(b.scheduledDate || b.completedDate || '').getTime() - new Date(a.scheduledDate || a.completedDate || '').getTime());

  const completedOS = clientOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');

  const clientQuotes = quotes.filter((q) => q.clientId === client.id);

  // Determine last service date and crop
  const latestOS = clientOS[0];
  const lastServiceDate = latestOS ? (latestOS.completedDate || latestOS.scheduledDate || null) : null;
  const lastServiceName = latestOS ? latestOS.serviceType : null;
  const lastCrop = latestOS ? latestOS.crop : clientQuotes[0]?.crop || 'Soja / Milho';

  // Determine property name
  const clientProps = properties.filter((p) => p.clientId === client.id);
  const lastPropertyName = latestOS ? latestOS.propertyName : clientProps[0]?.name || 'Fazenda Principal';

  // Calculate days inactive
  const daysSinceLastService = calculateDaysBetween(lastServiceDate, referenceDate);

  // Calculate average interval between services
  let averageServiceIntervalDays = 0;
  if (completedOS.length >= 2) {
    let totalInterval = 0;
    for (let i = 0; i < completedOS.length - 1; i++) {
      const d1 = new Date(completedOS[i].completedDate || completedOS[i].scheduledDate);
      const d2 = new Date(completedOS[i + 1].completedDate || completedOS[i + 1].scheduledDate);
      totalInterval += Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
    }
    averageServiceIntervalDays = Math.round(totalInterval / (completedOS.length - 1));
  } else {
    averageServiceIntervalDays = 45; // default agronomic window
  }

  // ==========================================
  // SCORE DE REATIVAÇÃO ALGORITHM (0 to 100) (ORIGINAL PRESERVED)
  // ==========================================
  let score = 0;
  const scoreReasons: string[] = [];

  // 1. Inactivity Time Scoring (Max 35 points)
  if (daysSinceLastService >= 30 && daysSinceLastService <= 60) {
    score += 25;
    scoreReasons.push(`Janela de retorno padrão (${daysSinceLastService} dias sem aplicar)`);
  } else if (daysSinceLastService > 60 && daysSinceLastService <= 120) {
    score += 35;
    scoreReasons.push(`Momento ideal de reativação para nova fase de safra (${daysSinceLastService} dias)`);
  } else if (daysSinceLastService > 120 && daysSinceLastService <= 180) {
    score += 25;
    scoreReasons.push(`Inativo há ${daysSinceLastService} dias (risco de contratação de concorrente)`);
  } else if (daysSinceLastService > 180 && daysSinceLastService < 999) {
    score += 15;
    scoreReasons.push(`Cliente frio (+${daysSinceLastService} dias sem serviços)`);
  } else {
    // Has no completed OS (only quotes or new)
    score += 15;
    scoreReasons.push(`Cliente cadastrado sem serviços concluídos na safra`);
  }

  // 2. Historical Value & Volume Scoring (Max 35 points)
  const totalRevenue = client.totalRevenue || completedOS.reduce((acc, os) => acc + (os.finalAmount || 0), 0);
  const totalHectares = client.totalHectares || completedOS.reduce((acc, os) => {
    const actualHa = Number(os.actualAreaSprayedHa);
    return acc + (actualHa > 0 ? actualHa : 0);
  }, 0);

  if (totalRevenue >= 150000 || totalHectares >= 3000) {
    score += 35;
    scoreReasons.push(`Grande conta estratégica: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} faturados`);
  } else if (totalRevenue >= 50000 || totalHectares >= 1000) {
    score += 25;
    scoreReasons.push(`Conta de médio-alto volume (${totalHectares} ha acumulados)`);
  } else if (totalRevenue >= 15000 || totalHectares >= 250) {
    score += 18;
    scoreReasons.push(`Cliente com volume regular (${totalHectares} ha)`);
  } else {
    score += 10;
    scoreReasons.push(`Perfil de entrada / área inicial`);
  }

  // 3. Client Rating & Reliability (Max 15 points)
  if (client.rating >= 4.8) {
    score += 15;
    scoreReasons.push(`Excelente histórico de relacionamento (Nota ${client.rating.toFixed(1)}/5)`);
  } else if (client.rating >= 4.0) {
    score += 10;
    scoreReasons.push(`Bom histórico de relacionamento (Nota ${client.rating.toFixed(1)}/5)`);
  } else {
    score += 5;
  }

  // 4. Agronomic Season / Multi-crop Potential (Max 15 points)
  const highGiroCrops = ['Soja', 'Milho', 'Algodão', 'Cana', 'Café'];
  if (highGiroCrops.some((c) => (lastCrop || '').toLowerCase().includes(c.toLowerCase()))) {
    score += 15;
    scoreReasons.push(`Cultura de alto giro (${lastCrop}) com múltiplas janelas de aplicação`);
  } else {
    score += 10;
    scoreReasons.push(`Cultura agronômica especializada (${lastCrop})`);
  }

  // Clamp score
  score = Math.min(100, Math.max(5, score));

  // Determine Tier
  let scoreTier: ReactivationScoreTier = 'oportunidade';
  if (daysSinceLastService < 15) {
    scoreTier = 'reativado';
  } else if (score >= 80) {
    scoreTier = 'alta_prioridade';
  } else if (score >= 60) {
    scoreTier = 'oportunidade';
  } else if (score >= 40) {
    scoreTier = 'risco_perda';
  } else {
    scoreTier = 'frio';
  }

  // Estimate potential revenue
  let estimatedPotentialRevenue = 0;
  if (latestOS && latestOS.finalAmount > 0) {
    estimatedPotentialRevenue = Math.round(latestOS.finalAmount * 1.05);
  } else if (client.totalHectares > 0) {
    estimatedPotentialRevenue = Math.round(client.totalHectares * 0.15 * 48); // ~15% da área total a R$ 48/ha
  } else {
    estimatedPotentialRevenue = 6500; // default estimated ticket
  }

  // =========================================================================
  // MOUTRYX OPPORTUNITY ENGINE (COMMERCIAL INTELLIGENCE - 0 to 100)
  // "Qual cliente merece minha atenção comercial AGORA?"
  // =========================================================================
  let opportunityScoreRaw = 0;
  const opportunityReasons: string[] = [];
  const daysPastExpectedCadence = daysSinceLastService - averageServiceIntervalDays;
  const averageTicket = completedOS.length > 0 ? Math.round(totalRevenue / completedOS.length) : (client.totalHectares * 48 || 6500);

  // 1. Cadence & Interval Factor (Max 25 pts)
  if (daysPastExpectedCadence >= 5 && daysPastExpectedCadence <= 60) {
    opportunityScoreRaw += 25;
    opportunityReasons.push(`⏱ Cliente está ${daysPastExpectedCadence} dias além do intervalo médio de contratação (${averageServiceIntervalDays} dias).`);
  } else if (daysPastExpectedCadence > 60 && daysPastExpectedCadence <= 120) {
    opportunityScoreRaw += 20;
    opportunityReasons.push(`⏱ Janela de retorno urgente: ${daysSinceLastService} dias sem serviços (cadência histórica de ${averageServiceIntervalDays} dias).`);
  } else if (daysPastExpectedCadence > 120) {
    opportunityScoreRaw += 12;
    opportunityReasons.push(`⏱ Longo período sem contratação (${daysSinceLastService} dias).`);
  } else if (daysPastExpectedCadence >= -15 && daysPastExpectedCadence < 5) {
    opportunityScoreRaw += 18;
    opportunityReasons.push(`⏱ Entrando na janela exata do ciclo médio de pulverização (${daysSinceLastService}/${averageServiceIntervalDays} dias).`);
  } else {
    opportunityScoreRaw += 5;
    opportunityReasons.push(`⏱ Aplicação recente registrada.`);
  }

  // 2. Recurrence Factor (Max 15 pts)
  if (completedOS.length >= 4) {
    opportunityScoreRaw += 15;
    opportunityReasons.push(`🔄 Possui forte histórico de fidelidade e recorrência (${completedOS.length} serviços realizados).`);
  } else if (completedOS.length >= 2) {
    opportunityScoreRaw += 12;
    opportunityReasons.push(`🔄 Histórico recorrente com ${completedOS.length} ordens de serviço executadas.`);
  } else if (completedOS.length === 1) {
    opportunityScoreRaw += 7;
    opportunityReasons.push(`🔄 Primeiro serviço executado com sucesso.`);
  } else {
    opportunityScoreRaw += 2;
  }

  // 3. Historical Revenue Factor (Max 15 pts)
  if (totalRevenue >= 80000) {
    opportunityScoreRaw += 15;
    opportunityReasons.push(`💰 Conta de alto valor histórico (R$ ${totalRevenue.toLocaleString('pt-BR')} faturados).`);
  } else if (totalRevenue >= 35000) {
    opportunityScoreRaw += 12;
    opportunityReasons.push(`💰 Faturamento histórico relevante de R$ ${totalRevenue.toLocaleString('pt-BR')}.`);
  } else if (totalRevenue >= 10000) {
    opportunityScoreRaw += 8;
    opportunityReasons.push(`💰 Faturamento consolidado na carteira.`);
  } else {
    opportunityScoreRaw += 4;
  }

  // 4. Average Ticket Factor (Max 10 pts)
  if (averageTicket >= 15000) {
    opportunityScoreRaw += 10;
    opportunityReasons.push(`💎 Alto ticket médio por operação (R$ ${averageTicket.toLocaleString('pt-BR')}/serviço).`);
  } else if (averageTicket >= 7000) {
    opportunityScoreRaw += 8;
    opportunityReasons.push(`💎 Ticket médio consistente de R$ ${averageTicket.toLocaleString('pt-BR')}.`);
  } else {
    opportunityScoreRaw += 4;
  }

  // 5. Total Services Count Factor (Max 10 pts)
  if (completedOS.length >= 5) {
    opportunityScoreRaw += 10;
  } else if (completedOS.length >= 2) {
    opportunityScoreRaw += 7;
  } else if (completedOS.length >= 1) {
    opportunityScoreRaw += 4;
  } else {
    opportunityScoreRaw += 1;
  }

  // 6. Agronomic Match Factor (Max 10 pts)
  if (highGiroCrops.some((c) => (lastCrop || '').toLowerCase().includes(c.toLowerCase()))) {
    opportunityScoreRaw += 10;
    opportunityReasons.push(`🌱 Cultura de alto giro agronômico (${lastCrop}) com múltiplas janelas sequenciais.`);
  } else {
    opportunityScoreRaw += 6;
    opportunityReasons.push(`🌱 Cultura agronômica (${lastCrop}).`);
  }

  // 7. Previous Quote History (Max 5 pts)
  if (clientQuotes.length > 0) {
    opportunityScoreRaw += 5;
    opportunityReasons.push(`📋 Histórico ativo de orçamentos e interesse comercial.`);
  } else {
    opportunityScoreRaw += 2;
  }

  // 8. Rating / Relationship (Max 5 pts)
  if (client.rating >= 4.7) {
    opportunityScoreRaw += 5;
    opportunityReasons.push(`⭐ Excelente relacionamento e satisfação com o serviço (Nota ${client.rating.toFixed(1)}/5).`);
  } else if (client.rating >= 4.0) {
    opportunityScoreRaw += 3;
  } else {
    opportunityScoreRaw += 1;
  }

  // 9. Financial Potential Factor (Max 5 pts)
  if (estimatedPotentialRevenue >= 15000) {
    opportunityScoreRaw += 5;
    opportunityReasons.push(`🎯 Grande potencial de fechamento imediato (R$ ${estimatedPotentialRevenue.toLocaleString('pt-BR')}).`);
  } else if (estimatedPotentialRevenue >= 8000) {
    opportunityScoreRaw += 4;
  } else {
    opportunityScoreRaw += 2;
  }

  const opportunityScore = Math.min(100, Math.max(10, Math.round(opportunityScoreRaw)));

  // Opportunity Tier
  let opportunityTier: import('../types').OpportunityScoreTier = 'media';
  if (opportunityScore >= 85) {
    opportunityTier = 'maxima';
  } else if (opportunityScore >= 70) {
    opportunityTier = 'alta';
  } else if (opportunityScore >= 50) {
    opportunityTier = 'media';
  } else {
    opportunityTier = 'baixa';
  }

  // Churn Risk calculation
  const isAtRiskOfChurn =
    (completedOS.length >= 2 || totalRevenue >= 25000) &&
    daysSinceLastService >= 70 &&
    daysPastExpectedCadence > 20;

  // Commercial Quadrant Matrix (Potential vs Probability)
  const isHighProb = opportunityScore >= 65;
  const isHighPot = estimatedPotentialRevenue >= 10000;
  let quadrantClassification: import('../types').CommercialQuadrant = 'baixo_baixo';
  if (isHighPot && isHighProb) {
    quadrantClassification = 'alto_alto';
  } else if (isHighPot && !isHighProb) {
    quadrantClassification = 'alto_baixo';
  } else if (!isHighPot && isHighProb) {
    quadrantClassification = 'baixo_alto';
  } else {
    quadrantClassification = 'baixo_baixo';
  }

  // Next Best Action (🎯 PRÓXIMA MELHOR AÇÃO)
  let nextBestAction = 'Apresentar disponibilidade da frota de drones para a próxima janela de pulverização.';
  const lowerService = (lastServiceName || '').toLowerCase();
  const lowerCrop = (lastCrop || '').toLowerCase();

  if (isAtRiskOfChurn) {
    nextBestAction = 'Reabrir relacionamento prioritário apresentando disponibilidade de datas da frota e condição especial de safra.';
  } else if (lowerService.includes('dessecação') || lowerService.includes('plantio')) {
    nextBestAction = 'Entrar em contato oferecendo planejamento de dessecação pré-plantio sem compactação e zero amassamento.';
  } else if (lowerService.includes('fungicida') || lowerService.includes('inseticida')) {
    nextBestAction = 'Enviar mensagem consultiva sobre monitoramento de pragas e aplicação preventiva de fungicida com penetração total.';
  } else if (lowerService.includes('foliar') || lowerService.includes('micronutrientes')) {
    nextBestAction = 'Apresentar proposta técnica para adubação foliar e bioestimulantes na fase vegetativa da lavoura.';
  } else if (lowerCrop.includes('milho')) {
    nextBestAction = 'Sondar necessidade de controle de lagarta-do-cartucho ou aplicação de fungicida na fase reprodutiva.';
  } else if (lowerCrop.includes('soja')) {
    nextBestAction = 'Apresentar pacote de dessecação pré-colheita ou proteção de baixeiro com bicos centrífugos.';
  }

  // Recommended Message (💬 MENSAGEM RECOMENDADA)
  const contactFirst = (client.contactName || client.name.split('/')[0]).trim();
  const farmClean = lastPropertyName || 'sua propriedade';
  const cropClean = lastCrop || 'sua lavoura';
  const daysClean = daysSinceLastService >= 999 ? 'alguns meses' : `${daysSinceLastService} dias`;

  const recommendedMessage = `Olá, ${contactFirst}! Tudo bem?

Estava revisando nosso histórico e percebi que já faz aproximadamente ${daysClean} desde nossa última aplicação na ${farmClean}.

Estamos organizando nossa programação de campo para ${cropClean} nos próximos dias e queria saber se vocês já estão planejando alguma aplicação para essa nova janela.

Se fizer sentido, posso verificar nossa disponibilidade de frota e preparar uma proposta personalizada para sua área!`;

  // ==========================================
  // SIMPLIFIED REATIVA v3.0 INTELLIGENCE
  // Simple 3-tier Priority (🔥 ALTA / 🟡 MÉDIA / ⚪ BAIXA) + Short Human Explanation
  // ==========================================
  let simplePriority: import('../types').SimpleReactivationPriority = 'media';
  let simplePriorityExplanation = '';

  if (daysSinceLastService < 15) {
    simplePriority = 'baixa';
    simplePriorityExplanation = `Aplicação recente concluída há ${daysSinceLastService} dias.`;
  } else if (completedOS.length >= 2 || totalRevenue >= 25000) {
    if (daysSinceLastService >= 30 && daysSinceLastService <= 120) {
      simplePriority = 'alta';
      simplePriorityExplanation = `Cliente recorrente (${completedOS.length} serviços). Está há ${daysSinceLastService} dias sem contratar.`;
    } else if (daysSinceLastService > 120) {
      simplePriority = 'alta';
      simplePriorityExplanation = `Cliente de alto valor (${completedOS.length} serviços). Há ${daysSinceLastService} dias sem novo contato.`;
    } else {
      simplePriority = 'media';
      simplePriorityExplanation = `Cliente parceiro com última aplicação há ${daysSinceLastService} dias.`;
    }
  } else if (completedOS.length === 1) {
    if (daysSinceLastService >= 30 && daysSinceLastService <= 90) {
      simplePriority = 'alta';
      simplePriorityExplanation = `Realizou 1 serviço anterior. Janela ideal para nova aplicação (${daysSinceLastService} dias).`;
    } else if (daysSinceLastService > 90) {
      simplePriority = 'media';
      simplePriorityExplanation = `Realizou 1 serviço anteriormente e está há ${daysSinceLastService} dias sem novo contato.`;
    } else {
      simplePriority = 'media';
      simplePriorityExplanation = `Último serviço realizado há ${daysSinceLastService} dias.`;
    }
  } else {
    // 0 completed OS
    if (clientQuotes.length > 0) {
      simplePriority = 'media';
      simplePriorityExplanation = `Possui histórico de proposta enviada. Pronto para primeiro fechamento de serviço.`;
    } else {
      simplePriority = 'baixa';
      simplePriorityExplanation = `Cadastrado na base. Sem histórico recente de aplicações registradas.`;
    }
  }

  // Simplified Status normalization
  let simpleStatus: import('../types').SimpleReactivationStatus = 'a_contatar';
  const rawStage = customFunnelStages[client.id];

  if (rawStage) {
    if (rawStage === 'reativado_contratado' || rawStage === ('reativado' as any)) {
      simpleStatus = 'reativado';
    } else if (rawStage === 'orcamento') {
      simpleStatus = 'orcamento';
    } else if (rawStage === 'interessado' || rawStage === ('respondeu' as any)) {
      simpleStatus = 'respondeu';
    } else if (rawStage === 'contatado' || rawStage === 'whatsapp_aberto') {
      simpleStatus = 'contatado';
    } else if (rawStage === 'sem_resposta' || rawStage === 'declinado') {
      simpleStatus = 'sem_resposta';
    } else {
      simpleStatus = 'a_contatar';
    }
  } else {
    if (daysSinceLastService < 15) {
      simpleStatus = 'reativado';
    } else {
      simpleStatus = 'a_contatar';
    }
  }

  const funnelStage = customFunnelStages[client.id] || (daysSinceLastService < 15 ? 'reativado_contratado' : 'selecionado');

  return {
    clientId: client.id,
    clientName: client.name,
    contactName: client.contactName || client.name.split('/')[0].trim(),
    phone: client.phone || client.whatsapp,
    whatsapp: client.whatsapp || client.phone,
    city: client.city,
    state: client.state,
    rating: client.rating,
    totalHectares: client.totalHectares,
    totalRevenue,
    lastServiceDate,
    lastServiceName,
    lastCrop,
    lastPropertyName,
    daysSinceLastService,
    averageServiceIntervalDays,
    totalCompletedOrders: completedOS.length,
    totalQuotesCount: clientQuotes.length,
    reactivationScore: score,
    scoreTier,
    scoreReasons,

    // Simplified Reactivation v3.0
    simplePriority,
    simplePriorityExplanation,
    simpleStatus,
    
    // Opportunity Engine fields
    opportunityScore,
    opportunityTier,
    opportunityReasons,
    nextBestAction,
    recommendedMessage,
    averageTicket,
    daysPastExpectedCadence,
    isAtRiskOfChurn,
    quadrantClassification,

    estimatedPotentialRevenue,
    funnelStage,
  };
}

/**
 * Generates overall analytics and metrics for the reactivation module and opportunity engine
 */
export function calculateReactivationMetrics(
  summaries: ReactivationClientSummary[]
): ReactivationMetricsSummary {
  const totalClients = summaries.length;
  const totalInactiveClients = summaries.filter((s) => s.daysSinceLastService >= 30).length;

  const highPriorityCount = summaries.filter((s) => s.scoreTier === 'alta_prioridade').length;
  const opportunityCount = summaries.filter((s) => s.scoreTier === 'oportunidade').length;
  const riskCount = summaries.filter((s) => s.scoreTier === 'risco_perda').length;
  const coldCount = summaries.filter((s) => s.scoreTier === 'frio').length;
  const reactivatedCount = summaries.filter((s) => s.funnelStage === 'reativado_contratado').length;

  const totalHistoricalRevenue = summaries.reduce((acc, s) => acc + s.totalRevenue, 0);
  const estimatedRecoverableRevenue = summaries
    .filter((s) => s.daysSinceLastService >= 30 && s.funnelStage !== 'reativado_contratado')
    .reduce((acc, s) => acc + s.estimatedPotentialRevenue, 0);

  const recoveredRevenue = summaries
    .filter((s) => s.funnelStage === 'reativado_contratado')
    .reduce((acc, s) => acc + s.estimatedPotentialRevenue, 0);

  const stageCounts: Record<ReactivationFunnelStage, number> = {
    selecionado: summaries.filter((s) => s.funnelStage === 'selecionado' || !s.funnelStage).length,
    whatsapp_aberto: summaries.filter((s) => s.funnelStage === 'whatsapp_aberto').length,
    contatado: summaries.filter((s) => s.funnelStage === 'contatado').length,
    interessado: summaries.filter((s) => s.funnelStage === 'interessado').length,
    orcamento: summaries.filter((s) => s.funnelStage === 'orcamento').length,
    reativado_contratado: reactivatedCount,
    sem_resposta: summaries.filter((s) => s.funnelStage === 'sem_resposta').length,
    declinado: summaries.filter((s) => s.funnelStage === 'declinado').length,
  };

  // Opportunity Engine aggregations
  const recommendedClients = summaries.filter((s) => s.opportunityScore >= 70 && s.funnelStage !== 'reativado_contratado');
  const recommendedPotentialRevenue = recommendedClients.reduce((acc, s) => acc + s.estimatedPotentialRevenue, 0);
  const maximumPriorityCount = summaries.filter((s) => s.opportunityTier === 'maxima').length;
  const highOpportunityCount = summaries.filter((s) => s.opportunityTier === 'alta').length;
  const atRiskCount = summaries.filter((s) => s.isAtRiskOfChurn).length;
  
  // Unworked potential revenue (estimativa de receita de clientes fora da cadência esperada)
  const unworkedPotentialRevenue = summaries
    .filter((s) => s.daysPastExpectedCadence > 0 && s.funnelStage !== 'reativado_contratado')
    .reduce((acc, s) => acc + s.estimatedPotentialRevenue, 0);

  const quadrantCounts = {
    altoAlto: summaries.filter((s) => s.quadrantClassification === 'alto_alto').length,
    altoBaixo: summaries.filter((s) => s.quadrantClassification === 'alto_baixo').length,
    baixoAlto: summaries.filter((s) => s.quadrantClassification === 'baixo_alto').length,
    baixoBaixo: summaries.filter((s) => s.quadrantClassification === 'baixo_baixo').length,
  };

  const contactedCount = summaries.filter((s) => s.funnelStage !== 'selecionado').length;
  const respondedCount = summaries.filter((s) => s.funnelStage === 'interessado' || s.funnelStage === 'orcamento' || s.funnelStage === 'reativado_contratado').length;
  const quotesCount = summaries.filter((s) => s.funnelStage === 'orcamento' || s.funnelStage === 'reativado_contratado').length;
  const completedOsCount = reactivatedCount;
  const conversionRate = contactedCount > 0 ? Math.round((completedOsCount / contactedCount) * 100) : 0;

  return {
    totalClients,
    totalInactiveClients,
    highPriorityCount,
    opportunityCount,
    riskCount,
    atRiskCount,
    coldCount,
    reactivatedCount,
    totalHistoricalRevenue,
    estimatedRecoverableRevenue,
    recoveredRevenue,
    stageCounts,
    opportunityMetrics: {
      recommendedCount: recommendedClients.length,
      recommendedPotentialRevenue,
      maximumPriorityCount,
      highOpportunityCount,
      atRiskCount,
      unworkedPotentialRevenue,
      quadrantCounts,
      commercialResults: {
        recommendedCount: recommendedClients.length,
        contactedCount,
        respondedCount,
        negotiationsCount: stageCounts.interessado,
        quotesCount,
        completedOsCount,
        recoveredRevenue,
        conversionRate,
      },
    },
  };
}

// ==========================================
// MOUTRYX REATIVA 2.0: CRM UTILITIES & ENGINES
// ==========================================

import {
  Prospect,
  CommercialOpportunity,
  CommercialActionToday,
  FollowUpItem,
  ReferralItem,
  PostSaleRecord,
  HarvestCalendarWindow,
  OpportunityScoreTier,
} from '../types';

/**
 * Calculates Opportunity Score Tier (0-100)
 */
export function getOpportunityScoreTier(score: number): {
  tier: OpportunityScoreTier;
  label: string;
  badgeClass: string;
  icon: string;
} {
  if (score >= 90) {
    return {
      tier: 'extremamente_quente',
      label: 'Extremamente Quente',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '🔥',
    };
  }
  if (score >= 75) {
    return {
      tier: 'alta_prioridade',
      label: 'Alta Prioridade',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: '🚀',
    };
  }
  if (score >= 50) {
    return {
      tier: 'oportunidade',
      label: 'Oportunidade',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: '🎯',
    };
  }
  if (score >= 25) {
    return {
      tier: 'baixa_prioridade',
      label: 'Baixa Prioridade',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: '⚠️',
    };
  }
  return {
    tier: 'frio',
    label: 'Frio',
    badgeClass: 'bg-slate-700/40 text-slate-400 border-slate-700',
    icon: '❄️',
  };
}

/**
 * Agricultural Harvest & Commercial Season Calendar Windows
 */
export function getHarvestCalendarWindows(): HarvestCalendarWindow[] {
  return [
    {
      id: 'cal-soja-dessecacao',
      crop: 'Soja',
      region: 'Centro-Oeste / MT / GO',
      phase: 'Dessecação Pré-Colheita / Fungicida Final',
      startDate: 'Janeiro',
      endDate: 'Fevereiro',
      serviceRecommended: 'Dessecação com Drone e Fungicida de Fechamento',
      description: 'Janela de alta urgência para dessecação rápida e uniforme sem amassamento de vagens.',
    },
    {
      id: 'cal-milho-safrinha',
      crop: 'Milho Safrinha',
      region: 'Centro-Oeste / PR / MS',
      phase: 'Pós-Emergência & Lagarta do Cartucho',
      startDate: 'Fevereiro',
      endDate: 'Abril',
      serviceRecommended: 'Aplicação de Inseticida / Biológico e Foliar',
      description: 'Controle de Spodoptera e adubação foliar quando o milho atinge estágio V4-V8.',
    },
    {
      id: 'cal-algodao-desfolha',
      crop: 'Algodão',
      region: 'MT / BA',
      phase: 'Desfolha & Regulador de Crescimento',
      startDate: 'Junho',
      endDate: 'Agosto',
      serviceRecommended: 'Aplicação de Desfolhante e Maturação',
      description: 'Aplicação uniforme nas copas altas sem perda de capulhos.',
    },
    {
      id: 'cal-pastagem-reforma',
      crop: 'Pastagem',
      region: 'Nacional',
      phase: 'Controle de Plantas Daninhas & Semeadura',
      startDate: 'Setembro',
      endDate: 'Novembro',
      serviceRecommended: 'Herbicida Seletivo em Pastagem e Sobre-semeadura',
      description: 'Limpeza de invasoras de folha larga e reforma de pasto antes do início das chuvas.',
    },
  ];
}

/**
 * Deterministic Next Best Action calculator for opportunities & clients
 */
export function determineOpportunityNextBestAction(
  stage: string,
  daysInactive: number,
  hasQuote: boolean,
  daysSinceQuote: number = 0,
  crop: string = 'Soja'
): { action: string; reason: string } {
  if (stage === 'novo_lead') {
    return {
      action: 'Enviar primeiro contato de apresentação',
      reason: 'Lead novo cadastrado aguardando apresentação das soluções de pulverização.',
    };
  }
  if (stage === 'primeiro_contato' || stage === 'contato_realizado') {
    return {
      action: 'Qualificar área e culturas de interesse',
      reason: 'Contato inicial já aberto. Verificar tamanho da lavoura e janela agronômica.',
    };
  }
  if (stage === 'interesse' || stage === 'levantamento_area') {
    return {
      action: 'Elaborar e enviar orçamento personalizado',
      reason: 'Produtor demonstrou interesse. Montar proposta com valor por hectare e data estimada.',
    };
  }
  if (stage === 'orcamento') {
    if (daysSinceQuote >= 3) {
      return {
        action: 'Fazer follow-up do orçamento enviado',
        reason: `Orçamento enviado há ${daysSinceQuote} dias sem retorno definitivo. Consultar dúvidas comerciais.`,
      };
    }
    return {
      action: 'Acompanhar decisão comercial do orçamento',
      reason: 'Proposta recente enviada. Manter contato consultivo.',
    };
  }
  if (stage === 'negociacao') {
    return {
      action: 'Fechar condições comerciais e agendar data de início',
      reason: 'Em negociação final. Confirmar disponibilidade de frota e prazos de pagamento.',
    };
  }
  if (stage === 'fechado' || stage === 'servico_agendado') {
    return {
      action: 'Confirmar janela climática e escala da equipe',
      reason: 'Serviço fechado. Alinhar condições de vento e abastecimento de calda na fazenda.',
    };
  }
  if (stage === 'servico_concluido' || stage === 'pos_venda') {
    return {
      action: 'Coletar feedback de satisfação e oferecer próxima janela',
      reason: 'Aplicação concluída. Registrar avaliação do produtor e planejar próxima fase da cultura.',
    };
  }
  // Default reactivation
  if (daysInactive >= 60) {
    return {
      action: `Reativar para a safra de ${crop}`,
      reason: `Produtor sem novas aplicações há ${daysInactive} dias. Apresentar disponibilidade de drones para a próxima janela.`,
    };
  }
  return {
    action: 'Manter relacionamento comercial',
    reason: 'Cliente ativo na carteira.',
  };
}

/**
 * Generates the daily "Seu Plano Comercial de Hoje" list
 */
export function generateCommercialActionsToday(
  prospects: Prospect[],
  opportunities: CommercialOpportunity[],
  clients: ReactivationClientSummary[],
  followUps: FollowUpItem[],
  referenceDate?: string | Date
): CommercialActionToday[] {
  const actions: CommercialActionToday[] = [];

  // 1. Follow-ups agendados para hoje ou atrasados
  const now = referenceDate instanceof Date ? referenceDate : referenceDate ? new Date(referenceDate) : new Date();
  const todayStr = now.toISOString().split('T')[0];
  followUps
    .filter((f) => f.status === 'pendente')
    .forEach((f) => {
      const isOverdue = f.scheduledDate < todayStr;
      actions.push({
        id: `action-fu-${f.id}`,
        title: isOverdue ? `⚠️ Follow-up Atrasado: ${f.producerName}` : `📅 Follow-up de Hoje: ${f.producerName}`,
        category: isOverdue ? 'negociacao_risco' : 'followup_orcamento',
        entityId: f.opportunityId || f.clientId || f.prospectId || f.id,
        entityType: f.clientId ? 'cliente' : 'prospecto',
        producerName: f.producerName,
        farmName: f.farmName,
        phone: f.whatsapp,
        whatsapp: f.whatsapp,
        reason: isOverdue ? `Follow-up programado para ${f.scheduledDate} está pendente: ${f.reason}` : `Follow-up para hoje: ${f.reason}`,
        potentialValue: 12500,
        nextBestAction: `Realizar contato de follow-up sobre ${f.reason}`,
        priorityScore: isOverdue ? 95 : 85,
        isAtRisk: isOverdue,
      });
    });

  // 2. Orçamentos pendentes de retorno há mais de 3 dias
  opportunities
    .filter((o) => o.stage === 'orcamento' || o.stage === 'negociacao')
    .forEach((o) => {
      actions.push({
        id: `action-opp-${o.id}`,
        title: `📋 Follow-up de Orçamento: ${o.producerName}`,
        category: 'followup_orcamento',
        entityId: o.id,
        entityType: o.entityType,
        producerName: o.producerName,
        farmName: o.farmName,
        phone: o.whatsapp || o.phone,
        whatsapp: o.whatsapp || o.phone,
        reason: o.nextBestActionReason || 'Orçamento aguardando aprovação e alinhamento de datas.',
        potentialValue: o.estimatedPotentialValue || 15000,
        nextBestAction: o.nextBestAction || 'Consultar retorno sobre a proposta enviada.',
        priorityScore: 90,
        crop: o.crop,
        city: o.city,
        isAtRisk: o.isAtRisk,
      });
    });

  // 3. Leads novos sem primeiro contato
  prospects
    .filter((p) => (p.stage === 'novo_lead' || !p.lastContactAt) && p.status === 'ativo')
    .forEach((p) => {
      actions.push({
        id: `action-pros-${p.id}`,
        title: `🎯 Novo Lead sem Contato: ${p.producerName}`,
        category: 'lead_sem_contato',
        entityId: p.id,
        entityType: 'prospecto',
        producerName: p.producerName,
        farmName: p.farmName,
        phone: p.whatsapp || p.phone,
        whatsapp: p.whatsapp || p.phone,
        reason: `Origem: ${p.leadSource.toUpperCase()} • Área estimada: ${p.approximateAreaHa} ha • Culturas: ${p.crops.join(', ')}`,
        potentialValue: p.estimatedPotentialValue || 10000,
        nextBestAction: 'Enviar primeiro contato de apresentação via WhatsApp',
        priorityScore: 80,
        crop: p.crops[0] || 'Soja',
        city: p.city,
      });
    });

  // 4. Clientes com alta pontuação de reativação inativos
  clients
    .filter((c) => c.opportunityScore >= 75 && c.daysSinceLastService >= 45 && c.funnelStage !== 'reativado_contratado')
    .slice(0, 5)
    .forEach((c) => {
      actions.push({
        id: `action-cli-${c.clientId}`,
        title: `🔄 Reativação Prioritária: ${c.clientName}`,
        category: 'reativacao',
        entityId: c.clientId,
        entityType: 'cliente',
        producerName: c.clientName,
        farmName: c.lastPropertyName || 'Fazenda',
        phone: c.whatsapp,
        whatsapp: c.whatsapp,
        reason: `Inativo há ${c.daysSinceLastService} dias • Histórico: R$ ${c.totalRevenue.toLocaleString('pt-BR')} • Cultura: ${c.lastCrop || 'Soja'}`,
        potentialValue: c.estimatedPotentialRevenue || 12000,
        nextBestAction: `Apresentar proposta de dessecação/fungicida para a próxima safra`,
        priorityScore: c.opportunityScore,
        daysInactiveOrPending: c.daysSinceLastService,
        crop: c.lastCrop || 'Soja',
        city: c.city,
      });
    });

  // Deduplicate and sort by priority score
  const uniqueMap = new Map<string, CommercialActionToday>();
  actions.forEach((a) => {
    if (!uniqueMap.has(a.id)) {
      uniqueMap.set(a.id, a);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => b.priorityScore - a.priorityScore);
}

const getRelativeDate = (offsetDays: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

/**
 * Initial sample seed data for Prospects
 */
export function getInitialProspects(companyId: string): Prospect[] {
  return [
    {
      id: 'prosp-1',
      companyId,
      producerName: 'Carlos Eduardo Barreto',
      farmName: 'Fazenda Santa Luzia',
      phone: '(66) 99881-2244',
      whatsapp: '(66) 99881-2244',
      city: 'Sorriso',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 850,
      crops: ['Soja', 'Milho'],
      interestedServices: ['Pulverização Agrícola', 'Dessecação'],
      leadSource: 'indicacao',
      referredBy: 'João Silva / Agro Silva',
      notes: 'Produtor com área em talhões com relevo acidentado próximo à APP. Busca drone para evitar amassamento.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'orcamento',
      opportunityScore: 92,
      estimatedPotentialValue: 28500,
      createdAt: getRelativeDate(-7),
      updatedAt: getRelativeDate(-2),
      lastContactAt: getRelativeDate(-3),
      nextFollowUpDate: getRelativeDate(1),
      nextFollowUpReason: 'Follow-up do orçamento de dessecação de 400 ha',
    },
    {
      id: 'prosp-2',
      companyId,
      producerName: 'Fernando Aguiar',
      farmName: 'Estância Terra Prometida',
      phone: '(66) 99772-3311',
      whatsapp: '(66) 99772-3311',
      city: 'Lucas do Rio Verde',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 1200,
      crops: ['Algodão', 'Soja'],
      interestedServices: ['Aplicação de Desfolhante', 'Fungicida'],
      leadSource: 'feira',
      notes: 'Conheceu a equipe no Show Safra. Muito interessado em dessecação pontual.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'novo_lead',
      opportunityScore: 86,
      estimatedPotentialValue: 36000,
      createdAt: getRelativeDate(-1),
      updatedAt: getRelativeDate(-1),
      nextFollowUpDate: getRelativeDate(0),
      nextFollowUpReason: 'Primeiro contato de apresentação das aeronaves DJI Agras',
    },
    {
      id: 'prosp-3',
      companyId,
      producerName: 'Mauro Sérgio Vilela',
      farmName: 'Agropecuária Três Lagoas',
      phone: '(66) 99611-8899',
      whatsapp: '(66) 99611-8899',
      city: 'Nova Mutum',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 450,
      crops: ['Pastagem', 'Milho'],
      interestedServices: ['Limpeza de Pastagem', 'Semeadura'],
      leadSource: 'instagram',
      notes: 'Solicitou cotação de sobre-semeadura de capim braquiária.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'interesse',
      opportunityScore: 74,
      estimatedPotentialValue: 14500,
      createdAt: getRelativeDate(-5),
      updatedAt: getRelativeDate(-2),
      lastContactAt: getRelativeDate(-4),
    },
  ];
}

/**
 * Initial sample seed data for Commercial Opportunities
 */
export function getInitialCommercialOpportunities(companyId: string): CommercialOpportunity[] {
  return [
    {
      id: 'opp-1',
      companyId,
      entityType: 'prospecto',
      prospectId: 'prosp-1',
      title: 'Dessecação Pré-Colheita 400 ha - Fazenda Santa Luzia',
      producerName: 'Carlos Eduardo Barreto',
      farmName: 'Fazenda Santa Luzia',
      phone: '(66) 99881-2244',
      whatsapp: '(66) 99881-2244',
      city: 'Sorriso',
      crop: 'Soja',
      serviceType: 'Dessecação Agrícola',
      areaHa: 400,
      estimatedPotentialValue: 18000,
      stage: 'orcamento',
      opportunityScore: 92,
      nextBestAction: 'Fazer follow-up do orçamento enviado',
      nextBestActionReason: 'Orçamento enviado há 4 dias e ainda sem retorno definitivo.',
      nextFollowUpDate: getRelativeDate(1),
      nextFollowUpReason: 'Alinhar dúvidas de taxa de aplicação e calda',
      isAtRisk: true,
      riskReason: 'Orçamento sem retorno há 4 dias.',
      createdAt: getRelativeDate(-7),
      updatedAt: getRelativeDate(-2),
    },
    {
      id: 'opp-2',
      companyId,
      entityType: 'cliente',
      clientId: 'client-5',
      title: 'Aplicação de Fungicida Safrinha 650 ha - Fazenda Boa Esperança',
      producerName: 'Fazenda Boa Esperança / Rogério Guimarães',
      farmName: 'Fazenda Boa Esperança',
      phone: '(66) 99822-4411',
      whatsapp: '(66) 99822-4411',
      city: 'Ipiranga do Norte',
      crop: 'Milho Safrinha',
      serviceType: 'Fungicida + Foliar',
      areaHa: 650,
      estimatedPotentialValue: 29250,
      stage: 'negociacao',
      opportunityScore: 88,
      nextBestAction: 'Confirmar cronograma de voo e contrato',
      nextBestActionReason: 'Cliente demonstrou interesse positivo na janela de V6.',
      nextFollowUpDate: getRelativeDate(2),
      nextFollowUpReason: 'Confirmação final da data de entrada na lavoura',
      isAtRisk: false,
      createdAt: getRelativeDate(-9),
      updatedAt: getRelativeDate(-1),
    },
  ];
}

/**
 * Initial sample seed data for FollowUps
 */
export function getInitialFollowUps(companyId: string): FollowUpItem[] {
  return [
    {
      id: 'fu-1',
      companyId,
      opportunityId: 'opp-1',
      prospectId: 'prosp-1',
      producerName: 'Carlos Eduardo Barreto',
      farmName: 'Fazenda Santa Luzia',
      whatsapp: '(66) 99881-2244',
      scheduledDate: getRelativeDate(0),
      reason: 'Follow-up do orçamento de dessecação de 400 ha',
      priority: 'alta',
      status: 'pendente',
      notes: 'Ligar ou enviar mensagem às 14h.',
    },
    {
      id: 'fu-2',
      companyId,
      opportunityId: 'opp-2',
      clientId: 'client-5',
      producerName: 'Rogério Guimarães',
      farmName: 'Fazenda Boa Esperança',
      whatsapp: '(66) 99822-4411',
      scheduledDate: getRelativeDate(1),
      reason: 'Alinhamento de datas para pulverização de milho',
      priority: 'media',
      status: 'pendente',
    },
    {
      id: 'fu-3',
      companyId,
      prospectId: 'prosp-2',
      producerName: 'Fernando Aguiar',
      farmName: 'Estância Terra Prometida',
      whatsapp: '(66) 99772-3311',
      scheduledDate: getRelativeDate(-1), // Overdue
      reason: 'Apresentação institucional e diagnóstico de área',
      priority: 'alta',
      status: 'pendente',
      notes: 'Agendado no Show Safra.',
    },
  ];
}

/**
 * Initial sample seed data for Referrals
 */
export function getInitialReferrals(companyId: string): ReferralItem[] {
  return [
    {
      id: 'ref-1',
      companyId,
      referrerClientId: 'client-5',
      referrerName: 'Rogério Guimarães (Fazenda Boa Esperança)',
      referredProspectName: 'Carlos Eduardo Barreto',
      referredFarmName: 'Fazenda Santa Luzia',
      referredPhone: '(66) 99881-2244',
      date: getRelativeDate(-7),
      status: 'em_contato',
      rewardNotes: 'Desconto de 5% no próximo voo se o Carlos fechar a dessecação.',
    },
  ];
}

/**
 * Initial sample seed data for Post-Sale
 */
export function getInitialPostSales(companyId: string): PostSaleRecord[] {
  return [
    {
      id: 'ps-1',
      companyId,
      clientId: 'client-1',
      clientName: 'Agropecuária Santa Maria',
      farmName: 'Fazenda Santa Maria - Talhão 04',
      serviceDate: getRelativeDate(-25),
      crop: 'Milho Safrinha',
      serviceType: 'Aplicação de Inseticida',
      areaSprayedHa: 320,
      satisfactionRating: 5,
      feedbackNotes: 'Excelente cobertura nas folhas baixas. Zero amassamento.',
      nextNeedIdentified: 'Dessecação para plantio de Soja',
      nextContactScheduled: getRelativeDate(12),
    },
  ];
}

/**
 * CSV Parser for Prospects
 */
export function parseProspectsCsv(csvText: string, companyId: string): {
  validProspects: Prospect[];
  errors: { row: number; reason: string }[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { validProspects: [], errors: [{ row: 1, reason: 'Arquivo CSV vazio ou sem cabeçalho.' }] };
  }

  const validProspects: Prospect[] = [];
  const errors: { row: number; reason: string }[] = [];

  // Expected columns: Nome, Fazenda, Telefone, Cidade, Estado, Cultura, Área, Serviço, Observação
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const nameIdx = headers.findIndex((h) => h.includes('nome') || h.includes('produtor'));
  const farmIdx = headers.findIndex((h) => h.includes('fazenda') || h.includes('propriedade'));
  const phoneIdx = headers.findIndex((h) => h.includes('fone') || h.includes('telefone') || h.includes('whatsapp') || h.includes('celular'));
  const cityIdx = headers.findIndex((h) => h.includes('cidade') || h.includes('municipio'));
  const stateIdx = headers.findIndex((h) => h.includes('uf') || h.includes('estado'));
  const cropIdx = headers.findIndex((h) => h.includes('cultura') || h.includes('cultivo'));
  const areaIdx = headers.findIndex((h) => h.includes('area') || h.includes('hectare') || h.includes('ha'));
  const serviceIdx = headers.findIndex((h) => h.includes('servico') || h.includes('interesse'));
  const notesIdx = headers.findIndex((h) => h.includes('obs') || h.includes('observacao') || h.includes('detalhe'));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const producerName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : '';
    const farmName = farmIdx >= 0 && cols[farmIdx] ? cols[farmIdx] : `Fazenda ${producerName}`;
    const phone = phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx] : '';

    if (!producerName) {
      errors.push({ row: i + 1, reason: 'Nome do produtor ausente.' });
      continue;
    }

    const city = cityIdx >= 0 && cols[cityIdx] ? cols[cityIdx] : 'Sorriso';
    const state = stateIdx >= 0 && cols[stateIdx] ? cols[stateIdx] : 'MT';
    const cropStr = cropIdx >= 0 && cols[cropIdx] ? cols[cropIdx] : 'Soja';
    const areaStr = areaIdx >= 0 && cols[areaIdx] ? cols[areaIdx].replace(/\D/g, '') : '500';
    const areaHa = parseInt(areaStr, 10) || 500;
    const serviceStr = serviceIdx >= 0 && cols[serviceIdx] ? cols[serviceIdx] : 'Pulverização Agrícola';
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : 'Importado via lista CSV';

    validProspects.push({
      id: `prosp-csv-${Date.now()}-${i}`,
      companyId,
      producerName,
      farmName,
      phone: phone || '(66) 99999-0000',
      whatsapp: phone || '(66) 99999-0000',
      city,
      state,
      approximateAreaHa: areaHa,
      crops: cropStr.split(';').map((c) => c.trim()),
      interestedServices: serviceStr.split(';').map((s) => s.trim()),
      leadSource: 'outro',
      notes,
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'novo_lead',
      opportunityScore: 70,
      estimatedPotentialValue: areaHa * 45, // R$ 45/ha estimativa
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      nextFollowUpReason: 'Primeiro contato com lead importado via CSV',
    });
  }

  return { validProspects, errors };
}

/**
 * Seed data generator for initial realistic Prospects
 */
export function generateSeedProspects(companyId: string): Prospect[] {
  return [
    {
      id: 'prosp-seed-1',
      companyId,
      producerName: 'Marcio Antunes Ribeiro',
      farmName: 'Fazenda Estrela do Norte',
      phone: '(66) 99844-3322',
      whatsapp: '(66) 99844-3322',
      city: 'Sorriso',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 1200,
      crops: ['Soja', 'Milho'],
      interestedServices: ['Pulverização Agrícola', 'Dessecação Pré-Plantio'],
      leadSource: 'indicacao',
      referredBy: 'Rogério Guimarães (Faz. Boa Esperança)',
      notes: 'Produtor busca drone para dessecação rápida e áreas com relevo acidentado perto de APPs.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'novo_lead',
      opportunityScore: 92,
      estimatedPotentialValue: 54000,
      createdAt: getRelativeDate(-2),
      updatedAt: getRelativeDate(-2),
      nextFollowUpDate: getRelativeDate(0),
      nextFollowUpReason: 'Enviar apresentação comercial e fotos de operações recentes',
    },
    {
      id: 'prosp-seed-2',
      companyId,
      producerName: 'Carlos Eduardo Zanatta',
      farmName: 'Fazenda Rio Verde',
      phone: '(66) 99755-6611',
      whatsapp: '(66) 99755-6611',
      city: 'Lucas do Rio Verde',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 850,
      crops: ['Milho Safrinha', 'Algodão'],
      interestedServices: ['Aplicação de Inseticida', 'Fungicida'],
      leadSource: 'feira',
      referredBy: 'Show Safra',
      notes: 'Pegou contato no estande da feira. Tem interesse em testes de bico rotativo centrífugo.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'primeiro_contato',
      opportunityScore: 84,
      estimatedPotentialValue: 38250,
      createdAt: getRelativeDate(-3),
      updatedAt: getRelativeDate(-1),
      lastContactAt: getRelativeDate(-1),
      nextFollowUpDate: getRelativeDate(1),
      nextFollowUpReason: 'Agendar visita técnica para medição de talhão com drone de mapeamento',
    },
    {
      id: 'prosp-seed-3',
      companyId,
      producerName: 'Guilherme Basso & Filhos',
      farmName: 'Agropecuária Basso',
      phone: '(66) 99611-9988',
      whatsapp: '(66) 99611-9988',
      city: 'Nova Mutum',
      state: 'MT',
      region: 'Médio-Norte',
      approximateAreaHa: 2400,
      crops: ['Soja', 'Algodão', 'Pastagem'],
      interestedServices: ['Controle de Daninhas em Pastagem', 'Dessecação Soja'],
      leadSource: 'instagram',
      notes: 'Enviou mensagem no direct querendo saber preço por hectare para 500ha de pastagem degradada.',
      responsibleName: 'Lucas Moura',
      status: 'ativo',
      stage: 'orcamento',
      opportunityScore: 78,
      estimatedPotentialValue: 96000,
      createdAt: getRelativeDate(-5),
      updatedAt: getRelativeDate(-1),
      lastContactAt: getRelativeDate(-1),
      nextFollowUpDate: getRelativeDate(0),
      nextFollowUpReason: 'Fazer follow-up da proposta de R$ 60/ha enviada na sexta-feira',
    },
  ];
}

/**
 * Seed data generator for initial Opportunities
 */
export function generateSeedOpportunities(companyId: string): CommercialOpportunity[] {
  return [
    {
      id: 'opp-seed-1',
      companyId,
      entityType: 'cliente',
      clientId: 'client-5',
      title: 'Dessecação Pré-Plantio Soja - Faz. Boa Esperança',
      producerName: 'Rogério Guimarães',
      farmName: 'Fazenda Boa Esperança',
      phone: '(66) 99822-4411',
      whatsapp: '(66) 99822-4411',
      city: 'Ipiranga do Norte',
      state: 'MT',
      crop: 'Soja',
      serviceType: 'Dessecação Pré-Plantio com Drone',
      areaHa: 450,
      estimatedPotentialValue: 29250,
      stage: 'negociacao',
      opportunityScore: 94,
      nextBestAction: 'Confirmar data da janela de aplicação e fechar contrato',
      nextBestActionReason: 'Cliente recorrente com janela fitossanitária aberta nos próximos 7 dias',
      nextFollowUpDate: getRelativeDate(0),
      nextFollowUpReason: 'Alinhar chegada da frota de drones Agras T40/T50',
      isAtRisk: false,
      createdAt: getRelativeDate(-7),
      updatedAt: getRelativeDate(-1),
    },
    {
      id: 'opp-seed-2',
      companyId,
      entityType: 'cliente',
      clientId: 'client-6',
      title: 'Fungicida de Fechamento de Linhas - Faz. Vale do Cerrado',
      producerName: 'Marcos Zanatta',
      farmName: 'Fazenda Vale do Cerrado',
      phone: '(66) 99933-7766',
      whatsapp: '(66) 99933-7766',
      city: 'Tapurah',
      state: 'MT',
      crop: 'Milho',
      serviceType: 'Aplicação de Fungicida + Inseticida',
      areaHa: 600,
      estimatedPotentialValue: 39000,
      stage: 'orcamento',
      opportunityScore: 82,
      nextBestAction: 'Realizar follow-up do orçamento enviado há 4 dias',
      nextBestActionReason: 'Orçamento entregue sem retorno do produtor',
      nextFollowUpDate: getRelativeDate(0),
      nextFollowUpReason: 'Perguntar se precisa de ajuste em volume de calda (L/ha)',
      isAtRisk: true,
      riskReason: 'Orçamento sem retorno há 4 dias úteis.',
      createdAt: getRelativeDate(-5),
      updatedAt: getRelativeDate(-1),
    },
    {
      id: 'opp-seed-3',
      companyId,
      entityType: 'prospecto',
      prospectId: 'prosp-seed-3',
      title: 'Controle de Invasoras em Pastagem - Agropecuária Basso',
      producerName: 'Guilherme Basso',
      farmName: 'Agropecuária Basso',
      phone: '(66) 99611-9988',
      whatsapp: '(66) 99611-9988',
      city: 'Nova Mutum',
      state: 'MT',
      crop: 'Pastagem',
      serviceType: 'Aplicação Seletiva de Herbicida com Drone',
      areaHa: 500,
      estimatedPotentialValue: 30000,
      stage: 'orcamento',
      opportunityScore: 78,
      nextBestAction: 'Apresentar cálculo de economia de defensivo com voo RTK',
      nextBestActionReason: 'Produtor preocupado com custo de herbicida',
      isAtRisk: false,
      createdAt: getRelativeDate(-3),
      updatedAt: getRelativeDate(-1),
    },
  ];
}

/**
 * Seed data generator for Follow-ups
 */
export function generateSeedFollowUps(companyId: string): FollowUpItem[] {
  return [
    {
      id: 'fu-seed-1',
      companyId,
      opportunityId: 'opp-seed-1',
      producerName: 'Rogério Guimarães',
      farmName: 'Fazenda Boa Esperança',
      whatsapp: '(66) 99822-4411',
      scheduledDate: getRelativeDate(0),
      reason: 'Fechar janela de dessecação de 450 ha',
      priority: 'alta',
      status: 'pendente',
      notes: 'Produtor aguardava alinhamento de data com o agrônomo da propriedade.',
    },
    {
      id: 'fu-seed-2',
      companyId,
      opportunityId: 'opp-seed-2',
      producerName: 'Marcos Zanatta',
      farmName: 'Fazenda Vale do Cerrado',
      whatsapp: '(66) 99933-7766',
      scheduledDate: getRelativeDate(0),
      reason: 'Retorno sobre proposta de fungicida no milho (R$ 65/ha)',
      priority: 'alta',
      status: 'pendente',
      notes: 'Verificar se aceita pagamento em 30 dias pós-aplicação.',
    },
    {
      id: 'fu-seed-3',
      companyId,
      producerName: 'Renato Teles',
      farmName: 'Sementes & Grãos Alvorada',
      whatsapp: '(66) 99655-2233',
      scheduledDate: getRelativeDate(1),
      reason: 'Primeiro contato da campanha de pulverização',
      priority: 'media',
      status: 'pendente',
      notes: 'Apresentar nova capacidade de calda e drone DJI Agras T50.',
    },
  ];
}

/**
 * Seed data generator for Post Sales
 */
export function generateSeedPostSales(companyId: string): PostSaleRecord[] {
  return [
    {
      id: 'ps-seed-1',
      companyId,
      clientId: 'client-1',
      clientName: 'Agropecuária Santa Maria',
      farmName: 'Fazenda Santa Maria',
      serviceDate: getRelativeDate(-12),
      crop: 'Milho Safrinha',
      serviceType: 'Pulverização Fungicida',
      areaSprayedHa: 420,
      satisfactionRating: 5,
      feedbackNotes: 'Excelente trabalho. Cobertura uniforme nas folhas baixeiras e pontualidade na chegada dos geradores.',
      nextNeedIdentified: 'Dessecação Pré-Plantio de Soja',
      nextContactScheduled: getRelativeDate(14),
    },
    {
      id: 'ps-seed-2',
      companyId,
      clientId: 'client-2',
      clientName: 'Grupo Bom Futuro da Serra',
      farmName: 'Fazenda Planalto',
      serviceDate: getRelativeDate(-20),
      crop: 'Soja',
      serviceType: 'Aplicação de Inseticida Noturno',
      areaSprayedHa: 310,
      satisfactionRating: 4,
      feedbackNotes: 'Aplicação noturna muito boa, sem deriva para a área vizinha.',
      nextNeedIdentified: 'Adubação Foliar Micronutrientes',
      nextContactScheduled: getRelativeDate(8),
    },
  ];
}

/**
 * Seed data generator for Referrals
 */
export function generateSeedReferrals(companyId: string): ReferralItem[] {
  return [
    {
      id: 'ref-seed-1',
      companyId,
      referrerName: 'Rogério Guimarães (Fazenda Boa Esperança)',
      referredProspectName: 'Marcio Antunes Ribeiro',
      referredFarmName: 'Fazenda Estrela do Norte',
      referredPhone: '(66) 99844-3322',
      date: getRelativeDate(-3),
      status: 'novo_lead',
      rewardNotes: 'Desconto de 5% na próxima aplicação de fungicida',
    },
    {
      id: 'ref-seed-2',
      companyId,
      referrerName: 'Agropecuária Santa Maria',
      referredProspectName: 'Nelson Brandão',
      referredFarmName: 'Fazenda Morada do Sol',
      referredPhone: '(66) 99711-4455',
      date: getRelativeDate(-7),
      status: 'em_contato',
      rewardNotes: 'Voo cortesia de mapeamento com multiespectral de 50ha',
    },
  ];
}


