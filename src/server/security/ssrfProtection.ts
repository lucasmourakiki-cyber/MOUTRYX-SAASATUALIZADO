/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — SSRF & URL SAFETY VALIDATOR
 * ============================================================================
 * Prevenção rigorosa contra Server-Side Request Forgery (SSRF).
 * Bloqueia requisições a:
 * - Endereços de loopback (127.0.0.1, localhost, ::1)
 * - Redes privadas (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local / Cloud Metadata (169.254.169.254, metadata.google.internal)
 * - Protocolos não seguros (file://, gopher://, ftp://, etc.)
 */

import dns from 'dns';
import net from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
]);

/**
 * Determina se um endereço IP IPv4 ou IPv6 pertence a um intervalo privado / reservado.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 100.64.0.0/10 (Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    // 198.18.0.0/15 (Benchmark testing)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future use)
    if (parts[0] >= 240) return true;

    return false;
  }

  // IPv6 checks
  const lowerIp = ip.toLowerCase();
  if (lowerIp === '::1' || lowerIp === '::' || lowerIp.startsWith('fe80:') || lowerIp.startsWith('fc00:') || lowerIp.startsWith('fd00:')) {
    return true;
  }

  return false;
}

/**
 * Valida de forma assíncrona se uma URL é segura para fetch externo contra SSRF.
 */
export async function validateSafeUrlForFetch(rawUrl: string): Promise<{ safe: boolean; error?: string; parsedUrl?: URL }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, error: 'URL ausente ou inválida.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, error: 'Formato de URL inválido.' };
  }

  // Apenas protocolos HTTP e HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: `Protocolo '${parsed.protocol}' não permitido. Apenas HTTP e HTTPS são suportados.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostnames bloqueados explicitamente
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
    return { safe: false, error: 'Acesso a domínios internos ou de infraestrutura é bloqueado.' };
  }

  // Se o hostname já for um IP direto
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { safe: false, error: 'Acesso a endereços IP privados ou de loopback é bloqueado.' };
    }
    return { safe: true, parsedUrl: parsed };
  }

  // Resolução DNS para verificar se o hostname aponta para IP privado
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: 'Não foi possível resolver o hostname fornecido.' };
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return { safe: false, error: 'O domínio resolve para endereço IP interno não autorizado (SSRF Protection).' };
      }
    }
  } catch (err: any) {
    return { safe: false, error: `Falha na resolução DNS do domínio: ${err?.message || 'Host desconhecido'}` };
  }

  return { safe: true, parsedUrl: parsed };
}
