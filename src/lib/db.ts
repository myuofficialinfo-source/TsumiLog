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
  currentGames: Array<{ appid: number; name: string; playtime: number; isBacklog: boolean }>
): Promise<{
  sublimationCandidates: Array<{ appid: number; name: string }>;
  newGamesToSnapshot: Array<{ appid: number; name: string; playtime: number }>;
}> {
  // スナップショットを取得
  const snapshot = await getBacklogSnapshot(steamId);
  const snapshotAppids = new Set(snapshot.map(g => g.appid));

  // 既に昇華済みのゲームを取得
  const graduations = await getUserGraduations(steamId);
  const graduatedAppids = new Set(graduations.map(g => g.appid));

  const sublimationCandidates: Array<{ appid: number; name: string }> = [];
  const newGamesToSnapshot: Array<{ appid: number; name: string; playtime: number }> = [];

  for (const game of currentGames) {
    // 既に昇華済みならスキップ
    if (graduatedAppids.has(game.appid)) continue;

    if (snapshotAppids.has(game.appid)) {
      // スナップショット内のゲームで isBacklog=false（30分以上 or トロコン済み）→ 昇華対象
      if (!game.isBacklog) {
        sublimationCandidates.push({ appid: game.appid, name: game.name });
      }
    } else {
      // スナップショットにないゲーム = 新規購入
      if (!game.isBacklog) {
        // 30分以上 or トロコン済み → 昇華対象 + スナップショットに追加
        sublimationCandidates.push({ appid: game.appid, name: game.name });
        newGamesToSnapshot.push({ appid: game.appid, name: game.name, playtime: game.playtime });
      } else {
        // 積みゲー（30分未満かつトロコンしていない）→ スナップショットに追加
        newGamesToSnapshot.push({ appid: game.appid, name: game.name, playtime: game.playtime });
      }
    }
  }

  return { sublimationCandidates, newGamesToSnapshot };
}
