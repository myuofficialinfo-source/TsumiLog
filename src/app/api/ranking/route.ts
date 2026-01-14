import { NextRequest, NextResponse } from 'next/server';
import { getRanking, getUserRank, getUserScore, initDatabase } from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

// ランキング取得
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // ランキング一覧取得
    const ranking = await getRanking(limit);

    // steamIdが指定されている場合、そのユーザーの情報も返す
    let userInfo = null;
    if (steamId) {
      const userScore = await getUserScore(steamId);
      const userRank = await getUserRank(steamId);
      userInfo = {
        steamId,
        ...userScore,
        rank: userRank,
      };
    }

    return NextResponse.json({
      ranking,
      userInfo,
    });
  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
