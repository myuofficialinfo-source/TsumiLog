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
  attack: number;       // プレイ時間で成長
  baseAttack: number;   // 基礎攻撃力

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
  isGraduated: boolean; // 5時間超えで卒業

  // 所有率（シナジー計算用）
  ownershipRate?: number;
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

// プレイ時間による成長段階
export type GrowthStage = 'weak' | 'normal' | 'strong' | 'graduated';

export function getGrowthStage(playtimeMinutes: number): GrowthStage {
  if (playtimeMinutes >= 300) return 'graduated';  // 5時間以上
  if (playtimeMinutes >= 120) return 'strong';     // 2-5時間
  if (playtimeMinutes >= 30) return 'normal';      // 30分-2時間
  return 'weak';                                    // 0-30分
}

// 成長段階による攻撃力倍率
export const GROWTH_MULTIPLIER: Record<GrowthStage, number> = {
  weak: 0.5,
  normal: 1.0,
  strong: 1.5,
  graduated: 0,  // 使用不可
};

// レアリティ判定（所有率から）
export function calculateRarity(ownershipRate: number): Rarity {
  // 所有率が低いほどレア
  if (ownershipRate <= 1) return 'ultraRare';    // 1%以下 → UC
  if (ownershipRate <= 5) return 'superRare';    // 5%以下 → SR
  if (ownershipRate <= 20) return 'rare';        // 20%以下 → R
  return 'common';                                // それ以上 → C
}

// 攻撃力計算
export function calculateAttack(
  baseAttack: number,
  playtimeMinutes: number,
  rarity: Rarity
): number {
  const stage = getGrowthStage(playtimeMinutes);
  if (stage === 'graduated') return 0;

  const growthMultiplier = GROWTH_MULTIPLIER[stage];
  const rarityCap = RARITY_CONFIG[rarity].growthCap;

  return Math.floor(baseAttack * growthMultiplier * rarityCap);
}

// HP計算（レビュースコアから）
export function calculateHP(reviewScore: number): number {
  // レビュースコア（0-100）× 10 = HP（0-1000）
  return Math.floor(reviewScore * 10);
}
