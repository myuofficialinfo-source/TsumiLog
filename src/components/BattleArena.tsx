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
}

// カードの攻撃インターバルを計算（攻撃力が高いほど遅い、HPが高いほど速い）
function calculateInterval(card: BattleCardType): number {
  // 基本インターバル: 2000ms
  // 攻撃力補正: 攻撃力10ごとに+100ms（最大+500ms）
  // HP補正: HP100ごとに-50ms（最大-300ms）
  const baseInterval = 2000;
  const attackPenalty = Math.min(500, Math.floor(card.attack / 10) * 100);
  const hpBonus = Math.min(300, Math.floor(card.hp / 100) * 50);
  // 先制攻撃持ちは最初のインターバルが半分
  const firstStrikeBonus = card.skills.includes('firstStrike') ? -500 : 0;
  return Math.max(800, baseInterval + attackPenalty - hpBonus + firstStrikeBonus);
}

// スキル効果の適用
function applySkillEffect(
  attacker: BattleCardType,
  defender: BattleCardType,
  baseDamage: number
): {
  damage: number;
  healAmount: number;
  isReflected: boolean;
  isCritical: boolean;
  skillUsed?: GenreSkill;
} {
  let damage = baseDamage;
  let healAmount = 0;
  let isReflected = false;
  let isCritical = false;
  let skillUsed: GenreSkill | undefined;

  // 攻撃者のスキル
  attacker.skills.forEach(skill => {
    switch (skill) {
      case 'absorb':
        healAmount = Math.floor(damage * 0.3);
        skillUsed = skill;
        break;
      case 'ambush':
        if (Math.random() < 0.25) {
          damage *= 2;
          isCritical = true;
          skillUsed = skill;
        }
        break;
    }
  });

  // 防御者のスキル
  defender.skills.forEach(skill => {
    switch (skill) {
      case 'defense':
        damage = Math.floor(damage * 0.7);
        skillUsed = skill;
        break;
      case 'reflect':
        isReflected = true;
        skillUsed = skill;
        break;
      case 'fear':
        damage = Math.floor(damage * 0.8);
        skillUsed = skill;
        break;
    }
  });

  return { damage, healAmount, isReflected, isCritical, skillUsed };
}

// リアルタイムバトル用カード型
interface BattleCardState extends BattleCardType {
  currentHp: number;
  currentTimer: number;
  maxTimer: number;
  isPlayer: boolean;
  position: 'front' | 'back';
  index: number;
}

export default function BattleArena({
  playerDeck,
  opponentDeck,
  onRematch,
  onBackToLobby,
}: BattleArenaProps) {
  const { language } = useLanguage();
  const [battleState, setBattleState] = useState<'preparing' | 'fighting' | 'finished'>('preparing');
  const [showBattleStart, setShowBattleStart] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);

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
    attackerIsPlayer: boolean;
    defender: string;
    damage: number;
    isCritical: boolean;
    isPlayerAttacking: boolean;
    skill?: GenreSkill;
  } | null>(null);
  const [damageDisplay, setDamageDisplay] = useState<{
    target: 'player' | 'opponent';
    damage: number;
    isCritical: boolean;
  } | null>(null);
  const [shakeTarget, setShakeTarget] = useState<'player' | 'opponent' | null>(null);

  // バトルログ
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // アニメーションフレーム用ref
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // バトル開始演出
  useEffect(() => {
    if (!showBattleStart) return;
    const timer = setTimeout(() => setShowBattleStart(false), 2000);
    return () => clearTimeout(timer);
  }, [showBattleStart]);

  // バトル初期化
  useEffect(() => {
    if (battleState !== 'preparing' || showBattleStart) return;

    const cards: BattleCardState[] = [];

    // プレイヤーカード初期化
    playerDeck.frontLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        cards.push({
          ...card,
          currentHp: card.hp,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: true,
          position: 'front',
          index,
        });
      }
    });
    playerDeck.backLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        cards.push({
          ...card,
          currentHp: card.hp,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: true,
          position: 'back',
          index,
        });
      }
    });

    // 相手カード初期化
    opponentDeck.frontLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        cards.push({
          ...card,
          currentHp: card.hp,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: false,
          position: 'front',
          index,
        });
      }
    });
    opponentDeck.backLine.forEach((card, index) => {
      if (card) {
        const interval = calculateInterval(card);
        cards.push({
          ...card,
          currentHp: card.hp,
          currentTimer: 0,
          maxTimer: interval,
          isPlayer: false,
          position: 'back',
          index,
        });
      }
    });

    // シナジーボーナス適用
    const applyBonus = (isPlayer: boolean, synergies: typeof playerDeck.synergies) => {
      synergies.forEach(synergy => {
        cards.forEach(card => {
          if (card.isPlayer === isPlayer) {
            if (synergy.effect.attackBonus) {
              card.attack = Math.floor(card.attack * (1 + synergy.effect.attackBonus / 100));
            }
            if (synergy.effect.hpBonus) {
              card.hp = Math.floor(card.hp * (1 + synergy.effect.hpBonus / 100));
              card.currentHp = card.hp;
              card.maxHp = card.hp;
            }
          }
        });
      });
    };
    applyBonus(true, playerDeck.synergies);
    applyBonus(false, opponentDeck.synergies);

    setBattleCards(cards);

    // HP計算
    const playerHp = cards.filter(c => c.isPlayer).reduce((sum, c) => sum + c.hp, 0);
    const opponentHp = cards.filter(c => !c.isPlayer).reduce((sum, c) => sum + c.hp, 0);
    setPlayerTotalHp(playerHp);
    setPlayerMaxHp(playerHp);
    setOpponentTotalHp(opponentHp);
    setOpponentMaxHp(opponentHp);

    setBattleState('fighting');
  }, [battleState, playerDeck, opponentDeck, showBattleStart]);

  // アクション処理用のref
  const pendingActionRef = useRef<{
    attacker: string;
    attackerIndex: number;
    attackerIsPlayer: boolean;
    defender: string;
    damage: number;
    isCritical: boolean;
    isPlayerAttacking: boolean;
    skill?: GenreSkill;
  } | null>(null);

  // リアルタイムバトルループ
  useEffect(() => {
    if (battleState !== 'fighting') return;

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) * speed;
      lastTimeRef.current = timestamp;

      setBattleCards(prevCards => {
        const newCards = [...prevCards];
        let actionOccurred = false;

        // 生存カードのみ処理
        const aliveCards = newCards.filter(c => c.currentHp > 0);
        const playerAlive = aliveCards.filter(c => c.isPlayer);
        const opponentAlive = aliveCards.filter(c => !c.isPlayer);

        // 勝敗判定
        if (playerAlive.length === 0 || opponentAlive.length === 0) {
          if (playerAlive.length === 0 && opponentAlive.length === 0) {
            setWinner('draw');
          } else if (playerAlive.length === 0) {
            setWinner('opponent');
          } else {
            setWinner('player');
          }
          setBattleState('finished');
          setTimeout(() => setShowResultPopup(true), 1000);
          return newCards;
        }

        // 各カードのタイマー更新
        aliveCards.forEach(card => {
          if (actionOccurred) return;

          card.currentTimer += deltaTime;

          // タイマーが満タンになったら攻撃
          if (card.currentTimer >= card.maxTimer) {
            card.currentTimer = 0;

            // ターゲット選択（前衛優先）
            const enemies = card.isPlayer ? opponentAlive : playerAlive;
            const frontEnemies = enemies.filter(e => e.position === 'front' && e.currentHp > 0);
            const target = frontEnemies.length > 0
              ? frontEnemies[Math.floor(Math.random() * frontEnemies.length)]
              : enemies.filter(e => e.currentHp > 0)[0];

            if (target) {
              const result = applySkillEffect(card, target, card.attack);
              target.currentHp = Math.max(0, target.currentHp - result.damage);

              // HP回復
              if (result.healAmount > 0) {
                card.currentHp = Math.min(card.maxHp, card.currentHp + result.healAmount);
              }

              // 反射ダメージ
              if (result.isReflected) {
                const reflectDamage = Math.floor(result.damage * 0.2);
                card.currentHp = Math.max(0, card.currentHp - reflectDamage);
              }

              pendingActionRef.current = {
                attacker: card.name,
                attackerIndex: card.index,
                attackerIsPlayer: card.isPlayer,
                defender: target.name,
                damage: result.damage,
                isCritical: result.isCritical,
                isPlayerAttacking: card.isPlayer,
                skill: result.skillUsed,
              };
              actionOccurred = true;
            }
          }
        });

        // HP合計更新
        const newPlayerHp = newCards.filter(c => c.isPlayer).reduce((sum, c) => sum + Math.max(0, c.currentHp), 0);
        const newOpponentHp = newCards.filter(c => !c.isPlayer).reduce((sum, c) => sum + Math.max(0, c.currentHp), 0);
        setPlayerTotalHp(newPlayerHp);
        setOpponentTotalHp(newOpponentHp);

        return newCards;
      });

      // エフェクト表示（コールバック外で処理）
      const action = pendingActionRef.current;
      if (action) {
        pendingActionRef.current = null;
        setCurrentAction(action);
        setDamageDisplay({
          target: action.isPlayerAttacking ? 'opponent' : 'player',
          damage: action.damage,
          isCritical: action.isCritical,
        });
        setShakeTarget(action.isPlayerAttacking ? 'opponent' : 'player');

        // ログ追加
        setBattleLog(prev => [
          `${action.attacker} → ${action.defender} (-${action.damage}${action.isCritical ? ' CRIT!' : ''})`,
          ...prev.slice(0, 9),
        ]);

        // エフェクトクリア
        setTimeout(() => {
          setCurrentAction(null);
          setDamageDisplay(null);
          setShakeTarget(null);
        }, 400 / speed);
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

    // 即座にバトル終了
    let playerHp = playerMaxHp;
    let opponentHp = opponentMaxHp;

    // 簡易シミュレーション
    const playerCards = battleCards.filter(c => c.isPlayer);
    const opponentCards = battleCards.filter(c => !c.isPlayer);
    const playerDps = playerCards.reduce((sum, c) => sum + (c.attack * 1000 / c.maxTimer), 0);
    const opponentDps = opponentCards.reduce((sum, c) => sum + (c.attack * 1000 / c.maxTimer), 0);

    // DPS比較で勝敗決定
    const playerTime = opponentHp / playerDps;
    const opponentTime = playerHp / opponentDps;

    if (playerTime < opponentTime) {
      opponentHp = 0;
      setWinner('player');
    } else if (opponentTime < playerTime) {
      playerHp = 0;
      setWinner('opponent');
    } else {
      setWinner('draw');
    }

    setPlayerTotalHp(playerHp);
    setOpponentTotalHp(opponentHp);
    setCurrentAction(null);
    setDamageDisplay(null);
    setShakeTarget(null);
    setBattleState('finished');
    setTimeout(() => setShowResultPopup(true), 1000);
  }, [battleCards, playerMaxHp, opponentMaxHp]);

  // カードのタイマーバー表示用
  const getCardTimerPercent = (card: BattleCardState) => {
    return Math.min(100, (card.currentTimer / card.maxTimer) * 100);
  };

  // 表示用カード取得
  const playerFrontCards = battleCards.filter(c => c.isPlayer && c.position === 'front');
  const playerBackCards = battleCards.filter(c => c.isPlayer && c.position === 'back');
  const opponentFrontCards = battleCards.filter(c => !c.isPlayer && c.position === 'front');
  const opponentBackCards = battleCards.filter(c => !c.isPlayer && c.position === 'back');

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
          {battleState === 'finished' && winner === 'player' && (
            <span className="text-green-600">{language === 'ja' ? '勝利!' : 'Victory!'}</span>
          )}
          {battleState === 'finished' && winner === 'opponent' && (
            <span className="text-red-600">{language === 'ja' ? '敗北...' : 'Defeat...'}</span>
          )}
          {battleState === 'finished' && winner === 'draw' && (
            <span className="text-yellow-600">{language === 'ja' ? '引き分け' : 'Draw'}</span>
          )}
        </h2>
      </div>

      {/* バトルフィールド */}
      <div className="pop-card p-6 space-y-4 relative overflow-hidden">
        {/* 相手側 */}
        <div className="space-y-2">
          {/* 相手HPバー */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-12">
                {language === 'ja' ? '相手' : 'Enemy'}
              </span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D] relative">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${opponentMaxHp > 0 ? (opponentTotalHp / opponentMaxHp) * 100 : 0}%`,
                    backgroundColor: 'var(--pop-red)',
                  }}
                />
              </div>
              <span className="text-xs font-bold w-20 text-right" style={{ color: 'var(--pop-red)' }}>
                {opponentTotalHp} / {opponentMaxHp}
              </span>
            </div>
            {/* ダメージ表示（HPバーの上に浮かぶ） */}
            {damageDisplay && damageDisplay.target === 'opponent' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-2"
                style={{ animation: 'damage-pop 0.5s ease-out forwards' }}
              >
                <span className={`text-2xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}>
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-sm ml-1">!</span>}
                </span>
              </div>
            )}
          </div>

          {/* 相手後衛 */}
          <div className="flex gap-2 justify-center">
            {opponentBackCards.map((card, index) => (
              <div
                key={`opponent-back-${index}`}
                className={`relative ${shakeTarget === 'opponent' ? 'animate-shake' : ''}`}
              >
                <BattleCard
                  card={card}
                  size="small"
                  showStats={false}
                  disabled={card.currentHp <= 0}
                />
                {/* ゲージオーバーレイ（下から上に上がる） */}
                {card.currentHp > 0 && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                    style={{ border: '3px solid transparent' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75"
                      style={{ height: `${getCardTimerPercent(card)}%` }}
                    />
                  </div>
                )}
                {/* 攻撃中エフェクト */}
                {currentAction?.attacker === card.name && currentAction.attackerIsPlayer === false && (
                  <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl animate-pulse" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>

          {/* 相手前衛 */}
          <div className="flex gap-2 justify-center">
            {opponentFrontCards.map((card, index) => (
              <div
                key={`opponent-front-${index}`}
                className={`relative ${shakeTarget === 'opponent' ? 'animate-shake' : ''}`}
              >
                <BattleCard
                  card={card}
                  size="small"
                  showStats={false}
                  disabled={card.currentHp <= 0}
                />
                {/* ゲージオーバーレイ（下から上に上がる） */}
                {card.currentHp > 0 && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                    style={{ border: '3px solid transparent' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75"
                      style={{ height: `${getCardTimerPercent(card)}%` }}
                    />
                  </div>
                )}
                {/* 攻撃中エフェクト */}
                {currentAction?.attacker === card.name && currentAction.attackerIsPlayer === false && (
                  <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl animate-pulse" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '前衛' : 'Front Line'}</p>
        </div>

        {/* VS + アクション表示 */}
        <div className="text-center py-2 relative">
          <span className="text-4xl font-black text-gray-300">VS</span>
          {currentAction && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: 'bounce-in 0.2s ease-out' }}
            >
              <div className="bg-black/80 px-4 py-2 rounded-xl flex items-center gap-2">
                <span className="text-white font-bold text-sm truncate max-w-24">{currentAction.attacker}</span>
                <Swords className="w-5 h-5 text-orange-400 animate-pulse" />
                <span className="text-white font-bold text-sm truncate max-w-24">{currentAction.defender}</span>
              </div>
            </div>
          )}
        </div>

        {/* プレイヤー側 */}
        <div className="space-y-2">
          {/* プレイヤー前衛 */}
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '前衛' : 'Front Line'}</p>
          <div className="flex gap-2 justify-center">
            {playerFrontCards.map((card, index) => (
              <div
                key={`player-front-${index}`}
                className={`relative ${shakeTarget === 'player' ? 'animate-shake' : ''}`}
              >
                <BattleCard
                  card={card}
                  size="small"
                  showStats={false}
                  disabled={card.currentHp <= 0}
                />
                {/* ゲージオーバーレイ（下から上に上がる） */}
                {card.currentHp > 0 && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                    style={{ border: '3px solid transparent' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75"
                      style={{ height: `${getCardTimerPercent(card)}%` }}
                    />
                  </div>
                )}
                {/* 攻撃中エフェクト */}
                {currentAction?.attacker === card.name && currentAction.attackerIsPlayer && (
                  <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* プレイヤー後衛 */}
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>
          <div className="flex gap-2 justify-center">
            {playerBackCards.map((card, index) => (
              <div
                key={`player-back-${index}`}
                className={`relative ${shakeTarget === 'player' ? 'animate-shake' : ''}`}
              >
                <BattleCard
                  card={card}
                  size="small"
                  showStats={false}
                  disabled={card.currentHp <= 0}
                />
                {/* ゲージオーバーレイ（下から上に上がる） */}
                {card.currentHp > 0 && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                    style={{ border: '3px solid transparent' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75"
                      style={{ height: `${getCardTimerPercent(card)}%` }}
                    />
                  </div>
                )}
                {/* 攻撃中エフェクト */}
                {currentAction?.attacker === card.name && currentAction.attackerIsPlayer && (
                  <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* プレイヤーHPバー */}
          <div className="relative pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-12">
                {language === 'ja' ? 'あなた' : 'You'}
              </span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D] relative">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${playerMaxHp > 0 ? (playerTotalHp / playerMaxHp) * 100 : 0}%`,
                    backgroundColor: 'var(--pop-green)',
                  }}
                />
              </div>
              <span className="text-xs font-bold w-20 text-right" style={{ color: 'var(--pop-green)' }}>
                {playerTotalHp} / {playerMaxHp}
              </span>
            </div>
            {/* ダメージ表示（HPバーの上に浮かぶ） */}
            {damageDisplay && damageDisplay.target === 'player' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-2"
                style={{ animation: 'damage-pop 0.5s ease-out forwards' }}
              >
                <span className={`text-2xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}>
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-sm ml-1">!</span>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* スキル発動エフェクト */}
        {currentAction?.skill && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: 'skill-flash 0.4s ease-out' }}
          >
            <div className="bg-purple-600/90 px-6 py-3 rounded-xl">
              <span className="text-white font-black text-xl">
                {SKILL_DESCRIPTIONS[currentAction.skill][language === 'ja' ? 'ja' : 'en'].split('（')[0]}
              </span>
            </div>
          </div>
        )}
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

      {/* 結果ポップアップ */}
      {showResultPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="pop-card p-8 max-w-md w-full mx-4 text-center"
            style={{ animation: 'bounce-in 0.5s ease-out' }}
          >
            <div className="mb-6">
              {winner === 'player' && (
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--pop-green)' }}>
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              )}
              {winner === 'opponent' && (
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--pop-red)' }}>
                  <X className="w-12 h-12 text-white" />
                </div>
              )}
              {winner === 'draw' && (
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--pop-yellow)' }}>
                  <Swords className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            <h2 className="text-3xl font-black mb-2">
              {winner === 'player' && <span style={{ color: 'var(--pop-green)' }}>{language === 'ja' ? '勝利！' : 'Victory!'}</span>}
              {winner === 'opponent' && <span style={{ color: 'var(--pop-red)' }}>{language === 'ja' ? '敗北...' : 'Defeat...'}</span>}
              {winner === 'draw' && <span style={{ color: 'var(--pop-yellow)' }}>{language === 'ja' ? '引き分け' : 'Draw'}</span>}
            </h2>
            <p className="text-gray-600 mb-6">
              {winner === 'player' && (language === 'ja' ? 'おめでとうございます！' : 'Congratulations!')}
              {winner === 'opponent' && (language === 'ja' ? 'また挑戦しよう！' : 'Try again!')}
              {winner === 'draw' && (language === 'ja' ? '互角の戦いでした！' : 'It was a close fight!')}
            </p>

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
