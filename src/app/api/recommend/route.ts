import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences } from '@/lib/gemini';
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limit';
import { GenreStats, BacklogGame } from '@/types/steam';

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const rateLimit = checkRateLimit('gemini-api');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: '本日のAPI利用上限に達しました。明日またお試しください。',
          resetAt: rateLimit.resetAt.toISOString()
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { backlogGames, genreStats, userPreferences, type } = body as {
      backlogGames: BacklogGame[];
      genreStats: GenreStats[];
      userPreferences?: string;
      type: 'recommend' | 'analyze';
    };

    if (type === 'analyze') {
      const totalGames = body.totalGames || 0;
      const totalPlaytime = body.totalPlaytime || 0;
      const analysis = await analyzeGamingPreferences(genreStats, totalGames, totalPlaytime);
      // 成功した場合のみカウントを増やす
      incrementRateLimit('gemini-api');
      return NextResponse.json({ analysis });
    }

    if (!backlogGames || !genreStats) {
      return NextResponse.json(
        { error: '積みゲーリストとジャンル統計が必要です' },
        { status: 400 }
      );
    }

    const recommendations = await generateRecommendations(
      backlogGames,
      genreStats,
      userPreferences
    );

    // 成功した場合のみカウントを増やす
    incrementRateLimit('gemini-api');
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Recommendation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `レコメンドの生成に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
