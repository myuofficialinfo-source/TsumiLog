import { NextRequest, NextResponse } from 'next/server';
import { getMostUsedGames, initDatabase, initGameUsageTable, recordGameUsage } from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initGameUsageTable();
    dbInitialized = true;
  }
}

// 最も使用されているゲームランキング取得
export async function GET() {
  try {
    await ensureDbInitialized();

    const games = await getMostUsedGames(20);

    return NextResponse.json({
      games,
    });
  } catch (error) {
    console.error('Game usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game usage' },
      { status: 500 }
    );
  }
}

// ゲーム使用率を記録
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { steamId, deckGames } = body as {
      steamId: string;
      deckGames: Array<{ appid: number; name: string }>;
    };

    if (!steamId || !deckGames || !Array.isArray(deckGames)) {
      return NextResponse.json(
        { error: 'steamId and deckGames are required' },
        { status: 400 }
      );
    }

    await recordGameUsage(steamId, deckGames);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Game usage POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to record game usage' },
      { status: 500 }
    );
  }
}
