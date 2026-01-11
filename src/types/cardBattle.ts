// カードバトル用の型定義

// レアリティ（所有率の逆数で決定）
// C(コモン), R(レア), SR(スーパーレア), UC(ウルトラレア)
export type Rarity = 'common' | 'rare' | 'superRare' | 'ultraRare';

// ジャンルスキル
export type GenreSkill =
  | 'firstStrike'   // Action: 先制攻撃
  | 'absorb'        // RPG: 吸収
  | 'fear'          // Horror: 恐怖（敵攻撃力ダウン）
  | 'defense'       // Strategy: 防御
  | 'reflect'       // Puzzle: 反射
  | 'buff'          // Simulation: バフ
  | 'ambush';       // Indie: 奇襲（2倍ダメージ確率）

// ジャンルとスキルのマッピング
export const GENRE_SKILL_MAP: Record<string, GenreSkill> = {
  'Action': 'firstStrike',
  'RPG': 'absorb',
  'Horror': 'fear',
  'Strategy': 'defense',
  'Puzzle': 'reflect',
  'Simulation': 'buff',
  'Indie': 'ambush',
  // 日本語対応
  'アクション': 'firstStrike',
  'ロールプレイング': 'absorb',
  'ホラー': 'fear',
  'ストラテジー': 'defense',
  'パズル': 'reflect',
  'シミュレーション': 'buff',
  'インディー': 'ambush',
};

// スキル効果の説明
export const SKILL_DESCRIPTIONS: Record<GenreSkill, { ja: string; en: string }> = {
  firstStrike: { ja: '先制攻撃', en: 'First Strike' },
  absorb: { ja: '吸収（与ダメの30%回復）', en: 'Absorb (Heal 30% of damage)' },
  fear: { ja: '恐怖（敵攻撃-20%）', en: 'Fear (Enemy ATK -20%)' },
  defense: { ja: '防御（被ダメ-30%）', en: 'Defense (DMG taken -30%)' },
  reflect: { ja: '反射（被ダメの20%返し）', en: 'Reflect (Return 20% DMG)' },
  buff: { ja: 'バフ（味方攻撃+15%）', en: 'Buff (Ally ATK +15%)' },
  ambush: { ja: '奇襲（25%で2倍ダメージ）', en: 'Ambush (25% chance 2x DMG)' },
};

// レアリティ設定
export const RARITY_CONFIG: Record<Rarity, {
  label: { ja: string; en: string };
  growthCap: number;  // 成長上限倍率
  color: string;
  glowColor: string;
  glowIntensity: number;
}> = {
  common: {
    label: { ja: 'C', en: 'C' },
    growthCap: 1.0,
    color: '#9CA3AF',  // グレー
    glowColor: 'rgba(156, 163, 175, 0.5)',
    glowIntensity: 0,
  },
  rare: {
    label: { ja: 'R', en: 'R' },
    growthCap: 1.5,
    color: '#3B82F6',  // 青
    glowColor: 'rgba(59, 130, 246, 0.7)',
    glowIntensity: 1,
  },
  superRare: {
    label: { ja: 'SR', en: 'SR' },
    growthCap: 2.0,
    color: '#FFD700',  // 金
    glowColor: 'rgba(255, 215, 0, 0.8)',
    glowIntensity: 2,
  },
  ultraRare: {
    label: { ja: 'UC', en: 'UC' },
    growthCap: 2.5,
    color: '#FF6B6B',  // 虹色（ベースカラー）
    glowColor: 'rgba(255, 107, 107, 0.9)',
    glowIntensity: 3,
  },
};

// バトルカード
export interface BattleCard {
  appid: number;
  name: string;
  headerImage: string;

  // ステータス
  hp: number;           // レビュースコア × 10
  maxHp: number;
  attack: number;       // プレイ時間で算出（0〜30分）

  // メタ情報
  rarity: Rarity;
  genres: string[];
  skills: GenreSkill[];

  // 開発元・パブリッシャー（シナジー用）
  developer?: string;
  publisher?: string;
  series?: string;      // シリーズ名（タイトルから推測）
  tags?: string[];      // Steamタグ

  // プレイ情報
  playtimeMinutes: number;

  // レビュー数（表示用）
  reviewCount?: number;
}

// シナジータイプ
export type SynergyType = 'genre' | 'developer' | 'series' | 'tag';

// シナジーボーナス
export interface SynergyBonus {
  type: SynergyType;
  name: string;
  count: number;
  effect: {
    attackBonus?: number;  // 攻撃力ボーナス（%）
    hpBonus?: number;      // HPボーナス（%）
    specialEffect?: string;
  };
}

// デッキ
export interface Deck {
  frontLine: (BattleCard | null)[];  // 前衛5枚
  backLine: (BattleCard | null)[];   // 後衛5枚
  synergies: SynergyBonus[];
}

// バトル結果
export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerDeck: Deck;
  opponentDeck: Deck;
  battleLog: BattleLogEntry[];
  totalDamageDealt: number;
  totalDamageReceived: number;
}

// バトルログエントリ
export interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  skill?: GenreSkill;
  isCritical?: boolean;
  isReflected?: boolean;
  healAmount?: number;
}

// 積みゲー判定（30分未満 = 積みゲー）
export const BACKLOG_THRESHOLD_MINUTES = 30;

// 積みゲーかどうかを判定
export function isBacklogGame(playtimeMinutes: number): boolean {
  return playtimeMinutes < BACKLOG_THRESHOLD_MINUTES;
}

// 攻撃力計算（プレイ時間0〜30分で算出、30分が最大）
// 攻撃力 = (プレイ時間 / 30) × 100 × レアリティ倍率
export function calculateAttack(
  playtimeMinutes: number,
  rarity: Rarity
): number {
  // 30分以上は積みゲーではないので0
  if (playtimeMinutes >= BACKLOG_THRESHOLD_MINUTES) return 0;

  const rarityCap = RARITY_CONFIG[rarity].growthCap;
  // プレイ時間に応じて0〜100の攻撃力、それにレアリティ倍率をかける
  const baseAttack = (playtimeMinutes / BACKLOG_THRESHOLD_MINUTES) * 100;

  return Math.floor(baseAttack * rarityCap);
}

// Steam評価ラベルに基づくHP設定
// 高評価率 → HP値のマッピング
export function calculateHP(positiveRate: number | null | undefined): number {
  // レビューなし or 取得できない場合
  if (positiveRate === null || positiveRate === undefined) {
    return 200;
  }

  // 評価ラベルに基づくHP
  if (positiveRate >= 95) return 950;      // 圧倒的に好評
  if (positiveRate >= 80) return 800;      // 非常に好評
  if (positiveRate >= 70) return 700;      // 好評
  if (positiveRate >= 40) return 550;      // やや好評
  if (positiveRate >= 35) return 400;      // 賛否両論
  if (positiveRate >= 20) return 300;      // やや不評
  return 200;                               // 不評
}

// 昇華ボーナス設定（30分以上プレイしたゲームがデッキ全体にバフ）
export const SUBLIMATION_BONUS: Record<Rarity, number> = {
  common: 1,      // +1%
  rare: 2,        // +2%
  superRare: 3,   // +3%
  ultraRare: 5,   // +5%
};

// トロコンボーナス設定（実績100%達成でさらにバフ）
export const TROPHY_BONUS: Record<Rarity, number> = {
  common: 2,      // +2%
  rare: 4,        // +4%
  superRare: 6,   // +6%
  ultraRare: 10,  // +10%
};

// 昇華済みゲームの情報
export interface SublimatedGame {
  appid: number;
  name: string;
  rarity: Rarity;
  playtimeMinutes: number;
  isCompleted: boolean;  // トロコン済みかどうか
}

// 昇華バフの計算結果
export interface SublimationBuffResult {
  totalBonus: number;           // 合計バフ％
  sublimationBonus: number;     // 昇華ボーナス％
  trophyBonus: number;          // トロコンボーナス％
  sublimatedCount: number;      // 昇華済みゲーム数
  completedCount: number;       // トロコン済みゲーム数
  breakdown: {
    rarity: Rarity;
    sublimationCount: number;
    trophyCount: number;
    bonus: number;
  }[];
}

// 昇華バフを計算
export function calculateSublimationBuff(
  sublimatedGames: SublimatedGame[]
): SublimationBuffResult {
  let sublimationBonus = 0;
  let trophyBonus = 0;
  let completedCount = 0;

  const breakdownMap: Record<Rarity, { sublimationCount: number; trophyCount: number; bonus: number }> = {
    common: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    rare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    superRare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    ultraRare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
  };

  for (const game of sublimatedGames) {
    // 昇華ボーナス
    const subBonus = SUBLIMATION_BONUS[game.rarity];
    sublimationBonus += subBonus;
    breakdownMap[game.rarity].sublimationCount++;
    breakdownMap[game.rarity].bonus += subBonus;

    // トロコンボーナス
    if (game.isCompleted) {
      const tropBonus = TROPHY_BONUS[game.rarity];
      trophyBonus += tropBonus;
      completedCount++;
      breakdownMap[game.rarity].trophyCount++;
      breakdownMap[game.rarity].bonus += tropBonus;
    }
  }

  const breakdown = (['common', 'rare', 'superRare', 'ultraRare'] as Rarity[]).map(rarity => ({
    rarity,
    sublimationCount: breakdownMap[rarity].sublimationCount,
    trophyCount: breakdownMap[rarity].trophyCount,
    bonus: breakdownMap[rarity].bonus,
  }));

  return {
    totalBonus: sublimationBonus + trophyBonus,
    sublimationBonus,
    trophyBonus,
    sublimatedCount: sublimatedGames.length,
    completedCount,
    breakdown,
  };
}

// レビュー数からレアリティを計算
// レビュー数が多い（有名）= コモン、少ない（マイナー）= レア
export function calculateRarityFromReviews(reviewCount: number): Rarity {
  if (reviewCount >= 50000) return 'common';      // 5万件以上 → C
  if (reviewCount >= 10000) return 'rare';        // 1万件以上 → R
  if (reviewCount >= 500) return 'superRare';     // 500件以上 → SR
  return 'ultraRare';                              // 500件未満 → UC
}

// ===== 防衛デッキ関連の型（非同期PVP用） =====

// 防衛デッキカード（DBに完全なカード情報を保存）
export interface DefenseDeckCard {
  appid: number;
  name: string;
  headerImage: string;
  hp: number;
  maxHp: number;
  attack: number;
  rarity: string;
  genres: string[];
  skills: string[];
  developer?: string;
  publisher?: string;
  tags?: string[];
  playtimeMinutes: number;
  reviewCount?: number;
}

// 対戦相手情報
export interface OpponentInfo {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  frontLine: DefenseDeckCard[];
  backLine: DefenseDeckCard[];
}

// 防衛デッキカードをバトルカードに変換
export function convertDefenseDeckToCards(defenseDeckCards: DefenseDeckCard[]): BattleCard[] {
  return defenseDeckCards.map(card => ({
    appid: card.appid,
    name: card.name,
    headerImage: card.headerImage,
    hp: card.hp,
    maxHp: card.maxHp,
    attack: card.attack,
    rarity: card.rarity as Rarity,
    genres: card.genres,
    skills: card.skills as GenreSkill[],
    developer: card.developer,
    publisher: card.publisher,
    tags: card.tags,
    playtimeMinutes: card.playtimeMinutes,
    reviewCount: card.reviewCount,
  }));
}

// ===== エネミー（CPU対戦）用データ =====

// 実際のSteamゲームデータ（エネミーデッキ用）
// ランク別に異なる強さのゲームを用意
export const ENEMY_GAME_POOL: {
  appid: number;
  name: string;
  genres: string[];
  positiveRate: number;   // HP決定用
  reviewCount: number;    // レアリティ決定用
  playtimeMinutes: number; // 攻撃力決定用（0-29の範囲）
}[] = [
  // === Tier 1: 初心者向け（低HP、低攻撃力、コモン中心） ===
  { appid: 730, name: 'Counter-Strike 2', genres: ['Action'], positiveRate: 85, reviewCount: 8000000, playtimeMinutes: 5 },
  { appid: 570, name: 'Dota 2', genres: ['Strategy'], positiveRate: 80, reviewCount: 2000000, playtimeMinutes: 8 },
  { appid: 440, name: 'Team Fortress 2', genres: ['Action'], positiveRate: 92, reviewCount: 1000000, playtimeMinutes: 6 },
  { appid: 578080, name: 'PUBG: BATTLEGROUNDS', genres: ['Action'], positiveRate: 55, reviewCount: 2500000, playtimeMinutes: 4 },
  { appid: 1172470, name: 'Apex Legends', genres: ['Action'], positiveRate: 78, reviewCount: 500000, playtimeMinutes: 7 },
  { appid: 252490, name: 'Rust', genres: ['Action', 'Indie'], positiveRate: 85, reviewCount: 600000, playtimeMinutes: 10 },
  { appid: 271590, name: 'Grand Theft Auto V', genres: ['Action'], positiveRate: 85, reviewCount: 1500000, playtimeMinutes: 9 },
  { appid: 1085660, name: 'Destiny 2', genres: ['Action'], positiveRate: 75, reviewCount: 400000, playtimeMinutes: 5 },

  // === Tier 2: 中級者向け（中HP、中攻撃力、レア混在） ===
  { appid: 292030, name: 'The Witcher 3: Wild Hunt', genres: ['RPG'], positiveRate: 95, reviewCount: 700000, playtimeMinutes: 15 },
  { appid: 1245620, name: 'ELDEN RING', genres: ['RPG', 'Action'], positiveRate: 92, reviewCount: 600000, playtimeMinutes: 18 },
  { appid: 1091500, name: 'Cyberpunk 2077', genres: ['RPG', 'Action'], positiveRate: 85, reviewCount: 800000, playtimeMinutes: 16 },
  { appid: 814380, name: 'Sekiro: Shadows Die Twice', genres: ['Action'], positiveRate: 95, reviewCount: 80000, playtimeMinutes: 20 },
  { appid: 374320, name: 'DARK SOULS III', genres: ['RPG', 'Action'], positiveRate: 94, reviewCount: 150000, playtimeMinutes: 17 },
  { appid: 582010, name: 'Monster Hunter: World', genres: ['Action', 'RPG'], positiveRate: 88, reviewCount: 120000, playtimeMinutes: 19 },
  { appid: 1174180, name: 'Red Dead Redemption 2', genres: ['Action'], positiveRate: 90, reviewCount: 500000, playtimeMinutes: 14 },
  { appid: 413150, name: 'Stardew Valley', genres: ['Simulation', 'RPG', 'Indie'], positiveRate: 97, reviewCount: 400000, playtimeMinutes: 12 },

  // === Tier 3: 上級者向け（高HP、高攻撃力、SR中心） ===
  { appid: 105600, name: 'Terraria', genres: ['Action', 'Indie'], positiveRate: 97, reviewCount: 900000, playtimeMinutes: 22 },
  { appid: 367520, name: 'Hollow Knight', genres: ['Action', 'Indie'], positiveRate: 96, reviewCount: 150000, playtimeMinutes: 24 },
  { appid: 1145360, name: 'Hades', genres: ['Action', 'RPG', 'Indie'], positiveRate: 97, reviewCount: 180000, playtimeMinutes: 23 },
  { appid: 250900, name: 'The Binding of Isaac: Rebirth', genres: ['Action', 'Indie'], positiveRate: 97, reviewCount: 100000, playtimeMinutes: 25 },
  { appid: 391540, name: 'Undertale', genres: ['RPG', 'Indie'], positiveRate: 96, reviewCount: 200000, playtimeMinutes: 21 },
  { appid: 620, name: 'Portal 2', genres: ['Puzzle', 'Action'], positiveRate: 99, reviewCount: 400000, playtimeMinutes: 20 },
  { appid: 268500, name: 'XCOM 2', genres: ['Strategy'], positiveRate: 87, reviewCount: 70000, playtimeMinutes: 26 },
  { appid: 236390, name: 'War Thunder', genres: ['Action', 'Simulation'], positiveRate: 70, reviewCount: 400000, playtimeMinutes: 22 },

  // === Tier 4: エキスパート向け（最高HP、最高攻撃力、UC中心） ===
  { appid: 524220, name: 'NieR:Automata', genres: ['RPG', 'Action'], positiveRate: 94, reviewCount: 80000, playtimeMinutes: 27 },
  { appid: 427520, name: 'Factorio', genres: ['Strategy', 'Simulation', 'Indie'], positiveRate: 97, reviewCount: 150000, playtimeMinutes: 28 },
  { appid: 294100, name: 'RimWorld', genres: ['Strategy', 'Simulation', 'Indie'], positiveRate: 98, reviewCount: 130000, playtimeMinutes: 29 },
  { appid: 1817070, name: 'Marvels Spider-Man Remastered', genres: ['Action'], positiveRate: 93, reviewCount: 60000, playtimeMinutes: 26 },
  { appid: 1938010, name: 'Raft', genres: ['Simulation', 'Indie'], positiveRate: 91, reviewCount: 40000, playtimeMinutes: 25 },
  { appid: 1817190, name: 'Marvels Spider-Man: Miles Morales', genres: ['Action'], positiveRate: 94, reviewCount: 30000, playtimeMinutes: 27 },
  { appid: 892970, name: 'Valheim', genres: ['Action', 'Indie'], positiveRate: 95, reviewCount: 350000, playtimeMinutes: 28 },
  { appid: 1063730, name: 'New World', genres: ['Action', 'RPG'], positiveRate: 68, reviewCount: 200000, playtimeMinutes: 24 },
];

// ランクティア定義（エネミー強度調整用）
export const ENEMY_RANK_CONFIG = {
  rookie:   { tierWeights: [0.7, 0.25, 0.05, 0], playtimeMultiplier: 0.5 },   // Tier1中心
  bronze:   { tierWeights: [0.5, 0.35, 0.12, 0.03], playtimeMultiplier: 0.6 },
  silver:   { tierWeights: [0.3, 0.4, 0.22, 0.08], playtimeMultiplier: 0.7 },
  gold:     { tierWeights: [0.15, 0.35, 0.35, 0.15], playtimeMultiplier: 0.8 },
  platinum: { tierWeights: [0.08, 0.25, 0.4, 0.27], playtimeMultiplier: 0.9 },
  diamond:  { tierWeights: [0.03, 0.15, 0.4, 0.42], playtimeMultiplier: 0.95 },
  master:   { tierWeights: [0, 0.1, 0.35, 0.55], playtimeMultiplier: 1.0 },
  legend:   { tierWeights: [0, 0.05, 0.3, 0.65], playtimeMultiplier: 1.0 },
} as const;

export type EnemyRank = keyof typeof ENEMY_RANK_CONFIG;

// スコアからエネミーランクを取得
export function getEnemyRankFromScore(score: number): EnemyRank {
  if (score >= 5000) return 'legend';
  if (score >= 2500) return 'master';
  if (score >= 1000) return 'diamond';
  if (score >= 400) return 'platinum';
  if (score >= 150) return 'gold';
  if (score >= 50) return 'silver';
  if (score >= 10) return 'bronze';
  return 'rookie';
}

// エネミーデッキを生成（ランクに応じた強さ）
export function generateEnemyDeck(playerScore: number): { deck: Deck; enemyName: string } {
  const rank = getEnemyRankFromScore(playerScore);
  const config = ENEMY_RANK_CONFIG[rank];

  // ティア別にゲームを分類
  const tiers = [
    ENEMY_GAME_POOL.slice(0, 8),   // Tier 1
    ENEMY_GAME_POOL.slice(8, 16),  // Tier 2
    ENEMY_GAME_POOL.slice(16, 24), // Tier 3
    ENEMY_GAME_POOL.slice(24, 32), // Tier 4
  ];

  // 重みに基づいてゲームを選択
  const selectedGames: typeof ENEMY_GAME_POOL = [];
  for (let i = 0; i < 10; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let tierIndex = 0;

    for (let t = 0; t < 4; t++) {
      cumulative += config.tierWeights[t];
      if (rand < cumulative) {
        tierIndex = t;
        break;
      }
    }

    // 選択されたティアからランダムにゲームを選択（重複回避）
    const tierGames = tiers[tierIndex].filter(g =>
      !selectedGames.some(sg => sg.appid === g.appid)
    );
    if (tierGames.length > 0) {
      const game = tierGames[Math.floor(Math.random() * tierGames.length)];
      selectedGames.push(game);
    } else {
      // ティアのゲームが全て使用済みなら別ティアから選択
      const allAvailable = ENEMY_GAME_POOL.filter(g =>
        !selectedGames.some(sg => sg.appid === g.appid)
      );
      if (allAvailable.length > 0) {
        selectedGames.push(allAvailable[Math.floor(Math.random() * allAvailable.length)]);
      }
    }
  }

  // ゲームをバトルカードに変換
  const cards: BattleCard[] = selectedGames.map(game => {
    const rarity = calculateRarityFromReviews(game.reviewCount);
    const adjustedPlaytime = Math.floor(game.playtimeMinutes * config.playtimeMultiplier);
    const genres = game.genres;
    const skills: GenreSkill[] = genres
      .map(genre => GENRE_SKILL_MAP[genre])
      .filter((skill): skill is GenreSkill => skill !== undefined);

    return {
      appid: game.appid,
      name: game.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      hp: calculateHP(game.positiveRate),
      maxHp: calculateHP(game.positiveRate),
      attack: calculateAttack(adjustedPlaytime, rarity),
      rarity,
      genres,
      skills: [...new Set(skills)],
      playtimeMinutes: adjustedPlaytime,
      reviewCount: game.reviewCount,
    };
  });

  // 攻撃力順でソートして前衛・後衛に配置
  cards.sort((a, b) => b.attack - a.attack);

  const frontLine: (BattleCard | null)[] = cards.slice(0, 5);
  const backLine: (BattleCard | null)[] = cards.slice(5, 10);

  while (frontLine.length < 5) frontLine.push(null);
  while (backLine.length < 5) backLine.push(null);

  // エネミー名をランクに応じて設定
  const enemyNames: Record<EnemyRank, string[]> = {
    rookie: ['見習いゲーマー', 'Rookie Gamer'],
    bronze: ['ブロンズ戦士', 'Bronze Warrior'],
    silver: ['シルバーハンター', 'Silver Hunter'],
    gold: ['ゴールドチャンピオン', 'Gold Champion'],
    platinum: ['プラチナマスター', 'Platinum Master'],
    diamond: ['ダイヤモンドエース', 'Diamond Ace'],
    master: ['マスターオブゲーム', 'Master of Games'],
    legend: ['伝説の積みゲーマー', 'Legendary Backlogger'],
  };

  return {
    deck: { frontLine, backLine, synergies: [] },
    enemyName: enemyNames[rank][0], // 日本語名を使用（言語対応は呼び出し側で）
  };
}
