import { NextRequest, NextResponse } from 'next/server';
import { getRecentlyPlayedGames } from '@/lib/steam';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const count = parseInt(searchParams.get('count') || '10');

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // 最近プレイしたゲームを取得
    const recentGames = await getRecentlyPlayedGames(steamId, count);

    return NextResponse.json({
      success: true,
      games: recentGames,
    });
  } catch (error) {
    console.error('Recent games API error:', error);
    return NextResponse.json(
      { error: 'Failed to get recent games' },
      { status: 500 }
    );
  }
}
