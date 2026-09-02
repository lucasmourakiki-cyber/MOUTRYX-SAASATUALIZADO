export type UserRole =
  | 'super_admin'
  | 'proprietario'
  | 'administrador'
  | 'gestor_operacional'
  | 'piloto'
  | 'financeiro'
  | 'consultor';

export type ServiceStatus =
  | 'agendado'
  | 'em_deslocamento'
  | 'em_operacao'
  | 'pausado'
  | 'concluido'
  | 'faturado'
  | 'pago'
  | 'cancelado';

export type CommissionStatus =
  | 'prevista'
  | 'aguardando_pagamento_cliente'
  | 'liberada'
  | 'aprovada'
  | 'paga'
  | 'cancelada';

export type QuoteStatus =
  | 'rascunho'
  | 'enviado'
  | 'visualizado'
  | 'aprovado'
  | 'convertido_em_os'
  | 'recusado'
  | 'expirado';

export type DroneStatus = 'disponivel' | 'em_operacao' | 'em_manutencao' | 'parado' | 'ativo' | 'inativo';

export type BatteryStatus =
  | 'excelente'
  | 'boa'
  | 'atencao'
  | 'limite_atingido'
  | 'em_manutencao'
  | 'disponivel'
  | 'em_uso'
  | 'em_carregamento'
  | 'inativa';

export type PaymentStatus = 'aberto' | 'vencendo' | 'vencido' | 'pago' | 'parcial' | 'cancelado';

export type PaymentMethod = 'pix' | 'transferencia' | 'boleto' | 'cartao' | 'dinheiro' | 'outro';

export type CostCenter =
  | 'drone'
  | 'piloto'
  | 'combustivel'
  | 'deslocamento'
  | 'manutencao'
  | 'bateria'
  | 'administrativo'
  | 'marketing'
  | 'aluguel'
  | 'energia'
  | 'software'
  | 'impostos'
  | 'outros';

export type ProductClass =
  | 'Herbicida'
  | 'Fungicida'
  | 'Inseticida'
  | 'Adjuvante'
  | 'Fertilizante Foliar'
  | 'Biológico'
  | 'Regulador de Crescimento'
  | 'Outro';

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  logoUrl?: string;
  ownerName: string;
  bankInfo: {
    bank: string;
    agency: string;
    account: string;
    pixKey: string;
    pixType: 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  };
  taxRatePercent: number;
  currency: string;
  setupProgress: number;
}

export interface UserProfile {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  active: boolean;
}

export type ProfessionalType = 'piloto' | 'auxiliar_caldista';
export type CommissionModelType = 'percentual' | 'fixo_por_servico' | 'por_hectare';

export interface ProfessionalDocument {
  id: string;
  type: 'cpf' | 'rg' | 'cnh' | 'caar' | 'anac' | 'certificado' | 'contrato' | 'carteira_trabalho' | 'residencia' | 'outro' | string;
  title: string;
  documentNumber?: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: string;
  uploadDate?: string;
  issueDate?: string;
  expiryDate?: string;
  expirationDate?: string;
  status?: 'valido' | 'vencendo' | 'vencido' | 'permanente';
  notes?: string;
}

export interface Pilot {
  id: string;
  companyId: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone: string;
  whatsapp: string;
  email: string;
  // Endereço
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
  // Profissional
  professionalType?: ProfessionalType; // 'piloto' | 'auxiliar_caldista'
  role?: ProfessionalType;
  status: 'ativo' | 'em_voo' | 'folga' | 'afastado' | 'inativo';
  hireDate: string; // YYYY-MM-DD
  contractType: 'clt' | 'mei' | 'prestador_pj' | 'autonomo' | 'contratado' | 'outro';
  cnpjMei?: string;
  experienceYears?: number | string;
  // Campos específicos de Piloto
  anacCode?: string;
  anacRegistration?: string;
  anacValidity?: string;
  caarCertified: boolean; // Certificado de Aplicador Aeroagrícola Remoto
  caarNumber?: string;
  caarValidity?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhValidity?: string;
  emergencyContact?: string;
  admissionDate?: string;
  contractValidity?: string;
  authorizedDrones?: string[]; // IDs or models of drones (e.g. DJI Agras T100, T50...)
  // Campos específicos de Auxiliar / Caldista
  functionTitle?: string; // e.g. "Auxiliar de Pista / Caldista", "Operador de Calda"
  operationalNotes?: string;
  // Remuneração & Comissão
  hasFixedSalary?: boolean;
  fixedSalary?: number; // R$/mês
  hasCommission?: boolean;
  commissionModel: 'fixo' | 'percentual' | 'por_hectare' | 'fixo_por_servico' | 'hibrido' | 'nenhum';
  commissionType?: 'percentual' | 'fixo_por_servico' | 'por_hectare';
  commissionValue?: number;
  percentRate?: number; // ex: 8%
  ratePerHectare?: number; // ex: R$ 7.50 / ha
  fixedPerService?: number; // ex: R$ 150.00 / OS
  hybridFixed?: number;
  hybridRatePerHa?: number;
  bonusPerMonth?: number;
  // Documentos & Anexos
  documents?: ProfessionalDocument[];
  contractPdfUrl?: string;
  contractPdfName?: string;
  contractPdfSize?: string;
  contractUploadDate?: string;
  // Estatísticas & Informações
  notes?: string;
  totalHectaresSprayed: number;
  flightHours: number;
  avatarUrl?: string;
  version?: number;
}

export interface Drone {
  id: string;
  companyId: string;
  name?: string; // Nome ou identificação personalizada (ex: Drone Alpha 01)
  model: string; // e.g. DJI Agras T100, DJI Agras T50, DJI Agras T40, XAG P100 Pro
  manufacturer: string;
  serialNumber: string;
  assetTag: string; // Patrimônio / Tag
  tag?: string; // Alias para compatibilidade
  year: number;
  purchaseDate: string;
  purchaseValue: number;
  status: DroneStatus;
  flightHours: number;
  accumulatedHectares: number;
  tankCapacityLiters: number;
  maxFlowRateLitersMin: number;
  sprayWidthMeters: number;
  anacRegistration: string;
  insuranceValidity: string;
  lastMaintenanceDate: string;
  nextMaintenanceHours: number;
  notes?: string;
  photoUrl?: string;
  version?: number;
}

export interface Battery {
  id: string;
  companyId: string;
  droneId?: string;
  identifier: string; // e.g. Bateria #017 ou Bateria DB1560 #01
  manufacturer: string;
  model: string;
  serialNumber: string;
  cycles: number;
  maxRecommendedCycles: number;
  capacity?: string; // e.g. "30.000 mAh" ou "1.560 Wh"
  hours: number;
  healthPercent: number;
  condition: BatteryStatus;
  status?: 'disponivel' | 'em_uso' | 'em_carregamento' | 'em_manutencao' | 'inativa';
  purchaseDate: string;
  lastTestDate: string;
  notes?: string;
  version?: number;
}

export interface MaintenanceRecord {
  id: string;
  companyId: string;
  droneId: string;
  droneModel: string;
  batteryId?: string;
  type: 'preventiva' | 'corretiva' | 'inspecao' | 'troca_peca';
  date: string;
  provider: string;
  description: string;
  cost: number;
  flightHoursAtService: number;
  partsReplaced: string[];
  notes?: string;
  nextMaintenanceDueHours?: number;
  version?: number;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  contactName: string;
  type: 'pf' | 'pj';
  cpfCnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  address: string;
  totalHectares: number;
  totalRevenue: number;
  rating: number; // 1 to 5
  notes?: string;
  createdAt: string;
  version?: number;
}

export interface Property {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  name: string; // e.g. Fazenda São João
  managerName: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  totalAreaHa: number;
  notes?: string;
  version?: number;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface Talhao {
  id: string;
  companyId: string;
  propertyId: string;
  propertyName: string;
  clientId: string;
  clientName: string;
  name: string; // e.g. Talhão 07 - Sede Norte
  areaHa: number;
  crop: string; // e.g. Milho, Soja
  cropStage?: string; // e.g. V4, R1, Florescimento
  lastApplicationDate?: string;
  polygon: GeoCoordinate[];
  center: GeoCoordinate;
  soilType?: string;
  notes?: string;
  version?: number;
}

export interface Crop {
  id: string;
  name: string;
  category: 'Graos' | 'Fibra' | 'Fruticultura' | 'Hortaliça' | 'Cana' | 'Pastagem' | 'Outro';
  standardCycleDays: number;
  commonPests: string[];
  averageSprayingVolumeLPerHa: number;
  icon?: string;
}

export interface FitossanitarioProduct {
  id: string;
  commercialName: string; // e.g. Fox Xpro, Priori Top, Premio, Engeo Pleno S
  manufacturer: string; // Bayer, Syngenta, FMC, Corteva, BASF
  activeIngredient: string; // e.g. Trifloxistrobina + Protioconazol + Bixafen
  productClass: ProductClass;
  formulation: string; // SC, EC, WG, SL
  mapaRegistration: string; // Ex: 012218
  anvisaMonographRef?: string;
  chemicalGroup?: string;
  toxicologicalClass?: string;
  environmentalClass?: string;
  authorizedCrops: string[]; // Soja, Milho, Algodão, Trigo...
  targetPests: string[]; // Ferrugem-asiática, Lagarta-do-cartucho, Percevejo-marrom...
  recommendedDoseRange: string; // e.g. 0.4 a 0.5 L/ha (Consultar Receituário)
  unit: 'L' | 'kg' | 'mL' | 'g' | string;
  defaultVolumeCaldaLPerHa: number; // e.g. 10 L/ha para drone
  officialSource?: 'AGROFIT/MAPA' | 'Anvisa Monografias' | 'Fabricante Oficial' | 'Cadastro Manual';
  lastUpdated: string;
  regulatoryDisclaimer?: string;
  status?: 'ativo' | 'inativo';
  notes?: string;
  safetyIntervalDays?: number;
  droneApplicationRecommended?: boolean;
}

export interface ServiceProductItem {
  productId: string;
  commercialName: string;
  activeIngredient: string;
  targetPest: string;
  dosePerHa: number;
  unit: string;
  plannedTotalQty: number;
  actualUsedQty?: number;
  volumeCaldaLPerHa: number;
}

export const APPLICATION_SERVICE_TYPES = [
  'DESSECAÇÃO',
  'HERBICIDA',
  'FUNGICIDA',
  'INSETICIDA',
  'ACARICIDA',
  'NEMATICIDA',
  'FERTILIZANTE',
  'ADUBAÇÃO FOLIAR',
  'BIOINSUMOS',
  'REGULADOR DE CRESCIMENTO',
  'APLICAÇÃO DE DEFENSIVOS',
  'APLICAÇÃO DE INOCULANTE',
  'OUTRO',
] as const;

export type ApplicationServiceType = (typeof APPLICATION_SERVICE_TYPES)[number] | string;

export const DROPLET_SIZES = [
  'Muito fina',
  'Fina',
  'Média',
  'Grossa',
  'Muito grossa',
] as const;

export type DropletSize = (typeof DROPLET_SIZES)[number] | string;

export interface DroneApplicationParameters {
  flightSpeedKmH?: number | string; // Velocidade de voo (km/h)
  flightHeightMeters?: number | string; // Altura de voo (m)
  swathWidthMeters?: number | string; // Faixa de aplicação (m)
  caldaVolumeLPerHa?: number | string; // Vazão / Volume de calda (L/ha)
  dropletSize?: DropletSize; // Tamanho de gota
  applicationDirectionNotes?: string; // Direção / Ângulo de aplicação
}

export interface ServiceOrder {
  id: string;
  osNumber: string; // e.g. OS-2026-0089
  companyId: string;
  quoteId?: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  propertyId: string;
  propertyName: string;
  propertyCoords: GeoCoordinate;
  talhaoId: string;
  talhaoName: string;
  crop: string;
  areaHa: number;
  serviceType: string; // e.g. FUNGICIDA / INSETICIDA / DESSECAÇÃO
  scheduledDate: string;
  scheduledTime: string;
  completedDate?: string;
  finalizedAt?: string;
  completedAt?: string;
  status: ServiceStatus;
  // Pilot & Caldista / Auxiliar Commission linkage
  pilotId: string;
  pilotName: string;
  caldistaId?: string;
  caldistaName?: string;
  auxiliarId?: string;
  auxiliarName?: string;
  droneId: string;
  droneModel: string;
  products: ServiceProductItem[];
  // Operational application parameters
  applicationParameters?: DroneApplicationParameters;
  // Operational details
  weatherConditions?: {
    temperatureC?: number | string;
    windSpeedKmH?: number | string;
    humidityPercent?: number | string;
    windDirection?: string;
    notes?: string;
  };
  flightHeightMeters?: number;
  flightSpeedMs?: number;
  flightSpeedKmH?: number;
  swathWidthMeters?: number;
  caldaVolumeLPerHa?: number;
  dropletSize?: string;
  flightHoursRecorded?: number;
  batteryCyclesUsed?: number;
  actualAreaSprayedHa?: number;
  // Financial breakdown
  pricePerHa: number;
  grossAmount: number;
  displacementFee: number;
  additionalFees: number;
  discount: number;
  finalAmount: number;
  estimatedCost: number;
  netMargin: number;
  paymentTerms: string;
  paymentMethod?: 'PIX' | 'BOLETO' | 'CARTÃO' | 'PAGAMENTO SAFRA' | string;
  harvestPaymentDate?: string;
  // Commission linkage
  calculatedPilotCommission: number;
  calculatedCaldistaCommission?: number;
  calculatedAuxiliarCommission?: number;
  commissionStatus: CommissionStatus;
  caldistaCommissionStatus?: CommissionStatus;
  commissionPaidDate?: string;
  // Approvals & Signatures
  clientSigned: boolean;
  clientSignDate?: string;
  clientSignName?: string;
  notes?: string;
  fieldOccurrencesCount?: number;
  version?: number;
}

export interface QuoteItem {
  description: string;
  areaHa: number;
  pricePerHa: number;
  subtotal: number;
}

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. ORC-2026-0042
  companyId: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  clientEmail: string;
  propertyId: string;
  propertyName: string;
  talhaoName?: string;
  crop: string;
  areaHa: number;
  serviceType: string;
  droneModelPreferred: string;
  pilotAssignedId?: string;
  pilotAssignedName?: string;
  pricePerHa: number;
  subtotal: number;
  displacementFee: number;
  discount: number;
  additionalFees: number;
  taxAmount: number;
  finalAmount: number;
  estimatedCost: number;
  estimatedMargin: number;
  estimatedMarginPercent: number;
  paymentTerms: string;
  validUntil: string;
  status: QuoteStatus;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
  notes?: string;
  convertedToOsId?: string;
  version?: number;
}

export interface AccountReceivable {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  osId: string;
  osNumber: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  proofDocumentUrl?: string;
  receiptNumber?: string;
  notes?: string;
  version?: number;
}

export interface AccountPayable {
  id: string;
  companyId: string;
  costCenter: CostCenter;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  droneId?: string;
  pilotId?: string;
  isRecurring: boolean;
  proofDocumentUrl?: string;
  notes?: string;
  version?: number;
}

export interface PilotCommissionRecord {
  id: string;
  companyId: string;
  pilotId: string; // ID do profissional (Piloto ou Auxiliar/Caldista)
  pilotName: string;
  professionalRole?: 'piloto' | 'auxiliar_caldista' | string;
  professionalType?: 'piloto' | 'auxiliar_caldista' | string;
  osId: string;
  osNumber: string;
  clientName: string;
  propertyName?: string;
  serviceDate: string;
  areaSprayedHa: number;
  serviceAmount: number;
  commissionRuleApplied: string;
  commissionAmount: number;
  status: CommissionStatus;
  clientPaidDate?: string;
  releasedDate?: string;
  approvedDate?: string;
  paidDate?: string;
  notes?: string;
  version?: number;
}

export type OccurrenceType =
  | 'chuva'
  | 'vento_forte'
  | 'problema_tecnico'
  | 'falta_produto'
  | 'acesso_dificil'
  | 'interrupcao'
  | 'alteracao_area'
  | 'outro';

export interface Occurrence {
  id: string;
  companyId: string;
  osId: string;
  osNumber: string;
  pilotId: string;
  pilotName: string;
  type: OccurrenceType;
  timestamp: string;
  description: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  actionTaken?: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'Orçamento' | 'Ordem de Serviço' | 'Cliente' | 'Financeiro' | 'Comissão' | 'Drone' | 'Piloto' | 'Configuração';
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  companyId: string;
  title: string;
  category: 'contrato' | 'certificado' | 'nota_fiscal' | 'comprovante' | 'anac' | 'laudo_agronomico' | 'outro';
  relatedType: 'pilot' | 'drone' | 'client' | 'os' | 'company';
  relatedId?: string;
  relatedName?: string;
  fileSize: string;
  uploadDate: string;
  expirationDate?: string;
  status: 'valido' | 'vencendo' | 'vencido' | 'permanente';
  notes?: string;
}

export interface DroneIAScoreMetrics {
  overallScore: number | null; // 0 to 100 or null if insufficient data
  productivityScore: number | null; // 0-100 or null
  marginScore: number | null; // 0-100 or null
  fleetUtilizationScore: number | null; // 0-100 or null
  financialControlScore: number | null; // 0-100 or null
  efficiencyScore: number | null; // 0-100 or null
  hasEnoughData: boolean;
  strengths: string[];
  attentionPoints: string[];
  history: { month: string; score: number }[];
}

export interface AIRecommendation {
  id: string;
  category: 'operacional' | 'financeiro' | 'frota' | 'precificacao' | 'comercial';
  impactLevel: 'alto' | 'medio' | 'baixo';
  title: string;
  dataPoint: string;
  analysis: string;
  reason: string;
  suggestedAction: string;
  potentialGain: string;
}

export type ReceiptCategory =
  | 'combustivel'
  | 'alimentacao'
  | 'mercado'
  | 'hospedagem'
  | 'manutencao_pecas'
  | 'pedagio'
  | 'outro';

export type ReimbursementStatus =
  | 'pendente'
  | 'aprovado'
  | 'reembolsado'
  | 'rejeitado'
  | 'corporativo';

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptNote {
  id: string;
  companyId: string;
  pilotId: string;
  pilotName: string;
  date: string; // YYYY-MM-DD
  time?: string;
  establishmentName: string;
  cnpj?: string;
  category: ReceiptCategory;
  totalAmount: number;
  paymentMethod: 'cartao_corporativo' | 'dinheiro_piloto' | 'pix_piloto' | 'cartao_pessoal_piloto' | 'faturado_empresa' | 'outro';
  reimbursementStatus: ReimbursementStatus;
  relatedOsId?: string;
  relatedOsNumber?: string;
  relatedPropertyName?: string;
  fuelDetails?: {
    fuelType: 'diesel_s10' | 'gasolina_comum' | 'gasolina_aditivada' | 'etanol' | 'oleo_2t' | 'outro';
    liters: number;
    pricePerLiter: number;
    vehicleOrEquipment?: 'gerador_recarga' | 'caminhonete_apoio' | 'tanque_campo' | 'outro';
  };
  items?: ReceiptItem[];
  imageUrl?: string;
  confidenceScore?: number;
  notes?: string;
  createdAt: string;
  approvedDate?: string;
  reimbursedDate?: string;
}

export interface PilotMonthlyExpenseSummary {
  pilotId: string;
  pilotName: string;
  month: string; // YYYY-MM
  totalNotesCount: number;
  totalSpent: number;
  fuelSpent: number;
  fuelLiters: number;
  foodSpent: number;
  marketSpent: number;
  maintenanceSpent: number;
  hotelSpent: number;
  tollSpent: number;
  otherSpent: number;
  reimbursementPending: number;
  reimbursementApproved: number;
  reimbursementPaid: number;
  corporateCardSpent: number;
}

// ==========================================
// MOUTRYX REATIVA TYPES
// ==========================================

export type SimpleReactivationPriority = 'alta' | 'media' | 'baixa';

export type SimpleReactivationStatus =
  | 'a_contatar'
  | 'contatado'
  | 'respondeu'
  | 'orcamento'
  | 'reativado'
  | 'sem_resposta';

export type ReactivationScoreTier =
  | 'alta_prioridade' // 80 - 100
  | 'oportunidade' // 60 - 79
  | 'risco_perda' // 40 - 59
  | 'frio' // < 40
  | 'reativado';

export type ReactivationFunnelStage =
  | 'selecionado' // A Contatar
  | 'whatsapp_aberto' // WhatsApp Aberto
  | 'contatado' // Mensagem Enviada
  | 'interessado' // Em Negociação
  | 'orcamento' // Orçamento Enviado
  | 'reativado_contratado' // Reativado / Fechou OS
  | 'sem_resposta' // Sem Resposta
  | 'declinado'; // Não Tem Interesse / Declinado

export interface ReactivationMessageTemplate {
  id: string;
  title: string;
  category:
    | 'fungicida'
    | 'dessecacao'
    | 'plantao_chuva'
    | 'cliente_antigo'
    | 'alto_valor'
    | 'urgencia'
    | 'relacionamento'
    | 'orcamento_aberto'
    | 'primeiro_contato'
    | 'reativacao'
    | 'pre_safra'
    | 'exclusivo_fiel'
    | 'personalizado';
  recommendedSeason: string;
  suggestedTone: 'consultivo' | 'comercial' | 'urgencia' | 'relacionamento';
  templateText: string;
  description: string;
}

export type CommercialQuadrant =
  | 'alto_alto' // Alto Potencial + Alta Probabilidade: Contate agora
  | 'alto_baixo' // Alto Potencial + Baixa Probabilidade: Requer abordagem estratégica
  | 'baixo_alto' // Baixo Potencial + Alta Probabilidade: Boa oportunidade rápida
  | 'baixo_baixo'; // Baixo Potencial + Baixa Probabilidade: Baixa prioridade

export interface ReactivationClientSummary {
  clientId: string;
  clientName: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  rating: number;
  totalHectares: number;
  totalRevenue: number;
  lastServiceDate: string | null;
  lastServiceName: string | null;
  lastCrop: string | null;
  lastPropertyName: string | null;
  daysSinceLastService: number;
  averageServiceIntervalDays: number;
  totalCompletedOrders: number;
  totalQuotesCount: number;
  
  // Original Reactivation Score (0 - 100)
  reactivationScore: number;
  scoreTier: ReactivationScoreTier;
  scoreReasons: string[];
  
  // NEW: Opportunity Engine Commercial Score (0 - 100)
  opportunityScore: number;
  opportunityTier: OpportunityScoreTier;
  opportunityReasons: string[]; // "POR QUE A MOUTRYX RECOMENDA?"
  nextBestAction: string; // "🎯 PRÓXIMA MELHOR AÇÃO"
  recommendedMessage: string; // "💬 MENSAGEM RECOMENDADA"
  averageTicket: number;
  daysPastExpectedCadence: number;
  isAtRiskOfChurn: boolean;
  quadrantClassification: CommercialQuadrant;
  
  // Simplified Reactivation (v3.0)
  simplePriority: SimpleReactivationPriority;
  simplePriorityExplanation: string;
  simpleStatus: SimpleReactivationStatus;
  contactHistory?: {
    id: string;
    date: string;
    messageText: string;
    channel: 'whatsapp' | 'ligacao' | 'presencial';
    statusAfter: SimpleReactivationStatus;
    notes?: string;
  }[];

  estimatedPotentialRevenue: number;
  funnelStage: ReactivationFunnelStage;
  lastContactedAt?: string;
  notes?: string;
  currentCampaignId?: string;
}

export interface OpportunityEngineMetricsSummary {
  recommendedCount: number;
  recommendedPotentialRevenue: number;
  maximumPriorityCount: number;
  highOpportunityCount: number;
  atRiskCount: number;
  unworkedPotentialRevenue: number;
  quadrantCounts: {
    altoAlto: number;
    altoBaixo: number;
    baixoAlto: number;
    baixoBaixo: number;
  };
  commercialResults: {
    recommendedCount: number;
    contactedCount: number;
    respondedCount: number;
    negotiationsCount: number;
    quotesCount: number;
    completedOsCount: number;
    recoveredRevenue: number;
    conversionRate: number;
  };
}

export interface ReactivationMetricsSummary {
  totalClients: number;
  totalInactiveClients: number;
  highPriorityCount: number;
  opportunityCount: number;
  riskCount: number;
  atRiskCount: number;
  coldCount: number;
  reactivatedCount: number;
  totalHistoricalRevenue: number;
  estimatedRecoverableRevenue: number;
  recoveredRevenue: number;
  stageCounts: Record<ReactivationFunnelStage, number>;
  
  // Integrated Opportunity Engine Metrics
  opportunityMetrics?: OpportunityEngineMetricsSummary;
}

export interface ReactivationCampaignClientItem {
  clientId: string;
  clientName: string;
  contactName: string;
  whatsapp: string;
  city: string;
  lastCrop: string;
  daysInactive: number;
  reactivationScore: number;
  funnelStage: ReactivationFunnelStage;
  contactedAt?: string;
  whatsappOpenedAt?: string;
  customMessage?: string;
  isIgnored?: boolean;
  notes?: string;
  convertedQuoteId?: string;
  convertedOsId?: string;
  convertedAmount?: number;
}

export interface ReactivationCampaign {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  objective: string;
  targetCrop?: string;
  targetRegion?: string;
  templateId: string;
  templateTitle: string;
  baseMessage: string;
  clients: ReactivationCampaignClientItem[];
  createdAt: string;
  updatedAt: string;
  status: 'rascunho' | 'em_andamento' | 'concluida' | 'pausada';
  totalSelected: number;
  totalContacted: number;
  totalInterested: number;
  totalQuotes: number;
  totalReactivated: number;
  estimatedPotentialValue: number;
  recoveredValue: number;
}

export interface ReactivationContactLog {
  id: string;
  companyId: string;
  campaignId?: string;
  clientId: string;
  clientName: string;
  whatsapp: string;
  messageSent: string;
  stageBefore: ReactivationFunnelStage;
  stageAfter: ReactivationFunnelStage;
  timestamp: string;
  notes?: string;
}

// ==========================================
// MOUTRYX REATIVA 2.0: CRM COMERCIAL DRONES
// ==========================================

export type CommercialFunnelStage =
  | 'novo_lead'
  | 'primeiro_contato'
  | 'contato_realizado'
  | 'interesse'
  | 'levantamento_area'
  | 'orcamento'
  | 'negociacao'
  | 'fechado'
  | 'servico_agendado'
  | 'servico_concluido'
  | 'pos_venda'
  | 'perdido';

export type LostReason =
  | 'preco'
  | 'escolheu_concorrente'
  | 'nao_respondeu'
  | 'servico_nao_disponivel'
  | 'area_inadequada'
  | 'mudanca_planejamento'
  | 'sem_necessidade'
  | 'outro';

export type LeadSource =
  | 'indicacao'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'google'
  | 'evento'
  | 'feira'
  | 'visita_comercial'
  | 'produtor_conhecido'
  | 'parceiro'
  | 'outro';

export type OpportunityScoreTier =
  | 'maxima'
  | 'alta'
  | 'media'
  | 'baixa'
  | 'extremamente_quente'
  | 'alta_prioridade'
  | 'oportunidade'
  | 'baixa_prioridade'
  | 'frio';

export interface Prospect {
  id: string;
  companyId: string;
  producerName: string;
  farmName: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  region?: string;
  approximateAreaHa: number;
  crops: string[];
  interestedServices: string[];
  leadSource: LeadSource;
  referredBy?: string;
  notes?: string;
  responsibleName: string;
  status: 'ativo' | 'convertido' | 'descartado';
  stage: CommercialFunnelStage;
  opportunityScore: number;
  estimatedPotentialValue: number;
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string;
  nextFollowUpDate?: string;
  nextFollowUpReason?: string;
  lostReason?: LostReason;
  lostReasonDetails?: string;
}

export interface CommercialOpportunity {
  id: string;
  companyId: string;
  entityType: 'cliente' | 'prospecto';
  clientId?: string;
  prospectId?: string;
  title: string;
  producerName: string;
  farmName: string;
  phone: string;
  whatsapp: string;
  city: string;
  state?: string;
  crop: string;
  serviceType: string;
  areaHa: number;
  estimatedPotentialValue: number;
  stage: CommercialFunnelStage;
  opportunityScore: number;
  nextBestAction: string;
  nextBestActionReason: string;
  responsibleName?: string;
  nextFollowUpDate?: string;
  nextFollowUpReason?: string;
  isAtRisk: boolean;
  riskReason?: string;
  createdAt: string;
  updatedAt: string;
  lostReason?: LostReason;
  lostReasonDetails?: string;
}

export interface FollowUpItem {
  id: string;
  companyId: string;
  opportunityId?: string;
  clientId?: string;
  prospectId?: string;
  producerName: string;
  farmName: string;
  whatsapp: string;
  scheduledDate: string; // YYYY-MM-DD
  reason: string;
  priority: 'alta' | 'media' | 'baixa';
  status: 'pendente' | 'realizado' | 'cancelado';
  notes?: string;
  completedAt?: string;
}

export interface ReferralItem {
  id: string;
  companyId: string;
  referrerClientId?: string;
  referrerName: string;
  referredProspectName: string;
  referredFarmName: string;
  referredPhone: string;
  date: string;
  status: 'novo_lead' | 'em_contato' | 'convertido' | 'perdido';
  rewardNotes?: string;
}

export interface PostSaleRecord {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  farmName: string;
  serviceId?: string;
  serviceDate: string;
  crop: string;
  serviceType: string;
  areaSprayedHa: number;
  satisfactionRating?: number; // 1-5
  feedbackNotes?: string;
  nextNeedIdentified?: string;
  nextContactScheduled?: string;
  createdNewOpportunityId?: string;
}

export interface HarvestCalendarWindow {
  id: string;
  crop: string;
  region: string;
  phase: string;
  startDate: string; // MM-DD or description
  endDate: string;
  serviceRecommended: string;
  description: string;
}

export interface CommercialActionToday {
  id: string;
  title: string;
  category: 'prioritario' | 'followup_orcamento' | 'reativacao' | 'lead_sem_contato' | 'negociacao_risco' | 'safra_expansao';
  entityId: string;
  entityType: 'cliente' | 'prospecto' | 'oportunidade';
  producerName: string;
  farmName: string;
  phone: string;
  whatsapp: string;
  reason: string;
  potentialValue: number;
  nextBestAction: string;
  priorityScore: number;
  daysInactiveOrPending?: number;
  isAtRisk?: boolean;
  crop?: string;
  city?: string;
}


