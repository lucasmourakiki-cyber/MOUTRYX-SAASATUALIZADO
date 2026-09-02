/**
 * MOUTRYX Centralized pt-BR Formatters
 * Padronização Numérica, Moeda, Áreas e Percentuais
 */

/**
 * Formata números com separador de milhar (.) e decimal (,) no padrão brasileiro (pt-BR)
 */
export const formatNumber = (
  value: number | undefined | null,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
  }
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return options?.fallback ?? '--';
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
};

/**
 * Formata área em hectares no padrão pt-BR (ex: 18.041,3 ha ou 18.041 ha)
 */
export const formatHectares = (
  value: number | undefined | null,
  options?: {
    includeUnit?: boolean;
    maxDigits?: number;
  }
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return options?.includeUnit !== false ? '0 ha' : '0';
  }

  const hasDecimals = value % 1 !== 0;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: options?.maxDigits ?? (hasDecimals ? 2 : 0),
  });

  return options?.includeUnit !== false ? `${formatted} ha` : formatted;
};

/**
 * Formata percentual no padrão pt-BR (ex: 86,7% ou 94%)
 */
export const formatPercent = (
  value: number | undefined | null,
  options?: {
    maxDigits?: number;
    forceDecimals?: boolean;
  }
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }

  const hasDecimals = options?.forceDecimals || value % 1 !== 0;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: options?.forceDecimals ? 1 : (hasDecimals ? 1 : 0),
    maximumFractionDigits: options?.maxDigits ?? 1,
  });

  return `${formatted}%`;
};

/**
 * Formata valor monetário em Reais (R$) no padrão brasileiro
 * (ex: R$ 2.459.926,56 ou R$ 18,09)
 */
export const formatCurrency = (
  value: number | undefined | null,
  options?: {
    includeSymbol?: boolean;
    fallback?: string;
  }
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return options?.includeSymbol !== false ? 'R$ 0,00' : '0,00';
  }

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return options?.includeSymbol !== false ? `R$ ${formatted}` : formatted;
};
