import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences, recommendNewReleases, FavoriteGame } from '@/lib/gemini';
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
    const { backlogGames, genreStats, userPreferences, type, language } = body as {
      backlogGames: BacklogGame[];
      genreStats: GenreStats[];
      userPreferences?: string;
      type: 'recommend' | 'analyze' | 'new-releases';
      language?: 'ja' | 'en';
    };
    const lang = language || 'ja';

    if (type === 'analyze') {
      const totalGames = body.totalGames || 0;
      const totalPlaytime = body.totalPlaytime || 0;
      const analysis = await analyzeGamingPreferences(genreStats, totalGames, totalPlaytime, lang);
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

      // フロントから送られてくるユーザー情報
      const favoriteGames = (body.favoriteGames || []) as FavoriteGame[];
      const wishlistNames = (body.wishlistNames || []) as string[];

      // ユーザーのトップジャンルを取得
      const topGenres = genreStats
        .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
        .slice(0, 5)
        .map(g => g.genre);

      // ユーザーのジャンルに基づいて新作ゲームを取得
      const candidates = await getNewReleases(topGenres);
      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'ゲームの取得に失敗しました' },
          { status: 500 }
        );
      }

      // Geminiで最適な新作を選定
      const newReleases = await recommendNewReleases(
        genreStats,
        candidates,
        favoriteGames,
        wishlistNames,
        lang
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
      userPreferences,
      lang
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
