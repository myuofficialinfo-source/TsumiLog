import { SteamGame, SteamGameDetails, UserProfile, WishlistGame } from '@/types/steam';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_STORE_API = 'https://store.steampowered.com/api';

export async function resolveVanityURL(vanityUrl: string): Promise<string | null> {
  const response = await fetch(
    `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${vanityUrl}`
  );
  const data = await response.json();

  if (data.response.success === 1) {
    return data.response.steamid;
  }
  return null;
}

export async function getUserProfile(steamId: string): Promise<UserProfile | null> {
  const response = await fetch(
    `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
  );
  const data = await response.json();

  const player = data.response.players[0];
  if (!player) return null;

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
  };
}

export async function getOwnedGames(steamId: string): Promise<SteamGame[]> {
  const response = await fetch(
    `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
  );
  const data = await response.json();

  return data.response.games || [];
}

export async function getGameDetails(appId: number): Promise<SteamGameDetails | null> {
  try {
    const response = await fetch(
      `${STEAM_STORE_API}/appdetails?appids=${appId}&l=japanese`
    );
    const data = await response.json();

    if (!data[appId]?.success) return null;

    const gameData = data[appId].data;
    return {
      appid: gameData.steam_appid,
      name: gameData.name,
      description: gameData.short_description,
      genres: gameData.genres || [],
      categories: gameData.categories || [],
      header_image: gameData.header_image,
      release_date: gameData.release_date,
      price_overview: gameData.price_overview,
    };
  } catch {
    return null;
  }
}

export async function getWishlist(steamId: string): Promise<WishlistGame[]> {
  try {
    // Wishlist APIはページネーションが必要
    const games: WishlistGame[] = [];
    let page = 0;

    while (true) {
      const response = await fetch(
        `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=${page}`
      );

      if (!response.ok) break;

      const data = await response.json();
      if (!data || Object.keys(data).length === 0) break;

      for (const [appid, info] of Object.entries(data)) {
        const gameInfo = info as { name: string; priority: number; added: number };
        games.push({
          appid: parseInt(appid),
          name: gameInfo.name,
          priority: gameInfo.priority,
          added: gameInfo.added,
        });
      }

      page++;
      if (page > 10) break; // 安全のため上限
    }

    return games;
  } catch {
    return [];
  }
}

// 積みゲーを判定（プレイ時間0または30分未満）
export function identifyBacklog(games: SteamGame[], thresholdMinutes = 30): SteamGame[] {
  return games.filter(game => game.playtime_forever < thresholdMinutes);
}

export interface NewReleaseGame {
  appid: number;
  name: string;
  genres: string[];
  tags: string[];
  description: string;
}

// 新作・人気ゲームを取得（詳細情報付き）
export async function getNewReleases(): Promise<NewReleaseGame[]> {
  try {
    const appIds: number[] = [];

    // 複数のソースからゲームを取得
    const [featuredRes, searchRes] = await Promise.all([
      // 1. featuredcategories から新作・人気を取得
      fetch(`${STEAM_STORE_API}/featuredcategories?l=japanese`),
      // 2. 売上トップから取得（より人気のゲームを含む）
      fetch(`https://store.steampowered.com/search/results/?query&start=0&count=30&sort_by=_ASC&force_infinite=1&category1=998&supportedlang=japanese&hidef2p=1&filter=topsellers&ndl=1&json=1`),
    ]);

    // featuredcategories からの取得
    if (featuredRes.ok) {
      const data = await featuredRes.json();

      // 新作カテゴリ
      if (data.new_releases?.items) {
        for (const item of data.new_releases.items) {
          if (!appIds.includes(item.id)) appIds.push(item.id);
        }
      }

      // トップセラー
      if (data.top_sellers?.items) {
        for (const item of data.top_sellers.items) {
          if (!appIds.includes(item.id)) appIds.push(item.id);
        }
      }

      // スペシャル（セール中の人気ゲーム）
      if (data.specials?.items) {
        for (const item of data.specials.items) {
          if (!appIds.includes(item.id)) appIds.push(item.id);
        }
      }
    }

    // 売上検索結果からの取得
    if (searchRes.ok) {
      try {
        const searchData = await searchRes.json();
        if (searchData.items) {
          for (const item of searchData.items) {
            // URLからappidを抽出
            const match = item.logo?.match(/\/apps\/(\d+)\//);
            if (match) {
              const id = parseInt(match[1]);
              if (!appIds.includes(id)) appIds.push(id);
            }
          }
        }
      } catch {
        // 検索結果のパースに失敗しても続行
      }
    }

    // 各ゲームの詳細を取得（並列で最大25本）
    const targetAppIds = appIds.slice(0, 25);
    const detailsPromises = targetAppIds.map(async (appid) => {
      try {
        const detailRes = await fetch(
          `${STEAM_STORE_API}/appdetails?appids=${appid}&l=japanese`
        );
        const detailData = await detailRes.json();

        if (!detailData[appid]?.success) return null;

        const gameData = detailData[appid].data;

        // DLCやサウンドトラックを除外
        if (gameData.type !== 'game') return null;

        return {
          appid,
          name: gameData.name,
          genres: (gameData.genres || []).map((g: { description: string }) => g.description),
          tags: (gameData.categories || []).slice(0, 5).map((c: { description: string }) => c.description),
          description: gameData.short_description || '',
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(detailsPromises);
    return results.filter((r): r is NewReleaseGame => r !== null);
  } catch {
    return [];
  }
}

// SteamIDを抽出（URL形式に対応）
export function extractSteamId(input: string): string {
  // 直接SteamID64が入力された場合
  if (/^\d{17}$/.test(input)) {
    return input;
  }

  // プロフィールURLからの抽出
  const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (profileMatch) {
    return profileMatch[1];
  }

  // カスタムURLからの抽出（vanity URL）
  const idMatch = input.match(/steamcommunity\.com\/id\/([^\/]+)/);
  if (idMatch) {
    return idMatch[1]; // これはvanity URLなので後で解決が必要
  }

  // それ以外はvanity URLとして扱う
  return input;
}
