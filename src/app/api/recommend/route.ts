import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, analyzeGamingPreferences, recommendNewReleases, FavoriteGame } from '@/lib/gemini';
import { getNewReleases } from '@/lib/steam';
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limit';
import { GenreStats, BacklogGame } from '@/types/steam';

// キャッシュ（5分間有効）
interface CacheEntry {
  data: string;
  timestamp: number;
}
interface NewReleasesCacheEntry {
  data: unknown;
  timestamp: number;
}
const analysisCache = new Map<string, CacheEntry>();
const newReleasesCache = new Map<string, NewReleasesCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// ジャンル統計からキャッシュキーを生成
function generateCacheKey(genreStats: GenreStats[], totalGames: number): string {
  const topGenres = genreStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => `${g.genre}:${Math.floor(g.count / 10) * 10}`); // 10本単位で丸める
  const gamesBucket = Math.floor(totalGames / 50) * 50; // 50本単位で丸める
  return `${topGenres.join('|')}|games:${gamesBucket}`;
}

// new-releases用のキャッシュキー生成
function generateNewReleasesKey(genreStats: GenreStats[]): string {
  const topGenres = genreStats
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 5)
    .map(g => g.genre);
  return `new-releases:${topGenres.join('|')}`;
}

// 古いキャッシュを削除
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }
  for (const [key, entry] of newReleasesCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      newReleasesCache.delete(key);
    }
  }
}

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

      // キャッシュをチェック
      cleanupCache();
      const cacheKey = generateCacheKey(genreStats, totalGames);
      const cached = analysisCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('Cache hit for analysis:', cacheKey);
        return NextResponse.json({ analysis: cached.data, cached: true });
      }

      console.log('Cache miss, calling Gemini API:', cacheKey);

      try {
        const analysis = await analyzeGamingPreferences(genreStats, totalGames, totalPlaytime, lang);

        // キャッシュに保存
        analysisCache.set(cacheKey, { data: analysis, timestamp: Date.now() });

        // 成功した場合のみカウントを増やす
        incrementRateLimit('gemini-api');
        return NextResponse.json({ analysis });
      } catch (geminiError) {
        console.error('Gemini API error for analyze:', geminiError);
        return NextResponse.json(
          {
            error: lang === 'ja'
              ? 'サーバーが混雑しています。しばらく待ってから再度お試しください。'
              : 'Server is busy. Please try again later.',
            busy: true
          },
          { status: 503 }
        );
      }
    }

    if (type === 'new-releases') {
      if (!genreStats) {
        return NextResponse.json(
          { error: 'ジャンル統計が必要です' },
          { status: 400 }
        );
      }

      // キャッシュをチェック
      cleanupCache();
      const nrCacheKey = generateNewReleasesKey(genreStats);
      const nrCached = newReleasesCache.get(nrCacheKey);

      if (nrCached && Date.now() - nrCached.timestamp < CACHE_TTL) {
        console.log('Cache hit for new-releases:', nrCacheKey);
        return NextResponse.json({ newReleases: nrCached.data, cached: true });
      }

      console.log('Cache miss for new-releases:', nrCacheKey);

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
      try {
        const newReleases = await recommendNewReleases(
          genreStats,
          candidates,
          favoriteGames,
          wishlistNames,
          lang
        );

        // キャッシュに保存
        newReleasesCache.set(nrCacheKey, { data: newReleases, timestamp: Date.now() });

        // 成功した場合のみカウントを増やす
        incrementRateLimit('gemini-api');
        return NextResponse.json({ newReleases });
      } catch (geminiError) {
        console.error('Gemini API error for new-releases:', geminiError);
        return NextResponse.json(
          {
            error: lang === 'ja'
              ? 'サーバーが混雑しています。しばらく待ってから再度お試しください。'
              : 'Server is busy. Please try again later.',
            busy: true
          },
          { status: 503 }
        );
      }
    }

    if (!backlogGames || !genreStats) {
      return NextResponse.json(
        { error: '積みゲーリストとジャンル統計が必要です' },
        { status: 400 }
      );
    }

    try {
      const recommendations = await generateRecommendations(
        backlogGames,
        genreStats,
        userPreferences,
        lang
      );

      // 成功した場合のみカウントを増やす
      incrementRateLimit('gemini-api');
      return NextResponse.json({ recommendations });
    } catch (geminiError) {
      console.error('Gemini API error for recommend:', geminiError);
      return NextResponse.json(
        {
          error: lang === 'ja'
            ? 'AIサーバーが混雑しています。しばらく待ってから再度お試しください。'
            : 'AI server is busy. Please try again later.',
          busy: true
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Recommendation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `レコメンドの生成に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
