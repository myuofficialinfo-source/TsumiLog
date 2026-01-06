import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences, recommendNewReleases } from '@/lib/gemini';
import { getNewReleases } from '@/lib/steam';
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
      type: 'recommend' | 'analyze' | 'new-releases';
    };

    if (type === 'analyze') {
      const totalGames = body.totalGames || 0;
      const totalPlaytime = body.totalPlaytime || 0;
      const analysis = await analyzeGamingPreferences(genreStats, totalGames, totalPlaytime);
      // 成功した場合のみカウントを増やす
      incrementRateLimit('gemini-api');
      return NextResponse.json({ analysis });
    }

    if (type === 'new-releases') {
      if (!genreStats) {
        return NextResponse.json(
          { error: 'ジャンル統計が必要です' },
          { status: 400 }
        );
      }

      // ユーザーのゲーム情報を取得
      const favoriteGames = (body.favoriteGames as string[]) || [];
      const userBacklogGames = (body.backlogGames as string[]) || [];

      // 新作ゲームを詳細情報付きで取得
      const newGames = await getNewReleases();
      if (newGames.length === 0) {
        return NextResponse.json(
          { error: '新作ゲームの取得に失敗しました' },
          { status: 500 }
        );
      }

      // 詳細情報をGeminiに渡す形式に変換
      const gamesWithDetails = newGames.map(g => ({
        appid: g.appid,
        name: g.name,
        genres: g.genres,
        tags: g.tags,
        description: g.description,
      }));

      const newReleases = await recommendNewReleases(
        genreStats,
        gamesWithDetails,
        favoriteGames,
        userBacklogGames
      );
      // 成功した場合のみカウントを増やす
      incrementRateLimit('gemini-api');
      return NextResponse.json({ newReleases });
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
