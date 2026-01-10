'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import BattleCard, { CardSlot } from './BattleCard';
import {
  BattleCard as BattleCardType,
  Deck,
  SynergyBonus,
  GENRE_SKILL_MAP,
  calculateRarity,
  calculateAttack,
  calculateHP,
  getGrowthStage,
  GenreSkill,
  RARITY_CONFIG,
  SKILL_DESCRIPTIONS,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shuffle, Wand2, Check, X, Users, Gamepad2, Tag, Building, Trophy, Star, Swords, Heart, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  isBacklog: boolean;
  headerImage: string;
}

interface GameDetail {
  genres: { description: string }[];
  developers?: string[];
  publishers?: string[];
  tags?: string[];
}

interface DeckBuilderProps {
  games: Game[];
  gameDetails: Map<number, GameDetail>;
  onDeckComplete: (deck: Deck) => void;
  onCancel: () => void;
  steamId?: string;
  personaName?: string;
  avatarUrl?: string;
}

// ゲームからバトルカードを生成
function createBattleCard(
  game: Game,
  details: GameDetail | undefined,
  ownershipRate: number = 50 // デフォルト50%
): BattleCardType {
  const rarity = calculateRarity(ownershipRate);
  const genres = details?.genres?.map(g => g.description) || [];
  const skills: GenreSkill[] = genres
    .map(genre => GENRE_SKILL_MAP[genre])
    .filter((skill): skill is GenreSkill => skill !== undefined);

  const baseAttack = 50; // 基礎攻撃力
  const reviewScore = 75; // TODO: 実際のレビュースコアを取得

  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    hp: calculateHP(reviewScore),
    maxHp: calculateHP(reviewScore),
    attack: calculateAttack(baseAttack, game.playtime_forever, rarity),
    baseAttack,
    rarity,
    genres,
    skills: [...new Set(skills)], // 重複除去
    developer: details?.developers?.[0],
    publisher: details?.publishers?.[0],
    tags: details?.tags,
    playtimeMinutes: game.playtime_forever,
    isGraduated: getGrowthStage(game.playtime_forever) === 'graduated',
    ownershipRate,
  };
}

// シナジー判定
function calculateSynergies(cards: BattleCardType[]): SynergyBonus[] {
  const synergies: SynergyBonus[] = [];

  // ジャンルシナジー
  const genreCount = new Map<string, number>();
  cards.forEach(card => {
    card.genres.forEach(genre => {
      genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    });
  });
  genreCount.forEach((count, genre) => {
    if (count >= 3) {
      synergies.push({
        type: 'genre',
        name: genre,
        count,
        effect: { attackBonus: 10 },
      });
    }
  });

  // 開発元シナジー
  const devCount = new Map<string, number>();
  cards.forEach(card => {
    if (card.developer) {
      devCount.set(card.developer, (devCount.get(card.developer) || 0) + 1);
    }
  });
  devCount.forEach((count, dev) => {
    if (count >= 2) {
      synergies.push({
        type: 'developer',
        name: dev,
        count,
        effect: { attackBonus: 15, specialEffect: 'combo' },
      });
    }
  });

  // タグシナジー
  const tagCount = new Map<string, number>();
  cards.forEach(card => {
    card.tags?.forEach(tag => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    });
  });
  tagCount.forEach((count, tag) => {
    if (count >= 3) {
      synergies.push({
        type: 'tag',
        name: tag,
        count,
        effect: { hpBonus: 10 },
      });
    }
  });

  return synergies;
}

export default function DeckBuilder({
  games,
  gameDetails,
  onDeckComplete,
  onCancel,
  steamId,
  personaName,
  avatarUrl,
}: DeckBuilderProps) {
  const { language } = useLanguage();

  // ユーザーのランキング情報
  const [userStats, setUserStats] = useState<{
    graduations: number;
    wins: number;
    score: number;
    rank: number | null;
  } | null>(null);

  // ランキング情報を取得
  useEffect(() => {
    if (!steamId) return;

    const fetchUserStats = async () => {
      try {
        const response = await fetch(`/api/battle?steamId=${steamId}`);
        if (response.ok) {
          const data = await response.json();
          setUserStats({
            graduations: data.graduations || 0,
            wins: data.wins || 0,
            score: data.score || 0,
            rank: data.rank,
          });
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };

    fetchUserStats();
  }, [steamId]);

  // 積みゲー（5時間以下）のみをフィルター
  const availableGames = useMemo(() => {
    return games.filter(game => {
      const stage = getGrowthStage(game.playtime_forever);
      return stage !== 'graduated'; // 卒業済みは除外
    });
  }, [games]);

  // バトルカードに変換
  const availableCards = useMemo(() => {
    return availableGames.map(game => {
      const details = gameDetails.get(game.appid);
      // 仮の所有率（実際はSteam APIから取得）
      const ownershipRate = Math.random() * 100;
      return createBattleCard(game, details, ownershipRate);
    });
  }, [availableGames, gameDetails]);

  // デッキ状態
  const [frontLine, setFrontLine] = useState<(BattleCardType | null)[]>([null, null, null, null, null]);
  const [backLine, setBackLine] = useState<(BattleCardType | null)[]>([null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<{ line: 'front' | 'back'; index: number } | null>(null);
  const [previewCard, setPreviewCard] = useState<BattleCardType | null>(null);

  // 選択済みカードのappid
  const selectedAppIds = useMemo(() => {
    const ids = new Set<number>();
    frontLine.forEach(card => card && ids.add(card.appid));
    backLine.forEach(card => card && ids.add(card.appid));
    return ids;
  }, [frontLine, backLine]);

  // シナジー計算
  const synergies = useMemo(() => {
    const allCards = [...frontLine, ...backLine].filter((c): c is BattleCardType => c !== null);
    return calculateSynergies(allCards);
  }, [frontLine, backLine]);

  // カードを配置
  const placeCard = (card: BattleCardType) => {
    if (!selectedSlot) return;

    const { line, index } = selectedSlot;

    if (line === 'front') {
      setFrontLine(prev => {
        const newLine = [...prev];
        newLine[index] = card;
        return newLine;
      });
    } else {
      setBackLine(prev => {
        const newLine = [...prev];
        newLine[index] = card;
        return newLine;
      });
    }
    setSelectedSlot(null);
    setPreviewCard(null);
  };

  // カードをプレビュー（詳細ポップアップ表示）
  const handleCardClick = (card: BattleCardType) => {
    setPreviewCard(card);
  };

  // プレビューからデッキに追加
  const confirmCardSelection = () => {
    if (previewCard && selectedSlot) {
      placeCard(previewCard);
    }
  };

  // カードを削除
  const removeCard = useCallback((line: 'front' | 'back', index: number) => {
    if (line === 'front') {
      setFrontLine(prev => {
        const newLine = [...prev];
        newLine[index] = null;
        return newLine;
      });
    } else {
      setBackLine(prev => {
        const newLine = [...prev];
        newLine[index] = null;
        return newLine;
      });
    }
  }, []);

  // おまかせ編成
  const autoFill = useCallback(() => {
    const shuffled = [...availableCards]
      .filter(c => !c.isGraduated)
      .sort(() => Math.random() - 0.5);

    const newFront: (BattleCardType | null)[] = [];
    const newBack: (BattleCardType | null)[] = [];

    // 攻撃力の高いカードを前衛に
    const sorted = shuffled.sort((a, b) => b.attack - a.attack);

    for (let i = 0; i < 5 && i < sorted.length; i++) {
      newFront.push(sorted[i]);
    }
    for (let i = 5; i < 10 && i < sorted.length; i++) {
      newBack.push(sorted[i]);
    }

    // 空きを埋める
    while (newFront.length < 5) newFront.push(null);
    while (newBack.length < 5) newBack.push(null);

    setFrontLine(newFront);
    setBackLine(newBack);
  }, [availableCards]);

  // シャッフル
  const shuffle = useCallback(() => {
    const shuffled = [...availableCards]
      .filter(c => !c.isGraduated)
      .sort(() => Math.random() - 0.5);

    const newFront: (BattleCardType | null)[] = [];
    const newBack: (BattleCardType | null)[] = [];

    for (let i = 0; i < 5 && i < shuffled.length; i++) {
      newFront.push(shuffled[i]);
    }
    for (let i = 5; i < 10 && i < shuffled.length; i++) {
      newBack.push(shuffled[i]);
    }

    while (newFront.length < 5) newFront.push(null);
    while (newBack.length < 5) newBack.push(null);

    setFrontLine(newFront);
    setBackLine(newBack);
  }, [availableCards]);

  // デッキ完成判定
  const deckCardCount = frontLine.filter(c => c !== null).length + backLine.filter(c => c !== null).length;
  const isDeckComplete = deckCardCount >= 10;

  // デッキ確定
  const confirmDeck = useCallback(() => {
    if (!isDeckComplete) return;

    const deck: Deck = {
      frontLine,
      backLine,
      synergies,
    };
    onDeckComplete(deck);
  }, [frontLine, backLine, synergies, isDeckComplete, onDeckComplete]);

  return (
    <div className="space-y-6">
      {/* ユーザー情報カード */}
      {steamId && (
        <div className="pop-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={personaName || 'User'}
                className="w-14 h-14 rounded-full border-3 border-[#3D3D3D]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-3 border-[#3D3D3D]">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">{personaName || 'Unknown'}</h3>
              {userStats && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{userStats.score}</span>
                    <span className="text-gray-500 text-xs">{language === 'ja' ? 'スコア' : 'Score'}</span>
                  </span>
                  {userStats.rank && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--pop-yellow)' }}>
                      #{userStats.rank} {language === 'ja' ? '位' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userStats && (
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xl font-black" style={{ color: 'var(--pop-green)' }}>{userStats.wins}</p>
                  <p className="text-xs text-gray-500">{language === 'ja' ? '勝利' : 'Wins'}</p>
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color: 'var(--pop-blue)' }}>{userStats.graduations}</p>
                  <p className="text-xs text-gray-500">{language === 'ja' ? '卒業' : 'Grads'}</p>
                </div>
              </div>
            )}
            <Link
              href="/battle/ranking"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] hover:opacity-90 text-white font-bold"
              style={{ backgroundColor: 'var(--pop-yellow)' }}
            >
              <Trophy className="w-4 h-4" />
              {language === 'ja' ? 'ランキング' : 'Ranking'}
            </Link>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#3D3D3D]">
            {language === 'ja' ? 'デッキ編成' : 'Build Your Deck'}
          </h2>
          <p className="text-sm text-gray-600">
            {language === 'ja'
              ? `${deckCardCount}/10枚 選択中`
              : `${deckCardCount}/10 cards selected`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={shuffle}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Shuffle className="w-4 h-4" />
            {language === 'ja' ? 'シャッフル' : 'Shuffle'}
          </button>
          <button
            onClick={autoFill}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Wand2 className="w-4 h-4" />
            {language === 'ja' ? 'おまかせ' : 'Auto Fill'}
          </button>
        </div>
      </div>

      {/* デッキ配置エリア */}
      <div className="pop-card p-6 space-y-6">
        {/* 後衛 */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
            <span className="px-2 py-1 rounded text-white text-xs" style={{ backgroundColor: 'var(--pop-blue)' }}>
              {language === 'ja' ? '後衛' : 'Back Line'}
            </span>
            <span className="text-xs text-gray-500">
              {language === 'ja' ? 'スキル効果1.5倍' : 'Skill x1.5'}
            </span>
          </h3>
          <div className="flex gap-3 justify-center flex-wrap">
            {backLine.map((card, index) => (
              <div key={`back-${index}`} className="relative">
                {card ? (
                  <>
                    <BattleCard
                      card={card}
                      size="small"
                      onClick={() => setSelectedSlot({ line: 'back', index })}
                      selected={selectedSlot?.line === 'back' && selectedSlot?.index === index}
                    />
                    <button
                      onClick={() => removeCard('back', index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <CardSlot
                    position="back"
                    size="small"
                    onClick={() => setSelectedSlot({ line: 'back', index })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 前衛 */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
            <span className="px-2 py-1 rounded text-white text-xs" style={{ backgroundColor: 'var(--pop-red)' }}>
              {language === 'ja' ? '前衛' : 'Front Line'}
            </span>
            <span className="text-xs text-gray-500">
              {language === 'ja' ? 'メインアタッカー' : 'Main Attacker'}
            </span>
          </h3>
          <div className="flex gap-3 justify-center flex-wrap">
            {frontLine.map((card, index) => (
              <div key={`front-${index}`} className="relative">
                {card ? (
                  <>
                    <BattleCard
                      card={card}
                      size="small"
                      onClick={() => setSelectedSlot({ line: 'front', index })}
                      selected={selectedSlot?.line === 'front' && selectedSlot?.index === index}
                    />
                    <button
                      onClick={() => removeCard('front', index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <CardSlot
                    position="front"
                    size="small"
                    onClick={() => setSelectedSlot({ line: 'front', index })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* シナジー表示 */}
      {synergies.length > 0 && (
        <div className="pop-card p-4">
          <h3 className="text-sm font-bold text-gray-600 mb-2">
            {language === 'ja' ? 'シナジーボーナス' : 'Synergy Bonuses'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {synergies.map((synergy, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[#3D3D3D]"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                {synergy.type === 'genre' && <Gamepad2 className="w-4 h-4" />}
                {synergy.type === 'developer' && <Building className="w-4 h-4" />}
                {synergy.type === 'series' && <Users className="w-4 h-4" />}
                {synergy.type === 'tag' && <Tag className="w-4 h-4" />}
                <span className="text-sm font-medium">{synergy.name}</span>
                <span className="text-xs text-gray-500">x{synergy.count}</span>
                {synergy.effect.attackBonus && (
                  <span className="text-xs text-green-600">+{synergy.effect.attackBonus}% ATK</span>
                )}
                {synergy.effect.hpBonus && (
                  <span className="text-xs text-red-600">+{synergy.effect.hpBonus}% HP</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カード選択エリア（常に表示） */}
      <div className="pop-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-600">
            {language === 'ja' ? 'カードを選択' : 'Select Cards'}
          </h3>
          {selectedSlot && (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: selectedSlot.line === 'front' ? 'var(--pop-red)' : 'var(--pop-blue)' }}>
              {language === 'ja'
                ? `${selectedSlot.line === 'front' ? '前衛' : '後衛'}${selectedSlot.index + 1}番`
                : `${selectedSlot.line === 'front' ? 'Front' : 'Back'} #${selectedSlot.index + 1}`}
            </span>
          )}
        </div>
        {!selectedSlot && (
          <p className="text-sm text-gray-500 mb-3">
            {language === 'ja' ? '上のスロットをクリックして配置先を選択してください' : 'Click a slot above to select placement'}
          </p>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-80 overflow-y-auto">
          {availableCards
            .filter(card => !selectedAppIds.has(card.appid) && !card.isGraduated)
            .map(card => (
              <BattleCard
                key={card.appid}
                card={card}
                size="small"
                onClick={() => handleCardClick(card)}
                showStats={false}
                disabled={!selectedSlot}
              />
            ))}
        </div>
      </div>

      {/* ゲーム詳細ポップアップ */}
      {previewCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewCard(null)}>
          <div
            className="pop-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-6">
              {/* 左側: ゲーム画像 */}
              <div className="flex-shrink-0">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${previewCard.appid}/library_600x900.jpg`}
                  alt={previewCard.name}
                  className="w-48 h-72 object-cover rounded-xl border-3 border-[#3D3D3D]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${previewCard.appid}/header.jpg`;
                  }}
                />
              </div>

              {/* 右側: 詳細情報 */}
              <div className="flex-1 min-w-0">
                {/* 名前 */}
                <h2 className="text-xl font-black text-[#3D3D3D] mb-2 truncate">{previewCard.name}</h2>

                {/* レアリティと開発元 */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: RARITY_CONFIG[previewCard.rarity].color }}
                  >
                    {RARITY_CONFIG[previewCard.rarity].label[language]}
                  </span>
                  {previewCard.developer && (
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Building className="w-3 h-3" />
                      {previewCard.developer}
                    </span>
                  )}
                </div>

                {/* プレイ時間 */}
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                  <Calendar className="w-4 h-4" />
                  {language === 'ja' ? 'プレイ時間' : 'Playtime'}: {Math.floor(previewCard.playtimeMinutes / 60)}{language === 'ja' ? '時間' : 'h'} {previewCard.playtimeMinutes % 60}{language === 'ja' ? '分' : 'm'}
                </div>

                {/* タグ */}
                {previewCard.genres && previewCard.genres.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">{language === 'ja' ? 'ジャンル' : 'Genres'}</p>
                    <div className="flex flex-wrap gap-1">
                      {previewCard.genres.slice(0, 5).map((genre, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 能力値 */}
                <div className="bg-gray-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-gray-500 mb-2">{language === 'ja' ? '能力値' : 'Stats'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Swords className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />
                      <div>
                        <p className="text-lg font-black" style={{ color: 'var(--pop-red)' }}>{previewCard.attack}</p>
                        <p className="text-xs text-gray-500">{language === 'ja' ? '攻撃力' : 'ATK'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5" style={{ color: 'var(--pop-green)' }} />
                      <div>
                        <p className="text-lg font-black" style={{ color: 'var(--pop-green)' }}>{previewCard.hp}</p>
                        <p className="text-xs text-gray-500">{language === 'ja' ? 'HP' : 'HP'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* スキル */}
                {previewCard.skills && previewCard.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">{language === 'ja' ? 'スキル' : 'Skills'}</p>
                    <div className="flex flex-wrap gap-1">
                      {previewCard.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: 'var(--pop-purple)' }}>
                          {SKILL_DESCRIPTIONS[skill][language]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-2">
                  {selectedSlot ? (
                    <button
                      onClick={confirmCardSelection}
                      className="flex-1 pop-button flex items-center justify-center gap-2 px-4 py-2 text-white font-bold"
                    >
                      <Check className="w-4 h-4" />
                      {language === 'ja'
                        ? `${selectedSlot.line === 'front' ? '前衛' : '後衛'}${selectedSlot.index + 1}番に配置`
                        : `Place in ${selectedSlot.line === 'front' ? 'Front' : 'Back'} #${selectedSlot.index + 1}`}
                    </button>
                  ) : (
                    <p className="flex-1 text-center text-sm text-gray-500 py-2">
                      {language === 'ja' ? 'スロットを選択してから配置してください' : 'Select a slot first'}
                    </p>
                  )}
                  <button
                    onClick={() => setPreviewCard(null)}
                    className="px-4 py-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          <X className="w-5 h-5" />
          {language === 'ja' ? 'キャンセル' : 'Cancel'}
        </button>
        <button
          onClick={confirmDeck}
          disabled={!isDeckComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] text-white font-bold ${
            isDeckComplete ? 'pop-button' : 'opacity-50 cursor-not-allowed'
          }`}
          style={{
            backgroundColor: isDeckComplete ? undefined : '#9CA3AF',
          }}
        >
          <Check className="w-5 h-5" />
          {language === 'ja' ? 'デッキ確定' : 'Confirm Deck'}
        </button>
      </div>
    </div>
  );
}
