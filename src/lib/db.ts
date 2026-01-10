import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default sql;

// テーブル初期化（初回のみ実行）
export async function initDatabase() {
  // ユーザーテーブル
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) UNIQUE NOT NULL,
      persona_name VARCHAR(100),
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 卒業ゲームテーブル（バトル機能開始後に卒業したゲームのみ）
  await sql`
    CREATE TABLE IF NOT EXISTS graduations (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      appid INTEGER NOT NULL,
      game_name VARCHAR(200),
      graduated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, appid)
    )
  `;

  // バトル結果テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS battles (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'lose', 'draw')),
      opponent_type VARCHAR(20) DEFAULT 'ai',
      battled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // インデックス作成
  await sql`CREATE INDEX IF NOT EXISTS idx_graduations_steam_id ON graduations(steam_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_battles_steam_id ON battles(steam_id)`;
}

// ユーザー登録/更新
export async function upsertUser(steamId: string, personaName?: string, avatarUrl?: string) {
  const result = await sql`
    INSERT INTO users (steam_id, persona_name, avatar_url, updated_at)
    VALUES (${steamId}, ${personaName || null}, ${avatarUrl || null}, CURRENT_TIMESTAMP)
    ON CONFLICT (steam_id)
    DO UPDATE SET
      persona_name = COALESCE(${personaName}, users.persona_name),
      avatar_url = COALESCE(${avatarUrl}, users.avatar_url),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0];
}

// ゲーム卒業を記録
export async function recordGraduation(steamId: string, appid: number, gameName: string) {
  try {
    const result = await sql`
      INSERT INTO graduations (steam_id, appid, game_name)
      VALUES (${steamId}, ${appid}, ${gameName})
      ON CONFLICT (steam_id, appid) DO NOTHING
      RETURNING *
    `;
    return result[0] || null;
  } catch {
    return null;
  }
}

// バトル結果を記録
export async function recordBattle(steamId: string, result: 'win' | 'lose' | 'draw') {
  const battleResult = await sql`
    INSERT INTO battles (steam_id, result)
    VALUES (${steamId}, ${result})
    RETURNING *
  `;
  return battleResult[0];
}

// ユーザーの卒業ゲーム数を取得
export async function getGraduationCount(steamId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM graduations WHERE steam_id = ${steamId}
  `;
  return parseInt(result[0]?.count || '0', 10);
}

// ユーザーの勝利数を取得
export async function getWinCount(steamId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM battles WHERE steam_id = ${steamId} AND result = 'win'
  `;
  return parseInt(result[0]?.count || '0', 10);
}

// ユーザーのスコア計算（卒業数 × 勝利数）
export async function getUserScore(steamId: string): Promise<{
  graduations: number;
  wins: number;
  score: number;
}> {
  const graduations = await getGraduationCount(steamId);
  const wins = await getWinCount(steamId);
  return {
    graduations,
    wins,
    score: graduations * wins,
  };
}

// ランキング取得
export async function getRanking(limit: number = 100): Promise<Array<{
  rank: number;
  steamId: string;
  personaName: string;
  avatarUrl: string;
  graduations: number;
  wins: number;
  score: number;
}>> {
  const result = await sql`
    WITH user_stats AS (
      SELECT
        u.steam_id,
        u.persona_name,
        u.avatar_url,
        u.created_at,
        COALESCE(g.graduation_count, 0) as graduations,
        COALESCE(b.win_count, 0) as wins,
        COALESCE(g.graduation_count, 0) * COALESCE(b.win_count, 0) as score
      FROM users u
      LEFT JOIN (
        SELECT steam_id, COUNT(*) as graduation_count
        FROM graduations
        GROUP BY steam_id
      ) g ON u.steam_id = g.steam_id
      LEFT JOIN (
        SELECT steam_id, COUNT(*) as win_count
        FROM battles
        WHERE result = 'win'
        GROUP BY steam_id
      ) b ON u.steam_id = b.steam_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY score DESC, wins DESC, graduations DESC, created_at ASC) as rank,
      steam_id,
      persona_name,
      avatar_url,
      graduations,
      wins,
      score
    FROM user_stats
    ORDER BY score DESC, wins DESC, graduations DESC, created_at ASC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    rank: parseInt(row.rank as string, 10),
    steamId: row.steam_id as string,
    personaName: row.persona_name as string || 'Unknown',
    avatarUrl: row.avatar_url as string || '',
    graduations: parseInt(row.graduations as string, 10),
    wins: parseInt(row.wins as string, 10),
    score: parseInt(row.score as string, 10),
  }));
}

// ユーザーのランキング順位を取得（全ユーザー対象、スコア0でも順位あり）
export async function getUserRank(steamId: string): Promise<number | null> {
  const result = await sql`
    WITH user_stats AS (
      SELECT
        u.steam_id,
        COALESCE(g.graduation_count, 0) * COALESCE(b.win_count, 0) as score,
        COALESCE(b.win_count, 0) as wins,
        COALESCE(g.graduation_count, 0) as graduations,
        u.created_at
      FROM users u
      LEFT JOIN (
        SELECT steam_id, COUNT(*) as graduation_count
        FROM graduations
        GROUP BY steam_id
      ) g ON u.steam_id = g.steam_id
      LEFT JOIN (
        SELECT steam_id, COUNT(*) as win_count
        FROM battles
        WHERE result = 'win'
        GROUP BY steam_id
      ) b ON u.steam_id = b.steam_id
    ),
    ranked AS (
      SELECT
        steam_id,
        ROW_NUMBER() OVER (ORDER BY score DESC, wins DESC, graduations DESC, created_at ASC) as rank
      FROM user_stats
    )
    SELECT rank FROM ranked WHERE steam_id = ${steamId}
  `;

  return result[0] ? parseInt(result[0].rank as string, 10) : null;
}

// ユーザーの卒業済みゲームリストを取得
export async function getUserGraduations(steamId: string): Promise<Array<{
  appid: number;
  gameName: string;
  graduatedAt: Date;
}>> {
  const result = await sql`
    SELECT appid, game_name, graduated_at
    FROM graduations
    WHERE steam_id = ${steamId}
    ORDER BY graduated_at DESC
  `;

  return result.map(row => ({
    appid: row.appid as number,
    gameName: row.game_name as string,
    graduatedAt: new Date(row.graduated_at as string),
  }));
}

// ゲーム使用テーブル初期化
export async function initGameUsageTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS game_usage (
      id SERIAL PRIMARY KEY,
      appid INTEGER NOT NULL,
      game_name VARCHAR(200),
      steam_id VARCHAR(20) NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, appid, used_at::date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_game_usage_appid ON game_usage(appid)`;
}

// デッキで使用されたゲームを記録
export async function recordGameUsage(steamId: string, games: Array<{ appid: number; name: string }>) {
  for (const game of games) {
    try {
      await sql`
        INSERT INTO game_usage (appid, game_name, steam_id)
        VALUES (${game.appid}, ${game.name}, ${steamId})
        ON CONFLICT (steam_id, appid, (used_at::date)) DO NOTHING
      `;
    } catch {
      // 重複エラーは無視
    }
  }
}

// 最も使用されているゲームランキング
export async function getMostUsedGames(limit: number = 20): Promise<Array<{
  rank: number;
  appid: number;
  gameName: string;
  usageCount: number;
  uniqueUsers: number;
}>> {
  const result = await sql`
    SELECT
      appid,
      game_name,
      COUNT(*) as usage_count,
      COUNT(DISTINCT steam_id) as unique_users
    FROM game_usage
    GROUP BY appid, game_name
    ORDER BY usage_count DESC, unique_users DESC
    LIMIT ${limit}
  `;

  return result.map((row, index) => ({
    rank: index + 1,
    appid: row.appid as number,
    gameName: row.game_name as string || 'Unknown',
    usageCount: parseInt(row.usage_count as string, 10),
    uniqueUsers: parseInt(row.unique_users as string, 10),
  }));
}
