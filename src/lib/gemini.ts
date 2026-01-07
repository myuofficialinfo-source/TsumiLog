import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenreStats, BacklogGame } from '@/types/steam';

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error('GOOGLE_AI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export type Language = 'ja' | 'en';

export async function generateRecommendations(
  backlogGames: BacklogGame[],
  genreStats: GenreStats[],
  userPreferences?: string,
  language: Language = 'ja'
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const topGenres = genreStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => g.genre);

  const backlogSummary = backlogGames
    .slice(0, 20)
    .map(g => `- ${g.name}`)
    .join('\n');

  const prompt = language === 'ja'
    ? `あなたはゲームレコメンドの専門家です。以下のユーザーの積みゲー（未プレイゲーム）リストの中から、優先的にプレイすべきおすすめゲームを5つ提案してください。

【重要】必ず以下の「積みゲーリスト」の中からのみ選んでください。新しいゲームの購入提案は不要です。

## ユーザーの積みゲー（未プレイゲーム）リスト:
${backlogSummary}

## よく遊ぶジャンル:
${topGenres.join(', ')}

${userPreferences ? `## ユーザーの好み:\n${userPreferences}` : ''}

## 回答形式:
積みゲーリストの中から5つ選び、以下の形式で回答してください。
【重要】「承知しました」「はい」などの前置きは一切不要です。いきなり「1. ゲーム名」から始めてください。

1. **ゲーム名**（※必ず上記リストから選択）
   - ジャンル:
   - おすすめ理由: (なぜ今プレイすべきか、ユーザーの好みとの関連性)
   - プレイ時間の目安:

ユーザーの好むジャンルや傾向を考慮して、積みゲーの中から最適なものを提案してください。`
    : `You are a game recommendation expert. From the user's backlog (unplayed games) list below, suggest 5 games they should prioritize playing.

【IMPORTANT】You must only select from the "Backlog List" below. Do not suggest purchasing new games.

## User's Backlog (Unplayed Games) List:
${backlogSummary}

## Frequently Played Genres:
${topGenres.join(', ')}

${userPreferences ? `## User Preferences:\n${userPreferences}` : ''}

## Response Format:
Select 5 games from the backlog list and respond in the following format.
【IMPORTANT】Do not include any preamble like "Sure" or "Okay". Start directly with "1. Game Name".

1. **Game Name** (Must be selected from the list above)
   - Genre:
   - Why Recommended: (Why they should play it now, connection to user's preferences)
   - Estimated Playtime:

Consider the user's preferred genres and tendencies to suggest the best games from their backlog.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`AIレコメンドの生成に失敗しました: ${errorMessage}`);
  }
}

export async function analyzeGamingPreferences(
  genreStats: GenreStats[],
  totalGames: number,
  totalPlaytime: number,
  language: Language = 'ja'
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const genreSummary = language === 'ja'
    ? genreStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(g => `${g.genre}: ${g.count}本 (総プレイ時間: ${Math.round(g.totalPlaytime / 60)}時間)`)
        .join('\n')
    : genreStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(g => `${g.genre}: ${g.count} games (Total Playtime: ${Math.round(g.totalPlaytime / 60)} hours)`)
        .join('\n');

  const prompt = language === 'ja'
    ? `あなたはゲーム分析の専門家です。以下のユーザーのゲームライブラリを分析し、ゲーマーとしての特徴を説明してください。

## ライブラリ統計:
- 総ゲーム数: ${totalGames}本
- 総プレイ時間: ${Math.round(totalPlaytime / 60)}時間

## ジャンル別統計:
${genreSummary}

## 回答形式（必ずこの順番で出力してください）:

【キャッチコピー】
まず最初に、このユーザーを一言で表すキャッチーで面白い称号を1行で出力してください。
例：「深夜のダンジョン探索者」「セール戦士・積みゲーマスター」「インディーゲームの目利き職人」など
SNSでシェアしたくなるような、ユニークで印象的な称号にしてください。

---

1. **ゲーマータイプ**: このユーザーはどんなタイプのゲーマーか（1-2文）
2. **好みの傾向**: 好きなゲームの特徴（箇条書き3-4点）
3. **意外な発見**: データから読み取れる興味深いポイント
4. **おすすめの遊び方**: 積みゲーを消化するためのアドバイス`
    : `You are a gaming analysis expert. Analyze the user's game library below and describe their characteristics as a gamer.

## Library Statistics:
- Total Games: ${totalGames}
- Total Playtime: ${Math.round(totalPlaytime / 60)} hours

## Genre Statistics:
${genreSummary}

## Response Format (Please output in this order):

【Catchphrase】
First, output a catchy and fun title that describes this user in one line.
Examples: "Midnight Dungeon Explorer", "Sale Warrior & Backlog Master", "Indie Game Connoisseur"
Make it unique and memorable, something worth sharing on social media.

---

1. **Gamer Type**: What type of gamer is this user (1-2 sentences)
2. **Preference Trends**: Characteristics of games they like (3-4 bullet points)
3. **Surprising Discoveries**: Interesting points that can be read from the data
4. **Recommended Play Style**: Advice for clearing their backlog`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`分析の生成に失敗しました: ${errorMessage}`);
  }
}

export interface NewGameRecommendation {
  appid: number;
  name: string;
  reason: string;
  genre: string;
  storeUrl: string;
  headerImage: string;
  description?: string;
}

export interface FavoriteGame {
  name: string;
  playtime: number; // hours
  genres: string[];
}

export async function recommendNewReleases(
  genreStats: GenreStats[],
  newGames: { appid: number; name: string; genres?: string[]; tags?: string[]; description?: string; headerImage?: string }[],
  favoriteGames: FavoriteGame[] = [],
  wishlistNames: string[] = [],
  language: Language = 'ja'
): Promise<NewGameRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // プレイ時間順でソートしたジャンル統計
  const topGenresByPlaytime = genreStats
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 5)
    .map(g => language === 'ja'
      ? `${g.genre} (${Math.round(g.totalPlaytime / 60)}時間)`
      : `${g.genre} (${Math.round(g.totalPlaytime / 60)} hours)`);

  // ユーザーのお気に入りゲーム情報
  const favoriteSection = favoriteGames.length > 0
    ? language === 'ja'
      ? `## 【最重要】ユーザーがよく遊んでいるゲーム（プレイ時間順）:
${favoriteGames.map(g => `- ${g.name}: ${g.playtime}時間 [${g.genres.join(', ')}]`).join('\n')}`
      : `## 【MOST IMPORTANT】User's Most Played Games (by playtime):
${favoriteGames.map(g => `- ${g.name}: ${g.playtime} hours [${g.genres.join(', ')}]`).join('\n')}`
    : '';

  // ウィッシュリスト情報
  const wishlistSection = wishlistNames.length > 0
    ? language === 'ja'
      ? `## ユーザーのウィッシュリスト（興味のあるゲーム）:
${wishlistNames.join(', ')}`
      : `## User's Wishlist (Games of Interest):
${wishlistNames.join(', ')}`
    : '';

  // 新作ゲームリスト
  const newGamesList = newGames
    .slice(0, 25)
    .map(g => {
      const genres = g.genres?.length
        ? (language === 'ja' ? `ジャンル: ${g.genres.join(', ')}` : `Genres: ${g.genres.join(', ')}`)
        : '';
      const desc = g.description
        ? (language === 'ja' ? `説明: ${g.description.slice(0, 200)}` : `Description: ${g.description.slice(0, 200)}`)
        : '';
      return `- ${g.name} (AppID: ${g.appid}) | ${genres} | ${desc}`;
    })
    .join('\n');

  const prompt = language === 'ja'
    ? `あなたはゲームレコメンドの専門家です。ユーザーの遊んでいるゲームとウィッシュリストを分析し、最も合う新作ゲームを選んでください。

${favoriteSection}

## ユーザーがよく遊ぶジャンル（プレイ時間順）:
${topGenresByPlaytime.join(', ')}

${wishlistSection}

## 候補ゲームリスト（直近3ヶ月の新作、この中から選んでください）:
${newGamesList}

## 選定基準:
1. ユーザーが最もプレイしているゲームのジャンル・雰囲気に近いものを優先
2. ウィッシュリストにあるゲームと似た傾向のゲームを選ぶ
3. ゲームの説明文のキーワードがユーザーの好みと一致するものを選ぶ
4. ユーザーがほとんど遊んでいないジャンルは避ける

## 回答形式:
必ず以下のJSON形式のみで回答してください。前置き不要。

\`\`\`json
[
  {
    "appid": 数字,
    "name": "ゲーム名（候補リストから正確にコピー）",
    "reason": "なぜこのユーザーに合うか（ユーザーの遊んでいるゲームやウィッシュリストとの類似点を具体的に）",
    "genre": "主なジャンル"
  }
]
\`\`\`

候補リストから5つ選んでください。`
    : `You are a game recommendation expert. Analyze the user's played games and wishlist to select the best new releases for them.

${favoriteSection}

## User's Most Played Genres (by playtime):
${topGenresByPlaytime.join(', ')}

${wishlistSection}

## Candidate Game List (new releases from the last 3 months, select from this list):
${newGamesList}

## Selection Criteria:
1. Prioritize games with similar genres/atmosphere to the user's most played games
2. Select games with similar tendencies to those in the wishlist
3. Choose games whose description keywords match user preferences
4. Avoid genres the user rarely plays

## Response Format:
Respond ONLY in the following JSON format. No preamble.

\`\`\`json
[
  {
    "appid": number,
    "name": "Game Name (copy exactly from candidate list)",
    "reason": "Why this fits the user (specific similarities to their played games or wishlist)",
    "genre": "Main Genre"
  }
]
\`\`\`

Select 5 games from the candidate list.`;

  // 有効なAppIDのセットを作成
  const validAppIds = new Set(newGames.map(g => g.appid));

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSONを抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が得られませんでした');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const recommendations = JSON.parse(jsonStr) as { appid: number; name: string; reason: string; genre: string }[];

    // 有効なAppIDのみをフィルタリング（Geminiが創作したゲームを除外）
    const validRecommendations = recommendations.filter(rec => validAppIds.has(rec.appid));

    // newGamesから情報を取得するマップを作成
    const gameInfoMap = new Map(newGames.map(g => [g.appid, { description: g.description, headerImage: g.headerImage }]));

    return validRecommendations.map(rec => {
      const gameInfo = gameInfoMap.get(rec.appid);
      return {
        ...rec,
        storeUrl: `https://store.steampowered.com/app/${rec.appid}`,
        headerImage: gameInfo?.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${rec.appid}/header.jpg`,
        description: gameInfo?.description,
      };
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`新作おすすめの生成に失敗しました: ${errorMessage}`);
  }
}
