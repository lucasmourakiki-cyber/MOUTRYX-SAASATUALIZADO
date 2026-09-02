/**
 * MOUTRYX DRONES - Centralized Dynamic Temporal Engine
 * Handles dynamic dates, periods, relative timeframes, Brazilian timezone calculations,
 * and temporal query parsing for DRONE IA and the entire platform.
 */

export interface BrazilDateParts {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  isoDate: string; // YYYY-MM-DD
  isoMonth: string; // YYYY-MM
}

export interface TemporalContext {
  now: Date;
  currentYear: number;
  currentMonth: number; // 1 - 12
  currentMonthStr: string; // "YYYY-MM"
  currentMonthName: string; // e.g. "Agosto"
  currentPeriodLabel: string; // e.g. "Agosto/2026"
  currentPeriodLongLabel: string; // e.g. "Agosto de 2026"
  
  previousMonth: number; // 1 - 12
  previousMonthYear: number; // e.g. 2026 (or 2026 if current is Jan 2027)
  previousMonthStr: string; // "YYYY-MM"
  previousMonthName: string; // e.g. "Julho"
  previousPeriodLabel: string; // e.g. "Julho/2026"
  previousPeriodLongLabel: string; // e.g. "Julho de 2026"

  todayStr: string; // "YYYY-MM-DD"
  yesterdayStr: string; // "YYYY-MM-DD"
  
  thisWeekStart: string; // Monday of current week
  thisWeekEnd: string; // Sunday of current week
  
  lastWeekStart: string;
  lastWeekEnd: string;
  
  last7DaysStart: string;
  last30DaysStart: string;
  last90DaysStart: string;
  
  thisYearStart: string; // "YYYY-01-01"
  thisYearEnd: string; // "YYYY-12-31"
  
  lastYear: number;
  lastYearStart: string; // "YYYY-01-01"
  lastYearEnd: string; // "YYYY-12-31"
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function getMonthName(monthIndexOrNum: number): string {
  // Accepts 1-12 or 0-11
  const idx = monthIndexOrNum > 0 && monthIndexOrNum <= 12 ? monthIndexOrNum - 1 : monthIndexOrNum;
  return MONTH_NAMES[idx] || 'Mês';
}

/**
 * Returns year, month (1-12), day (1-31) in Brazil timezone (America/Sao_Paulo)
 * or local time if Intl is constrained.
 */
export function getBrazilDateParts(refDate?: Date | string): BrazilDateParts {
  const d = refDate instanceof Date ? refDate : refDate ? new Date(refDate) : new Date();
  
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return getBrazilDateParts(fallback);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = formatter.format(d); // Outputs YYYY-MM-DD
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    return {
      year,
      month,
      day,
      isoDate: `${parts[0]}-${parts[1]}-${parts[2]}`,
      isoMonth: `${parts[0]}-${parts[1]}`,
    };
  } catch {
    // Fallback using local getters
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      year,
      month,
      day,
      isoDate: `${year}-${pad(month)}-${pad(day)}`,
      isoMonth: `${year}-${pad(month)}`,
    };
  }
}

/**
 * Helper to add/subtract days from a YYYY-MM-DD string safely
 */
export function shiftDateString(isoDate: string, daysOffset: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + daysOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * Builds the complete dynamic temporal context for any reference date.
 */
export function getTemporalContext(refDate?: Date | string): TemporalContext {
  const now = refDate instanceof Date ? refDate : refDate ? new Date(refDate) : new Date();
  const parts = getBrazilDateParts(now);

  const currentYear = parts.year;
  const currentMonth = parts.month;
  const pad = (n: number) => String(n).padStart(2, '0');
  const currentMonthStr = `${currentYear}-${pad(currentMonth)}`;
  const currentMonthName = getMonthName(currentMonth);
  const currentPeriodLabel = `${currentMonthName}/${currentYear}`;
  const currentPeriodLongLabel = `${currentMonthName} de ${currentYear}`;

  // Previous month calculation (handling Jan -> Dec previous year)
  let previousMonth = currentMonth - 1;
  let previousMonthYear = currentYear;
  if (previousMonth < 1) {
    previousMonth = 12;
    previousMonthYear = currentYear - 1;
  }
  const previousMonthStr = `${previousMonthYear}-${pad(previousMonth)}`;
  const previousMonthName = getMonthName(previousMonth);
  const previousPeriodLabel = `${previousMonthName}/${previousMonthYear}`;
  const previousPeriodLongLabel = `${previousMonthName} de ${previousMonthYear}`;

  const todayStr = parts.isoDate;
  const yesterdayStr = shiftDateString(todayStr, -1);

  // Week calculation (Monday - Sunday)
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayOfWeek = dt.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekStart = shiftDateString(todayStr, mondayOffset);
  const thisWeekEnd = shiftDateString(thisWeekStart, 6);

  const lastWeekStart = shiftDateString(thisWeekStart, -7);
  const lastWeekEnd = shiftDateString(thisWeekStart, -1);

  const last7DaysStart = shiftDateString(todayStr, -7);
  const last30DaysStart = shiftDateString(todayStr, -30);
  const last90DaysStart = shiftDateString(todayStr, -90);

  const thisYearStart = `${currentYear}-01-01`;
  const thisYearEnd = `${currentYear}-12-31`;

  const lastYear = currentYear - 1;
  const lastYearStart = `${lastYear}-01-01`;
  const lastYearEnd = `${lastYear}-12-31`;

  return {
    now,
    currentYear,
    currentMonth,
    currentMonthStr,
    currentMonthName,
    currentPeriodLabel,
    currentPeriodLongLabel,
    previousMonth,
    previousMonthYear,
    previousMonthStr,
    previousMonthName,
    previousPeriodLabel,
    previousPeriodLongLabel,
    todayStr,
    yesterdayStr,
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
    last7DaysStart,
    last30DaysStart,
    last90DaysStart,
    thisYearStart,
    thisYearEnd,
    lastYear,
    lastYearStart,
    lastYearEnd,
  };
}

/**
 * Safely extracts and validates a temporal reference from request payload or context.
 * Prioritizes:
 * 1. Contextual temporal data (context.temporalInfo, context.referenceDate)
 * 2. Root temporal data (body.temporalInfo, body.referenceDate)
 * 3. Fallback to undefined (which allows getTemporalContext to use system clock)
 *
 * Enforces strict validation:
 * - Must be a valid date or YYYY-MM-DD string
 * - Year must be within realistic bounds (2000 - 2100)
 * - Immune to malformed inputs or injections
 */
export function extractValidReferenceDate(reqBodyOrContext?: any): Date | undefined {
  if (!reqBodyOrContext || typeof reqBodyOrContext !== 'object') {
    return undefined;
  }

  const candidates = [
    reqBodyOrContext.context?.temporalInfo?.currentDate,
    reqBodyOrContext.context?.temporalInfo?.today,
    reqBodyOrContext.context?.temporalInfo?.isoDate,
    typeof reqBodyOrContext.context?.temporalInfo === 'string' ? reqBodyOrContext.context?.temporalInfo : undefined,
    reqBodyOrContext.context?.referenceDate,
    reqBodyOrContext.context?.refDate,
    reqBodyOrContext.temporalInfo?.currentDate,
    reqBodyOrContext.temporalInfo?.today,
    reqBodyOrContext.temporalInfo?.isoDate,
    typeof reqBodyOrContext.temporalInfo === 'string' ? reqBodyOrContext.temporalInfo : undefined,
    reqBodyOrContext.referenceDate,
    reqBodyOrContext.refDate,
    reqBodyOrContext.currentDate,
    reqBodyOrContext.today,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (candidate instanceof Date && !isNaN(candidate.getTime())) {
      const year = candidate.getFullYear();
      if (year >= 2000 && year <= 2100) {
        return candidate;
      }
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          // Construct UTC date for midday to prevent any timezone date boundary roll
          const parsed = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          // Strict calendar check: ensure the date actually exists in the calendar (e.g. rejects 2026-02-31, 2026-02-29 on non-leap years)
          if (
            !isNaN(parsed.getTime()) &&
            parsed.getUTCFullYear() === y &&
            parsed.getUTCMonth() + 1 === m &&
            parsed.getUTCDate() === d
          ) {
            return parsed;
          }
        }
        // If string had YYYY-MM-DD pattern but failed calendar validation, do not fallback to permissive new Date()
        continue;
      }

      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getUTCFullYear();
        if (year >= 2000 && year <= 2100) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolves the full dynamic TemporalContext, prioritizing validated request context
 * and falling back gracefully to system clock.
 */
export function resolveTemporalContext(reqBodyOrContext?: any): TemporalContext {
  const validRef = extractValidReferenceDate(reqBodyOrContext);
  return getTemporalContext(validRef);
}

/**
 * Extracts and normalizes any date string found on an object (OS, receipt, receivable, payable)
 */
export function extractItemDate(item: any): string | null {
  if (!item) return null;
  const raw =
    item.date ||
    item.scheduledDate ||
    item.completedDate ||
    item.dueDate ||
    item.due ||
    item.createdAt ||
    item.paymentDate;
  if (!raw) return null;
  if (raw instanceof Date) {
    return !isNaN(raw.getTime()) ? raw.toISOString().split('T')[0] : null;
  }
  if (typeof raw === 'string') {
    const match = raw.match(/^\d{4}-\d{2}(-\d{2})?/);
    return match ? match[0] : (raw.length >= 7 ? raw.substring(0, 10) : null);
  }
  return null;
}

export type TemporalFilterType =
  | 'hoje'
  | 'ontem'
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_passado'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'ultimos_90_dias'
  | 'este_ano'
  | 'ano_passado'
  | 'mes_especifico'
  | 'geral_acumulado'
  | 'comparacao_meses';

export interface ParsedTemporalQuery {
  filterType: TemporalFilterType;
  label: string;
  isComparison: boolean;
  targetMonthStr?: string; // YYYY-MM
  targetMonthName?: string;
  targetYear?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Normalizes text removing accents and extra spaces for robust keyword matching
 */
function cleanQueryText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses user questions into structured temporal filters based on dynamic temporal context.
 */
export function parseTemporalQuery(message: string, temporalContext?: TemporalContext): ParsedTemporalQuery {
  const temporal = temporalContext || getTemporalContext();
  const text = cleanQueryText(message);

  // 1. Check for Month Comparison: "faturei mais este mes ou mes passado", "comparar este mes com mes passado", "este mes vs mes passado"
  const hasEsteMes = text.includes('este mes') || text.includes('neste mes') || text.includes('esse mes') || text.includes('no mes atual');
  const hasMesPassado = text.includes('mes passado') || text.includes('no mes passado') || text.includes('mes anterior') || text.includes('ultimo mes');
  const isComparison =
    (hasEsteMes && hasMesPassado) ||
    text.includes('ou mes passado') ||
    text.includes('vs mes passado') ||
    text.includes('comparar este mes') ||
    text.includes('comparativo mensal') ||
    text.includes('diferenca entre este mes e o passado');

  if (isComparison) {
    return {
      filterType: 'comparacao_meses',
      label: `Comparação: ${temporal.currentPeriodLabel} vs ${temporal.previousPeriodLabel}`,
      isComparison: true,
      startDate: temporal.previousMonthStr,
      endDate: temporal.currentMonthStr,
    };
  }

  // 2. "Hoje"
  if (text.includes('hoje') || text.includes('do dia') || text.includes('nesta data')) {
    return {
      filterType: 'hoje',
      label: `Hoje (${temporal.todayStr})`,
      isComparison: false,
      startDate: temporal.todayStr,
      endDate: temporal.todayStr,
    };
  }

  // 3. "Ontem"
  if (text.includes('ontem') || text.includes('no dia anterior')) {
    return {
      filterType: 'ontem',
      label: `Ontem (${temporal.yesterdayStr})`,
      isComparison: false,
      startDate: temporal.yesterdayStr,
      endDate: temporal.yesterdayStr,
    };
  }

  // 4. "Últimos 7 dias"
  if (text.includes('ultimos 7 dias') || text.includes('7 dias') || text.includes('ultima semana')) {
    return {
      filterType: 'ultimos_7_dias',
      label: `Últimos 7 dias (${temporal.last7DaysStart} a ${temporal.todayStr})`,
      isComparison: false,
      startDate: temporal.last7DaysStart,
      endDate: temporal.todayStr,
    };
  }

  // 5. "Últimos 30 dias"
  if (text.includes('ultimos 30 dias') || text.includes('30 dias') || text.includes('ultimo mes') && !text.includes('mes passado')) {
    return {
      filterType: 'ultimos_30_dias',
      label: `Últimos 30 dias (${temporal.last30DaysStart} a ${temporal.todayStr})`,
      isComparison: false,
      startDate: temporal.last30DaysStart,
      endDate: temporal.todayStr,
    };
  }

  // 6. "Últimos 90 dias" / "Últimos 3 meses" / "Trimestre"
  if (text.includes('ultimos 90 dias') || text.includes('90 dias') || text.includes('ultimos 3 meses') || text.includes('neste trimestre')) {
    return {
      filterType: 'ultimos_90_dias',
      label: `Últimos 90 dias (${temporal.last90DaysStart} a ${temporal.todayStr})`,
      isComparison: false,
      startDate: temporal.last90DaysStart,
      endDate: temporal.todayStr,
    };
  }

  // 7. "Esta semana"
  if (text.includes('esta semana') || text.includes('nessa semana') || text.includes('semana atual')) {
    return {
      filterType: 'esta_semana',
      label: `Esta Semana (${temporal.thisWeekStart} a ${temporal.thisWeekEnd})`,
      isComparison: false,
      startDate: temporal.thisWeekStart,
      endDate: temporal.thisWeekEnd,
    };
  }

  // 8. "Semana passada"
  if (text.includes('semana passada') || text.includes('semana anterior')) {
    return {
      filterType: 'semana_passada',
      label: `Semana Passada (${temporal.lastWeekStart} a ${temporal.lastWeekEnd})`,
      isComparison: false,
      startDate: temporal.lastWeekStart,
      endDate: temporal.lastWeekEnd,
    };
  }

  // 9. "Mês passado" / "Mês anterior"
  if (hasMesPassado) {
    return {
      filterType: 'mes_passado',
      label: `${temporal.previousPeriodLongLabel} (${temporal.previousPeriodLabel})`,
      isComparison: false,
      targetMonthStr: temporal.previousMonthStr,
      targetMonthName: temporal.previousMonthName,
      targetYear: temporal.previousMonthYear,
      startDate: `${temporal.previousMonthStr}-01`,
      endDate: `${temporal.previousMonthStr}-31`,
    };
  }

  // 10. "Este mês" / "No mês" / "Mês corrente"
  if (hasEsteMes || text.includes('no mes') || text.includes('mensal') || text.includes('deste mes')) {
    return {
      filterType: 'este_mes',
      label: `${temporal.currentPeriodLongLabel} (${temporal.currentPeriodLabel})`,
      isComparison: false,
      targetMonthStr: temporal.currentMonthStr,
      targetMonthName: temporal.currentMonthName,
      targetYear: temporal.currentYear,
      startDate: `${temporal.currentMonthStr}-01`,
      endDate: `${temporal.currentMonthStr}-31`,
    };
  }

  // 11. "Este ano" / "Ano atual" / "Neste ano"
  if (text.includes('este ano') || text.includes('neste ano') || text.includes('ano atual') || text.includes('no ano corrente')) {
    return {
      filterType: 'este_ano',
      label: `Ano de ${temporal.currentYear}`,
      isComparison: false,
      targetYear: temporal.currentYear,
      startDate: temporal.thisYearStart,
      endDate: temporal.thisYearEnd,
    };
  }

  // 12. "Ano passado" / "Ano anterior"
  if (text.includes('ano passado') || text.includes('no ano passado') || text.includes('ano anterior')) {
    return {
      filterType: 'ano_passado',
      label: `Ano de ${temporal.lastYear}`,
      isComparison: false,
      targetYear: temporal.lastYear,
      startDate: temporal.lastYearStart,
      endDate: temporal.lastYearEnd,
    };
  }

  // 13. Specific Month Query (e.g. "quanto recebi em marco?", "faturamento de janeiro de 2025")
  const monthMap: { [key: string]: number } = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };

  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (text.includes(mName)) {
      // Check if a 4-digit or 2-digit year is specified near the month
      const yearMatch = text.match(new RegExp(`${mName}[^0-9]*(\\d{4})`)) || text.match(new RegExp(`(\\d{4})[^0-9]*${mName}`)) || text.match(/\b(20\d{2})\b/);
      let targetYear = temporal.currentYear;
      if (yearMatch && yearMatch[1]) {
        targetYear = parseInt(yearMatch[1], 10);
      }

      const pad = (n: number) => String(n).padStart(2, '0');
      const targetMonthStr = `${targetYear}-${pad(mNum)}`;
      const resolvedMonthName = getMonthName(mNum);

      return {
        filterType: 'mes_especifico',
        label: `${resolvedMonthName} de ${targetYear} (${resolvedMonthName}/${targetYear})`,
        isComparison: false,
        targetMonthStr,
        targetMonthName: resolvedMonthName,
        targetYear,
        startDate: `${targetMonthStr}-01`,
        endDate: `${targetMonthStr}-31`,
      };
    }
  }

  // Default: General / Overall or Current Month context
  return {
    filterType: 'este_mes',
    label: `${temporal.currentPeriodLongLabel} (${temporal.currentPeriodLabel})`,
    isComparison: false,
    targetMonthStr: temporal.currentMonthStr,
    targetMonthName: temporal.currentMonthName,
    targetYear: temporal.currentYear,
    startDate: `${temporal.currentMonthStr}-01`,
    endDate: `${temporal.currentMonthStr}-31`,
  };
}

/**
 * Filter an array of items by date range in a timezone-safe manner
 */
export function filterItemsByDateRange<T>(
  items: T[],
  startDate: string,
  endDate: string,
  dateExtractor: (item: T) => string | null = extractItemDate
): T[] {
  return items.filter((item) => {
    const itemDate = dateExtractor(item);
    if (!itemDate) return false;
    // Lexicographical comparison for YYYY-MM-DD
    if (itemDate.length === 7) {
      // Item is YYYY-MM
      const startMonth = startDate.substring(0, 7);
      const endMonth = endDate.substring(0, 7);
      return itemDate >= startMonth && itemDate <= endMonth;
    }
    return itemDate >= startDate && itemDate <= endDate;
  });
}
