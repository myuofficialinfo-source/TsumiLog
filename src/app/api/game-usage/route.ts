import { NextResponse } from 'next/server';
import { getMostUsedGames, initDatabase, initGameUsageTable } from '@/lib/db';

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
