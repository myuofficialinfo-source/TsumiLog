import { neon } from '@neondatabase/serverless';
import type { DefenseDeckCard } from '@/types/cardBattle';

const sql = neon(process.env.DATABASE_URL!);

// 型を再エクスポート（他のファイルとの互換性のため）
export type { DefenseDeckCard } from '@/types/cardBattle';

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
      rarity VARCHAR(20) DEFAULT 'common',
      is_completed BOOLEAN DEFAULT FALSE,
      review_count INTEGER DEFAULT 0,
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
export async function recordGraduation(
  steamId: string,
  appid: number,
  gameName: string,
  options?: {
    rarity?: string;
    isCompleted?: boolean;
    reviewCount?: number;
  }
) {
  try {
    const rarity = options?.rarity || 'common';
    const isCompleted = options?.isCompleted || false;
    const reviewCount = options?.reviewCount || 0;

    const result = await sql`
      INSERT INTO graduations (steam_id, appid, game_name, rarity, is_completed, review_count)
      VALUES (${steamId}, ${appid}, ${gameName}, ${rarity}, ${isCompleted}, ${reviewCount})
      ON CONFLICT (steam_id, appid) DO NOTHING
      RETURNING *
    `;
    return result[0] || null;
  } catch {
    return null;
  }
}

// 卒業ゲームのトロコン状態を更新
export async function updateGraduationCompletion(
  steamId: string,
  appid: number,
  isCompleted: boolean
): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE graduations
      SET is_completed = ${isCompleted}
      WHERE steam_id = ${steamId} AND appid = ${appid}
      RETURNING *
    `;
    return result.length > 0;
  } catch {
    return false;
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

// ユーザーの卒業ゲームリストを取得
export async function getGraduations(steamId: string): Promise<Array<{
  appid: number;
  gameName: string;
  rarity: string;
  isCompleted: boolean;
  reviewCount: number;
  graduatedAt: string;
}>> {
  const result = await sql`
    SELECT appid, game_name, rarity, is_completed, review_count, graduated_at
    FROM graduations
    WHERE steam_id = ${steamId}
    ORDER BY graduated_at DESC
  `;
  return result.map(row => ({
    appid: row.appid,
    gameName: row.game_name,
    rarity: row.rarity || 'common',
    isCompleted: row.is_completed || false,
    reviewCount: row.review_count || 0,
    graduatedAt: row.graduated_at,
  }));
}

// ユーザーの勝利数を取得
export async function getWinCount(steamId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM battles WHERE steam_id = ${steamId} AND result = 'win'
  `;
  return parseInt(result[0]?.count || '0', 10);
}

// ユーザーのスコア計算（昇華数ベース + 勝利ボーナス）
// スコア = (昇華数 × 10) + 勝利数
// 昇華がメイン、勝利は小さなボーナス
export async function getUserScore(steamId: string): Promise<{
  sublimations: number;
  wins: number;
  score: number;
}> {
  const sublimations = await getGraduationCount(steamId);
  const wins = await getWinCount(steamId);
  const score = (sublimations * 10) + wins;
  return {
    sublimations,
    wins,
    score,
  };
}

// ランキング取得（1勝以上のユーザーのみ）
// スコア = (昇華数 × 10) + 勝利数
export async function getRanking(limit: number = 100): Promise<Array<{
  rank: number;
  steamId: string;
  personaName: string;
  avatarUrl: string;
  sublimations: number;
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
        COALESCE(g.graduation_count, 0) as sublimations,
        COALESCE(b.win_count, 0) as wins,
        (COALESCE(g.graduation_count, 0) * 10) + COALESCE(b.win_count, 0) as score
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
      ROW_NUMBER() OVER (ORDER BY score DESC, sublimations DESC, wins DESC, created_at ASC) as rank,
      steam_id,
      persona_name,
      avatar_url,
      sublimations,
      wins,
      score
    FROM user_stats
    WHERE wins >= 1
    ORDER BY score DESC, sublimations DESC, wins DESC, created_at ASC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    rank: parseInt(row.rank as string, 10),
    steamId: row.steam_id as string,
    personaName: row.persona_name as string || 'Unknown',
    avatarUrl: row.avatar_url as string || '',
    sublimations: parseInt(row.sublimations as string, 10),
    wins: parseInt(row.wins as string, 10),
    score: parseInt(row.score as string, 10),
  }));
}

// ユーザーのランキング順位を取得（1勝以上のみランキング参加）
// 0勝の場合はnullを返す（ランク外）
export async function getUserRank(steamId: string): Promise<number | null> {
  // まず勝利数を確認
  const winCheck = await sql`
    SELECT COUNT(*) as win_count FROM battles WHERE steam_id = ${steamId} AND result = 'win'
  `;
  const wins = parseInt(winCheck[0]?.win_count || '0', 10);

  // 0勝ならランク外
  if (wins < 1) {
    return null;
  }

  const result = await sql`
    WITH user_stats AS (
      SELECT
        u.steam_id,
        (COALESCE(g.graduation_count, 0) * 10) + COALESCE(b.win_count, 0) as score,
        COALESCE(b.win_count, 0) as wins,
        COALESCE(g.graduation_count, 0) as sublimations,
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
      WHERE COALESCE(b.win_count, 0) >= 1
    ),
    ranked AS (
      SELECT
        steam_id,
        ROW_NUMBER() OVER (ORDER BY score DESC, sublimations DESC, wins DESC, created_at ASC) as rank
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
  isCompleted: boolean;
  graduatedAt: Date;
}>> {
  const result = await sql`
    SELECT appid, game_name, is_completed, graduated_at
    FROM graduations
    WHERE steam_id = ${steamId}
    ORDER BY graduated_at DESC
  `;

  return result.map(row => ({
    appid: row.appid as number,
    gameName: row.game_name as string,
    isCompleted: row.is_completed as boolean || false,
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
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_game_usage_appid ON game_usage(appid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_game_usage_steam_id ON game_usage(steam_id)`;
}

// デッキで使用されたゲームを記録
export async function recordGameUsage(steamId: string, games: Array<{ appid: number; name: string }>) {
  for (const game of games) {
    try {
      await sql`
        INSERT INTO game_usage (appid, game_name, steam_id)
        VALUES (${game.appid}, ${game.name}, ${steamId})
      `;
    } catch {
      // エラーは無視
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

// デッキテーブル初期化
export async function initDeckTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_decks (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      deck_number INTEGER NOT NULL CHECK (deck_number >= 1 AND deck_number <= 5),
      front_line JSONB NOT NULL DEFAULT '[]',
      back_line JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, deck_number)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_decks_steam_id ON user_decks(steam_id)`;
}

// デッキカードの型（保存用、appidのみ保存）
export interface SavedDeckCard {
  appid: number;
}

// デッキを保存
export async function saveDeck(
  steamId: string,
  deckNumber: number,
  frontLine: SavedDeckCard[],
  backLine: SavedDeckCard[]
): Promise<void> {
  await sql`
    INSERT INTO user_decks (steam_id, deck_number, front_line, back_line, updated_at)
    VALUES (${steamId}, ${deckNumber}, ${JSON.stringify(frontLine)}, ${JSON.stringify(backLine)}, CURRENT_TIMESTAMP)
    ON CONFLICT (steam_id, deck_number)
    DO UPDATE SET
      front_line = ${JSON.stringify(frontLine)},
      back_line = ${JSON.stringify(backLine)},
      updated_at = CURRENT_TIMESTAMP
  `;
}

// デッキを取得
export async function getDeck(
  steamId: string,
  deckNumber: number
): Promise<{
  frontLine: SavedDeckCard[];
  backLine: SavedDeckCard[];
  isActive: boolean;
} | null> {
  const result = await sql`
    SELECT front_line, back_line, is_active
    FROM user_decks
    WHERE steam_id = ${steamId} AND deck_number = ${deckNumber}
  `;

  if (result.length === 0) return null;

  return {
    frontLine: result[0].front_line as SavedDeckCard[],
    backLine: result[0].back_line as SavedDeckCard[],
    isActive: result[0].is_active as boolean,
  };
}

// 全デッキを取得
export async function getAllDecks(steamId: string): Promise<Array<{
  deckNumber: number;
  frontLine: SavedDeckCard[];
  backLine: SavedDeckCard[];
  isActive: boolean;
}>> {
  const result = await sql`
    SELECT deck_number, front_line, back_line, is_active
    FROM user_decks
    WHERE steam_id = ${steamId}
    ORDER BY deck_number
  `;

  return result.map(row => ({
    deckNumber: row.deck_number as number,
    frontLine: row.front_line as SavedDeckCard[],
    backLine: row.back_line as SavedDeckCard[],
    isActive: row.is_active as boolean,
  }));
}

// アクティブデッキを設定
export async function setActiveDeck(steamId: string, deckNumber: number): Promise<void> {
  // 全デッキを非アクティブに
  await sql`
    UPDATE user_decks
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE steam_id = ${steamId}
  `;

  // 指定デッキをアクティブに
  await sql`
    UPDATE user_decks
    SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE steam_id = ${steamId} AND deck_number = ${deckNumber}
  `;
}

// アクティブデッキを取得
export async function getActiveDeck(steamId: string): Promise<{
  deckNumber: number;
  frontLine: SavedDeckCard[];
  backLine: SavedDeckCard[];
} | null> {
  const result = await sql`
    SELECT deck_number, front_line, back_line
    FROM user_decks
    WHERE steam_id = ${steamId} AND is_active = TRUE
  `;

  if (result.length === 0) return null;

  return {
    deckNumber: result[0].deck_number as number,
    frontLine: result[0].front_line as SavedDeckCard[],
    backLine: result[0].back_line as SavedDeckCard[],
  };
}

// ===== 防衛デッキ機能（非同期PVP用） =====

// 防衛デッキテーブル初期化
export async function initDefenseDeckTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS defense_decks (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) UNIQUE NOT NULL,
      front_line JSONB NOT NULL DEFAULT '[]',
      back_line JSONB NOT NULL DEFAULT '[]',
      total_hp INTEGER DEFAULT 0,
      total_attack INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_defense_decks_steam_id ON defense_decks(steam_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_defense_decks_total_hp ON defense_decks(total_hp)`;
}

// 防衛デッキを保存
export async function saveDefenseDeck(
  steamId: string,
  frontLine: DefenseDeckCard[],
  backLine: DefenseDeckCard[]
): Promise<void> {
  // 総HPと総攻撃力を計算（マッチング用）
  const allCards = [...frontLine, ...backLine];
  const totalHp = allCards.reduce((sum, card) => sum + card.hp, 0);
  const totalAttack = allCards.reduce((sum, card) => sum + card.attack, 0);

  await sql`
    INSERT INTO defense_decks (steam_id, front_line, back_line, total_hp, total_attack, updated_at)
    VALUES (${steamId}, ${JSON.stringify(frontLine)}, ${JSON.stringify(backLine)}, ${totalHp}, ${totalAttack}, CURRENT_TIMESTAMP)
    ON CONFLICT (steam_id)
    DO UPDATE SET
      front_line = ${JSON.stringify(frontLine)},
      back_line = ${JSON.stringify(backLine)},
      total_hp = ${totalHp},
      total_attack = ${totalAttack},
      updated_at = CURRENT_TIMESTAMP
  `;
}

// 防衛デッキを取得
export async function getDefenseDeck(steamId: string): Promise<{
  frontLine: DefenseDeckCard[];
  backLine: DefenseDeckCard[];
  totalHp: number;
  totalAttack: number;
} | null> {
  const result = await sql`
    SELECT front_line, back_line, total_hp, total_attack
    FROM defense_decks
    WHERE steam_id = ${steamId}
  `;

  if (result.length === 0) return null;

  return {
    frontLine: result[0].front_line as DefenseDeckCard[],
    backLine: result[0].back_line as DefenseDeckCard[],
    totalHp: result[0].total_hp as number,
    totalAttack: result[0].total_attack as number,
  };
}

// マッチング用：ランダムに対戦相手の防衛デッキを取得（自分以外）
export async function getRandomOpponentDeck(excludeSteamId: string): Promise<{
  steamId: string;
  personaName: string;
  avatarUrl: string;
  frontLine: DefenseDeckCard[];
  backLine: DefenseDeckCard[];
  totalHp: number;
  totalAttack: number;
} | null> {
  // ランダムに1件取得（自分以外の防衛デッキ）
  const result = await sql`
    SELECT
      d.steam_id,
      d.front_line,
      d.back_line,
      d.total_hp,
      d.total_attack,
      u.persona_name,
      u.avatar_url
    FROM defense_decks d
    LEFT JOIN users u ON d.steam_id = u.steam_id
    WHERE d.steam_id != ${excludeSteamId}
    ORDER BY RANDOM()
    LIMIT 1
  `;

  if (result.length === 0) return null;

  return {
    steamId: result[0].steam_id as string,
    personaName: result[0].persona_name as string || 'Unknown',
    avatarUrl: result[0].avatar_url as string || '',
    frontLine: result[0].front_line as DefenseDeckCard[],
    backLine: result[0].back_line as DefenseDeckCard[],
    totalHp: result[0].total_hp as number,
    totalAttack: result[0].total_attack as number,
  };
}

// マッチング用：パワーレベルに近い対戦相手を取得（より公平なマッチング）
export async function getMatchedOpponentDeck(
  excludeSteamId: string,
  targetPower: number
): Promise<{
  steamId: string;
  personaName: string;
  avatarUrl: string;
  frontLine: DefenseDeckCard[];
  backLine: DefenseDeckCard[];
  totalHp: number;
  totalAttack: number;
} | null> {
  // 総HP + 総攻撃力でパワーを計算し、近いデッキを取得
  const result = await sql`
    SELECT
      d.steam_id,
      d.front_line,
      d.back_line,
      d.total_hp,
      d.total_attack,
      u.persona_name,
      u.avatar_url,
      ABS((d.total_hp + d.total_attack) - ${targetPower}) as power_diff
    FROM defense_decks d
    LEFT JOIN users u ON d.steam_id = u.steam_id
    WHERE d.steam_id != ${excludeSteamId}
    ORDER BY power_diff ASC, RANDOM()
    LIMIT 1
  `;

  if (result.length === 0) return null;

  return {
    steamId: result[0].steam_id as string,
    personaName: result[0].persona_name as string || 'Unknown',
    avatarUrl: result[0].avatar_url as string || '',
    frontLine: result[0].front_line as DefenseDeckCard[],
    backLine: result[0].back_line as DefenseDeckCard[],
    totalHp: result[0].total_hp as number,
    totalAttack: result[0].total_attack as number,
  };
}

// 防衛デッキの総数を取得
export async function getDefenseDeckCount(): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM defense_decks
  `;
  return parseInt(result[0]?.count || '0', 10);
}

// PVPバトル結果を記録（opponent_steam_idを追加）
export async function recordPvpBattle(
  steamId: string,
  result: 'win' | 'lose' | 'draw',
  opponentSteamId: string
): Promise<void> {
  await sql`
    INSERT INTO battles (steam_id, result, opponent_type, opponent_steam_id)
    VALUES (${steamId}, ${result}, 'pvp', ${opponentSteamId})
  `;
}

// battlesテーブルにopponent_steam_idカラムを追加するマイグレーション
export async function migrateBattlesTable() {
  try {
    await sql`
      ALTER TABLE battles
      ADD COLUMN IF NOT EXISTS opponent_steam_id VARCHAR(20)
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_battles_opponent ON battles(opponent_steam_id)`;
  } catch {
    // カラムが既に存在する場合は無視
  }
}

// graduationsテーブルにトロコン関連カラムを追加するマイグレーション
export async function migrateGraduationsTable() {
  try {
    await sql`ALTER TABLE graduations ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) DEFAULT 'common'`;
    await sql`ALTER TABLE graduations ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE graduations ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0`;
  } catch {
    // カラムが既に存在する場合は無視
  }
}

// ===== ユーザーゲーム情報テーブル =====
// ユーザーの所持ゲーム情報を保存（Steam APIから取得したデータをキャッシュ）

// ユーザーゲームテーブル初期化
export async function initUserGamesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_games (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      appid INTEGER NOT NULL,
      game_name VARCHAR(200),
      playtime_forever INTEGER DEFAULT 0,
      is_backlog BOOLEAN DEFAULT TRUE,
      is_completed BOOLEAN DEFAULT FALSE,
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, appid)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_games_steam_id ON user_games(steam_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_games_appid ON user_games(appid)`;
}

// ユーザーのゲーム情報を一括保存/更新
export async function syncUserGames(
  steamId: string,
  games: Array<{
    appid: number;
    name: string;
    playtime: number;
    isBacklog: boolean;
    isCompleted: boolean;
  }>
): Promise<number> {
  let syncedCount = 0;
  for (const game of games) {
    try {
      await sql`
        INSERT INTO user_games (steam_id, appid, game_name, playtime_forever, is_backlog, is_completed, last_synced_at)
        VALUES (${steamId}, ${game.appid}, ${game.name}, ${game.playtime}, ${game.isBacklog}, ${game.isCompleted}, CURRENT_TIMESTAMP)
        ON CONFLICT (steam_id, appid)
        DO UPDATE SET
          game_name = ${game.name},
          playtime_forever = ${game.playtime},
          is_backlog = ${game.isBacklog},
          is_completed = ${game.isCompleted},
          last_synced_at = CURRENT_TIMESTAMP
      `;
      syncedCount++;
    } catch {
      // エラーは無視
    }
  }
  return syncedCount;
}

// ユーザーのゲーム情報を取得
export async function getUserGames(steamId: string): Promise<Array<{
  appid: number;
  gameName: string;
  playtimeForever: number;
  isBacklog: boolean;
  isCompleted: boolean;
  lastSyncedAt: Date;
}>> {
  const result = await sql`
    SELECT appid, game_name, playtime_forever, is_backlog, is_completed, last_synced_at
    FROM user_games
    WHERE steam_id = ${steamId}
    ORDER BY playtime_forever DESC
  `;

  return result.map(row => ({
    appid: row.appid as number,
    gameName: row.game_name as string,
    playtimeForever: row.playtime_forever as number,
    isBacklog: row.is_backlog as boolean,
    isCompleted: row.is_completed as boolean,
    lastSyncedAt: new Date(row.last_synced_at as string),
  }));
}

// ユーザーのゲーム統計を取得
export async function getUserGameStats(steamId: string): Promise<{
  totalGames: number;
  backlogCount: number;
  playedGames: number;
  completedGames: number;
  totalPlaytimeHours: number;
}> {
  const result = await sql`
    SELECT
      COUNT(*) as total_games,
      SUM(CASE WHEN is_backlog THEN 1 ELSE 0 END) as backlog_count,
      SUM(CASE WHEN NOT is_backlog THEN 1 ELSE 0 END) as played_games,
      SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_games,
      COALESCE(SUM(playtime_forever), 0) as total_playtime
    FROM user_games
    WHERE steam_id = ${steamId}
  `;

  const row = result[0];
  return {
    totalGames: parseInt(row?.total_games as string || '0', 10),
    backlogCount: parseInt(row?.backlog_count as string || '0', 10),
    playedGames: parseInt(row?.played_games as string || '0', 10),
    completedGames: parseInt(row?.completed_games as string || '0', 10),
    totalPlaytimeHours: Math.round((parseInt(row?.total_playtime as string || '0', 10)) / 60),
  };
}

// ユーザーの最終同期日時を取得
export async function getUserGamesLastSynced(steamId: string): Promise<Date | null> {
  const result = await sql`
    SELECT MAX(last_synced_at) as last_synced
    FROM user_games
    WHERE steam_id = ${steamId}
  `;

  if (result[0]?.last_synced) {
    return new Date(result[0].last_synced as string);
  }
  return null;
}

// ===== ウィッシュリストテーブル =====
// ユーザーのウィッシュリスト情報を保存

// ウィッシュリストテーブル初期化
export async function initWishlistTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_wishlist (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      appid INTEGER NOT NULL,
      game_name VARCHAR(200),
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, appid)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_wishlist_steam_id ON user_wishlist(steam_id)`;
}

// ユーザーのウィッシュリストを同期
export async function syncUserWishlist(
  steamId: string,
  wishlist: Array<{ appid: number; name: string }>
): Promise<number> {
  let syncedCount = 0;
  for (const game of wishlist) {
    try {
      await sql`
        INSERT INTO user_wishlist (steam_id, appid, game_name, last_synced_at)
        VALUES (${steamId}, ${game.appid}, ${game.name}, CURRENT_TIMESTAMP)
        ON CONFLICT (steam_id, appid)
        DO UPDATE SET
          game_name = ${game.name},
          last_synced_at = CURRENT_TIMESTAMP
      `;
      syncedCount++;
    } catch {
      // エラーは無視
    }
  }
  return syncedCount;
}

// ユーザーのウィッシュリストを取得
export async function getUserWishlist(steamId: string): Promise<Array<{
  appid: number;
  gameName: string;
  addedAt: Date;
}>> {
  const result = await sql`
    SELECT appid, game_name, added_at
    FROM user_wishlist
    WHERE steam_id = ${steamId}
    ORDER BY added_at DESC
  `;

  return result.map(row => ({
    appid: row.appid as number,
    gameName: row.game_name as string,
    addedAt: new Date(row.added_at as string),
  }));
}

// ウィッシュリスト数を取得
export async function getUserWishlistCount(steamId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM user_wishlist WHERE steam_id = ${steamId}
  `;
  return parseInt(result[0]?.count || '0', 10);
}

// ===== 積みゲースナップショット機能 =====
// ユーザーが初めてバトルに参加した時点での積みゲー（30分未満）を保存
// この中から30分を超えたゲームのみが昇華としてカウントされる

// 積みゲースナップショットテーブル初期化
export async function initBacklogSnapshotTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS backlog_snapshot (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL,
      appid INTEGER NOT NULL,
      game_name VARCHAR(200),
      initial_playtime INTEGER DEFAULT 0,
      snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(steam_id, appid)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_backlog_snapshot_steam_id ON backlog_snapshot(steam_id)`;
}

// ユーザーの積みゲースナップショットが存在するか確認
export async function hasBacklogSnapshot(steamId: string): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count FROM backlog_snapshot WHERE steam_id = ${steamId}
  `;
  return parseInt(result[0]?.count || '0', 10) > 0;
}

// 積みゲースナップショットを保存（初回のみ）
// games: 30分未満のゲームリスト
export async function saveBacklogSnapshot(
  steamId: string,
  games: Array<{ appid: number; name: string; playtime: number }>
): Promise<number> {
  let savedCount = 0;
  for (const game of games) {
    try {
      await sql`
        INSERT INTO backlog_snapshot (steam_id, appid, game_name, initial_playtime)
        VALUES (${steamId}, ${game.appid}, ${game.name}, ${game.playtime})
        ON CONFLICT (steam_id, appid) DO NOTHING
      `;
      savedCount++;
    } catch {
      // エラーは無視
    }
  }
  return savedCount;
}

// 積みゲースナップショットを取得
export async function getBacklogSnapshot(steamId: string): Promise<Array<{
  appid: number;
  gameName: string;
  initialPlaytime: number;
}>> {
  const result = await sql`
    SELECT appid, game_name, initial_playtime
    FROM backlog_snapshot
    WHERE steam_id = ${steamId}
  `;

  return result.map(row => ({
    appid: row.appid as number,
    gameName: row.game_name as string,
    initialPlaytime: row.initial_playtime as number,
  }));
}

// 昇華対象のゲームをフィルタ
// 昇華条件：スナップショット内のゲームで「30分以上」または「トロコン済み」
// isBacklog: 30分未満かつトロコンしていない場合true
// isBacklog=false の場合は昇華済み（30分以上 or トロコン済み）
export async function filterSublimationCandidates(
  steamId: string,
  currentGames: Array<{ appid: number; name: string; playtime: number; isBacklog: boolean; isCompleted?: boolean }>
): Promise<{
  sublimationCandidates: Array<{ appid: number; name: string; isCompleted: boolean }>;
  newGamesToSnapshot: Array<{ appid: number; name: string; playtime: number }>;
  completionUpdates: Array<{ appid: number; isCompleted: boolean }>;
}> {
  // スナップショットを取得
  const snapshot = await getBacklogSnapshot(steamId);
  const snapshotAppids = new Set(snapshot.map(g => g.appid));

  // 既に昇華済みのゲームを取得
  const graduations = await getUserGraduations(steamId);
  const graduatedAppids = new Set(graduations.map(g => g.appid));
  const graduationMap = new Map(graduations.map(g => [g.appid, g]));

  const sublimationCandidates: Array<{ appid: number; name: string; isCompleted: boolean }> = [];
  const newGamesToSnapshot: Array<{ appid: number; name: string; playtime: number }> = [];
  const completionUpdates: Array<{ appid: number; isCompleted: boolean }> = [];

  for (const game of currentGames) {
    const isCompleted = game.isCompleted || false;

    // 既に昇華済みの場合
    if (graduatedAppids.has(game.appid)) {
      // トロコン状態が変わった場合は更新対象に追加
      const existing = graduationMap.get(game.appid);
      if (existing && existing.isCompleted !== isCompleted) {
        completionUpdates.push({ appid: game.appid, isCompleted });
      }
      continue;
    }

    if (snapshotAppids.has(game.appid)) {
      // スナップショット内のゲームで isBacklog=false（30分以上 or トロコン済み）→ 昇華対象
      if (!game.isBacklog) {
        sublimationCandidates.push({ appid: game.appid, name: game.name, isCompleted });
      }
    } else {
      // スナップショットにないゲーム = 新規購入
      if (!game.isBacklog) {
        // 30分以上 or トロコン済み → 昇華対象 + スナップショットに追加
        sublimationCandidates.push({ appid: game.appid, name: game.name, isCompleted });
        newGamesToSnapshot.push({ appid: game.appid, name: game.name, playtime: game.playtime });
      } else {
        // 積みゲー（30分未満かつトロコンしていない）→ スナップショットに追加
        newGamesToSnapshot.push({ appid: game.appid, name: game.name, playtime: game.playtime });
      }
    }
  }

  return { sublimationCandidates, newGamesToSnapshot, completionUpdates };
}

// ===== カレンダーイベントテーブル =====
// ユーザーのゲームプレイ予定を保存

// カレンダーイベントテーブル初期化
export async function initCalendarEventsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      steam_id VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      end_date DATE,
      start_time VARCHAR(5),
      end_time VARCHAR(5),
      game_id INTEGER NOT NULL,
      game_name VARCHAR(200) NOT NULL,
      game_image TEXT,
      type VARCHAR(20) NOT NULL CHECK (type IN ('planned', 'played', 'release')),
      note TEXT,
      playtime_minutes INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_events_steam_id ON calendar_events(steam_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date)`;
}

// カレンダーイベント型
export interface CalendarEventDB {
  id: string;
  steamId: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  gameId: number;
  gameName: string;
  gameImage?: string;
  type: 'planned' | 'played' | 'release';
  note?: string;
  playtimeMinutes?: number;
  createdAt: string;
}

// カレンダーイベントを追加
export async function addCalendarEvent(
  steamId: string,
  event: {
    date: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    gameId: number;
    gameName: string;
    gameImage?: string;
    type: 'planned' | 'played' | 'release';
    note?: string;
    playtimeMinutes?: number;
  }
): Promise<CalendarEventDB> {
  const result = await sql`
    INSERT INTO calendar_events (
      steam_id, date, end_date, start_time, end_time,
      game_id, game_name, game_image, type, note, playtime_minutes
    )
    VALUES (
      ${steamId},
      ${event.date},
      ${event.endDate || null},
      ${event.startTime || null},
      ${event.endTime || null},
      ${event.gameId},
      ${event.gameName},
      ${event.gameImage || null},
      ${event.type},
      ${event.note || null},
      ${event.playtimeMinutes || null}
    )
    RETURNING *
  `;

  const row = result[0];
  return {
    id: row.id as string,
    steamId: row.steam_id as string,
    date: (row.date as string).split('T')[0],
    endDate: row.end_date ? (row.end_date as string).split('T')[0] : undefined,
    startTime: row.start_time as string | undefined,
    endTime: row.end_time as string | undefined,
    gameId: row.game_id as number,
    gameName: row.game_name as string,
    gameImage: row.game_image as string | undefined,
    type: row.type as 'planned' | 'played' | 'release',
    note: row.note as string | undefined,
    playtimeMinutes: row.playtime_minutes as number | undefined,
    createdAt: row.created_at as string,
  };
}

// ユーザーのカレンダーイベントを取得
export async function getCalendarEvents(steamId: string): Promise<CalendarEventDB[]> {
  const result = await sql`
    SELECT *
    FROM calendar_events
    WHERE steam_id = ${steamId}
    ORDER BY date ASC, start_time ASC NULLS LAST
  `;

  return result.map(row => ({
    id: row.id as string,
    steamId: row.steam_id as string,
    date: (row.date as string).split('T')[0],
    endDate: row.end_date ? (row.end_date as string).split('T')[0] : undefined,
    startTime: row.start_time as string | undefined,
    endTime: row.end_time as string | undefined,
    gameId: row.game_id as number,
    gameName: row.game_name as string,
    gameImage: row.game_image as string | undefined,
    type: row.type as 'planned' | 'played' | 'release',
    note: row.note as string | undefined,
    playtimeMinutes: row.playtime_minutes as number | undefined,
    createdAt: row.created_at as string,
  }));
}

// カレンダーイベントを更新
export async function updateCalendarEvent(
  steamId: string,
  eventId: string,
  updates: {
    date?: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    type?: 'planned' | 'played' | 'release';
    note?: string | null;
    playtimeMinutes?: number | null;
  }
): Promise<CalendarEventDB | null> {
  // 渡されたフィールドのみ更新、undefinedなら既存値を維持
  const result = await sql`
    UPDATE calendar_events
    SET
      date = COALESCE(${updates.date ?? null}, date),
      end_date = CASE WHEN ${updates.endDate !== undefined} THEN ${updates.endDate ?? null} ELSE end_date END,
      start_time = CASE WHEN ${updates.startTime !== undefined} THEN ${updates.startTime ?? null} ELSE start_time END,
      end_time = CASE WHEN ${updates.endTime !== undefined} THEN ${updates.endTime ?? null} ELSE end_time END,
      type = COALESCE(${updates.type ?? null}, type),
      note = CASE WHEN ${updates.note !== undefined} THEN ${updates.note ?? null} ELSE note END,
      playtime_minutes = CASE WHEN ${updates.playtimeMinutes !== undefined} THEN ${updates.playtimeMinutes ?? null} ELSE playtime_minutes END
    WHERE id = ${eventId} AND steam_id = ${steamId}
    RETURNING *
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id as string,
    steamId: row.steam_id as string,
    date: (row.date as string).split('T')[0],
    endDate: row.end_date ? (row.end_date as string).split('T')[0] : undefined,
    startTime: row.start_time as string | undefined,
    endTime: row.end_time as string | undefined,
    gameId: row.game_id as number,
    gameName: row.game_name as string,
    gameImage: row.game_image as string | undefined,
    type: row.type as 'planned' | 'played' | 'release',
    note: row.note as string | undefined,
    playtimeMinutes: row.playtime_minutes as number | undefined,
    createdAt: row.created_at as string,
  };
}

// カレンダーイベントを削除
export async function deleteCalendarEvent(steamId: string, eventId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM calendar_events
    WHERE id = ${eventId} AND steam_id = ${steamId}
    RETURNING id
  `;
  return result.length > 0;
}
