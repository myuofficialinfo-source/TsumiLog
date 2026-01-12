'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BattleCard from './BattleCard';
import {
  BattleCard as BattleCardType,
  Deck,
  BattleResult,
  GenreSkill,
  SKILL_DESCRIPTIONS,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swords, Zap, Trophy, RotateCcw, Home, X, Play, FastForward } from 'lucide-react';

interface BattleArenaProps {
  playerDeck: Deck;
  opponentDeck: Deck;
  onBattleEnd: (result: BattleResult) => void;
  onRematch: () => void;
  onBackToLobby: () => void;
  steamId?: string;
  personaName?: string;
  avatarUrl?: string;
  opponentName?: string;
  opponentAvatarUrl?: string;
  opponentSteamId?: string; // PVP対戦時の相手のSteamID
}

// カードの攻撃インターバルを計算
function calculateInterval(card: BattleCardType): number {
  const baseInterval = 2000;
  const attackPenalty = Math.min(500, Math.floor(card.attack / 10) * 100);
  const hpBonus = Math.min(300, Math.floor(card.hp / 100) * 50);
  const firstStrikeBonus = card.skills.includes('firstStrike') ? -500 : 0;
  const speedBonus = card.skills.includes('speed') ? -300 : 0;  // Racing: 加速
  const earlybirdBonus = card.skills.includes('earlybird') ? -800 : 0;  // Early Access: 先制確定
  return Math.max(600, baseInterval + attackPenalty - hpBonus + firstStrikeBonus + speedBonus + earlybirdBonus);
}

// 前衛/後衛の位置補正
// 前衛: 攻撃+20%、スキル効果0.7倍
// 後衛: 攻撃-20%、スキル効果1.5倍
const POSITION_MODIFIERS = {
  front: { attackMultiplier: 1.2, skillMultiplier: 0.7 },
  back: { attackMultiplier: 0.8, skillMultiplier: 1.5 },
};

// スキル効果の適用
function applySkillEffect(
  attacker: BattleCardType & { position?: 'front' | 'back'; attackCount?: number; skillBonus?: number },
  defender: BattleCardType & { position?: 'front' | 'back'; hitCount?: number; skillBonus?: number },
  baseDamage: number,
  allyCount: number = 1,
  defenderHpPercent: number = 100
): {
  damage: number;
  healAmount: number;
  allyHealAmount: number;
  isReflected: boolean;
  isCritical: boolean;
  isDodged: boolean;
  skillUsed?: GenreSkill;
} {
  // 攻撃者の位置補正を適用
  const attackerPosition = attacker.position || 'front';
  const defenderPosition = defender.position || 'front';
  const attackerMod = POSITION_MODIFIERS[attackerPosition];
  const defenderMod = POSITION_MODIFIERS[defenderPosition];

  // シナジーによるスキルボーナス（%）を倍率に変換
  const attackerSkillBonus = 1 + ((attacker.skillBonus || 0) / 100);
  const defenderSkillBonus = 1 + ((defender.skillBonus || 0) / 100);

  // 基礎ダメージに攻撃者の位置補正を適用
  let damage = Math.floor(baseDamage * attackerMod.attackMultiplier);
  let healAmount = 0;
  let allyHealAmount = 0;
  let isReflected = false;
  let isCritical = false;
  let isDodged = false;
  let skillUsed: GenreSkill | undefined;

  // 防御側の追加防御倍率
  let defenseMultiplier = 1.0;

  // チュートリアル（初回被ダメ無効）チェック
  const isFirstHit = (defender.hitCount || 0) === 0;

  // 攻撃者スキル（スキル倍率は攻撃者の位置で決まる）
  attacker.skills.forEach(skill => {
    switch (skill) {
      case 'absorb':
        // 吸収: 与ダメの30%回復（スキル倍率適用）
        healAmount = Math.floor(damage * 0.3 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'ambush':
        // 奇襲: 25%で2倍ダメージ（スキル倍率で確率UP、最大50%）
        const ambushCrit = Math.min(0.5, 0.25 * attackerMod.skillMultiplier * attackerSkillBonus);
        if (Math.random() < ambushCrit) {
          damage *= 2;
          isCritical = true;
          skillUsed = skill;
        }
        break;
      case 'buff':
        // バフ: 自攻撃+15%（スキル倍率適用）
        const buffBonus = 0.15 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + buffBonus));
        skillUsed = skill;
        break;
      case 'lucky':
        // 幸運: 20%で1.5倍ダメージ
        if (Math.random() < 0.2 * attackerMod.skillMultiplier * attackerSkillBonus) {
          damage = Math.floor(damage * 1.5);
          skillUsed = skill;
        }
        break;
      case 'teamwork':
        // 連携: 攻撃時味方HP+5%回復
        allyHealAmount = Math.floor(damage * 0.05 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'explore':
        // 探索: 敵防御無視20%
        defenseMultiplier *= (1 - 0.2 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'party':
        // パーティ: 味方多いほど攻撃UP（味方1人につき+5%）
        const partyBonus = allyCount * 0.05 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + partyBonus));
        skillUsed = skill;
        break;
      case 'calculate':
        // 計算: クリティカル率+10%
        if (Math.random() < 0.1 * attackerMod.skillMultiplier * attackerSkillBonus) {
          damage = Math.floor(damage * 1.5);
          isCritical = true;
          skillUsed = skill;
        }
        break;
      case 'soundwave':
        // 音波: 全体攻撃、威力50%（AOE効果はバトルループ側で処理）
        // ここでは威力調整のみ
        skillUsed = skill;
        break;
      case 'design':
        // デザイン: スキル効果+10%（他スキルの効果が強化される）
        // 実装は他スキルの計算に影響するため、マルチプライヤーとして処理
        skillUsed = skill;
        break;
      case 'study':
        // 学習: 戦闘中攻撃力徐々にUP（攻撃回数に応じて+2%）
        const studyBonus = (attacker.attackCount || 0) * 0.02 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + Math.min(0.5, studyBonus)));
        skillUsed = skill;
        break;
      case 'training':
        // トレーニング: 最初の攻撃2倍
        if ((attacker.attackCount || 0) === 0) {
          damage *= 2;
          skillUsed = skill;
        }
        break;
      case 'produce':
        // プロデュース: 味方スキル発動率UP（実装は確率計算に影響）
        skillUsed = skill;
        break;
      case 'publish':
        // パブリッシュ: 敵情報公開、弱点+10%ダメージ
        damage = Math.floor(damage * (1 + 0.1 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'develop':
        // 開発: ランダムスキル追加発動（10%確率で追加クリティカル）
        if (Math.random() < 0.1) {
          damage = Math.floor(damage * 1.3);
          skillUsed = skill;
        }
        break;
      case 'mature':
        // マチュア: 攻撃+20%、防御-10%
        damage = Math.floor(damage * (1 + 0.2 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'expose':
        // エクスポーズ: 敵防御-20%
        defenseMultiplier *= (1 - 0.2 * attackerMod.skillMultiplier * attackerSkillBonus);
        skillUsed = skill;
        break;
      case 'brutal':
        // ブルータル: 与ダメ+25%
        damage = Math.floor(damage * (1 + 0.25 * attackerMod.skillMultiplier * attackerSkillBonus));
        skillUsed = skill;
        break;
      case 'gore':
        // ゴア: 敵HP低いほどダメージUP（HP50%以下で最大+50%）
        const goreBonus = Math.max(0, (50 - defenderHpPercent) / 50) * 0.5 * attackerMod.skillMultiplier * attackerSkillBonus;
        damage = Math.floor(damage * (1 + goreBonus));
        if (goreBonus > 0) skillUsed = skill;
        break;
    }
  });

  // 防御者スキル（スキル倍率は防御者の位置で決まる）
  defender.skills.forEach(skill => {
    switch (skill) {
      case 'defense':
        // 防御: 被ダメ-30%（スキル倍率で軽減量UP）
        const defenseReduction = 0.3 * defenderMod.skillMultiplier * defenderSkillBonus * defenseMultiplier;
        damage = Math.floor(damage * (1 - Math.min(0.5, defenseReduction)));
        skillUsed = skill;
        break;
      case 'reflect':
        // 反射: 被ダメの20%返し
        isReflected = true;
        skillUsed = skill;
        break;
      case 'fear':
        // 恐怖: 敵攻撃-20%（スキル倍率適用）
        const fearReduction = 0.2 * defenderMod.skillMultiplier * defenderSkillBonus;
        damage = Math.floor(damage * (1 - Math.min(0.4, fearReduction)));
        skillUsed = skill;
        break;
      case 'freebie':
        // フリービー: 被ダメ時10%で無効化
        if (Math.random() < 0.1 * defenderMod.skillMultiplier * defenderSkillBonus) {
          isDodged = true;
          damage = 0;
          skillUsed = skill;
        }
        break;
      case 'retouch':
        // レタッチ: HP20%以下で防御2倍
        if (defenderHpPercent <= 20) {
          damage = Math.floor(damage * 0.5);
          skillUsed = skill;
        }
        break;
      case 'utility':
        // ユーティリティ: 状態異常耐性（反射などの追加効果を軽減）
        // 実装は状態異常システムがある場合に効果発揮
        skillUsed = skill;
        break;
      case 'tutorial':
        // チュートリアル: 初回被ダメ無効
        if (isFirstHit) {
          isDodged = true;
          damage = 0;
          skillUsed = skill;
        }
        break;
      case 'docu':
        // ドキュメント: 敵スキル効果-20%
        // 攻撃者のスキル効果を弱体化（ダメージを少し軽減で表現）
        damage = Math.floor(damage * (1 - 0.1 * defenderMod.skillMultiplier * defenderSkillBonus));
        skillUsed = skill;
        break;
      case 'mature':
        // マチュア（防御側）: 攻撃+20%、防御-10%
        damage = Math.floor(damage * 1.1); // 被ダメ+10%
        break;
      case 'brutal':
        // ブルータル（防御側）: 被ダメ+15%
        damage = Math.floor(damage * 1.15);
        break;
    }
  });

  return { damage, healAmount, allyHealAmount, isReflected, isCritical, isDodged, skillUsed };
}

// リアルタイムバトル用カード型（チーム共有HP、個別HPなし）
interface BattleCardState extends BattleCardType {
  currentTimer: number;
  maxTimer: number;
  isPlayer: boolean;
  position: 'front' | 'back';
  index: number;
  attackCount: number;  // 攻撃回数（studyスキル用）
  hitCount: number;     // 被ダメ回数（tutorialスキル用）
  skillBonus: number;   // シナジーによるスキル効果ボーナス（%）
}

export default function BattleArena({
  playerDeck,
  opponentDeck,
  onRematch,
  onBackToLobby,
  steamId,
  personaName,
  avatarUrl,
  opponentName,
  opponentAvatarUrl,
  opponentSteamId,
}: BattleArenaProps) {
  const { language } = useLanguage();
  const [battleState, setBattleState] = useState<'preparing' | 'fighting' | 'finished'>('preparing');
  const [showBattleStart, setShowBattleStart] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [battleStats, setBattleStats] = useState<{
    graduations: number;
    wins: number;
    score: number;
    rank: number | null;
    newGraduations: Array<{ appid: number; name: string }>;
  } | null>(null);
  const battleReportedRef = useRef(false);

  // リアルタイムバトル用state
  const [battleCards, setBattleCards] = useState<BattleCardState[]>([]);
  const [playerTotalHp, setPlayerTotalHp] = useState(0);
  const [playerMaxHp, setPlayerMaxHp] = useState(0);
  const [opponentTotalHp, setOpponentTotalHp] = useState(0);
  const [opponentMaxHp, setOpponentMaxHp] = useState(0);
  const [speed, setSpeed] = useState(1);

  // エフェクト用state
  const [currentAction, setCurrentAction] = useState<{
    attacker: string;
    attackerIndex: number;
    attackerPosition: 'front' | 'back';
    attackerIsPlayer: boolean;
    defender: string;
    damage: number;
    isCritical: boolean;
    isPlayerAttacking: boolean;
    skill?: GenreSkill;
  } | null>(null);
  // 複数のダメージ表示（スタッキング対応）
  const [damageDisplays, setDamageDisplays] = useState<Array<{
    target: 'player' | 'opponent';
    damage: number;
    isCritical: boolean;
    key: number;
    offsetX: number; // ランダムX位置オフセット（px）
    offsetY: number; // ランダムY位置オフセット（px）
  }>>([]);
  const [shakeTarget, setShakeTarget] = useState<'player' | 'opponent' | null>(null);
  // 複数の火花エフェクト（ランダム位置で最後まで再生）
  const [hitEffects, setHitEffects] = useState<Array<{
    target: 'player' | 'opponent';
    key: number;
    x: number; // ランダムX位置（%）
    y: number; // ランダムY位置（%）
  }>>([]);
  // スキル発動表示（積み上げ式）
  const [skillDisplays, setSkillDisplays] = useState<Array<{
    skill: GenreSkill;
    isPlayerAttacking: boolean;
    key: number;
  }>>([]);

  // バトルログ
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // HP用ref（リアルタイム更新用）
  const playerHpRef = useRef(0);
  const opponentHpRef = useRef(0);

  // アニメーションフレーム用ref
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // バトル開始演出
  useEffect(() => {
    if (!showBattleStart) return;
    const timer = setTimeout(() => setShowBattleStart(false), 2000);
    return () => clearTimeout(timer);
  }, [showBattleStart]);

  // バトル終了時にローディングオーバーレイを表示し、APIコール
  useEffect(() => {
    if (battleState !== 'finished' || !winner || battleReportedRef.current) return;

    battleReportedRef.current = true;

    // すぐにローディングオーバーレイを表示
    setShowLoadingOverlay(true);

    // ダミーモードの場合はAPIコールせずにすぐポップアップ表示
    if (!steamId) {
      setTimeout(() => {
        setShowLoadingOverlay(false);
        setShowResultPopup(true);
      }, 500);
      return;
    }

    const reportBattle = async () => {
      try {
        // 昇華済みカード（30分以上プレイ）を抽出
        const allCards = [...playerDeck.frontLine, ...playerDeck.backLine].filter(
          (c): c is BattleCardType => c !== null
        );
        const graduatedGames = allCards
          .filter(c => c.playtimeMinutes >= 30) // 30分以上 = 昇華
          .map(c => ({ appid: c.appid, name: c.name }));

        // デッキで使用したゲーム一覧
        const deckGames = allCards.map(c => ({ appid: c.appid, name: c.name }));

        const result = winner === 'player' ? 'win' : winner === 'opponent' ? 'lose' : 'draw';

        const response = await fetch('/api/battle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steamId,
            result,
            personaName,
            avatarUrl,
            graduatedGames,
            deckGames,
            opponentSteamId, // PVP対戦時の相手のSteamID
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setBattleStats({
            graduations: data.userStats.graduations,
            wins: data.userStats.wins,
            score: data.userStats.score,
            rank: data.userStats.rank,
            newGraduations: data.newGraduations || [],
          });
        }
      } catch (error) {
        console.error('Failed to report battle:', error);
      } finally {
        // ローディング終了、ポップアップ表示
        setShowLoadingOverlay(false);
        setShowResultPopup(true);
      }
    };

    reportBattle();
  }, [battleState, winner, steamId, personaName, avatarUrl, playerDeck]);

  // バトル初期化
  useEffect(() => {
    if (battleState !== 'preparing' || showBattleStart) return;

    const cards: BattleCardState[] = [];
    let totalPlayerHp = 0;
    let totalOpponentHp = 0;

    // シナジーからスキルボーナスを計算
    const playerSkillBonus = playerDeck.synergies.reduce((acc, synergy) => {
      return acc + (synergy.effect.skillBonus || 0);
    }, 0);
    const opponentSkillBonus = opponentDeck.synergies.reduce((acc, synergy) => {
      return acc + (synergy.effect.skillBonus || 0);
    }, 0);

    // プレイヤーカード初期化
    playerDeck.frontLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        const boostedCard = { ...card };
        // シナジーボーナス適用
        playerDeck.synergies.forEach(synergy => {
          if (synergy.effect.attackBonus) {
            boostedCard.attack = Math.floor(boostedCard.attack * (1 + synergy.effect.attackBonus / 100));
          }
          if (synergy.effect.hpBonus) {
            boostedCard.hp = Math.floor(boostedCard.hp * (1 + synergy.effect.hpBonus / 100));
          }
        });
        totalPlayerHp += boostedCard.hp;
        cards.push({
          ...boostedCard,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: true,
          position: 'front',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus: playerSkillBonus,
        });
      }
    });
    playerDeck.backLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        const boostedCard = { ...card };
        playerDeck.synergies.forEach(synergy => {
          if (synergy.effect.attackBonus) {
            boostedCard.attack = Math.floor(boostedCard.attack * (1 + synergy.effect.attackBonus / 100));
          }
          if (synergy.effect.hpBonus) {
            boostedCard.hp = Math.floor(boostedCard.hp * (1 + synergy.effect.hpBonus / 100));
          }
        });
        totalPlayerHp += boostedCard.hp;
        cards.push({
          ...boostedCard,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: true,
          position: 'back',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus: playerSkillBonus,
        });
      }
    });

    // 相手カード初期化
    opponentDeck.frontLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        const boostedCard = { ...card };
        opponentDeck.synergies.forEach(synergy => {
          if (synergy.effect.attackBonus) {
            boostedCard.attack = Math.floor(boostedCard.attack * (1 + synergy.effect.attackBonus / 100));
          }
          if (synergy.effect.hpBonus) {
            boostedCard.hp = Math.floor(boostedCard.hp * (1 + synergy.effect.hpBonus / 100));
          }
        });
        totalOpponentHp += boostedCard.hp;
        cards.push({
          ...boostedCard,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: false,
          position: 'front',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus: opponentSkillBonus,
        });
      }
    });
    opponentDeck.backLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        const boostedCard = { ...card };
        opponentDeck.synergies.forEach(synergy => {
          if (synergy.effect.attackBonus) {
            boostedCard.attack = Math.floor(boostedCard.attack * (1 + synergy.effect.attackBonus / 100));
          }
          if (synergy.effect.hpBonus) {
            boostedCard.hp = Math.floor(boostedCard.hp * (1 + synergy.effect.hpBonus / 100));
          }
        });
        totalOpponentHp += boostedCard.hp;
        cards.push({
          ...boostedCard,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: false,
          position: 'back',
          index,
          attackCount: 0,
          hitCount: 0,
          skillBonus: opponentSkillBonus,
        });
      }
    });

    setBattleCards(cards);
    setPlayerTotalHp(totalPlayerHp);
    setPlayerMaxHp(totalPlayerHp);
    setOpponentTotalHp(totalOpponentHp);
    setOpponentMaxHp(totalOpponentHp);
    playerHpRef.current = totalPlayerHp;
    opponentHpRef.current = totalOpponentHp;

    setBattleState('fighting');
  }, [battleState, playerDeck, opponentDeck, showBattleStart]);

  // アクション処理用のref
  const pendingActionRef = useRef<{
    attacker: string;
    attackerIndex: number;
    attackerPosition: 'front' | 'back';
    attackerIsPlayer: boolean;
    defender: string;
    damage: number;
    isCritical: boolean;
    isPlayerAttacking: boolean;
    skill?: GenreSkill;
    healAmount: number;
    reflectDamage: number;
  } | null>(null);

  // リアルタイムバトルループ
  useEffect(() => {
    if (battleState !== 'fighting') return;

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) * speed;
      lastTimeRef.current = timestamp;

      // 勝敗判定
      if (playerHpRef.current <= 0 || opponentHpRef.current <= 0) {
        if (playerHpRef.current <= 0 && opponentHpRef.current <= 0) {
          setWinner('draw');
        } else if (playerHpRef.current <= 0) {
          setWinner('opponent');
        } else {
          setWinner('player');
        }
        setBattleState('finished');
        // ポップアップ表示はAPIレスポンス後に行う（useEffect内で処理）
        return;
      }

      setBattleCards(prevCards => {
        const newCards = prevCards.map(c => ({ ...c }));
        let actionOccurred = false;

        // 全カード処理（チーム共有HPなので全カードが常にアクティブ）
        const playerCards = newCards.filter(c => c.isPlayer);
        const opponentCards = newCards.filter(c => !c.isPlayer);

        newCards.forEach(card => {
          if (actionOccurred) return;

          card.currentTimer += deltaTime;

          // タイマーが満タンになったら攻撃
          if (card.currentTimer >= card.maxTimer) {
            card.currentTimer = 0;

            // ターゲット選択（敵チームからランダム）
            const enemies = card.isPlayer ? opponentCards : playerCards;
            const allies = card.isPlayer ? playerCards : opponentCards;
            const target = enemies[Math.floor(Math.random() * enemies.length)];

            if (target) {
              // HP％を計算（goreスキル用）
              const targetTeamHp = card.isPlayer ? opponentHpRef.current : playerHpRef.current;
              const targetTeamMaxHp = card.isPlayer ? opponentMaxHp : playerMaxHp;
              const defenderHpPercent = targetTeamMaxHp > 0 ? (targetTeamHp / targetTeamMaxHp) * 100 : 100;

              const result = applySkillEffect(
                card,
                target,
                card.attack,
                allies.length,
                defenderHpPercent
              );

              // 攻撃回数をインクリメント（studyスキル用）
              card.attackCount++;
              // 被ダメ回数をインクリメント（tutorialスキル用）
              target.hitCount++;

              // 回避された場合はダメージなし
              if (result.isDodged) {
                pendingActionRef.current = {
                  attacker: card.name,
                  attackerIndex: card.index,
                  attackerPosition: card.position,
                  attackerIsPlayer: card.isPlayer,
                  defender: target.name,
                  damage: 0,
                  isCritical: false,
                  isPlayerAttacking: card.isPlayer,
                  skill: result.skillUsed,
                  healAmount: 0,
                  reflectDamage: 0,
                };
                actionOccurred = true;
                return;
              }

              // 反射ダメージ計算（防御者の位置でスキル倍率適用）
              const targetMod = POSITION_MODIFIERS[target.position];
              const reflectMultiplier = 0.2 * targetMod.skillMultiplier; // 基本20%、後衛なら30%

              // チーム共有HPにダメージ
              let reflectDamage = 0;
              if (card.isPlayer) {
                opponentHpRef.current = Math.max(0, opponentHpRef.current - result.damage);
                // 吸収で自チーム回復
                if (result.healAmount > 0) {
                  playerHpRef.current = Math.min(playerMaxHp, playerHpRef.current + result.healAmount);
                }
                // 連携で味方HP回復
                if (result.allyHealAmount > 0) {
                  playerHpRef.current = Math.min(playerMaxHp, playerHpRef.current + result.allyHealAmount);
                }
                // 反射ダメージ（位置補正適用）
                if (result.isReflected) {
                  reflectDamage = Math.floor(result.damage * reflectMultiplier);
                  playerHpRef.current = Math.max(0, playerHpRef.current - reflectDamage);
                }
              } else {
                playerHpRef.current = Math.max(0, playerHpRef.current - result.damage);
                if (result.healAmount > 0) {
                  opponentHpRef.current = Math.min(opponentMaxHp, opponentHpRef.current + result.healAmount);
                }
                if (result.allyHealAmount > 0) {
                  opponentHpRef.current = Math.min(opponentMaxHp, opponentHpRef.current + result.allyHealAmount);
                }
                if (result.isReflected) {
                  reflectDamage = Math.floor(result.damage * reflectMultiplier);
                  opponentHpRef.current = Math.max(0, opponentHpRef.current - reflectDamage);
                }
              }

              pendingActionRef.current = {
                attacker: card.name,
                attackerIndex: card.index,
                attackerPosition: card.position,
                attackerIsPlayer: card.isPlayer,
                defender: target.name,
                damage: result.damage,
                isCritical: result.isCritical,
                isPlayerAttacking: card.isPlayer,
                skill: result.skillUsed,
                healAmount: result.healAmount,
                reflectDamage,
              };
              actionOccurred = true;
            }
          }
        });

        // HP更新
        setPlayerTotalHp(playerHpRef.current);
        setOpponentTotalHp(opponentHpRef.current);

        return newCards;
      });

      // エフェクト表示
      const action = pendingActionRef.current;
      if (action) {
        pendingActionRef.current = null;
        setCurrentAction(action);
        const targetSide = action.isPlayerAttacking ? 'opponent' : 'player';

        // ダメージ表示を追加（ランダムオフセット付き、上下左右に散らす）
        const damageKey = Date.now() + Math.random();
        const offsetX = (Math.random() - 0.5) * 150; // -75px〜75px（左右広め）
        const offsetY = (Math.random() - 0.5) * 80;  // -40px〜40px（上下も広め）
        setDamageDisplays(prev => [...prev, {
          target: targetSide,
          damage: action.damage,
          isCritical: action.isCritical,
          key: damageKey,
          offsetX,
          offsetY,
        }]);

        setShakeTarget(targetSide);
        // 火花エフェクト（デッキ全体にランダム位置）
        const newEffectKey = Date.now() + Math.random();
        const randomX = Math.random() * 80 + 10; // 10%〜90%
        const randomY = Math.random() * 60 + 20; // 20%〜80%
        setHitEffects(prev => [...prev, {
          target: targetSide,
          key: newEffectKey,
          x: randomX,
          y: randomY,
        }]);

        // スキル発動表示を追加（積み上げ式、最大5件まで）
        if (action.skill) {
          const skillKey = Date.now() + Math.random();
          setSkillDisplays(prev => {
            const newDisplays = [...prev, {
              skill: action.skill!,
              isPlayerAttacking: action.isPlayerAttacking,
              key: skillKey,
            }];
            // 最大5件まで（古いものは即削除）
            return newDisplays.slice(-5);
          });

          // 3秒後に一番古いものから順に削除
          setTimeout(() => {
            setSkillDisplays(prev => prev.filter(d => d.key !== skillKey));
          }, 3000 / speed);
        }

        // ログ追加（ユーザー名のゲーム名 → 相手ユーザー名 形式）
        const playerLabel = personaName || (language === 'ja' ? 'あなた' : 'You');
        const opponentLabel = opponentName || 'AI';
        const ownerLabel = action.isPlayerAttacking ? playerLabel : opponentLabel;
        const targetLabel = action.isPlayerAttacking ? opponentLabel : playerLabel;
        const skillText = action.skill ? ` [${action.skill}]` : '';
        const critText = action.isCritical ? ' CRIT!' : '';
        setBattleLog(prev => [
          `${ownerLabel}の${action.attacker}${skillText} → ${targetLabel} (-${action.damage}${critText})`,
          ...prev.slice(0, 9),
        ]);

        // エフェクトクリア（その他は400ms）
        setTimeout(() => {
          setCurrentAction(null);
          setShakeTarget(null);
        }, 400 / speed);

        // ダメージ表示は2.5秒後にフェードアウト（長めに表示）
        setTimeout(() => {
          setDamageDisplays(prev => prev.filter(d => d.key !== damageKey));
        }, 2500 / speed);

        // 火花エフェクトは個別に削除（アニメーション完了後）
        setTimeout(() => {
          setHitEffects(prev => prev.filter(e => e.key !== newEffectKey));
        }, 600 / speed);
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [battleState, speed]);

  // スキップ
  const skipToEnd = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // 簡易シミュレーション
    const playerCards = battleCards.filter(c => c.isPlayer);
    const opponentCards = battleCards.filter(c => !c.isPlayer);
    const playerDps = playerCards.reduce((sum, c) => sum + (c.attack * 1000 / c.maxTimer), 0);
    const opponentDps = opponentCards.reduce((sum, c) => sum + (c.attack * 1000 / c.maxTimer), 0);

    const playerTime = opponentHpRef.current / playerDps;
    const opponentTime = playerHpRef.current / opponentDps;

    if (playerTime < opponentTime) {
      opponentHpRef.current = 0;
      setWinner('player');
    } else if (opponentTime < playerTime) {
      playerHpRef.current = 0;
      setWinner('opponent');
    } else {
      setWinner('draw');
    }

    setPlayerTotalHp(playerHpRef.current);
    setOpponentTotalHp(opponentHpRef.current);
    setCurrentAction(null);
    setDamageDisplays([]);
    setShakeTarget(null);
    setHitEffects([]);
    setSkillDisplays([]);
    setBattleState('finished');
    // ポップアップ表示はAPIレスポンス後に行う（useEffect内で処理）
  }, [battleCards]);

  // カードのタイマー表示用
  const getCardTimerPercent = (card: BattleCardState) => {
    return Math.min(100, (card.currentTimer / card.maxTimer) * 100);
  };

  // 表示用カード取得
  const playerFrontCards = battleCards.filter(c => c.isPlayer && c.position === 'front');
  const playerBackCards = battleCards.filter(c => c.isPlayer && c.position === 'back');
  const opponentFrontCards = battleCards.filter(c => !c.isPlayer && c.position === 'front');
  const opponentBackCards = battleCards.filter(c => !c.isPlayer && c.position === 'back');

  // カードがアクティブ（攻撃/スキル発動中）かどうか
  const isCardActive = (isPlayer: boolean, position: 'front' | 'back', index: number) => {
    if (!currentAction) return false;
    return (
      currentAction.attackerIsPlayer === isPlayer &&
      currentAction.attackerPosition === position &&
      currentAction.attackerIndex === index
    );
  };

  // チームのHP残りがあるかどうか
  const isPlayerTeamAlive = playerTotalHp > 0;
  const isOpponentTeamAlive = opponentTotalHp > 0;

  return (
    <div className="space-y-4">
      {/* 速度コントロール */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 5].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] font-bold transition-all ${
              speed === s ? 'bg-[#3D3D3D] text-white' : 'hover:bg-gray-100'
            }`}
            style={{ backgroundColor: speed === s ? '#3D3D3D' : 'var(--card-bg)' }}
          >
            {s === 1 ? <Play className="w-4 h-4" /> : <FastForward className="w-4 h-4" />}
            x{s}
          </button>
        ))}
      </div>

      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#3D3D3D]">
          {battleState === 'preparing' && (language === 'ja' ? 'バトル準備中...' : 'Preparing Battle...')}
          {battleState === 'fighting' && (language === 'ja' ? 'バトル中!' : 'Battle!')}
          {battleState === 'finished' && (language === 'ja' ? 'バトル終了' : 'Battle End')}
        </h2>
      </div>

      {/* バトルフィールド */}
      <div className="pop-card p-4 lg:p-6 relative overflow-hidden">
        {/* PC版: 横並び（自分左、相手右）、スマホ: 縦並び（相手上、自分下） */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">

          {/* プレイヤー側（PC: 左、スマホ: 下なのでorderで調整） */}
          <div className="flex-1 space-y-2 order-2 lg:order-1 relative">
            {/* ダメージ表示（プレイヤー側・複数スタック） */}
            {damageDisplays.filter(d => d.target === 'player').map((damageDisplay) => (
              <div
                key={damageDisplay.key}
                className="absolute top-1/2 left-1/2 z-30 pointer-events-none"
                style={{
                  animation: 'damage-pop 2.5s ease-out forwards',
                  transform: `translate(calc(-50% + ${damageDisplay.offsetX}px), calc(-50% + ${damageDisplay.offsetY}px))`,
                }}
              >
                <span
                  className={`text-4xl lg:text-5xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.7)' }}
                >
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-2xl lg:text-3xl ml-2">CRIT!</span>}
                </span>
              </div>
            ))}

            {/* プレイヤーHPバー */}
            <div className="flex items-center gap-2 p-2 rounded-lg border-2" style={{ borderColor: 'var(--pop-green)', backgroundColor: 'rgba(42, 157, 143, 0.1)' }}>
              {/* アイコン */}
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--pop-green)' }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--pop-green)' }}>
                  {personaName?.charAt(0)?.toUpperCase() || 'P'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate" style={{ color: 'var(--pop-green)' }}>
                    {personaName || (language === 'ja' ? 'あなた' : 'You')}
                  </span>
                  <span className="text-xs font-bold ml-2" style={{ color: 'var(--pop-green)' }}>
                    {playerTotalHp} / {playerMaxHp}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${playerMaxHp > 0 ? (playerTotalHp / playerMaxHp) * 100 : 0}%`,
                      backgroundColor: 'var(--pop-green)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* プレイヤー前衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '前衛' : 'Front'}</p>
              <div className="flex gap-1 justify-center relative flex-wrap">
                {playerFrontCards.map((card, index) => {
                  const active = isCardActive(true, 'front', card.index);
                  return (
                    <div
                      key={`player-front-${index}`}
                      className={`relative transition-transform duration-150 ${shakeTarget === 'player' ? 'animate-shake' : ''} ${active ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isPlayerTeamAlive}
                      />
                      {isPlayerTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {active && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
                {/* 火花エフェクト */}
                {hitEffects.filter(e => e.target === 'player').map(effect => (
                  <div key={effect.key} className="absolute pointer-events-none z-20" style={{ left: `${effect.x}%`, top: `${effect.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="spark-burst bg-red-500/80" />
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const distance = 50 + Math.random() * 20;
                      return (
                        <div key={i} className="spark-particle" style={{ '--spark-x': `${Math.cos(angle) * distance}px`, '--spark-y': `${Math.sin(angle) * distance}px`, backgroundColor: i % 2 === 0 ? '#EF4444' : '#F97316', animationDelay: `${i * 0.02}s` } as React.CSSProperties} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* プレイヤー後衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '後衛' : 'Back'}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {playerBackCards.map((card, index) => {
                  const active = isCardActive(true, 'back', card.index);
                  return (
                    <div
                      key={`player-back-${index}`}
                      className={`relative transition-transform duration-150 ${shakeTarget === 'player' ? 'animate-shake' : ''} ${active ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isPlayerTeamAlive}
                      />
                      {isPlayerTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {active && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* VS（中央）- スキル発動表示（積み上げ式） */}
          <div className="flex items-center justify-center order-1 lg:order-2 py-2 lg:py-0 lg:px-4 relative min-w-20">
            <span className="text-3xl lg:text-4xl font-black text-gray-300">VS</span>
            {/* スキル発動を積み上げ表示（下から上へ） */}
            {skillDisplays.length > 0 && (
              <div className="absolute inset-0 flex flex-col-reverse items-center justify-center pointer-events-none gap-1 overflow-visible">
                {skillDisplays.map((display, index) => (
                  <div
                    key={display.key}
                    className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg border-2 text-center whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      borderColor: display.isPlayerAttacking ? 'var(--pop-green)' : 'var(--pop-red)',
                      boxShadow: display.isPlayerAttacking
                        ? '0 0 10px rgba(42, 157, 143, 0.5)'
                        : '0 0 10px rgba(230, 57, 70, 0.5)',
                      animation: 'bounce-in 0.2s ease-out',
                      opacity: 1 - (index * 0.15), // 古いものは少し薄く
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Zap
                        className="w-3 h-3 lg:w-4 lg:h-4"
                        style={{ color: display.isPlayerAttacking ? 'var(--pop-green)' : 'var(--pop-red)' }}
                      />
                      <span className="text-white font-bold text-xs block">
                        {SKILL_DESCRIPTIONS[display.skill][language === 'ja' ? 'ja' : 'en'].split('（')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 相手側（PC: 右、スマホ: 上） */}
          <div className="flex-1 space-y-2 order-0 lg:order-3 relative">
            {/* ダメージ表示（相手側・複数スタック） */}
            {damageDisplays.filter(d => d.target === 'opponent').map((damageDisplay) => (
              <div
                key={damageDisplay.key}
                className="absolute top-1/2 left-1/2 z-30 pointer-events-none"
                style={{
                  animation: 'damage-pop 2.5s ease-out forwards',
                  transform: `translate(calc(-50% + ${damageDisplay.offsetX}px), calc(-50% + ${damageDisplay.offsetY}px))`,
                }}
              >
                <span
                  className={`text-4xl lg:text-5xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.7)' }}
                >
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-2xl lg:text-3xl ml-2">CRIT!</span>}
                </span>
              </div>
            ))}

            {/* 相手HPバー */}
            <div className="flex items-center gap-2 p-2 rounded-lg border-2" style={{ borderColor: 'var(--pop-red)', backgroundColor: 'rgba(230, 57, 70, 0.1)' }}>
              {/* アイコン */}
              {opponentAvatarUrl ? (
                <img src={opponentAvatarUrl} alt="" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--pop-red)' }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--pop-red)' }}>
                  {opponentName?.charAt(0)?.toUpperCase() || 'AI'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate" style={{ color: 'var(--pop-red)' }}>
                    {opponentName || 'AI'}
                  </span>
                  <span className="text-xs font-bold ml-2" style={{ color: 'var(--pop-red)' }}>
                    {opponentTotalHp} / {opponentMaxHp}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${opponentMaxHp > 0 ? (opponentTotalHp / opponentMaxHp) * 100 : 0}%`,
                      backgroundColor: 'var(--pop-red)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 相手前衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '前衛' : 'Front'}</p>
              <div className="flex gap-1 justify-center relative flex-wrap">
                {opponentFrontCards.map((card, index) => {
                  const active = isCardActive(false, 'front', card.index);
                  return (
                    <div
                      key={`opponent-front-${index}`}
                      className={`relative transition-transform duration-150 ${shakeTarget === 'opponent' ? 'animate-shake' : ''} ${active ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isOpponentTeamAlive}
                      />
                      {isOpponentTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {active && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
                {/* 火花エフェクト */}
                {hitEffects.filter(e => e.target === 'opponent').map(effect => (
                  <div key={effect.key} className="absolute pointer-events-none z-20" style={{ left: `${effect.x}%`, top: `${effect.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="spark-burst bg-orange-400/80" />
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const distance = 50 + Math.random() * 20;
                      return (
                        <div key={i} className="spark-particle" style={{ '--spark-x': `${Math.cos(angle) * distance}px`, '--spark-y': `${Math.sin(angle) * distance}px`, backgroundColor: i % 2 === 0 ? '#F97316' : '#FBBF24', animationDelay: `${i * 0.02}s` } as React.CSSProperties} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 相手後衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '後衛' : 'Back'}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {opponentBackCards.map((card, index) => {
                  const active = isCardActive(false, 'back', card.index);
                  return (
                    <div
                      key={`opponent-back-${index}`}
                      className={`relative transition-transform duration-150 ${shakeTarget === 'opponent' ? 'animate-shake' : ''} ${active ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isOpponentTeamAlive}
                      />
                      {isOpponentTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {active && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* バトルログ */}
      <div className="pop-card p-4 max-h-32 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-600 mb-2">
          {language === 'ja' ? 'バトルログ' : 'Battle Log'}
        </h3>
        <div className="space-y-1 text-xs">
          {battleLog.map((log, index) => (
            <div key={index} className="text-gray-600">{log}</div>
          ))}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-center gap-4">
        {battleState === 'fighting' && (
          <button
            onClick={skipToEnd}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Zap className="w-5 h-5" />
            {language === 'ja' ? 'スキップ' : 'Skip'}
          </button>
        )}
      </div>

      {/* バトル開始演出 */}
      {showBattleStart && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center" style={{ animation: 'bounce-in 0.5s ease-out' }}>
            <div
              className="text-6xl md:text-8xl font-black text-white"
              style={{
                textShadow: '0 0 20px var(--pop-red), 0 0 40px var(--pop-yellow), 0 0 60px var(--pop-red)',
                animation: 'pulse-glow 1s ease-in-out infinite',
              }}
            >
              {language === 'ja' ? 'バトル開始！' : 'Battle Start!'}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Swords className="w-12 h-12 text-white animate-bounce" />
              <Zap className="w-12 h-12 text-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
              <Swords className="w-12 h-12 text-white animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* ローディングオーバーレイ（バトル終了後、結果取得中） */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
            <p className="text-white text-lg font-bold">
              {language === 'ja' ? '結果を読み込み中...' : 'Loading results...'}
            </p>
          </div>
        </div>
      )}

      {/* 結果ポップアップ */}
      {showResultPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-hidden">
          {/* 紙吹雪エフェクト（勝利時のみ） */}
          {winner === 'player' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-20px',
                    width: `${8 + Math.random() * 8}px`,
                    height: `${8 + Math.random() * 8}px`,
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                    borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}
          <div
            className="pop-card p-8 max-w-md w-full mx-4 text-center relative z-10"
            style={{ animation: 'bounce-in 0.5s ease-out' }}
          >
            {/* 結果ラベル（大きく上に） */}
            <div className="mb-6">
              {winner === 'player' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-green)' }}>
                  {language === 'ja' ? '勝利！' : 'Victory!'}
                </h2>
              )}
              {winner === 'opponent' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-red)' }}>
                  {language === 'ja' ? '敗北...' : 'Defeat...'}
                </h2>
              )}
              {winner === 'draw' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-yellow)' }}>
                  {language === 'ja' ? '引き分け' : 'Draw'}
                </h2>
              )}
            </div>

            {/* 戦績情報 */}
            {battleStats && (
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-green)' }}>
                      {battleStats.wins}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? '勝利' : 'Wins'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-yellow)' }}>
                      #{battleStats.rank || '-'}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? '順位' : 'Rank'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-purple)' }}>
                      {battleStats.score}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? 'スコア' : 'Score'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowResultPopup(false);
                  onRematch();
                }}
                className="pop-button flex items-center justify-center gap-2 px-6 py-3 text-white font-bold w-full"
              >
                <RotateCcw className="w-5 h-5" />
                {language === 'ja' ? 'もう一度バトル' : 'Battle Again'}
              </button>
              <button
                onClick={onBackToLobby}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 font-bold w-full"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <Home className="w-5 h-5" />
                {language === 'ja' ? 'ロビーに戻る' : 'Back to Lobby'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
