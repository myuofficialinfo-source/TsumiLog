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
}

// カードの攻撃インターバルを計算
function calculateInterval(card: BattleCardType): number {
  const baseInterval = 2000;
  const attackPenalty = Math.min(500, Math.floor(card.attack / 10) * 100);
  const hpBonus = Math.min(300, Math.floor(card.hp / 100) * 50);
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

// リアルタイムバトル用カード型（チーム共有HP、個別HPなし）
interface BattleCardState extends BattleCardType {
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
  steamId,
  personaName,
  avatarUrl,
}: BattleArenaProps) {
  const { language } = useLanguage();
  const [battleState, setBattleState] = useState<'preparing' | 'fighting' | 'finished'>('preparing');
  const [showBattleStart, setShowBattleStart] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(false);
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
  const [damageDisplay, setDamageDisplay] = useState<{
    target: 'player' | 'opponent';
    damage: number;
    isCritical: boolean;
  } | null>(null);
  const [shakeTarget, setShakeTarget] = useState<'player' | 'opponent' | null>(null);
  // 複数の火花エフェクト（ランダム位置で最後まで再生）
  const [hitEffects, setHitEffects] = useState<Array<{
    target: 'player' | 'opponent';
    key: number;
    x: number; // ランダムX位置（%）
    y: number; // ランダムY位置（%）
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

  // バトル結果をAPIに送信
  useEffect(() => {
    if (battleState !== 'finished' || !winner || battleReportedRef.current) return;
    if (!steamId) return;

    battleReportedRef.current = true;

    const reportBattle = async () => {
      try {
        // 卒業済みカード（10時間以上プレイ）を抽出
        const allCards = [...playerDeck.frontLine, ...playerDeck.backLine].filter(
          (c): c is BattleCardType => c !== null
        );
        const graduatedGames = allCards
          .filter(c => c.playtimeMinutes >= 600) // 10時間 = 600分
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
        setTimeout(() => setShowResultPopup(true), 1000);
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
            const target = enemies[Math.floor(Math.random() * enemies.length)];

            if (target) {
              const result = applySkillEffect(card, target, card.attack);

              // チーム共有HPにダメージ
              let reflectDamage = 0;
              if (card.isPlayer) {
                opponentHpRef.current = Math.max(0, opponentHpRef.current - result.damage);
                // 吸収で自チーム回復
                if (result.healAmount > 0) {
                  playerHpRef.current = Math.min(playerHpRef.current + result.healAmount, playerHpRef.current);
                }
                // 反射ダメージ
                if (result.isReflected) {
                  reflectDamage = Math.floor(result.damage * 0.2);
                  playerHpRef.current = Math.max(0, playerHpRef.current - reflectDamage);
                }
              } else {
                playerHpRef.current = Math.max(0, playerHpRef.current - result.damage);
                if (result.healAmount > 0) {
                  opponentHpRef.current = Math.min(opponentHpRef.current + result.healAmount, opponentHpRef.current);
                }
                if (result.isReflected) {
                  reflectDamage = Math.floor(result.damage * 0.2);
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
        setDamageDisplay({
          target: targetSide,
          damage: action.damage,
          isCritical: action.isCritical,
        });
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

        // ログ追加
        setBattleLog(prev => [
          `${action.attacker} → ${action.defender} (-${action.damage}${action.isCritical ? ' CRIT!' : ''})`,
          ...prev.slice(0, 9),
        ]);

        // エフェクトクリア（ダメージ表示は1秒、その他は400ms）
        setTimeout(() => {
          setCurrentAction(null);
          setShakeTarget(null);
        }, 400 / speed);

        setTimeout(() => {
          setDamageDisplay(null);
        }, 1000 / speed);

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
    setDamageDisplay(null);
    setShakeTarget(null);
    setHitEffects([]);
    setBattleState('finished');
    setTimeout(() => setShowResultPopup(true), 1000);
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
            {/* ダメージ表示 */}
            {damageDisplay && damageDisplay.target === 'opponent' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-4 z-10"
                style={{ animation: 'damage-pop 1s ease-out forwards' }}
              >
                <span className={`text-3xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-xl ml-1">CRIT!</span>}
                </span>
              </div>
            )}
          </div>

          {/* 相手後衛 */}
          <div className="flex gap-2 justify-center items-end">
            {opponentBackCards.map((card, index) => {
              const active = isCardActive(false, 'back', card.index);
              return (
                <div
                  key={`opponent-back-${index}`}
                  className={`relative transition-transform duration-150 ${shakeTarget === 'opponent' ? 'animate-shake' : ''} ${active ? 'scale-110 z-10' : ''}`}
                >
                  <BattleCard
                    card={card}
                    size="small"
                    showStats={false}
                    disabled={!isOpponentTeamAlive}
                  />
                  {/* ゲージオーバーレイ */}
                  {isOpponentTeamAlive && (
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
                  {/* アクティブ時のグロー */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)',
                        animation: 'pulse 0.3s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>

          {/* 相手前衛 */}
          <div className="flex gap-2 justify-center relative items-end">
            {opponentFrontCards.map((card, index) => {
              const active = isCardActive(false, 'front', card.index);
              return (
                <div
                  key={`opponent-front-${index}`}
                  className={`relative transition-transform duration-150 ${shakeTarget === 'opponent' ? 'animate-shake' : ''} ${active ? 'scale-110 z-10' : ''}`}
                >
                  <BattleCard
                    card={card}
                    size="small"
                    showStats={false}
                    disabled={!isOpponentTeamAlive}
                  />
                  {/* ゲージオーバーレイ */}
                  {isOpponentTeamAlive && (
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
                  {/* アクティブ時のグロー */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)',
                        animation: 'pulse 0.3s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              );
            })}
            {/* 火花ヒットエフェクト（相手デッキ - ランダム位置） */}
            {hitEffects.filter(e => e.target === 'opponent').map(effect => (
              <div
                key={effect.key}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${effect.x}%`,
                  top: `${effect.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* 中央バースト */}
                <div className="spark-burst bg-orange-400/80" />
                {/* 火花パーティクル */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const distance = 50 + Math.random() * 20;
                  const x = Math.cos(angle) * distance;
                  const y = Math.sin(angle) * distance;
                  return (
                    <div
                      key={i}
                      className="spark-particle"
                      style={{
                        '--spark-x': `${x}px`,
                        '--spark-y': `${y}px`,
                        backgroundColor: i % 2 === 0 ? '#F97316' : '#FBBF24',
                        animationDelay: `${i * 0.02}s`,
                      } as React.CSSProperties}
                    />
                  );
                })}
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
          <div className="flex gap-2 justify-center relative items-start">
            {playerFrontCards.map((card, index) => {
              const active = isCardActive(true, 'front', card.index);
              return (
                <div
                  key={`player-front-${index}`}
                  className={`relative transition-transform duration-150 ${shakeTarget === 'player' ? 'animate-shake' : ''} ${active ? 'scale-110 z-10' : ''}`}
                >
                  <BattleCard
                    card={card}
                    size="small"
                    showStats={false}
                    disabled={!isPlayerTeamAlive}
                  />
                  {/* ゲージオーバーレイ */}
                  {isPlayerTeamAlive && (
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
                  {/* アクティブ時のグロー */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)',
                        animation: 'pulse 0.3s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              );
            })}
            {/* 火花ヒットエフェクト（プレイヤーデッキ - ランダム位置） */}
            {hitEffects.filter(e => e.target === 'player').map(effect => (
              <div
                key={effect.key}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${effect.x}%`,
                  top: `${effect.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* 中央バースト */}
                <div className="spark-burst bg-red-500/80" />
                {/* 火花パーティクル */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const distance = 50 + Math.random() * 20;
                  const x = Math.cos(angle) * distance;
                  const y = Math.sin(angle) * distance;
                  return (
                    <div
                      key={i}
                      className="spark-particle"
                      style={{
                        '--spark-x': `${x}px`,
                        '--spark-y': `${y}px`,
                        backgroundColor: i % 2 === 0 ? '#EF4444' : '#F97316',
                        animationDelay: `${i * 0.02}s`,
                      } as React.CSSProperties}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* プレイヤー後衛 */}
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>
          <div className="flex gap-2 justify-center items-start">
            {playerBackCards.map((card, index) => {
              const active = isCardActive(true, 'back', card.index);
              return (
                <div
                  key={`player-back-${index}`}
                  className={`relative transition-transform duration-150 ${shakeTarget === 'player' ? 'animate-shake' : ''} ${active ? 'scale-110 z-10' : ''}`}
                >
                  <BattleCard
                    card={card}
                    size="small"
                    showStats={false}
                    disabled={!isPlayerTeamAlive}
                  />
                  {/* ゲージオーバーレイ */}
                  {isPlayerTeamAlive && (
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
                  {/* アクティブ時のグロー */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)',
                        animation: 'pulse 0.3s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              );
            })}
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
            {/* ダメージ表示 */}
            {damageDisplay && damageDisplay.target === 'player' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-4 z-10"
                style={{ animation: 'damage-pop 1s ease-out forwards' }}
              >
                <span className={`text-3xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-xl ml-1">CRIT!</span>}
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
