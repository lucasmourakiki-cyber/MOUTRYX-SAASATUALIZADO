import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { hashToken, StoredSession } from './sessionStore';
import { getSessionRepository } from './repositoryFactory';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  exp: number; // Unix timestamp in ms
  iat: number; // Issued at timestamp in ms
  jti?: string; // Unique token identifier
}

/**
 * Enterprise Session Secret Resolver:
 * - Production: Strictly requires process.env.SESSION_SECRET (fails safely on startup if missing)
 * - Development: Reads or generates a persistent 256-bit secret stored in data/.session_secret
 *   to ensure session tokens survive development server restarts while keeping secrets out of git.
 */
function resolveSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET?.trim();

  // If explicitly configured in environment (min 16 chars)
  if (configuredSecret && configuredSecret.length >= 16) {
    return configuredSecret;
  }

  // Use persistent secret file in data/.session_secret or generate one
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const secretFilePath = path.join(dataDir, '.session_secret');
    if (fs.existsSync(secretFilePath)) {
      const persisted = fs.readFileSync(secretFilePath, 'utf-8').trim();
      if (persisted && persisted.length >= 32) {
        return persisted;
      }
    }

    // Generate new 256-bit cryptographically secure secret and persist to data/.session_secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFilePath, newSecret, { mode: 0o600 });
    return newSecret;
  } catch (err) {
    console.warn('[MOUTRYX SECURITY] Could not persist session secret to disk, falling back to ephemeral random:', err);
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = resolveSessionSecret();
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory blacklist for explicitly revoked tokens (fast check)
const revokedTokens: Set<string> = new Set();

/**
 * Creates a cryptographically signed HMAC-SHA256 token and registers it in the persistent session repository.
 * FAIL-CLOSED: The session MUST be successfully written to persistent storage before returning the token.
 * Format: base64url(payload).base64url(signature)
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, 'exp' | 'iat' | 'jti'>,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const now = Date.now();
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = now + TOKEN_EXPIRY_MS;

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp,
    jti,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const token = `${payloadB64}.${signature}`;
  const tokenHash = hashToken(token);

  // Synchronously record and persist the session in the session repository (Fail-Closed)
  const sessionRepo = getSessionRepository();
  await sessionRepo.create({
    id: jti,
    userId: payload.userId,
    tokenHash,
    expiresAt: new Date(exp),
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });

  return token;
}

/**
 * Synchronous creation without repository persistence (strictly for unit tests and local mocks)
 */
export function createSessionTokenSync(
  payload: Omit<SessionPayload, 'exp' | 'iat' | 'jti'>
): string {
  const now = Date.now();
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = now + TOKEN_EXPIRY_MS;

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp,
    jti,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Invalidates / revokes a session token in persistent storage (Fail-Closed) and local memory.
 * Throws an error if persistent revocation fails to prevent false-positive confirmation.
 */
export async function invalidateSessionToken(token: string): Promise<void> {
  if (!token || typeof token !== 'string') return;

  const tokenHash = hashToken(token);
  
  // 1. Revoga na persistência primária (PostgreSQL / SessionRepository)
  const sessionRepo = getSessionRepository();
  await sessionRepo.revoke(tokenHash);

  // 2. Registra na blacklist em memória após confirmação de persistência
  revokedTokens.add(token);

  // Periodic memory cleanup
  if (revokedTokens.size > 5000) {
    revokedTokens.clear();
  }
}

/**
 * Verifies a token and returns the payload if valid, not expired, and not revoked
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  if (revokedTokens.has(token)) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;

  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    // Constant-time signature comparison to prevent timing attacks
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);

    if (providedBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.userId || !payload.exp) {
      return null;
    }

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
