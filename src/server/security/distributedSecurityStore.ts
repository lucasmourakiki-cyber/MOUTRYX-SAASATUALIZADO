/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — DISTRIBUTED SECURITY & QUOTA REPOSITORY
 * ============================================================================
 * Armazenamento e controle distribuído multi-instância (Cloud Run / PostgreSQL)
 * para Rate Limiting, Concorrência e Quotas de IA.
 *
 * Elimina a dependência de memória local isolada por processo Node.js.
 * Todas as instâncias compartilham a mesma barreira transacional no PostgreSQL.
 * ============================================================================
 */

import { query, isDatabaseConfigured, withTransaction, DbExecutor } from '../db/postgresClient';
import { safeLogger } from './safeLogger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // Unix timestamp in milliseconds
  totalHits: number;
  limit: number;
}

export interface ConcurrencyLockResult {
  acquired: boolean;
  currentCount: number;
  lockKey: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remainingMinute: number;
  remainingDay: number;
  reason?: 'MINUTE_LIMIT_EXCEEDED' | 'DAY_LIMIT_EXCEEDED';
  resetTimeMinute: number;
  resetTimeDay: number;
}

// Fallback in-memory structures only used when DB is completely unconfigured in local dev
interface LocalRateRecord {
  count: number;
  windowStart: number;
  windowEnd: number;
}

interface LocalLockRecord {
  ownerId: string;
  category: string;
  expiresAt: number;
}

interface LocalQuotaRecord {
  minuteCount: number;
  minuteWindowEnd: number;
  dayCount: number;
  dayWindowEnd: number;
}

const localRateStore = new Map<string, LocalRateRecord>();
const localLockStore = new Map<string, LocalLockRecord>();
const localQuotaStore = new Map<string, LocalQuotaRecord>();

/**
 * ============================================================================
 * 1. DISTRIBUTED RATE LIMITING (PostgreSQL + Atomic Sliding Window)
 * ============================================================================
 */
export async function checkAndIncrementRateLimit(params: {
  key: string;
  category: string;
  windowMs: number;
  max: number;
}): Promise<RateLimitResult> {
  const { key, category, windowMs, max } = params;
  const now = Date.now();
  const windowEnd = new Date(now + windowMs);
  const windowStart = new Date(now);

  if (isDatabaseConfigured()) {
    try {
      const sql = `
        INSERT INTO distributed_rate_limits (key, category, count, window_start, window_end, updated_at)
        VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE
        SET 
          count = CASE 
            WHEN distributed_rate_limits.window_end <= CURRENT_TIMESTAMP THEN 1
            ELSE distributed_rate_limits.count + 1
          END,
          window_start = CASE 
            WHEN distributed_rate_limits.window_end <= CURRENT_TIMESTAMP THEN $3
            ELSE distributed_rate_limits.window_start
          END,
          window_end = CASE 
            WHEN distributed_rate_limits.window_end <= CURRENT_TIMESTAMP THEN $4
            ELSE distributed_rate_limits.window_end
          END,
          updated_at = CURRENT_TIMESTAMP
        RETURNING count, window_start, window_end;
      `;

      const result = await query(sql, [key, category, windowStart.toISOString(), windowEnd.toISOString()]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const count = parseInt(row.count, 10) || 1;
        const rowWindowEnd = new Date(row.window_end).getTime();
        const allowed = count <= max;
        const remaining = Math.max(0, max - count);

        return {
          allowed,
          remaining,
          resetTime: rowWindowEnd,
          totalHits: count,
          limit: max,
        };
      }
    } catch (err: any) {
      safeLogger.error('Erro ao consultar distributed_rate_limits no PostgreSQL (Fail-Closed)', {
        key,
        category,
        error: err?.message,
      });
      // FAIL-CLOSED: Se o banco falhar, negar acesso imediatamente (não cair para memória local)
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + windowMs,
        totalHits: max + 1,
        limit: max,
      };
    }
  }

  // Local memory fallback (used when PostgreSQL is not configured)
  let record = localRateStore.get(key);
  if (!record || record.windowEnd <= now) {
    record = {
      count: 1,
      windowStart: now,
      windowEnd: now + windowMs,
    };
  } else {
    record.count += 1;
  }
  localRateStore.set(key, record);

  const allowed = record.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - record.count),
    resetTime: record.windowEnd,
    totalHits: record.count,
    limit: max,
  };
}

// Simple local async mutex for local dev fallback concurrency protection
const localMutexMap = new Map<string, Promise<void>>();
async function acquireLocalMutex(key: string): Promise<() => void> {
  while (localMutexMap.has(key)) {
    await localMutexMap.get(key);
  }
  let unlock: () => void;
  const promise = new Promise<void>((resolve) => {
    unlock = () => {
      localMutexMap.delete(key);
      resolve();
    };
  });
  localMutexMap.set(key, promise);
  return unlock!;
}

/**
 * ============================================================================
 * 2. DISTRIBUTED CONCURRENCY LOCKS (PostgreSQL Leases with Advisory Xact Locks)
 * ============================================================================
 */
export async function acquireConcurrencyLock(params: {
  lockKey: string;
  ownerId: string;
  category: string;
  maxConcurrent: number;
  leaseTtlSeconds?: number;
}): Promise<ConcurrencyLockResult> {
  const { lockKey, ownerId, category, maxConcurrent, leaseTtlSeconds = 45 } = params;
  const now = Date.now();
  const expiresAt = new Date(now + leaseTtlSeconds * 1000);

  if (isDatabaseConfigured()) {
    try {
      return await withTransaction(async (tx: DbExecutor) => {
        // 1. SERIALIZAÇÃO ESTREITA NO POSTGRESQL (Advisory Transaction Lock por owner e categoria)
        // Impede rigorosamente race conditions entre transações concorrentes no Cloud Run
        await tx.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [ownerId, category]);

        // 2. Limpa locks expirados de forma atômica
        await tx.query('DELETE FROM distributed_concurrency_locks WHERE expires_at <= CURRENT_TIMESTAMP');

        // 3. Conta locks ativos para o mesmo owner e categoria sob a trava transacional
        const countRes = await tx.query(
          'SELECT COUNT(*) as active_count FROM distributed_concurrency_locks WHERE owner_id = $1 AND category = $2',
          [ownerId, category]
        );
        const activeCount = parseInt(countRes.rows[0]?.active_count || '0', 10);

        if (activeCount >= maxConcurrent) {
          return {
            acquired: false,
            currentCount: activeCount,
            lockKey,
          };
        }

        // 4. Adquire lock inserindo registro com TTL
        await tx.query(
          `INSERT INTO distributed_concurrency_locks (lock_key, owner_id, category, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (lock_key) DO UPDATE SET expires_at = $4, acquired_at = CURRENT_TIMESTAMP`,
          [lockKey, ownerId, category, expiresAt.toISOString()]
        );

        return {
          acquired: true,
          currentCount: activeCount + 1,
          lockKey,
        };
      });
    } catch (err: any) {
      safeLogger.error('Erro ao gerenciar concorrência distribuída no PostgreSQL (Fail-Closed)', {
        lockKey,
        ownerId,
        error: err?.message,
      });
      // FAIL-CLOSED: Se o banco falhar, negar aquisição do lock
      return { acquired: false, currentCount: maxConcurrent, lockKey };
    }
  }

  // Local fallback (when PostgreSQL is not configured) com proteção por mutex local
  const releaseLocalMutex = await acquireLocalMutex(`${ownerId}:${category}`);
  try {
    const currentNow = Date.now();
    // Purge expired
    for (const [k, v] of localLockStore.entries()) {
      if (v.expiresAt <= currentNow) {
        localLockStore.delete(k);
      }
    }

    let activeCount = 0;
    for (const v of localLockStore.values()) {
      if (v.ownerId === ownerId && v.category === category) {
        activeCount++;
      }
    }

    if (activeCount >= maxConcurrent) {
      return { acquired: false, currentCount: activeCount, lockKey };
    }

    localLockStore.set(lockKey, {
      ownerId,
      category,
      expiresAt: currentNow + leaseTtlSeconds * 1000,
    });

    return { acquired: true, currentCount: activeCount + 1, lockKey };
  } finally {
    releaseLocalMutex();
  }
}

export async function releaseConcurrencyLock(lockKey: string): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      await query('DELETE FROM distributed_concurrency_locks WHERE lock_key = $1', [lockKey]);
    } catch (err: any) {
      safeLogger.warn('Aviso ao liberar lock de concorrência distribuída', { lockKey, error: err?.message });
    }
  }
  localLockStore.delete(lockKey);
}

/**
 * ============================================================================
 * 3. DISTRIBUTED AI QUOTAS (PostgreSQL / Multi-instance)
 * ============================================================================
 */
export async function checkAndIncrementAiQuota(params: {
  dimension: 'user' | 'tenant' | 'ip';
  targetId: string;
  maxPerMinute: number;
  maxPerDay: number;
}): Promise<QuotaCheckResult> {
  const { dimension, targetId, maxPerMinute, maxPerDay } = params;
  const quotaKey = `ai_quota:${dimension}:${targetId}`;
  const now = Date.now();
  const minuteEnd = new Date(now + 60 * 1000);
  const dayEnd = new Date(now + 24 * 60 * 60 * 1000);

  if (isDatabaseConfigured()) {
    try {
      return await withTransaction(async (tx: DbExecutor) => {
        // 1. Obtém ou cria registro com bloqueio FOR UPDATE
        const selRes = await tx.query(
          'SELECT * FROM distributed_quotas WHERE quota_key = $1 FOR UPDATE',
          [quotaKey]
        );

        let minuteCount = 0;
        let minuteWindowEnd = minuteEnd.getTime();
        let dayCount = 0;
        let dayWindowEnd = dayEnd.getTime();

        if (selRes.rows.length > 0) {
          const row = selRes.rows[0];
          const curMinEnd = new Date(row.minute_window_end).getTime();
          const curDayEnd = new Date(row.day_window_end).getTime();

          minuteCount = curMinEnd > now ? parseInt(row.minute_count, 10) || 0 : 0;
          minuteWindowEnd = curMinEnd > now ? curMinEnd : minuteEnd.getTime();

          dayCount = curDayEnd > now ? parseInt(row.day_count, 10) || 0 : 0;
          dayWindowEnd = curDayEnd > now ? curDayEnd : dayEnd.getTime();
        }

        // Verifica limites ANTES de incrementar
        if (minuteCount >= maxPerMinute) {
          return {
            allowed: false,
            remainingMinute: 0,
            remainingDay: Math.max(0, maxPerDay - dayCount),
            reason: 'MINUTE_LIMIT_EXCEEDED',
            resetTimeMinute: minuteWindowEnd,
            resetTimeDay: dayWindowEnd,
          };
        }

        if (dayCount >= maxPerDay) {
          return {
            allowed: false,
            remainingMinute: Math.max(0, maxPerMinute - minuteCount),
            remainingDay: 0,
            reason: 'DAY_LIMIT_EXCEEDED',
            resetTimeMinute: minuteWindowEnd,
            resetTimeDay: dayWindowEnd,
          };
        }

        // Incrementa contadores
        const newMinuteCount = minuteCount + 1;
        const newDayCount = dayCount + 1;

        await tx.query(
          `INSERT INTO distributed_quotas (quota_key, dimension, target_id, minute_count, minute_window_end, day_count, day_window_end, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (quota_key) DO UPDATE
           SET 
             minute_count = $4,
             minute_window_end = $5,
             day_count = $6,
             day_window_end = $7,
             updated_at = CURRENT_TIMESTAMP`,
          [
            quotaKey,
            dimension,
            targetId,
            newMinuteCount,
            new Date(minuteWindowEnd).toISOString(),
            newDayCount,
            new Date(dayWindowEnd).toISOString(),
          ]
        );

        return {
          allowed: true,
          remainingMinute: Math.max(0, maxPerMinute - newMinuteCount),
          remainingDay: Math.max(0, maxPerDay - newDayCount),
          resetTimeMinute: minuteWindowEnd,
          resetTimeDay: dayWindowEnd,
        };
      });
    } catch (err: any) {
      safeLogger.error('Erro ao verificar quota de IA no PostgreSQL (Fail-Closed)', {
        dimension,
        targetId,
        error: err?.message,
      });
      // FAIL-CLOSED: Se o banco falhar, bloquear chamada de IA
      return {
        allowed: false,
        remainingMinute: 0,
        remainingDay: 0,
        reason: 'MINUTE_LIMIT_EXCEEDED',
        resetTimeMinute: now + 60000,
        resetTimeDay: now + 86400000,
      };
    }
  }

  // Local fallback (when PostgreSQL is not configured)
  let qRecord = localQuotaStore.get(quotaKey);
  if (!qRecord) {
    qRecord = {
      minuteCount: 0,
      minuteWindowEnd: now + 60000,
      dayCount: 0,
      dayWindowEnd: now + 86400000,
    };
  }

  if (qRecord.minuteWindowEnd <= now) {
    qRecord.minuteCount = 0;
    qRecord.minuteWindowEnd = now + 60000;
  }
  if (qRecord.dayWindowEnd <= now) {
    qRecord.dayCount = 0;
    qRecord.dayWindowEnd = now + 86400000;
  }

  if (qRecord.minuteCount >= maxPerMinute) {
    return {
      allowed: false,
      remainingMinute: 0,
      remainingDay: Math.max(0, maxPerDay - qRecord.dayCount),
      reason: 'MINUTE_LIMIT_EXCEEDED',
      resetTimeMinute: qRecord.minuteWindowEnd,
      resetTimeDay: qRecord.dayWindowEnd,
    };
  }

  if (qRecord.dayCount >= maxPerDay) {
    return {
      allowed: false,
      remainingMinute: Math.max(0, maxPerMinute - qRecord.minuteCount),
      remainingDay: 0,
      reason: 'DAY_LIMIT_EXCEEDED',
      resetTimeMinute: qRecord.minuteWindowEnd,
      resetTimeDay: qRecord.dayWindowEnd,
    };
  }

  qRecord.minuteCount += 1;
  qRecord.dayCount += 1;
  localQuotaStore.set(quotaKey, qRecord);

  return {
    allowed: true,
    remainingMinute: Math.max(0, maxPerMinute - qRecord.minuteCount),
    remainingDay: Math.max(0, maxPerDay - qRecord.dayCount),
    resetTimeMinute: qRecord.minuteWindowEnd,
    resetTimeDay: qRecord.dayWindowEnd,
  };
}

/**
 * Limpa o estado distribuído (utilizado exclusivamente em rotinas de teste automatizadas)
 */
export async function resetDistributedSecurityStateForTesting(): Promise<void> {
  localRateStore.clear();
  localLockStore.clear();
  localQuotaStore.clear();

  if (isDatabaseConfigured()) {
    try {
      await query('TRUNCATE TABLE distributed_rate_limits, distributed_concurrency_locks, distributed_quotas');
    } catch {
      // Ignora se as tabelas ainda não foram criadas
    }
  }
}
