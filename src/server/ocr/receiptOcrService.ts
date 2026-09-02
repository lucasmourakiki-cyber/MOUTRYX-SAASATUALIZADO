/**
 * MOUTRYX — Dedicated Receipt OCR Vision Service
 * 
 * High-speed, high-accuracy, reliable receipt extraction with:
 * - Image normalization & pre-flight deduplication
 * - Brazilian Fiscal Receipt tailored prompt (NFC-e, SAT, CF-e, Cupom Fiscal, Posto, Maquininha)
 * - Strict JSON schema enforcement
 * - In-flight concurrency lock & Short-lived tenant cache
 * - Controlled retry with exponential backoff (max 1 retry)
 * - Controlled 18s timeout
 * - Zero hallucination on unreadable / missing fields
 */

import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  RawOcrExtractedData,
  ValidatedReceiptData,
  validateAndNormalizeReceiptData,
} from './receiptValidator';

export interface ScanReceiptRequestOptions {
  imageBase64: string;
  mimeType?: string;
  companyId: string;
  pilotHint?: string;
  notesHint?: string;
  establishmentHint?: string;
}

export interface ScanReceiptResult {
  success: boolean;
  source: 'gemini_vision_ocr' | 'receipt_cache' | 'unreadable_fallback';
  data: ValidatedReceiptData;
  metrics: {
    totalDurationMs: number;
    modelDurationMs?: number;
    cached: boolean;
    imageSizeKb: number;
  };
}

// In-memory tenant-isolated deduplication cache (60 seconds TTL)
interface CachedOcrEntry {
  data: ValidatedReceiptData;
  timestamp: number;
}
const ocrCache = new Map<string, CachedOcrEntry>();
const inFlightRequests = new Map<string, Promise<ScanReceiptResult>>();

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of ocrCache.entries()) {
    if (now - entry.timestamp > 60000) {
      ocrCache.delete(key);
    }
  }
}

/**
 * Strips data URI prefixes and normalizes base64 string
 */
export function sanitizeBase64(input: string, fallbackMime = 'image/jpeg'): { cleanBase64: string; mimeType: string } {
  let clean = input.trim();
  let mimeType = fallbackMime;

  if (clean.includes(';base64,')) {
    const parts = clean.split(';base64,');
    mimeType = parts[0].replace('data:', '').trim() || fallbackMime;
    clean = parts[1].trim();
  }

  // Normalize MIME
  mimeType = mimeType.toLowerCase();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
    mimeType = 'image/jpeg';
  }

  // Strip white spaces
  clean = clean.replace(/\s+/g, '');

  return { cleanBase64: clean, mimeType };
}

/**
 * Computes deterministic hash of image for tenant-isolated deduplication
 */
export function computeImageHash(companyId: string, cleanBase64: string): string {
  const hash = crypto.createHash('sha256').update(`${companyId}:${cleanBase64.substring(0, 5000)}:${cleanBase64.length}`).digest('hex');
  return `${companyId}:${hash}`;
}

/**
 * Builds the specialized prompt for Brazilian fiscal receipt extraction
 */
function buildReceiptOcrPrompt(currentYear: number): string {
  return `VOCÊ É O MOTOR DE OCR E AUDITORIA FISCAL DA PLATAFORMA MOUTRYX (DRONE IA).
SUA TAREFA É REALIZAR A TRANSCRIÇÃO ESTRUTURADA EXATA DO COMPROVANTE FISCAL / RECIBO / CUPOM NA IMAGEM.

DIRETRIZES FUNDAMENTAIS:
1. LEIA COM RIGOR FISCAL: Extraia exatamente o que estiver impresso na imagem. NUNCA invente ou presuma informações ausentes.
2. TOLERÂNCIA A FOTOS REAIS: A imagem pode estar inclinada, com sombras, em papel térmico com letras miúdas ou dobrada. Decodifique os caracteres visíveis com máxima fidelidade.
3. SE UM CAMPO NÃO FOR LEGÍVEL OU NÃO EXISTIR: retorne string vazia "" ou 0 para números. NUNCA gere dados fictícios.

CAMPOS A EXTRAIR:
- establishmentName: Razão social ou nome fantasia real do estabelecimento (restaurante, posto, mercado, oficina, etc.). Remova cabeçalhos de sistema como "DANFE NFC-e", "EXTRATO SAT", "CUPOM FISCAL", "CF-e".
- cnpj: CNPJ no formato "XX.XXX.XXX/XXXX-XX" ou os 14 dígitos.
- documentNumber: Número do cupom, extrato SAT, NFC-e ou COO.
- date: Data da emissão no formato "YYYY-MM-DD" (se o ano estiver omitido, use ${currentYear}).
- time: Hora no formato "HH:MM".
- category: "alimentacao" (refeições, restaurantes, lanches), "combustivel" (diesel, gasolina, etanol em postos), "mercado" (supermercados, água, gelo), "manutencao_pecas" (oficinas, peças, mangueiras, bicos), "hospedagem" (hotéis, pousadas) ou "outro".
- totalAmount: Valor TOTAL final pago em reais (número decimal, ex: 154.80).
- subtotal: Subtotal bruto se discriminado.
- discount: Valor de desconto se houver.
- paymentMethod: "pix_piloto", "dinheiro_piloto", "cartao_pessoal_piloto", "cartao_corporativo", "faturado_empresa" ou "outro".
- fuelDetails: Se for COMBUSTÍVEL, extraia:
    * liters: quantidade de litros abastecidos (número decimal, ex: 55.40).
    * pricePerLiter: preço unitário por litro (ex: 6.09).
    * fuelType: "diesel_s10", "gasolina_comum", "gasolina_aditivada", "etanol", "oleo_2t" ou "outro".
    * vehicleOrEquipment: "gerador_recarga" (se indicado para gerador/baterias) ou "caminhonete_apoio".
    * vehiclePlate: placa do veículo se impressa no cupom (ex: "BRA2E19").
  Se NÃO for combustível, preencha fuelDetails com null.
- items: Lista de itens discriminados:
    * description: descrição do produto/serviço
    * quantity: quantidade numérica
    * unitPrice: preço unitário
    * totalPrice: valor total daquele item
- detectedLegibility: "clear", "skewed", "dark", "wrinkled", "partial" ou "illegible".
- notes: Breve observação ou transcrição fiel resumida.

Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{
  "establishmentName": "Auto Posto Alvorada",
  "cnpj": "12.345.678/0001-90",
  "documentNumber": "049182",
  "date": "2026-05-14",
  "time": "14:22",
  "category": "combustivel",
  "subtotal": 304.50,
  "discount": 0.00,
  "totalAmount": 304.50,
  "paymentMethod": "pix_piloto",
  "fuelDetails": {
    "fuelType": "diesel_s10",
    "liters": 50.00,
    "pricePerLiter": 6.09,
    "vehicleOrEquipment": "gerador_recarga",
    "vehiclePlate": "QRE4A12"
  },
  "items": [
    {
      "description": "OLEO DIESEL S10 B S500",
      "quantity": 50.00,
      "unitPrice": 6.09,
      "totalPrice": 304.50
    }
  ],
  "confidenceScore": 98,
  "detectedLegibility": "clear",
  "notes": "Abastecimento de Diesel S-10 registrado com sucesso."
}`;
}

/**
 * Main OCR execution function with speed, precision, and resilience
 */
export async function processReceiptOcrWithGemini(
  ai: GoogleGenAI | null,
  options: ScanReceiptRequestOptions
): Promise<ScanReceiptResult> {
  const startTime = Date.now();
  cleanExpiredCache();

  const { imageBase64, mimeType = 'image/jpeg', companyId } = options;

  // 1. Validation of payload
  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 30) {
    const fallback = validateAndNormalizeReceiptData({
      notes: 'Imagem não fornecida ou payload vazio.',
      confidenceScore: 10,
    });
    return {
      success: false,
      source: 'unreadable_fallback',
      data: fallback,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        cached: false,
        imageSizeKb: 0,
      },
    };
  }

  // 2. Base64 Sanitization & Hash Calculation
  const { cleanBase64, mimeType: cleanMime } = sanitizeBase64(imageBase64, mimeType);
  const imageSizeKb = Math.round((cleanBase64.length * 0.75) / 1024);
  const cacheKey = computeImageHash(companyId, cleanBase64);

  // 3. Check Deduplication Cache
  const cached = ocrCache.get(cacheKey);
  if (cached) {
    return {
      success: true,
      source: 'receipt_cache',
      data: cached.data,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        cached: true,
        imageSizeKb,
      },
    };
  }

  // 4. In-Flight Request Deduplication
  const activeInFlight = inFlightRequests.get(cacheKey);
  if (activeInFlight) {
    return activeInFlight;
  }

  const executionPromise = (async (): Promise<ScanReceiptResult> => {
    let modelDurationMs = 0;
    const currentYear = new Date().getFullYear();

    if (!ai) {
      // Return unreadable fallback without hallucinating
      const fallback = validateAndNormalizeReceiptData({
        notes: 'Serviço de IA não configurado ou indisponível.',
        confidenceScore: 20,
      });
      return {
        success: false,
        source: 'unreadable_fallback',
        data: fallback,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          cached: false,
          imageSizeKb,
        },
      };
    }

    const prompt = buildReceiptOcrPrompt(currentYear);
    const contents = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: cleanMime,
        },
      },
      {
        text: prompt,
      },
    ];

    // Priority model: gemini-3.7-flash with fallback to gemini-3.1-flash-lite
    const models = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let rawText: string | null = null;
    const modelStart = Date.now();

    for (const model of models) {
      try {
        // Controlled 18s timeout per attempt
        const callPromise = ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT_OCR_18S')), 18000);
        });

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        rawText = response?.text || null;

        if (rawText && rawText.trim().length > 0) {
          modelDurationMs = Date.now() - modelStart;
          break;
        }
      } catch (err: any) {
        const isTransient =
          err?.status === 429 ||
          err?.status === 503 ||
          err?.status === 500 ||
          (err?.message && (err.message.includes('fetch') || err.message.includes('network')));

        if (isTransient) {
          // Controlled 1-time retry with 800ms backoff
          try {
            await new Promise((r) => setTimeout(r, 800));
            const retryResp: any = await ai.models.generateContent({
              model,
              contents,
              config: { responseMimeType: 'application/json' },
            });
            rawText = retryResp?.text || null;
            if (rawText && rawText.trim().length > 0) {
              modelDurationMs = Date.now() - modelStart;
              break;
            }
          } catch {
            // Proceed to next model in cascade
          }
        }
      }
    }

    // Parse JSON
    let parsedJson: RawOcrExtractedData | null = null;
    if (rawText) {
      try {
        const cleaned = rawText.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsedJson = JSON.parse(cleaned);
      } catch (jsonErr) {
        console.warn('[MOUTRYX OCR] JSON parse error from model response:', jsonErr);
      }
    }

    let validatedData: ValidatedReceiptData;
    if (parsedJson) {
      validatedData = validateAndNormalizeReceiptData(parsedJson);
    } else {
      // Zero Hallucination: if image is completely unreadable
      validatedData = validateAndNormalizeReceiptData({
        notes: 'Comprovante ilegível ou não foi possível decodificar o texto.',
        confidenceScore: 20,
      });
    }

    // Save to short-lived tenant cache
    ocrCache.set(cacheKey, {
      data: validatedData,
      timestamp: Date.now(),
    });

    return {
      success: true,
      source: 'gemini_vision_ocr',
      data: validatedData,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        modelDurationMs,
        cached: false,
        imageSizeKb,
      },
    };
  })();

  inFlightRequests.set(cacheKey, executionPromise);
  try {
    const result = await executionPromise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
