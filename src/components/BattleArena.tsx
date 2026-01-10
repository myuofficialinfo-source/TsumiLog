'use client';

import { useState, useEffect, useCallback } from 'react';
import BattleCard from './BattleCard';
import {
  BattleCard as BattleCardType,
  Deck,
  BattleLogEntry,
  BattleResult,
  GenreSkill,
  SKILL_DESCRIPTIONS,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swords, Zap, Trophy, RotateCcw, Home, X } from 'lucide-react';

interface BattleArenaProps {
  playerDeck: Deck;
  opponentDeck: Deck;
  onBattleEnd: (result: BattleResult) => void;
  onRematch: () => void;
  onBackToLobby: () => void;
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
      case 'absorb': // 吸収
        healAmount = Math.floor(damage * 0.3);
        skillUsed = skill;
        break;
      case 'ambush': // 奇襲
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
      case 'defense': // 防御
        damage = Math.floor(damage * 0.7);
        skillUsed = skill;
        break;
      case 'reflect': // 反射
        isReflected = true;
        skillUsed = skill;
        break;
      case 'fear': // 恐怖
        damage = Math.floor(damage * 0.8);
        skillUsed = skill;
        break;
    }
  });

  return { damage, healAmount, isReflected, isCritical, skillUsed };
}

// バトルシミュレーション
function simulateBattle(
  playerDeck: Deck,
  opponentDeck: Deck
): { log: BattleLogEntry[]; winner: 'player' | 'opponent' | 'draw' } {
  const log: BattleLogEntry[] = [];
  let turn = 0;

  // カードのコピーを作成（HPを変更するため）
  const playerCards = [
    ...playerDeck.frontLine.filter((c): c is BattleCardType => c !== null).map(c => ({ ...c })),
    ...playerDeck.backLine.filter((c): c is BattleCardType => c !== null).map(c => ({ ...c })),
  ];
  const opponentCards = [
    ...opponentDeck.frontLine.filter((c): c is BattleCardType => c !== null).map(c => ({ ...c })),
    ...opponentDeck.backLine.filter((c): c is BattleCardType => c !== null).map(c => ({ ...c })),
  ];

  // 先制攻撃持ちを先に
  playerCards.sort((a, b) => {
    const aFirst = a.skills.includes('firstStrike') ? 1 : 0;
    const bFirst = b.skills.includes('firstStrike') ? 1 : 0;
    return bFirst - aFirst;
  });
  opponentCards.sort((a, b) => {
    const aFirst = a.skills.includes('firstStrike') ? 1 : 0;
    const bFirst = b.skills.includes('firstStrike') ? 1 : 0;
    return bFirst - aFirst;
  });

  // シナジーボーナスを適用
  const applyBonuses = (cards: BattleCardType[], synergies: typeof playerDeck.synergies) => {
    synergies.forEach(synergy => {
      cards.forEach(card => {
        if (synergy.effect.attackBonus) {
          card.attack = Math.floor(card.attack * (1 + synergy.effect.attackBonus / 100));
        }
        if (synergy.effect.hpBonus) {
          card.hp = Math.floor(card.hp * (1 + synergy.effect.hpBonus / 100));
          card.maxHp = card.hp;
        }
      });
    });
  };
  applyBonuses(playerCards, playerDeck.synergies);
  applyBonuses(opponentCards, opponentDeck.synergies);

  // バトルループ
  while (playerCards.some(c => c.hp > 0) && opponentCards.some(c => c.hp > 0) && turn < 100) {
    turn++;

    // プレイヤーの攻撃
    const playerAttacker = playerCards.find(c => c.hp > 0);
    const opponentDefender = opponentCards.find(c => c.hp > 0);

    if (playerAttacker && opponentDefender) {
      const result = applySkillEffect(playerAttacker, opponentDefender, playerAttacker.attack);
      opponentDefender.hp -= result.damage;

      if (result.healAmount > 0) {
        playerAttacker.hp = Math.min(playerAttacker.maxHp, playerAttacker.hp + result.healAmount);
      }

      if (result.isReflected) {
        const reflectDamage = Math.floor(result.damage * 0.2);
        playerAttacker.hp -= reflectDamage;
      }

      log.push({
        turn,
        attacker: playerAttacker.name,
        defender: opponentDefender.name,
        damage: result.damage,
        skill: result.skillUsed,
        isCritical: result.isCritical,
        isReflected: result.isReflected,
        healAmount: result.healAmount,
      });
    }

    // 相手の攻撃
    const opponentAttacker = opponentCards.find(c => c.hp > 0);
    const playerDefender = playerCards.find(c => c.hp > 0);

    if (opponentAttacker && playerDefender) {
      const result = applySkillEffect(opponentAttacker, playerDefender, opponentAttacker.attack);
      playerDefender.hp -= result.damage;

      if (result.healAmount > 0) {
        opponentAttacker.hp = Math.min(opponentAttacker.maxHp, opponentAttacker.hp + result.healAmount);
      }

      if (result.isReflected) {
        const reflectDamage = Math.floor(result.damage * 0.2);
        opponentAttacker.hp -= reflectDamage;
      }

      log.push({
        turn,
        attacker: opponentAttacker.name,
        defender: playerDefender.name,
        damage: result.damage,
        skill: result.skillUsed,
        isCritical: result.isCritical,
        isReflected: result.isReflected,
        healAmount: result.healAmount,
      });
    }
  }

  // 勝敗判定
  const playerAlive = playerCards.filter(c => c.hp > 0).length;
  const opponentAlive = opponentCards.filter(c => c.hp > 0).length;

  let winner: 'player' | 'opponent' | 'draw';
  if (playerAlive > opponentAlive) {
    winner = 'player';
  } else if (opponentAlive > playerAlive) {
    winner = 'opponent';
  } else {
    winner = 'draw';
  }

  return { log, winner };
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
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [displayedCards, setDisplayedCards] = useState<{
    player: { front: BattleCardType[]; back: BattleCardType[] };
    opponent: { front: BattleCardType[]; back: BattleCardType[] };
  }>({
    player: { front: [], back: [] },
    opponent: { front: [], back: [] },
  });
  const [playerTotalHp, setPlayerTotalHp] = useState(0);
  const [playerMaxHp, setPlayerMaxHp] = useState(0);
  const [opponentTotalHp, setOpponentTotalHp] = useState(0);
  const [opponentMaxHp, setOpponentMaxHp] = useState(0);

  // バトル開始演出後にバトルを開始
  useEffect(() => {
    if (!showBattleStart) return;

    const timer = setTimeout(() => {
      setShowBattleStart(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showBattleStart]);

  // バトル開始
  useEffect(() => {
    if (battleState !== 'preparing' || showBattleStart) return;

    // カードを前衛・後衛に分けて初期化
    const playerFront = playerDeck.frontLine.filter((c): c is BattleCardType => c !== null);
    const playerBack = playerDeck.backLine.filter((c): c is BattleCardType => c !== null);
    const opponentFront = opponentDeck.frontLine.filter((c): c is BattleCardType => c !== null);
    const opponentBack = opponentDeck.backLine.filter((c): c is BattleCardType => c !== null);

    setDisplayedCards({
      player: { front: playerFront, back: playerBack },
      opponent: { front: opponentFront, back: opponentBack },
    });

    // 合計HPを計算
    const playerTotal = [...playerFront, ...playerBack].reduce((sum, c) => sum + c.hp, 0);
    const opponentTotal = [...opponentFront, ...opponentBack].reduce((sum, c) => sum + c.hp, 0);
    setPlayerTotalHp(playerTotal);
    setPlayerMaxHp(playerTotal);
    setOpponentTotalHp(opponentTotal);
    setOpponentMaxHp(opponentTotal);

    // バトルシミュレーション
    const { log, winner } = simulateBattle(playerDeck, opponentDeck);
    setBattleLog(log);
    setWinner(winner);
    setBattleState('fighting');
  }, [battleState, playerDeck, opponentDeck, showBattleStart]);

  // ログを再生
  useEffect(() => {
    if (battleState !== 'fighting' || currentLogIndex >= battleLog.length) {
      if (battleState === 'fighting' && currentLogIndex >= battleLog.length) {
        setBattleState('finished');
        // バトル終了時にポップアップを表示
        setTimeout(() => setShowResultPopup(true), 500);
      }
      return;
    }

    const timer = setTimeout(() => {
      const entry = battleLog[currentLogIndex];

      // 合計HPを更新
      const allPlayerCards = [...displayedCards.player.front, ...displayedCards.player.back];
      const isPlayerAttacker = allPlayerCards.some(c => c.name === entry.attacker);

      if (isPlayerAttacker) {
        setOpponentTotalHp(prev => Math.max(0, prev - entry.damage));
      } else {
        setPlayerTotalHp(prev => Math.max(0, prev - entry.damage));
      }

      setCurrentLogIndex(i => i + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [battleState, currentLogIndex, battleLog, displayedCards]);

  // スキップ
  const skipToEnd = useCallback(() => {
    setCurrentLogIndex(battleLog.length);
    setBattleState('finished');
    setTimeout(() => setShowResultPopup(true), 500);
  }, [battleLog.length]);

  return (
    <div className="space-y-6">
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
      <div className="pop-card p-6 space-y-6">
        {/* 相手側 */}
        <div className="space-y-3">
          {/* 相手HPバー */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500 w-16">
              {language === 'ja' ? '相手' : 'Opponent'}
            </span>
            <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-[#3D3D3D]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${opponentMaxHp > 0 ? (opponentTotalHp / opponentMaxHp) * 100 : 0}%`,
                  backgroundColor: 'var(--pop-red)',
                }}
              />
            </div>
            <span className="text-sm font-bold w-20 text-right" style={{ color: 'var(--pop-red)' }}>
              {opponentTotalHp} / {opponentMaxHp}
            </span>
          </div>

          {/* 相手後衛 */}
          <div className="flex gap-2 justify-center">
            {displayedCards.opponent.back.map((card, index) => (
              <BattleCard key={`opponent-back-${index}`} card={card} size="small" showStats={false} />
            ))}
          </div>
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>

          {/* 相手前衛 */}
          <div className="flex gap-2 justify-center">
            {displayedCards.opponent.front.map((card, index) => (
              <BattleCard key={`opponent-front-${index}`} card={card} size="small" showStats={false} />
            ))}
          </div>
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '前衛' : 'Front Line'}</p>
        </div>

        {/* VS */}
        <div className="text-center py-2">
          <span className="text-4xl font-black text-gray-300">VS</span>
        </div>

        {/* プレイヤー側 */}
        <div className="space-y-3">
          {/* プレイヤー前衛 */}
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '前衛' : 'Front Line'}</p>
          <div className="flex gap-2 justify-center">
            {displayedCards.player.front.map((card, index) => (
              <BattleCard key={`player-front-${index}`} card={card} size="small" showStats={false} />
            ))}
          </div>

          {/* プレイヤー後衛 */}
          <p className="text-xs text-center text-gray-400">{language === 'ja' ? '後衛' : 'Back Line'}</p>
          <div className="flex gap-2 justify-center">
            {displayedCards.player.back.map((card, index) => (
              <BattleCard key={`player-back-${index}`} card={card} size="small" showStats={false} />
            ))}
          </div>

          {/* プレイヤーHPバー */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm font-bold text-gray-500 w-16">
              {language === 'ja' ? 'あなた' : 'You'}
            </span>
            <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-[#3D3D3D]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${playerMaxHp > 0 ? (playerTotalHp / playerMaxHp) * 100 : 0}%`,
                  backgroundColor: 'var(--pop-green)',
                }}
              />
            </div>
            <span className="text-sm font-bold w-20 text-right" style={{ color: 'var(--pop-green)' }}>
              {playerTotalHp} / {playerMaxHp}
            </span>
          </div>
        </div>
      </div>

      {/* バトルログ */}
      <div className="pop-card p-4 max-h-40 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-600 mb-2">
          {language === 'ja' ? 'バトルログ' : 'Battle Log'}
        </h3>
        <div className="space-y-1 text-sm">
          {battleLog.slice(0, currentLogIndex).map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-400">T{entry.turn}</span>
              <span className="font-medium">{entry.attacker}</span>
              <Swords className="w-3 h-3 text-orange-500" />
              <span className="font-medium">{entry.defender}</span>
              <span className="text-red-500">-{entry.damage}</span>
              {entry.isCritical && (
                <span className="text-yellow-500 font-bold">CRIT!</span>
              )}
              {entry.skill && (
                <span className="text-purple-500 text-xs">
                  [{SKILL_DESCRIPTIONS[entry.skill][language === 'ja' ? 'ja' : 'en'].split('（')[0]}]
                </span>
              )}
            </div>
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
          <div
            className="text-center"
            style={{ animation: 'bounce-in 0.5s ease-out' }}
          >
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
            className="pop-card p-8 max-w-md w-full mx-4 text-center animate-bounce-in"
            style={{ animation: 'bounce-in 0.5s ease-out' }}
          >
            {/* 結果アイコン */}
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

            {/* 結果テキスト */}
            <h2 className="text-3xl font-black mb-2">
              {winner === 'player' && (
                <span style={{ color: 'var(--pop-green)' }}>
                  {language === 'ja' ? '勝利！' : 'Victory!'}
                </span>
              )}
              {winner === 'opponent' && (
                <span style={{ color: 'var(--pop-red)' }}>
                  {language === 'ja' ? '敗北...' : 'Defeat...'}
                </span>
              )}
              {winner === 'draw' && (
                <span style={{ color: 'var(--pop-yellow)' }}>
                  {language === 'ja' ? '引き分け' : 'Draw'}
                </span>
              )}
            </h2>
            <p className="text-gray-600 mb-6">
              {winner === 'player' && (language === 'ja' ? 'おめでとうございます！' : 'Congratulations!')}
              {winner === 'opponent' && (language === 'ja' ? 'また挑戦しよう！' : 'Try again!')}
              {winner === 'draw' && (language === 'ja' ? '互角の戦いでした！' : 'It was a close fight!')}
            </p>

            {/* ボタン */}
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
