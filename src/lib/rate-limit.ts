import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash Redisの設定（環境変数から取得）
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Upstashが設定されているかチェック
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// IPベースのレート制限（1時間あたり10回）
const ipHourlyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:ip:hourly',
    })
  : null;

// IPベースのレート制限（1日あたり30回）
const ipDailyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '24 h'),
      prefix: 'ratelimit:ip:daily',
    })
  : null;

// グローバルAPIレート制限（1日あたり1000回）
const globalDailyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, '24 h'),
      prefix: 'ratelimit:global',
    })
  : null;

// ===== フォールバック用のインメモリ制限 =====
const DAILY_LIMIT = 1000;
const IP_HOURLY_LIMIT = 10;
const IP_DAILY_LIMIT = 30;

interface RateLimitData {
  count: number;
  resetAt: number;
}

interface IpRateLimitData {
  hourlyCount: number;
  hourlyResetAt: number;
  dailyCount: number;
  dailyResetAt: number;
}

const rateLimitStore: Map<string, RateLimitData> = new Map();
const ipRateLimitStore: Map<string, IpRateLimitData> = new Map();

function getJSTMidnight(): number {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstMidnight = new Date(
    jstNow.getFullYear(),
    jstNow.getMonth(),
    jstNow.getDate(),
    0, 0, 0, 0
  );
  const nextMidnightJST = new Date(jstMidnight.getTime() + 24 * 60 * 60 * 1000);
  return nextMidnightJST.getTime() - jstOffset;
}

// ===== Upstash対応のIPレート制限 =====
export async function checkIpRateLimitAsync(ip: string): Promise<{
  allowed: boolean;
  reason?: 'hourly' | 'daily';
  hourlyRemaining: number;
  dailyRemaining: number;
}> {
  // Upstashが設定されている場合
  if (isUpstashConfigured && ipHourlyLimiter && ipDailyLimiter) {
    try {
      const [hourlyResult, dailyResult] = await Promise.all([
        ipHourlyLimiter.limit(ip),
        ipDailyLimiter.limit(ip),
      ]);

      if (!hourlyResult.success) {
        return {
          allowed: false,
          reason: 'hourly',
          hourlyRemaining: 0,
          dailyRemaining: dailyResult.remaining,
        };
      }

      if (!dailyResult.success) {
        return {
          allowed: false,
          reason: 'daily',
          hourlyRemaining: hourlyResult.remaining,
          dailyRemaining: 0,
        };
      }

      return {
        allowed: true,
        hourlyRemaining: hourlyResult.remaining,
        dailyRemaining: dailyResult.remaining,
      };
    } catch (error) {
      console.error('Upstash rate limit error:', error);
      // Upstashエラー時はインメモリにフォールバック
    }
  }

  // インメモリフォールバック
  return checkIpRateLimitMemory(ip);
}

// ===== Upstash対応のグローバルレート制限 =====
export async function checkGlobalRateLimitAsync(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  if (isUpstashConfigured && globalDailyLimiter) {
    try {
      const result = await globalDailyLimiter.limit('global');
      return {
        allowed: result.success,
        remaining: result.remaining,
      };
    } catch (error) {
      console.error('Upstash global rate limit error:', error);
    }
  }

  // インメモリフォールバック
  const result = checkRateLimit('gemini-api');
  return {
    allowed: result.allowed,
    remaining: result.remaining,
  };
}

// ===== インメモリ版（フォールバック用） =====
function checkIpRateLimitMemory(ip: string): {
  allowed: boolean;
  reason?: 'hourly' | 'daily';
  hourlyRemaining: number;
  dailyRemaining: number;
} {
  const now = Date.now();
  const data = ipRateLimitStore.get(ip);

  const hourlyReset = now + 60 * 60 * 1000;
  const dailyReset = getJSTMidnight();

  if (!data) {
    ipRateLimitStore.set(ip, {
      hourlyCount: 1,
      hourlyResetAt: hourlyReset,
      dailyCount: 1,
      dailyResetAt: dailyReset
    });
    return {
      allowed: true,
      hourlyRemaining: IP_HOURLY_LIMIT - 1,
      dailyRemaining: IP_DAILY_LIMIT - 1,
    };
  }

  // 時間リセット
  if (now >= data.hourlyResetAt) {
    data.hourlyCount = 0;
    data.hourlyResetAt = hourlyReset;
  }

  // 日次リセット
  if (now >= data.dailyResetAt) {
    data.dailyCount = 0;
    data.dailyResetAt = dailyReset;
  }

  data.hourlyCount += 1;
  data.dailyCount += 1;
  ipRateLimitStore.set(ip, data);

  const hourlyRemaining = IP_HOURLY_LIMIT - data.hourlyCount;
  const dailyRemaining = IP_DAILY_LIMIT - data.dailyCount;

  if (hourlyRemaining < 0) {
    return {
      allowed: false,
      reason: 'hourly',
      hourlyRemaining: 0,
      dailyRemaining: Math.max(0, dailyRemaining),
    };
  }

  if (dailyRemaining < 0) {
    return {
      allowed: false,
      reason: 'daily',
      hourlyRemaining: Math.max(0, hourlyRemaining),
      dailyRemaining: 0,
    };
  }

  return {
    allowed: true,
    hourlyRemaining,
    dailyRemaining,
  };
}

// ===== 既存のインメモリ関数（後方互換性） =====
export function checkRateLimit(key: string = 'gemini-api'): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const data = rateLimitStore.get(key);

  if (!data || now >= data.resetAt) {
    const resetAt = getJSTMidnight();
    rateLimitStore.set(key, { count: 0, resetAt });
    return { allowed: true, remaining: DAILY_LIMIT, resetAt: new Date(resetAt) };
  }

  const remaining = DAILY_LIMIT - data.count;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    resetAt: new Date(data.resetAt)
  };
}

export function incrementRateLimit(key: string = 'gemini-api'): void {
  const now = Date.now();
  const data = rateLimitStore.get(key);

  if (!data || now >= data.resetAt) {
    const resetAt = getJSTMidnight();
    rateLimitStore.set(key, { count: 1, resetAt });
  } else {
    data.count += 1;
    rateLimitStore.set(key, data);
  }
}

export function getRateLimitStatus(key: string = 'gemini-api'): { count: number; limit: number; remaining: number; resetAt: Date | null } {
  const data = rateLimitStore.get(key);
  const now = Date.now();

  if (!data || now >= data.resetAt) {
    return { count: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, resetAt: null };
  }

  return {
    count: data.count,
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - data.count,
    resetAt: new Date(data.resetAt)
  };
}

// 同期版（後方互換性のため残す）
export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  reason?: 'hourly' | 'daily';
  hourlyRemaining: number;
  dailyRemaining: number;
  hourlyResetAt: Date;
  dailyResetAt: Date;
} {
  const now = Date.now();
  const hourlyReset = now + 60 * 60 * 1000;
  const dailyReset = getJSTMidnight();

  const result = checkIpRateLimitMemory(ip);
  return {
    ...result,
    hourlyResetAt: new Date(hourlyReset),
    dailyResetAt: new Date(dailyReset),
  };
}

export function incrementIpRateLimit(_ip: string): void {
  // Upstash使用時はlimit()で自動カウントされるため不要
  // インメモリ版はcheckIpRateLimitMemory内でカウント済み
}
