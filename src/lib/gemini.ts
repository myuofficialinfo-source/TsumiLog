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
積みゲーリストの中から5つ選び、以下の形式で回答してください:

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

## 回答形式:
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
