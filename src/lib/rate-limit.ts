// 1日あたりのAPI呼び出し制限
const DAILY_LIMIT = 1000;

// メモリベースのカウンター（Vercelではインスタンス間で共有されないため、
// 正確な制限にはRedis/Upstash KVなどの外部ストレージが必要）
interface RateLimitData {
  count: number;
  resetAt: number;
}

const rateLimitStore: Map<string, RateLimitData> = new Map();

function getJSTMidnight(): number {
  const now = new Date();
  // JSTは UTC+9
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  // 今日のJST 0:00を計算
  const jstMidnight = new Date(
    jstNow.getFullYear(),
    jstNow.getMonth(),
    jstNow.getDate(),
    0, 0, 0, 0
  );

  // 次の日のJST 0:00をUTCのタイムスタンプとして返す
  const nextMidnightJST = new Date(jstMidnight.getTime() + 24 * 60 * 60 * 1000);
  return nextMidnightJST.getTime() - jstOffset;
}

export function checkRateLimit(key: string = 'gemini-api'): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const data = rateLimitStore.get(key);

  // リセット時刻を過ぎていたら、またはデータがなければ初期化
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
