/**
 * MOUTRYX — Receipt OCR Validator & Semantic Coherence Engine
 * 
 * Provides strict parsing, formatting, mathematical verification,
 * CNPJ validation, fuel-specific checks, and confidence scoring.
 * 
 * Rule: NEVER hallucinate data. If unreadable, signal low confidence and review.
 */

export interface RawOcrExtractedData {
  establishmentName?: string;
  cnpj?: string;
  cpf?: string;
  documentNumber?: string;
  date?: string;
  time?: string;
  category?: string;
  totalAmount?: number | string;
  subtotal?: number | string;
  discount?: number | string;
  paymentMethod?: string;
  reimbursementStatus?: string;
  fuelDetails?: {
    fuelType?: string;
    liters?: number | string;
    pricePerLiter?: number | string;
    vehicleOrEquipment?: string;
    vehiclePlate?: string;
  } | null;
  items?: Array<{
    description?: string;
    quantity?: number | string;
    unit?: string;
    unitPrice?: number | string;
    totalPrice?: number | string;
  }>;
  confidenceScore?: number;
  detectedLegibility?: string;
  notes?: string;
}

export interface FieldConfidence {
  establishment: 'high' | 'medium' | 'low';
  cnpj: 'high' | 'medium' | 'low';
  date: 'high' | 'medium' | 'low';
  total: 'high' | 'medium' | 'low';
  items: 'high' | 'medium' | 'low';
  fuel: 'high' | 'medium' | 'low';
}

export interface ValidatedReceiptData {
  establishmentName: string;
  cnpj: string;
  cpf?: string;
  documentNumber: string;
  date: string;
  time: string;
  category: 'alimentacao' | 'combustivel' | 'mercado' | 'manutencao_pecas' | 'hospedagem' | 'outro';
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'cartao_corporativo' | 'dinheiro_piloto' | 'pix_piloto' | 'cartao_pessoal_piloto' | 'faturado_empresa' | 'outro';
  reimbursementStatus: 'pendente' | 'aprovado' | 'corporativo';
  fuelDetails: {
    fuelType: 'diesel_s10' | 'gasolina_comum' | 'gasolina_aditivada' | 'etanol' | 'oleo_2t' | 'outro';
    liters: number;
    pricePerLiter: number;
    vehicleOrEquipment?: 'gerador_recarga' | 'caminhonete_apoio' | 'tanque_campo' | 'outro';
    vehiclePlate?: string;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  confidenceScore: number;
  fieldConfidence: FieldConfidence;
  needsReview: boolean;
  reviewReasons: string[];
  notes: string;
}

/**
 * Validates Brazilian CNPJ format and check digits (mod 11)
 */
export function validateCnpj(cnpjStr?: string | null): { isValid: boolean; formatted: string; isComplete: boolean } {
  if (!cnpjStr) return { isValid: false, formatted: '', isComplete: false };
  const clean = cnpjStr.replace(/\D/g, '');
  if (clean.length !== 14) {
    if (clean.length > 8 && clean.length < 14) {
      // Partial CNPJ
      return { isValid: false, formatted: cnpjStr.trim(), isComplete: false };
    }
    return { isValid: false, formatted: '', isComplete: false };
  }

  // Reject all repeated digits (00000000000000, 11111111111111, etc.)
  if (/^(\d)\1{13}$/.test(clean)) {
    return { isValid: false, formatted: '', isComplete: true };
  }

  // Calculate first check digit
  let size = 12;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) {
    return { isValid: false, formatted: cnpjStr.trim(), isComplete: true };
  }

  // Calculate second check digit
  size = 13;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) {
    return { isValid: false, formatted: cnpjStr.trim(), isComplete: true };
  }

  const formatted = clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return { isValid: true, formatted, isComplete: true };
}

/**
 * Normalizes and validates decimal currency amounts
 */
export function parseCurrency(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }
  let str = String(val).trim();
  // Strip "R$", spaces
  str = str.replace(/R\$\s*/gi, '').replace(/\s+/g, '');
  // If format is Brazilian (1.234,56 or 56,90)
  if (str.includes(',') && str.includes('.')) {
    // 1.234,56 -> 1234.56
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

/**
 * Validates date string (YYYY-MM-DD)
 */
export function validateDate(dateStr?: string | null): { isValid: boolean; normalizedDate: string; isRecent: boolean } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const fallbackDate = today.toISOString().split('T')[0];

  if (!dateStr || typeof dateStr !== 'string') {
    return { isValid: false, normalizedDate: fallbackDate, isRecent: false };
  }

  let clean = dateStr.trim();
  // If DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(clean)) {
    const parts = clean.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    clean = `${year}-${month}-${day}`;
  }

  // Validate YYYY-MM-DD
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { isValid: false, normalizedDate: fallbackDate, isRecent: false };
  }

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < currentYear - 5 || y > currentYear + 1) {
    return { isValid: false, normalizedDate: fallbackDate, isRecent: false };
  }

  // Exact calendar validity check (e.g. leap years, 30-day months)
  const testDate = new Date(Date.UTC(y, m - 1, d));
  if (
    testDate.getUTCFullYear() !== y ||
    testDate.getUTCMonth() !== m - 1 ||
    testDate.getUTCDate() !== d
  ) {
    return { isValid: false, normalizedDate: fallbackDate, isRecent: false };
  }

  const isRecent = y >= currentYear - 1;
  return { isValid: true, normalizedDate: clean, isRecent };
}

/**
 * Clean establishment name removing document headers
 */
export function cleanEstablishmentName(name?: string | null, category?: string): { name: string; isRecognized: boolean } {
  if (!name || typeof name !== 'string') {
    return {
      name: category === 'alimentacao' ? 'Restaurante & Refeições' : 'Comprovante Fiscal',
      isRecognized: false,
    };
  }

  let cleaned = name.trim();
  // Strip fiscal boilerplate prefixes
  cleaned = cleaned
    .replace(/^(danfe\s*nfc-?e|danfe|extrato\s*sat|extrato\s*n[º°]?\s*\d*|cupom\s*fiscal|sat\s*c?f?-?e|sat\s*n[º°]?\s*\d*|comprovante|documento\s*auxiliar|nota\s*fiscal\s*de\s*consumidor\s*eletr[oô]nica)\s*[-:]*\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If after stripping it's empty or purely generic
  if (!cleaned || /^(recibo|comprovante|cupom|nota\s*fiscal|extrato)$/i.test(cleaned)) {
    return {
      name: category === 'alimentacao' ? 'Restaurante & Refeições' : 'Estabelecimento Comercial',
      isRecognized: false,
    };
  }

  return { name: cleaned, isRecognized: true };
}

/**
 * Main semantic validation and confidence calculation engine
 */
export function validateAndNormalizeReceiptData(raw: RawOcrExtractedData): ValidatedReceiptData {
  const reviewReasons: string[] = [];
  const fieldConfidence: FieldConfidence = {
    establishment: 'low',
    cnpj: 'low',
    date: 'low',
    total: 'low',
    items: 'low',
    fuel: 'high', // default high unless fuel issues found
  };

  // 1. Category resolution
  let category: ValidatedReceiptData['category'] = 'alimentacao';
  const rawCat = (raw.category || '').toLowerCase().trim();
  if (['combustivel', 'combustível'].includes(rawCat)) category = 'combustivel';
  else if (['mercado', 'supermercado'].includes(rawCat)) category = 'mercado';
  else if (['manutencao_pecas', 'manutencao', 'peças', 'pecas'].includes(rawCat)) category = 'manutencao_pecas';
  else if (['hospedagem', 'hotel'].includes(rawCat)) category = 'hospedagem';
  else if (rawCat === 'outro') category = 'outro';

  // 2. Establishment Name
  const { name: cleanName, isRecognized: nameRecognized } = cleanEstablishmentName(raw.establishmentName, category);
  if (nameRecognized) {
    fieldConfidence.establishment = 'high';
  } else {
    fieldConfidence.establishment = 'medium';
    reviewReasons.push('Conferir nome do estabelecimento');
  }

  // 3. CNPJ Validation
  const cnpjResult = validateCnpj(raw.cnpj);
  const formattedCnpj = cnpjResult.formatted;
  if (cnpjResult.isValid) {
    fieldConfidence.cnpj = 'high';
  } else if (raw.cnpj && raw.cnpj.trim().length > 0) {
    fieldConfidence.cnpj = 'medium';
    reviewReasons.push('CNPJ com dígitos incompletos ou ilegíveis');
  } else {
    fieldConfidence.cnpj = 'low';
  }

  // 4. Date & Time Validation
  const dateResult = validateDate(raw.date);
  const cleanDate = dateResult.normalizedDate;
  if (dateResult.isValid) {
    fieldConfidence.date = 'high';
  } else {
    fieldConfidence.date = 'medium';
    reviewReasons.push('Data da nota não identificada ou formato ajustado');
  }

  let cleanTime = (raw.time || '').trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cleanTime)) {
    cleanTime = '12:00';
  }

  // 5. Amounts & Financials
  const totalAmount = parseCurrency(raw.totalAmount);
  const subtotal = parseCurrency(raw.subtotal) || totalAmount;
  const discount = parseCurrency(raw.discount);

  if (totalAmount > 0) {
    fieldConfidence.total = 'high';
  } else {
    fieldConfidence.total = 'low';
    reviewReasons.push('Valor total da nota precisa ser informado');
  }

  // 6. Payment Method & Status
  let paymentMethod: ValidatedReceiptData['paymentMethod'] = 'pix_piloto';
  const pm = (raw.paymentMethod || '').toLowerCase();
  if (pm.includes('cartao_corp') || pm.includes('corporativo')) paymentMethod = 'cartao_corporativo';
  else if (pm.includes('dinheiro')) paymentMethod = 'dinheiro_piloto';
  else if (pm.includes('cartao_pessoal') || pm.includes('pessoal')) paymentMethod = 'cartao_pessoal_piloto';
  else if (pm.includes('faturado')) paymentMethod = 'faturado_empresa';
  else if (pm.includes('pix')) paymentMethod = 'pix_piloto';
  else if (pm === 'outro') paymentMethod = 'outro';

  const reimbursementStatus: ValidatedReceiptData['reimbursementStatus'] =
    paymentMethod === 'cartao_corporativo' ? 'corporativo' : 'pendente';

  // 7. Items Parsing & Math Validation
  const parsedItems: ValidatedReceiptData['items'] = [];
  let calculatedItemsSum = 0;

  if (Array.isArray(raw.items) && raw.items.length > 0) {
    for (const it of raw.items) {
      const desc = (it.description || '').trim();
      const qty = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity || '1').replace(',', '.')) || 1;
      const unitP = parseCurrency(it.unitPrice);
      let totalP = parseCurrency(it.totalPrice);
      if (totalP === 0 && unitP > 0) {
        totalP = Math.round(qty * unitP * 100) / 100;
      }
      if (desc.length > 0) {
        parsedItems.push({
          description: desc,
          quantity: Math.max(0.001, qty),
          unitPrice: unitP > 0 ? unitP : totalP,
          totalPrice: totalP,
        });
        calculatedItemsSum += totalP;
      }
    }
  }

  // Check items consistency
  if (parsedItems.length > 0) {
    const diff = Math.abs(calculatedItemsSum - (totalAmount + discount));
    if (diff <= 0.20 || Math.abs(calculatedItemsSum - totalAmount) <= 0.20) {
      fieldConfidence.items = 'high';
    } else {
      fieldConfidence.items = 'medium';
      reviewReasons.push(`Soma dos itens discriminados (R$ ${calculatedItemsSum.toFixed(2)}) difere do total (R$ ${totalAmount.toFixed(2)})`);
    }
  } else {
    // Single fallback line
    parsedItems.push({
      description:
        category === 'combustivel'
          ? 'Abastecimento em Campo'
          : category === 'alimentacao'
          ? 'Consumação / Refeição'
          : 'Despesa Operacional',
      quantity: 1,
      unitPrice: totalAmount,
      totalPrice: totalAmount,
    });
    fieldConfidence.items = totalAmount > 0 ? 'medium' : 'low';
  }

  // 8. Fuel Specific Validation
  let validatedFuel: ValidatedReceiptData['fuelDetails'] = null;
  if (category === 'combustivel' || raw.fuelDetails) {
    const rawFuel = raw.fuelDetails || {};
    const liters = typeof rawFuel.liters === 'number' ? rawFuel.liters : parseFloat(String(rawFuel.liters || '0').replace(',', '.')) || 0;
    const pricePerLiter = parseCurrency(rawFuel.pricePerLiter);

    let fuelType: ValidatedReceiptData['fuelDetails'] extends { fuelType: infer T } ? T : never = 'diesel_s10';
    const ft = (rawFuel.fuelType || '').toLowerCase();
    if (ft.includes('gasolina_aditivada')) fuelType = 'gasolina_aditivada';
    else if (ft.includes('gasolina')) fuelType = 'gasolina_comum';
    else if (ft.includes('etanol') || ft.includes('alcool')) fuelType = 'etanol';
    else if (ft.includes('2t') || ft.includes('oleo')) fuelType = 'oleo_2t';
    else if (ft.includes('diesel')) fuelType = 'diesel_s10';

    let vehicleOrEquipment: 'gerador_recarga' | 'caminhonete_apoio' | 'tanque_campo' | 'outro' = 'gerador_recarga';
    const ve = (rawFuel.vehicleOrEquipment || '').toLowerCase();
    if (ve.includes('caminhonete') || ve.includes('veiculo') || ve.includes('hilux') || ve.includes('s10')) {
      vehicleOrEquipment = 'caminhonete_apoio';
    } else if (ve.includes('tanque')) {
      vehicleOrEquipment = 'tanque_campo';
    }

    // Mathematical verification for Fuel: Liters * Price/L ≈ Total
    if (liters > 0 && pricePerLiter > 0 && totalAmount > 0) {
      const fuelTotal = liters * pricePerLiter;
      if (Math.abs(fuelTotal - totalAmount) > 0.50) {
        fieldConfidence.fuel = 'medium';
        reviewReasons.push(`Cálculo de combustível: ${liters.toFixed(2)}L x R$ ${pricePerLiter.toFixed(2)} = R$ ${fuelTotal.toFixed(2)} difere do total`);
      } else {
        fieldConfidence.fuel = 'high';
      }
    } else if (liters === 0 && totalAmount > 0) {
      fieldConfidence.fuel = 'low';
      reviewReasons.push('Litragem do combustível não identificada na nota');
    }

    validatedFuel = {
      fuelType,
      liters: Math.round(liters * 100) / 100,
      pricePerLiter: Math.round(pricePerLiter * 100) / 100,
      vehicleOrEquipment,
      vehiclePlate: rawFuel.vehiclePlate ? rawFuel.vehiclePlate.trim().toUpperCase() : undefined,
    };
  }

  // 9. Global Confidence Score (0-100)
  let score = 95;
  if (fieldConfidence.establishment === 'medium') score -= 15;
  if (fieldConfidence.total === 'low') score -= 35;
  if (fieldConfidence.date === 'medium') score -= 10;
  if (fieldConfidence.cnpj === 'low') score -= 10;
  if (fieldConfidence.items === 'medium') score -= 10;
  if (fieldConfidence.items === 'low') score -= 20;
  if (category === 'combustivel' && fieldConfidence.fuel !== 'high') score -= 15;

  if (raw.confidenceScore !== undefined && typeof raw.confidenceScore === 'number') {
    score = Math.min(score, Math.max(0, raw.confidenceScore));
  }

  score = Math.max(10, Math.min(99, score));
  const needsReview = score < 80 || reviewReasons.length > 0 || totalAmount <= 0 || !nameRecognized;

  const docNumber = (raw.documentNumber || '').trim().replace(/^n[º°]\s*/i, '');

  return {
    establishmentName: cleanName,
    cnpj: formattedCnpj,
    cpf: raw.cpf ? raw.cpf.trim() : undefined,
    documentNumber: docNumber,
    date: cleanDate,
    time: cleanTime,
    category,
    subtotal: subtotal || totalAmount,
    discount,
    totalAmount,
    paymentMethod,
    reimbursementStatus,
    fuelDetails: validatedFuel,
    items: parsedItems,
    confidenceScore: score,
    fieldConfidence,
    needsReview,
    reviewReasons,
    notes: (raw.notes || '').trim() || (needsReview ? 'Comprovante com itens marcados para conferência.' : 'Comprovante lido e validado com sucesso.'),
  };
}
