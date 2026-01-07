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
    `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&skip_unvetted_apps=0&include_free_sub=1`
  );
  const data = await response.json();

  return data.response.games || [];
}

export async function getGameDetails(appId: number, language: 'ja' | 'en' = 'ja'): Promise<SteamGameDetails | null> {
  try {
    const steamLang = language === 'ja' ? 'japanese' : 'english';
    const response = await fetch(
      `${STEAM_STORE_API}/appdetails?appids=${appId}&l=${steamLang}`
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

// Steamジャンル名からタグIDへのマッピング
const GENRE_TO_TAG: Record<string, string> = {
  'アドベンチャー': '21',
  'Adventure': '21',
  'インディー': '492',
  'Indie': '492',
  'RPG': '122',
  'アクション': '19',
  'Action': '19',
  'カジュアル': '597',
  'Casual': '597',
  'シミュレーション': '599',
  'Simulation': '599',
  'ストラテジー': '9',
  'Strategy': '9',
  'パズル': '1664',
  'Puzzle': '1664',
};

// ユーザーのジャンルに基づいて最近リリースされたゲームを取得
export async function getNewReleases(userGenres: string[] = []): Promise<NewReleaseGame[]> {
  try {
    const appIds: number[] = [];

    // ユーザーのジャンルからタグIDを取得
    const tagIds = userGenres
      .map(g => GENRE_TO_TAG[g])
      .filter(Boolean)
      .slice(0, 3); // 最大3つのタグで検索

    // タグIDがある場合はSteam検索APIを使用
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        try {
          const searchRes = await fetch(
            `https://store.steampowered.com/search/results/?query&start=0&count=15&sort_by=Released_DESC&category1=998&tags=${tagId}&json=1`
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.items) {
              for (const item of searchData.items) {
                const match = item.logo?.match(/\/apps\/(\d+)\//);
                if (match) {
                  const id = parseInt(match[1]);
                  if (!appIds.includes(id)) appIds.push(id);
                }
              }
            }
          }
        } catch {
          // 検索失敗しても続行
        }
      }
    }

    // タグ検索で十分なゲームが取得できない場合はfeaturedcategoriesからも取得
    if (appIds.length < 10) {
      const featuredRes = await fetch(`${STEAM_STORE_API}/featuredcategories?l=japanese`);
      if (featuredRes.ok) {
        const data = await featuredRes.json();
        if (data.new_releases?.items) {
          for (const item of data.new_releases.items) {
            if (!appIds.includes(item.id)) appIds.push(item.id);
          }
        }
      }
    }

    // 3ヶ月前の日付を計算
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

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

        // リリース日をチェック（3ヶ月以内のみ）
        const releaseDate = gameData.release_date;
        if (releaseDate?.coming_soon) return null;

        if (releaseDate?.date) {
          const dateStr = releaseDate.date;
          const releaseDateObj = new Date(dateStr.replace(/年|月/g, '/').replace(/日/, ''));
          if (isNaN(releaseDateObj.getTime()) || releaseDateObj < threeMonthsAgo) {
            return null;
          }
        }

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
