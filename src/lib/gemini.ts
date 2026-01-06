import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenreStats, BacklogGame } from '@/types/steam';

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error('GOOGLE_AI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function generateRecommendations(
  backlogGames: BacklogGame[],
  genreStats: GenreStats[],
  userPreferences?: string
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

  const prompt = `あなたはゲームレコメンドの専門家です。以下のユーザーの積みゲー（未プレイゲーム）リストの中から、優先的にプレイすべきおすすめゲームを5つ提案してください。

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

ユーザーの好むジャンルや傾向を考慮して、積みゲーの中から最適なものを提案してください。`;

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
  totalPlaytime: number
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const genreSummary = genreStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(g => `${g.genre}: ${g.count}本 (総プレイ時間: ${Math.round(g.totalPlaytime / 60)}時間)`)
    .join('\n');

  const prompt = `あなたはゲーム分析の専門家です。以下のユーザーのゲームライブラリを分析し、ゲーマーとしての特徴を説明してください。

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
4. **おすすめの遊び方**: 積みゲーを消化するためのアドバイス`;

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
}

export interface FavoriteGame {
  name: string;
  playtime: number; // hours
  genres: string[];
}

export async function recommendNewReleases(
  genreStats: GenreStats[],
  newGames: { appid: number; name: string; genres?: string[]; tags?: string[]; description?: string }[],
  favoriteGames: FavoriteGame[] = [],
  wishlistNames: string[] = []
): Promise<NewGameRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // プレイ時間順でソートしたジャンル統計
  const topGenresByPlaytime = genreStats
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 5)
    .map(g => `${g.genre} (${Math.round(g.totalPlaytime / 60)}時間)`);

  // ユーザーのお気に入りゲーム情報
  const favoriteSection = favoriteGames.length > 0
    ? `## 【最重要】ユーザーがよく遊んでいるゲーム（プレイ時間順）:
${favoriteGames.map(g => `- ${g.name}: ${g.playtime}時間 [${g.genres.join(', ')}]`).join('\n')}`
    : '';

  // ウィッシュリスト情報
  const wishlistSection = wishlistNames.length > 0
    ? `## ユーザーのウィッシュリスト（興味のあるゲーム）:
${wishlistNames.join(', ')}`
    : '';

  // 新作ゲームリスト
  const newGamesList = newGames
    .slice(0, 25)
    .map(g => {
      const genres = g.genres?.length ? `ジャンル: ${g.genres.join(', ')}` : '';
      const desc = g.description ? `説明: ${g.description.slice(0, 200)}` : '';
      return `- ${g.name} (AppID: ${g.appid}) | ${genres} | ${desc}`;
    })
    .join('\n');

  const prompt = `あなたはゲームレコメンドの専門家です。ユーザーの遊んでいるゲームとウィッシュリストを分析し、最も合う新作ゲームを選んでください。

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

候補リストから5つ選んでください。`;

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

    return validRecommendations.map(rec => ({
      ...rec,
      storeUrl: `https://store.steampowered.com/app/${rec.appid}`,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${rec.appid}/header.jpg`,
    }));
  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`新作おすすめの生成に失敗しました: ${errorMessage}`);
  }
}
