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

export async function recommendNewReleases(
  genreStats: GenreStats[],
  newGames: { appid: number; name: string; genres?: string[]; tags?: string[]; description?: string }[],
  favoriteGames: string[] = [],
  backlogGames: string[] = []
): Promise<NewGameRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const topGenres = genreStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => g.genre);

  const newGamesList = newGames
    .slice(0, 25)
    .map(g => {
      const genres = g.genres?.length ? `ジャンル: ${g.genres.join(', ')}` : '';
      const desc = g.description ? `説明: ${g.description.slice(0, 150)}` : '';
      return `- ${g.name} (AppID: ${g.appid}) | ${genres} | ${desc}`;
    })
    .join('\n');

  // ユーザーのゲーム情報セクション（より詳細に）
  const favoriteSection = favoriteGames.length > 0
    ? `## 【重要】ユーザーがよくプレイするゲーム（プレイ時間上位）:
これらのゲームをユーザーは長時間遊んでいます。似たジャンル・システム・雰囲気のゲームを優先してください。
${favoriteGames.map(g => `- ${g}`).join('\n')}`
    : '';

  const backlogSection = backlogGames.length > 0
    ? `## ユーザーが購入済みだが未プレイのゲーム:
${backlogGames.join(', ')}`
    : '';

  const prompt = `あなたはゲームレコメンドの専門家です。ユーザーがプレイしているゲームを分析し、候補リストから最も好みに合うゲームを5つ選んでください。

${favoriteSection}

## ユーザーがよく遊ぶジャンル:
${topGenres.join(', ')}

${backlogSection}

## 候補ゲームリスト（この中から選んでください）:
${newGamesList}

## 【重要】選定基準:
1. ユーザーがプレイしているゲームと同じジャンル・システムを最優先
   - 例: RPGをよく遊ぶ→RPGを推薦、アクションをよく遊ぶ→アクションを推薦
2. ユーザーのプレイ傾向に合った雰囲気・世界観のゲーム
3. ジャンルが合わないゲームは選ばない

## 回答形式:
必ず以下のJSON形式のみで回答してください。前置き不要。

\`\`\`json
[
  {
    "appid": 数字,
    "name": "ゲーム名",
    "reason": "○○（ユーザーがプレイしているゲーム名）と同じ△△（ジャンル/システム）で、□□な点がおすすめ",
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
