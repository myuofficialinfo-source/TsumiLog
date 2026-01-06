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
