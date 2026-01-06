import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences } from '@/lib/gemini';
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

      // ユーザーのジャンル重みを計算（プレイ時間ベース）
      const genreWeights = new Map<string, number>();
      let totalPlaytime = 0;
      genreStats.forEach(g => {
        totalPlaytime += g.totalPlaytime;
      });
      genreStats.forEach(g => {
        const weight = totalPlaytime > 0 ? g.totalPlaytime / totalPlaytime : g.count / genreStats.length;
        genreWeights.set(g.genre, weight);
      });

      // 各候補ゲームにスコアを計算
      const scoredGames = candidates.map(game => {
        let score = 0;
        const matchedGenres: string[] = [];

        game.genres.forEach(genre => {
          const weight = genreWeights.get(genre);
          if (weight) {
            score += weight;
            matchedGenres.push(genre);
          }
        });

        // 理由を生成（ゲームの説明を使用）
        const reason = game.description
          ? game.description.slice(0, 80) + (game.description.length > 80 ? '...' : '')
          : (matchedGenres.length > 0 ? `${matchedGenres.join('・')}ジャンルが一致` : '新作タイトル');

        return {
          appid: game.appid,
          name: game.name,
          genre: matchedGenres.length > 0 ? matchedGenres.join(', ') : game.genres.slice(0, 2).join(', '),
          reason,
          score,
          storeUrl: `https://store.steampowered.com/app/${game.appid}`,
          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        };
      });

      // スコア順にソートして上位5つを返す
      const newReleases = scoredGames
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

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
