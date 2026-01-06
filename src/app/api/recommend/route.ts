import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences } from '@/lib/gemini';
import { GenreStats, BacklogGame } from '@/types/steam';

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: 'レコメンドの生成に失敗しました' },
      { status: 500 }
    );
  }
}
