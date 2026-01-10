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
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [displayedCards, setDisplayedCards] = useState<{
    player: (BattleCardType & { currentHp: number })[];
    opponent: (BattleCardType & { currentHp: number })[];
  }>({
    player: [],
    opponent: [],
  });

  // バトル開始
  useEffect(() => {
    if (battleState !== 'preparing') return;

    // カードを初期化
    const playerCards = [
      ...playerDeck.frontLine.filter((c): c is BattleCardType => c !== null),
      ...playerDeck.backLine.filter((c): c is BattleCardType => c !== null),
    ].map(c => ({ ...c, currentHp: c.hp }));

    const opponentCards = [
      ...opponentDeck.frontLine.filter((c): c is BattleCardType => c !== null),
      ...opponentDeck.backLine.filter((c): c is BattleCardType => c !== null),
    ].map(c => ({ ...c, currentHp: c.hp }));

    setDisplayedCards({ player: playerCards, opponent: opponentCards });

    // バトルシミュレーション
    const { log, winner } = simulateBattle(playerDeck, opponentDeck);
    setBattleLog(log);
    setWinner(winner);
    setBattleState('fighting');
  }, [battleState, playerDeck, opponentDeck]);

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

      // HPを更新
      setDisplayedCards(prev => {
        const updateHp = (cards: typeof prev.player, name: string, damage: number) => {
          return cards.map(c => {
            if (c.name === name) {
              return { ...c, currentHp: Math.max(0, c.currentHp - damage) };
            }
            return c;
          });
        };

        // 攻撃を受けた側のHPを減らす
        const isPlayerAttacker = prev.player.some(c => c.name === entry.attacker);
        if (isPlayerAttacker) {
          return {
            ...prev,
            opponent: updateHp(prev.opponent, entry.defender, entry.damage),
          };
        } else {
          return {
            ...prev,
            player: updateHp(prev.player, entry.defender, entry.damage),
          };
        }
      });

      setCurrentLogIndex(i => i + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [battleState, currentLogIndex, battleLog]);

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
      <div className="pop-card p-6 space-y-8">
        {/* 相手側 */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-500 text-center">
            {language === 'ja' ? '相手' : 'Opponent'}
          </h3>
          <div className="flex gap-2 justify-center flex-wrap">
            {displayedCards.opponent.map((card, index) => (
              <div key={`opponent-${index}`} className="relative">
                <BattleCard
                  card={card}
                  size="small"
                  disabled={card.currentHp <= 0}
                />
                {/* HPバー */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 rounded-b">
                  <div
                    className="h-full bg-red-500 rounded-b transition-all duration-300"
                    style={{ width: `${(card.currentHp / card.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VS */}
        <div className="text-center">
          <span className="text-4xl font-black text-gray-300">VS</span>
        </div>

        {/* プレイヤー側 */}
        <div className="space-y-2">
          <div className="flex gap-2 justify-center flex-wrap">
            {displayedCards.player.map((card, index) => (
              <div key={`player-${index}`} className="relative">
                <BattleCard
                  card={card}
                  size="small"
                  disabled={card.currentHp <= 0}
                />
                {/* HPバー */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 rounded-b">
                  <div
                    className="h-full bg-green-500 rounded-b transition-all duration-300"
                    style={{ width: `${(card.currentHp / card.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-bold text-gray-500 text-center">
            {language === 'ja' ? 'あなた' : 'You'}
          </h3>
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
