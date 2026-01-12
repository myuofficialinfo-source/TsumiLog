/**
 * サーバーサイドバトルエンジン
 *
 * チート対策のため、全てのバトルロジックはサーバーで実行される。
 * フロントエンドにはバトルログのみを返し、アニメーション再生に使用する。
 */

import { GenreSkill, Rarity, RARITY_CONFIG } from '@/types/cardBattle';

// バトルカードの型定義（サーバー用）
export interface ServerBattleCard {
  appid: number;
  name: string;
  attack: number;
  hp: number;
  maxHp: number;
  rarity: Rarity;
  skills: GenreSkill[];
  genres: string[];
  playtimeMinutes: number;
  developer?: string;
  publisher?: string;
  headerImage?: string;  // カード画像URL
}

// バトル中のカード状態
interface BattleCardState extends ServerBattleCard {
  currentTimer: number;
  maxTimer: number;
  isPlayer: boolean;
  position: 'front' | 'back';
  index: number;
  attackCount: number;
  hitCount: number;
  skillBonus: number;
}

// バトルログのエントリ型
export interface BattleLogEntry {
  timestamp: number;  // バトル開始からのms
  type: 'attack' | 'skill' | 'damage' | 'heal' | 'defeat' | 'reflect' | 'dodge' | 'critical';
  attackerId?: string;  // カードID（player_front_0 など）
  defenderId?: string;
  damage?: number;
  healAmount?: number;
  skill?: GenreSkill;
  playerHp?: number;
  opponentHp?: number;
  message?: string;
}

// バトル結果の型
export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerFinalHp: number;
  opponentFinalHp: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  battleDurationMs: number;
  logs: BattleLogEntry[];
  seed: number;  // 乱数シード（再現性のため）
}

// 前衛/後衛の位置補正
const POSITION_MODIFIERS = {
  front: { attackMultiplier: 1.2, skillMultiplier: 0.7 },
  back: { attackMultiplier: 0.8, skillMultiplier: 1.5 },
};

// 攻撃インターバル計算
function calculateAttackInterval(card: ServerBattleCard): number {
  const baseInterval = 2000;
  const attackPenalty = card.attack > 200 ? (card.attack - 200) * 2 : 0;
  const hpBonus = card.hp > 1000 ? Math.min(300, (card.hp - 1000) / 10) : 0;
  const firstStrikeBonus = card.skills.includes('firstStrike') ? -500 : 0;
  const speedBonus = card.skills.includes('speed') ? -300 : 0;
  const earlybirdBonus = card.skills.includes('earlybird') ? -800 : 0;
  return Math.max(600, baseInterval + attackPenalty - hpBonus + firstStrikeBonus + speedBonus + earlybirdBonus);
}

// シード付き乱数生成器（再現性のため）
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

// スキル効果の適用
function applySkillEffect(
  attacker: BattleCardState,
  defender: BattleCardState,
  baseDamage: number,
  allyCount: number,
  defenderHpPercent: number,
  random: SeededRandom
): {
  damage: number;
  healAmount: number;
  allyHealAmount: number;
  isReflected: boolean;
  isCritical: boolean;
  isDodged: boolean;
  skillUsed?: GenreSkill;
} {
  const attackerMod = POSITION_MODIFIERS[attacker.position];
  const defenderMod = POSITION_MODIFIERS[defender.position];
  const attackerSkillBonus = 1 + ((attacker.skillBonus || 0) / 100);
  const defenderSkillBonus = 1 + ((defender.skillBonus || 0) / 100);

  let damage = Math.floor(baseDamage * attackerMod.attackMultiplier);
  let healAmount = 0;
  let allyHealAmount = 0;
  let isReflected = false;
  let isCritical = false;
  let isDodged = false;
  let skillUsed: GenreSkill | undefined;
  let defenseMultiplier = 1.0;

  const isFirstHit = defender.hitCount === 0;

  // 攻撃者スキル
  for (const skill of attacker.skills) {
    switch (skill) {
      case 'absorb':
        healAmount = Math.floor(damage * 0.3 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'ambush':
        const ambushCrit = Math.min(0.5, 0.25 * attackerMod.skillMultiplier * attackerSkillBonus);
        if (random.next() < ambushCrit) {
          damage *= 2;
          isCritical = true;
          skillUsed = skill;
        }
        break;
      case 'buff':
        const buffBonus = 0.15 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + buffBonus));
        skillUsed = skill;
        break;
      case 'lucky':
        if (random.next() < 0.2 * attackerMod.skillMultiplier * attackerSkillBonus) {
          damage = Math.floor(damage * 1.5);
          skillUsed = skill;
        }
        break;
      case 'teamwork':
        allyHealAmount = Math.floor(damage * 0.05 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'explore':
        defenseMultiplier *= (1 - 0.2 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'party':
        const partyBonus = allyCount * 0.05 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + partyBonus));
        skillUsed = skill;
        break;
      case 'calculate':
        if (random.next() < 0.1 * attackerMod.skillMultiplier * attackerSkillBonus) {
          damage = Math.floor(damage * 1.5);
          isCritical = true;
          skillUsed = skill;
        }
        break;
      case 'study':
        const studyBonus = attacker.attackCount * 0.02 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + Math.min(0.5, studyBonus)));
        skillUsed = skill;
        break;
      case 'training':
        if (attacker.attackCount === 0) {
          damage *= 2;
          skillUsed = skill;
        }
        break;
      case 'publish':
        damage = Math.floor(damage * (1 + 0.1 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'develop':
        if (random.next() < 0.1) {
          damage = Math.floor(damage * 1.3);
          skillUsed = skill;
        }
        break;
      case 'mature':
        damage = Math.floor(damage * (1 + 0.2 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'expose':
        defenseMultiplier *= (1 - 0.2 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'brutal':
        damage = Math.floor(damage * (1 + 0.25 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'gore':
        const goreBonus = Math.max(0, (50 - defenderHpPercent) / 50) * 0.5 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + goreBonus));
        if (goreBonus > 0) skillUsed = skill;
        break;
    }
  }

  // 防御者スキル
  for (const skill of defender.skills) {
    switch (skill) {
      case 'defense':
        const defenseReduction = 0.3 * defenderMod.skillMultiplier * defenderSkillBonus * defenseMultiplier;
        damage = Math.floor(damage * (1 - Math.min(0.5, defenseReduction)));
        skillUsed = skill;
        break;
      case 'reflect':
        isReflected = true;
        skillUsed = skill;
        break;
      case 'fear':
        const fearReduction = 0.2 * defenderMod.skillMultiplier * defenderSkillBonus;
        damage = Math.floor(damage * (1 - Math.min(0.4, fearReduction)));
        skillUsed = skill;
        break;
      case 'freebie':
        if (random.next() < 0.1 * defenderMod.skillMultiplier * defenderSkillBonus) {
          isDodged = true;
          damage = 0;
          skillUsed = skill;
        }
        break;
      case 'retouch':
        if (defenderHpPercent <= 20) {
          damage = Math.floor(damage * 0.5);
          skillUsed = skill;
        }
        break;
      case 'tutorial':
        if (isFirstHit) {
          isDodged = true;
          damage = 0;
          skillUsed = skill;
        }
        break;
      case 'docu':
        damage = Math.floor(damage * (1 - 0.1 * defenderMod.skillMultiplier * defenderSkillBonus));
        skillUsed = skill;
        break;
      case 'mature':
        damage = Math.floor(damage * 1.1);
        break;
      case 'brutal':
        damage = Math.floor(damage * 1.15);
        break;
    }
  }

  return { damage, healAmount, allyHealAmount, isReflected, isCritical, isDodged, skillUsed };
}

// チーム合計HP計算
function calculateTeamHp(cards: (ServerBattleCard | null)[]): number {
  return cards.reduce((sum, card) => sum + (card?.hp || 0), 0);
}

// シナジー計算（同ジャンル3本以上でボーナス）
function calculateSynergies(cards: (ServerBattleCard | null)[]): { skillBonus: number } {
  const genreCount = new Map<string, number>();
  cards.forEach(card => {
    if (card) {
      card.genres.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    }
  });

  let skillBonus = 0;
  genreCount.forEach((count) => {
    if (count >= 3) {
      skillBonus += (count - 2) * 5; // 3本で+5%, 4本で+10%, 5本で+15%
    }
  });

  return { skillBonus };
}

/**
 * メインのバトル実行関数
 * サーバーサイドで呼び出され、完全なバトルをシミュレートして結果を返す
 */
export function executeBattle(
  playerDeck: {
    frontLine: (ServerBattleCard | null)[];
    backLine: (ServerBattleCard | null)[];
  },
  opponentDeck: {
    frontLine: (ServerBattleCard | null)[];
    backLine: (ServerBattleCard | null)[];
  },
  seed?: number
): BattleResult {
  // 乱数シード初期化
  const actualSeed = seed ?? Date.now();
  const random = new SeededRandom(actualSeed);

  const logs: BattleLogEntry[] = [];
  let currentTime = 0;
  const MAX_BATTLE_TIME = 120000; // 2分でタイムアウト

  // チームHP初期化
  const playerMaxHp = calculateTeamHp([...playerDeck.frontLine, ...playerDeck.backLine]);
  const opponentMaxHp = calculateTeamHp([...opponentDeck.frontLine, ...opponentDeck.backLine]);
  let playerHp = playerMaxHp;
  let opponentHp = opponentMaxHp;

  // シナジー計算
  const playerSynergy = calculateSynergies([...playerDeck.frontLine, ...playerDeck.backLine]);
  const opponentSynergy = calculateSynergies([...opponentDeck.frontLine, ...opponentDeck.backLine]);

  // カード状態初期化
  const initCardStates = (
    deck: { frontLine: (ServerBattleCard | null)[]; backLine: (ServerBattleCard | null)[] },
    isPlayer: boolean,
    skillBonus: number
  ): BattleCardState[] => {
    const states: BattleCardState[] = [];

    deck.frontLine.forEach((card, index) => {
      if (card) {
        const interval = calculateAttackInterval(card);
        states.push({
          ...card,
          currentTimer: interval,
          maxTimer: interval,
          isPlayer,
          position: 'front',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus,
        });
      }
    });

    deck.backLine.forEach((card, index) => {
      if (card) {
        const interval = calculateAttackInterval(card);
        states.push({
          ...card,
          currentTimer: interval,
          maxTimer: interval,
          isPlayer,
          position: 'back',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus,
        });
      }
    });

    return states;
  };

  const playerCards = initCardStates(playerDeck, true, playerSynergy.skillBonus);
  const opponentCards = initCardStates(opponentDeck, false, opponentSynergy.skillBonus);

  // 統計
  let totalDamageDealt = 0;
  let totalDamageReceived = 0;

  // バトル開始ログ
  logs.push({
    timestamp: 0,
    type: 'attack',
    message: 'Battle Start',
    playerHp,
    opponentHp,
  });

  // バトルループ（時間ベースシミュレーション）
  const TIME_STEP = 50; // 50msごとにシミュレート

  while (playerHp > 0 && opponentHp > 0 && currentTime < MAX_BATTLE_TIME) {
    currentTime += TIME_STEP;

    // 全カードのタイマーを進める
    const allCards = [...playerCards, ...opponentCards];

    for (const card of allCards) {
      card.currentTimer -= TIME_STEP;

      if (card.currentTimer <= 0) {
        // 攻撃実行
        card.currentTimer = card.maxTimer;

        const isPlayerAttack = card.isPlayer;
        const targetTeam = isPlayerAttack ? opponentCards : playerCards;
        const targetTeamHp = isPlayerAttack ? opponentHp : playerHp;
        const targetMaxHp = isPlayerAttack ? opponentMaxHp : playerMaxHp;

        if (targetTeam.length === 0) continue;

        // ターゲット選択（生存カードからランダム）
        const aliveTargets = targetTeam.filter(t => true); // 全カード対象（チームHP制）
        if (aliveTargets.length === 0) continue;

        const targetIndex = Math.floor(random.next() * aliveTargets.length);
        const target = aliveTargets[targetIndex];

        const defenderHpPercent = (targetTeamHp / targetMaxHp) * 100;
        const allyCount = (isPlayerAttack ? playerCards : opponentCards).length;

        // スキル効果適用
        const result = applySkillEffect(
          card,
          target,
          card.attack,
          allyCount,
          defenderHpPercent,
          random
        );

        card.attackCount++;
        target.hitCount++;

        const cardId = `${card.isPlayer ? 'player' : 'opponent'}_${card.position}_${card.index}`;
        const targetId = `${target.isPlayer ? 'player' : 'opponent'}_${target.position}_${target.index}`;

        // 回避
        if (result.isDodged) {
          logs.push({
            timestamp: currentTime,
            type: 'dodge',
            attackerId: cardId,
            defenderId: targetId,
            skill: result.skillUsed,
            playerHp,
            opponentHp,
          });
          continue;
        }

        // ダメージ適用
        if (isPlayerAttack) {
          opponentHp = Math.max(0, opponentHp - result.damage);
          totalDamageDealt += result.damage;
        } else {
          playerHp = Math.max(0, playerHp - result.damage);
          totalDamageReceived += result.damage;
        }

        // 攻撃ログ
        logs.push({
          timestamp: currentTime,
          type: result.isCritical ? 'critical' : 'attack',
          attackerId: cardId,
          defenderId: targetId,
          damage: result.damage,
          skill: result.skillUsed,
          playerHp,
          opponentHp,
        });

        // 反射ダメージ
        if (result.isReflected) {
          const reflectDamage = Math.floor(result.damage * 0.2);
          if (isPlayerAttack) {
            playerHp = Math.max(0, playerHp - reflectDamage);
            totalDamageReceived += reflectDamage;
          } else {
            opponentHp = Math.max(0, opponentHp - reflectDamage);
            totalDamageDealt += reflectDamage;
          }

          logs.push({
            timestamp: currentTime,
            type: 'reflect',
            attackerId: targetId,
            defenderId: cardId,
            damage: reflectDamage,
            skill: 'reflect',
            playerHp,
            opponentHp,
          });
        }

        // 回復
        if (result.healAmount > 0) {
          if (isPlayerAttack) {
            playerHp = Math.min(playerMaxHp, playerHp + result.healAmount);
          } else {
            opponentHp = Math.min(opponentMaxHp, opponentHp + result.healAmount);
          }

          logs.push({
            timestamp: currentTime,
            type: 'heal',
            attackerId: cardId,
            healAmount: result.healAmount,
            skill: 'absorb',
            playerHp,
            opponentHp,
          });
        }

        // 味方回復（teamwork）
        if (result.allyHealAmount > 0) {
          if (isPlayerAttack) {
            playerHp = Math.min(playerMaxHp, playerHp + result.allyHealAmount);
          } else {
            opponentHp = Math.min(opponentMaxHp, opponentHp + result.allyHealAmount);
          }

          logs.push({
            timestamp: currentTime,
            type: 'heal',
            attackerId: cardId,
            healAmount: result.allyHealAmount,
            skill: 'teamwork',
            playerHp,
            opponentHp,
          });
        }

        // 勝敗チェック
        if (playerHp <= 0 || opponentHp <= 0) {
          break;
        }
      }
    }
  }

  // 勝敗判定
  let winner: 'player' | 'opponent' | 'draw';
  if (playerHp <= 0 && opponentHp <= 0) {
    winner = 'draw';
  } else if (opponentHp <= 0) {
    winner = 'player';
  } else if (playerHp <= 0) {
    winner = 'opponent';
  } else {
    // タイムアウト：残りHPの割合で判定
    const playerHpPercent = playerHp / playerMaxHp;
    const opponentHpPercent = opponentHp / opponentMaxHp;
    if (Math.abs(playerHpPercent - opponentHpPercent) < 0.05) {
      winner = 'draw';
    } else if (playerHpPercent > opponentHpPercent) {
      winner = 'player';
    } else {
      winner = 'opponent';
    }
  }

  // 終了ログ
  logs.push({
    timestamp: currentTime,
    type: 'defeat',
    message: `Battle End - ${winner} wins`,
    playerHp: Math.max(0, playerHp),
    opponentHp: Math.max(0, opponentHp),
  });

  return {
    winner,
    playerFinalHp: Math.max(0, playerHp),
    opponentFinalHp: Math.max(0, opponentHp),
    totalDamageDealt,
    totalDamageReceived,
    battleDurationMs: currentTime,
    logs,
    seed: actualSeed,
  };
}

/**
 * カードデータの検証
 * フロントエンドから送られたデータが改ざんされていないか確認
 */
export function validateCard(card: ServerBattleCard, steamOwnedGames: number[]): boolean {
  // 1. ゲームを所持しているか
  if (!steamOwnedGames.includes(card.appid)) {
    return false;
  }

  // 2. 攻撃力・HPが妥当な範囲か（プレイ時間ベースで計算される）
  // 基本攻撃力: 50-300の範囲（プレイ時間に応じて増加）
  const maxAttack = 50 + Math.min(250, card.playtimeMinutes / 10);
  const rarityMultiplier = RARITY_CONFIG[card.rarity]?.growthCap || 1;
  const expectedMaxAttack = maxAttack * rarityMultiplier * 1.5; // 余裕を持たせる

  if (card.attack > expectedMaxAttack) {
    console.warn(`Invalid attack: ${card.attack} > ${expectedMaxAttack} for ${card.name}`);
    return false;
  }

  return true;
}
