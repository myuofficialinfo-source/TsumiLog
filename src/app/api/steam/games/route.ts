import { NextRequest, NextResponse } from 'next/server';
import {
  getOwnedGames,
  getUserProfile,
  resolveVanityURL,
  extractSteamId,
  getWishlist,
  getCompletedGames,
} from '@/lib/steam';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const steamInput = searchParams.get('steamId');
  const includeWishlist = searchParams.get('wishlist') === 'true';

  if (!steamInput) {
    return NextResponse.json(
      { error: 'Steam IDまたはプロフィールURLが必要です' },
      { status: 400 }
    );
  }

  try {
    let steamId = extractSteamId(steamInput);

    // Vanity URLの場合は解決
    if (!/^\d{17}$/.test(steamId)) {
      const resolvedId = await resolveVanityURL(steamId);
      if (!resolvedId) {
        return NextResponse.json(
          { error: 'Steam IDが見つかりませんでした' },
          { status: 404 }
        );
      }
      steamId = resolvedId;
    }

    // 並列でデータ取得
    const [profile, ownedGames, wishlist] = await Promise.all([
      getUserProfile(steamId),
      getOwnedGames(steamId),
      includeWishlist ? getWishlist(steamId) : Promise.resolve([]),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: 'プロフィールが見つからないか、非公開です' },
        { status: 404 }
      );
    }

    // プレイ時間30分未満のゲームを抽出
    const potentialBacklog = ownedGames.filter(g => g.playtime_forever < 30);

    // トロコン済み（実績100%）のゲームを取得
    const completedGames = await getCompletedGames(
      steamId,
      potentialBacklog.map(g => g.appid)
    );

    // 積みゲーを特定（30分未満 かつ トロコンしていない）
    const backlog = potentialBacklog.filter(g => !completedGames.has(g.appid));

    // ジャンル統計は別途詳細取得が必要なので、クライアント側で行う
    const totalPlaytime = ownedGames.reduce((sum, g) => sum + g.playtime_forever, 0);

    return NextResponse.json({
      profile,
      stats: {
        totalGames: ownedGames.length,
        backlogCount: backlog.length,
        totalPlaytimeHours: Math.round(totalPlaytime / 60),
        playedGames: ownedGames.length - backlog.length,
      },
      games: ownedGames.map(game => ({
        ...game,
        isBacklog: game.playtime_forever < 30 && !completedGames.has(game.appid),
        playtimeHours: Math.round(game.playtime_forever / 60 * 10) / 10,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      })),
      wishlist,
    });
  } catch (error) {
    console.error('Steam API error:', error);
    return NextResponse.json(
      { error: 'Steam APIへの接続に失敗しました' },
      { status: 500 }
    );
  }
}
