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

// SteamSpyからゲーム情報を取得（ユーザータグ、高評価率）
export async function getSteamSpyData(appId: number): Promise<{
  tags: string[];
  positiveRate: number;
} | null> {
  try {
    const response = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`
    );
    if (!response.ok) return null;

    const data = await response.json();

    // タグはオブジェクト形式 { "Roguelike": 1234, "Action": 567 } で、数値は投票数
    const tags = data.tags ? Object.keys(data.tags).slice(0, 10) : [];

    // 高評価率を計算
    const positive = data.positive || 0;
    const negative = data.negative || 0;
    const total = positive + negative;
    const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 75;

    return { tags, positiveRate };
  } catch {
    return null;
  }
}

// Steam Reviews APIからレビュー数を取得（フォールバック用）
async function getReviewCount(appId: number): Promise<{ total: number } | undefined> {
  try {
    // language=allで全言語のレビュー合計を取得
    const response = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=0&language=all`
    );
    if (!response.ok) {
      console.log(`[getReviewCount] appId=${appId}: response not ok (${response.status})`);
      return undefined;
    }
    const data = await response.json();
    console.log(`[getReviewCount] appId=${appId}: success=${data.success}, total_reviews=${data.query_summary?.total_reviews}`);
    if (data.success === 1 && data.query_summary) {
      const total = data.query_summary.total_reviews || 0;
      if (total > 0) {
        return { total };
      }
    }
    return undefined;
  } catch (error) {
    console.error(`[getReviewCount] appId=${appId}: error`, error);
    return undefined;
  }
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

    // SteamSpyからタグと高評価率を取得
    const steamSpyData = await getSteamSpyData(appId);

    // レビュー数を取得
    let recommendations = gameData.recommendations;
    console.log(`[getGameDetails] appId=${appId}: Store API recommendations=${JSON.stringify(recommendations)}, type=${gameData.type}`);

    // Demoの場合は常に本体のレビュー数を使用（一貫性のため）
    if (gameData.type === 'demo' && gameData.fullgame?.appid) {
      const fullGameAppId = parseInt(gameData.fullgame.appid, 10);
      console.log(`[getGameDetails] appId=${appId}: Demo detected, using full game (${fullGameAppId}) reviews`);
      recommendations = await getReviewCount(fullGameAppId);
      console.log(`[getGameDetails] appId=${appId}: Full game reviews result=${JSON.stringify(recommendations)}`);
    } else if (!recommendations) {
      // 通常ゲームでrecommendationsがない場合はReviews APIから取得
      console.log(`[getGameDetails] appId=${appId}: No recommendations from Store API, calling Reviews API fallback...`);
      recommendations = await getReviewCount(appId);
      console.log(`[getGameDetails] appId=${appId}: Reviews API fallback result=${JSON.stringify(recommendations)}`);
    }

    return {
      appid: gameData.steam_appid,
      name: gameData.name,
      description: gameData.short_description,
      genres: gameData.genres || [],
      categories: gameData.categories || [],
      tags: steamSpyData?.tags,  // SteamSpyからのユーザータグ
      header_image: gameData.header_image,
      release_date: gameData.release_date,
      price_overview: gameData.price_overview,
      recommendations,  // レビュー数（Store APIまたはReviews APIから）
      metacritic: gameData.metacritic,
      positiveRate: steamSpyData?.positiveRate,  // 高評価率
      userTags: steamSpyData?.tags,  // ユーザータグ（別名保存）
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

// ユーザーの全実績達成率を取得
export async function getPlayerAchievements(steamId: string, appId: number): Promise<{ achieved: number; total: number } | null> {
  try {
    const response = await fetch(
      `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appid=${appId}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.playerstats?.success || !data.playerstats?.achievements) {
      return null;
    }

    const achievements = data.playerstats.achievements;
    const total = achievements.length;
    const achieved = achievements.filter((a: { achieved: number }) => a.achieved === 1).length;

    return { achieved, total };
  } catch {
    return null;
  }
}

// 複数ゲームのトロコン状態を一括取得（実績100%達成）
export async function getCompletedGames(steamId: string, appIds: number[]): Promise<Set<number>> {
  const completedGames = new Set<number>();

  // 並列で取得（ただしレート制限を考慮して10本ずつ）
  const batchSize = 10;
  for (let i = 0; i < appIds.length; i += batchSize) {
    const batch = appIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (appId) => {
        const achievement = await getPlayerAchievements(steamId, appId);
        if (achievement && achievement.total > 0 && achievement.achieved === achievement.total) {
          return appId;
        }
        return null;
      })
    );

    results.forEach(appId => {
      if (appId !== null) completedGames.add(appId);
    });

    // レート制限対策
    if (i + batchSize < appIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return completedGames;
}

export interface NewReleaseGame {
  appid: number;
  name: string;
  genres: string[];
  tags: string[];
  description: string;
  headerImage: string;
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

// リトライ付きfetch（5回まで）
async function fetchWithRetry(url: string, maxRetries: number = 5): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      // 429やその他のエラーの場合は待機してリトライ
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  return null;
}

// ユーザーのジャンルに基づいて最近リリースされたゲームを取得
export async function getNewReleases(userGenres: string[] = []): Promise<NewReleaseGame[]> {
  try {
    const appIds: number[] = [];

    // まずfeaturedcategoriesから取得（より安定している）
    try {
      const featuredRes = await fetchWithRetry(`${STEAM_STORE_API}/featuredcategories?l=japanese`);
      if (featuredRes) {
        const data = await featuredRes.json();
        if (data.new_releases?.items) {
          for (const item of data.new_releases.items) {
            if (!appIds.includes(item.id)) appIds.push(item.id);
          }
        }
        // top_sellersからも取得
        if (data.top_sellers?.items) {
          for (const item of data.top_sellers.items) {
            if (!appIds.includes(item.id)) appIds.push(item.id);
          }
        }
      }
    } catch {
      console.log('Featured categories fetch failed');
    }

    // ユーザーのジャンルからタグIDを取得
    const tagIds = userGenres
      .map(g => GENRE_TO_TAG[g])
      .filter(Boolean)
      .slice(0, 3); // 最大3つのタグで検索

    // タグIDがある場合はSteam検索APIを使用（追加で取得）
    if (tagIds.length > 0 && appIds.length < 20) {
      for (const tagId of tagIds) {
        try {
          const searchRes = await fetchWithRetry(
            `https://store.steampowered.com/search/results/?query&start=0&count=15&sort_by=Released_DESC&category1=998&tags=${tagId}&json=1`
          );
          if (searchRes) {
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

    // 3ヶ月前の日付を計算
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // appIdsが取得できなかった場合は空配列（APIで503を返す）
    if (appIds.length === 0) {
      console.log('No appIds found from Steam API');
      return [];
    }

    console.log(`Found ${appIds.length} candidate games from Steam`);

    // 各ゲームの詳細を取得（並列で最大25本、レート制限対策でバッチ処理）
    const targetAppIds = appIds.slice(0, 25);
    const detailsPromises = targetAppIds.map(async (appid) => {
      try {
        const detailRes = await fetchWithRetry(
          `${STEAM_STORE_API}/appdetails?appids=${appid}&l=japanese`
        );
        if (!detailRes) return null;
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
          headerImage: gameData.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(detailsPromises);
    const validResults = results.filter((r): r is NewReleaseGame => r !== null);

    // 全ての詳細取得が失敗した場合は空配列（APIで503を返す）
    if (validResults.length === 0) {
      console.log('All game details fetch failed');
    }

    return validResults;
  } catch {
    return [];
  }
}

// フレンド情報の型
export interface SteamFriend {
  steamid: string;
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number; // 0=Offline, 1=Online, 2=Busy, 3=Away, 4=Snooze, 5=looking to trade, 6=looking to play
  gameextrainfo?: string; // 現在プレイ中のゲーム名
  gameid?: string; // 現在プレイ中のゲームID
}

// 最近プレイしたゲームの型
export interface RecentlyPlayedGame {
  appid: number;
  name: string;
  playtime_2weeks: number; // 過去2週間のプレイ時間（分）
  playtime_forever: number;
  img_icon_url: string;
}

// フレンドリストを取得
export async function getFriendList(steamId: string): Promise<{ steamid: string; friend_since: number }[]> {
  try {
    const response = await fetch(
      `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&relationship=friend`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.friendslist?.friends || [];
  } catch {
    return [];
  }
}

// 複数ユーザーのプロフィールを一括取得
export async function getPlayerSummaries(steamIds: string[]): Promise<SteamFriend[]> {
  if (steamIds.length === 0) return [];

  try {
    // 一度に100人まで取得可能
    const response = await fetch(
      `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamIds.join(',')}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.response?.players || [];
  } catch {
    return [];
  }
}

// ユーザーの最近プレイしたゲームを取得
export async function getRecentlyPlayedGames(steamId: string, count: number = 10): Promise<RecentlyPlayedGame[]> {
  try {
    const response = await fetch(
      `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&count=${count}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.response?.games || [];
  } catch {
    return [];
  }
}

// フレンドの最近のプレイ履歴を取得（アイコン付き）
export async function getFriendsRecentActivity(steamId: string, limit: number = 20): Promise<{
  friend: SteamFriend;
  recentGames: RecentlyPlayedGame[];
}[]> {
  try {
    // フレンドリストを取得
    const friendsList = await getFriendList(steamId);
    if (friendsList.length === 0) return [];

    // フレンドのSteamIDを取得（最大100人）
    const friendIds = friendsList.slice(0, 100).map(f => f.steamid);

    // フレンドのプロフィールを取得
    const friends = await getPlayerSummaries(friendIds);

    // 各フレンドの最近のプレイ履歴を取得（上位20人のみ、API負荷軽減）
    const activeFriends = friends
      .filter(f => f.personastate > 0 || f.gameextrainfo) // オンラインまたはゲーム中
      .slice(0, limit);

    const results = await Promise.all(
      activeFriends.map(async (friend) => {
        const recentGames = await getRecentlyPlayedGames(friend.steamid, 5);
        return { friend, recentGames };
      })
    );

    return results.filter(r => r.recentGames.length > 0);
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
