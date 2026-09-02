/**
 * MOUTRYX AGRO - Validadores Universais e Regras de Negócio
 * Validação estrita de CPF, CNPJ, E-mail, Telefone, e Integridade Cadastral
 */

/**
 * Normaliza qualquer documento removendo caracteres não numéricos.
 */
export const cleanDigits = (value?: string | null): string => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

/**
 * Validação de CPF (Algoritmo Módulo 11)
 */
export const isValidCPF = (cpf?: string | null): boolean => {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return false;
  // Rejeita sequências de dígitos repetidos conhecidas
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
};

/**
 * Validação de CNPJ (Algoritmo Módulo 11)
 */
export const isValidCNPJ = (cnpj?: string | null): boolean => {
  const digits = cleanDigits(cnpj);
  if (digits.length !== 14) return false;
  // Rejeita sequências repetidas
  if (/^(\d)\1{13}$/.test(digits)) return false;

  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const digitsCheck = digits.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsCheck.charAt(0), 10)) return false;

  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsCheck.charAt(1), 10)) return false;

  return true;
};

/**
 * Validação de CPF ou CNPJ
 */
export const isValidCpfOrCnpj = (doc?: string | null): boolean => {
  if (!doc || !doc.trim()) return true; // Se não informado, é opcional
  const digits = cleanDigits(doc);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
};

/**
 * Validação de E-mail
 */
export const isValidEmail = (email?: string | null): boolean => {
  if (!email || !email.trim()) return true; // Opcional se vazio
  const trimmed = email.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
};

/**
 * Validação de Telefone / WhatsApp Brasileiro
 */
export const isValidPhone = (phone?: string | null): boolean => {
  if (!phone || !phone.trim()) return true; // Opcional se vazio
  let digits = cleanDigits(phone);
  // Se começar com DDI do Brasil (55) e tiver 12 ou 13 dígitos, remove o DDI
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  // Aceita de 10 a 11 dígitos (com DDD)
  return digits.length >= 10 && digits.length <= 11;
};

/**
 * Normaliza e-mail para comparação consistente (lowercase e trim)
 */
export const normalizeEmail = (email?: string | null): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Normaliza telefone com máscara padrão brasileira
 */
export const normalizePhone = (phone?: string | null): string => {
  if (!phone) return '';
  const digits = cleanDigits(phone);
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }
  return phone.trim();
};

/**
 * Formata CPF para exibição padrão (000.000.000-00)
 */
export const formatCPF = (cpf?: string | null): string => {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return cpf || '';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Formata CNPJ para exibição padrão (00.000.000/0000-00)
 */
export const formatCNPJ = (cnpj?: string | null): string => {
  const digits = cleanDigits(cnpj);
  if (digits.length !== 14) return cnpj || '';
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

/**
 * Formata CPF ou CNPJ automaticamente
 */
export const formatCpfOrCnpj = (doc?: string | null): string => {
  const digits = cleanDigits(doc);
  if (digits.length === 11) return formatCPF(digits);
  if (digits.length === 14) return formatCNPJ(digits);
  return doc || '';
};

/**
 * Validação de UF Brasileira (27 estados)
 */
export const BRAZILIAN_UFS_SET = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export const isValidUF = (uf?: string | null): boolean => {
  if (!uf || !uf.trim()) return false;
  return BRAZILIAN_UFS_SET.has(uf.trim().toUpperCase());
};
