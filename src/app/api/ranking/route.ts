import { NextRequest, NextResponse } from 'next/server';
import { getRankingByPeriod, getUserRankByPeriod, initDatabase } from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

// ランキング取得
// クエリパラメータ:
//   - steamId: ユーザーのSteam ID（任意）
//   - limit: 取得件数（デフォルト100）
//   - period: 期間（'all' | 'weekly' | 'daily'、デフォルト'all'）
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const period = (searchParams.get('period') || 'all') as 'all' | 'weekly' | 'daily';

    // 期間を検証
    const validPeriods = ['all', 'weekly', 'daily'];
    const normalizedPeriod = validPeriods.includes(period) ? period : 'all';

    // ランキング一覧取得（期間指定）
    const ranking = await getRankingByPeriod(limit, normalizedPeriod);

    // steamIdが指定されている場合、そのユーザーの情報も返す
    let userInfo = null;
    if (steamId) {
      const userStats = await getUserRankByPeriod(steamId, normalizedPeriod);
      userInfo = {
        steamId,
        sublimations: userStats.sublimations,
        wins: userStats.wins,
        score: userStats.score,
        rank: userStats.rank,
      };
    }

    return NextResponse.json({
      ranking,
      userInfo,
      period: normalizedPeriod,
    });
  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
