'use client';

import { useState, useMemo, useCallback, useEffect, DragEvent } from 'react';
import BattleCard, { CardSlot } from './BattleCard';
import {
  BattleCard as BattleCardType,
  Deck,
  SynergyBonus,
  GENRE_SKILL_MAP,
  calculateAttack,
  calculateHP,
  isBacklogGame,
  GenreSkill,
  RARITY_CONFIG,
  SKILL_DESCRIPTIONS,
  SublimatedGame,
  calculateSublimationBuff,
  BACKLOG_THRESHOLD_MINUTES,
  calculateRarityFromReviews,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shuffle, Wand2, Check, X, Users, Gamepad2, Tag, Building, Trophy, Swords, Heart, Calendar, Award, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

// ランクティア定義
const RANK_TIERS = [
  { name: { ja: 'ルーキー', en: 'Rookie' }, minScore: 0, color: '#9CA3AF', icon: '🌱' },
  { name: { ja: 'ブロンズ', en: 'Bronze' }, minScore: 10, color: '#CD7F32', icon: '🥉' },
  { name: { ja: 'シルバー', en: 'Silver' }, minScore: 50, color: '#C0C0C0', icon: '🥈' },
  { name: { ja: 'ゴールド', en: 'Gold' }, minScore: 150, color: '#FFD700', icon: '🥇' },
  { name: { ja: 'プラチナ', en: 'Platinum' }, minScore: 400, color: '#E5E4E2', icon: '💎' },
  { name: { ja: 'ダイヤモンド', en: 'Diamond' }, minScore: 1000, color: '#B9F2FF', icon: '💠' },
  { name: { ja: 'マスター', en: 'Master' }, minScore: 2500, color: '#9B59B6', icon: '👑' },
  { name: { ja: 'レジェンド', en: 'Legend' }, minScore: 5000, color: '#FF6B6B', icon: '🔥' },
];

function getRankTier(score: number) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RANK_TIERS[i].minScore) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  isBacklog: boolean;
  headerImage: string;
}

interface GameDetail {
  genres: { description: string }[];
  categories?: { id: number; description: string }[];  // Steamカテゴリー
  developers?: string[];
  publishers?: string[];
  tags?: string[];           // SteamSpyユーザータグ
  userTags?: string[];       // SteamSpyユーザータグ（別名）
  recommendations?: { total: number };  // レビュー数
  metacritic?: { score: number };
  positiveRate?: number;     // 高評価率（0-100）
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
  details: GameDetail | undefined
): BattleCardType {
  // レビュー数からレアリティを決定（取得できない場合は中間値）
  const reviewCount = details?.recommendations?.total ?? 10000;
  const rarity = calculateRarityFromReviews(reviewCount);

  const genres = details?.genres?.map(g => g.description) || [];
  const skills: GenreSkill[] = genres
    .map(genre => GENRE_SKILL_MAP[genre])
    .filter((skill): skill is GenreSkill => skill !== undefined);

  // 高評価率でHP決定（取得できない場合はnullを渡してデフォルトHP200）
  const positiveRate = details?.positiveRate ?? null;

  // ユーザータグ（SteamSpyから）とカテゴリー（Steam APIから）を統合
  const userTags = details?.userTags || details?.tags || [];
  const categories = details?.categories?.map(c => c.description) || [];

  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    hp: calculateHP(positiveRate),
    maxHp: calculateHP(positiveRate),
    attack: calculateAttack(game.playtime_forever, rarity),
    rarity,
    genres,
    skills: [...new Set(skills)], // 重複除去
    developer: details?.developers?.[0],
    publisher: details?.publishers?.[0],
    tags: [...userTags, ...categories],  // ユーザータグ + カテゴリーを結合
    playtimeMinutes: game.playtime_forever,
    reviewCount, // レビュー数を保存（参考用）
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
    sublimations: number;
    wins: number;
    score: number;
    rank: number | null;
  } | null>(null);

  // ランキング情報を取得
  useEffect(() => {
    if (!steamId) return;

    const fetchUserStats = async () => {
      try {
        const params = new URLSearchParams({ steamId });
        if (personaName) params.append('personaName', personaName);
        if (avatarUrl) params.append('avatarUrl', avatarUrl);

        const response = await fetch(`/api/battle?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setUserStats({
            sublimations: data.sublimations || 0,
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
  }, [steamId, personaName, avatarUrl]);

  // 積みゲー（30分未満）のみをフィルター
  const availableGames = useMemo(() => {
    return games.filter(game => isBacklogGame(game.playtime_forever));
  }, [games]);

  // バトルカードに変換（重複除去）
  const availableCards = useMemo(() => {
    const seenAppIds = new Set<number>();
    return availableGames
      .filter(game => {
        // 重複チェック
        if (seenAppIds.has(game.appid)) return false;
        seenAppIds.add(game.appid);
        return true;
      })
      .map(game => {
        const details = gameDetails.get(game.appid);
        return createBattleCard(game, details);
      });
  }, [availableGames, gameDetails]);

  // デッキ番号管理（1〜5）
  const [currentDeckNumber, setCurrentDeckNumber] = useState(1);
  const [deckStates, setDeckStates] = useState<{
    [key: number]: {
      frontLine: (BattleCardType | null)[];
      backLine: (BattleCardType | null)[];
      isActive: boolean;
    };
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isSavingDefenseDeck, setIsSavingDefenseDeck] = useState(false);

  // デッキ状態
  const [frontLine, setFrontLine] = useState<(BattleCardType | null)[]>([null, null, null, null, null]);
  const [backLine, setBackLine] = useState<(BattleCardType | null)[]>([null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<{ line: 'front' | 'back'; index: number } | null>(null);
  const [previewCard, setPreviewCard] = useState<BattleCardType | null>(null);
  const [draggedCard, setDraggedCard] = useState<BattleCardType | null>(null);
  const [draggedFromSlot, setDraggedFromSlot] = useState<{ line: 'front' | 'back'; index: number } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ line: 'front' | 'back'; index: number } | null>(null);
  const [sortBy, setSortBy] = useState<'rarity' | 'attack' | 'hp'>('rarity');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 保存されたデッキをロード
  useEffect(() => {
    if (!steamId) {
      setIsLoadingDecks(false);
      return;
    }

    const loadDecks = async () => {
      try {
        const response = await fetch(`/api/deck?steamId=${steamId}`);
        if (response.ok) {
          const data = await response.json();
          const newDeckStates: typeof deckStates = {};

          // 保存されたデッキをappidからBattleCardに復元
          for (const deck of data.decks || []) {
            const restoredFront: (BattleCardType | null)[] = [null, null, null, null, null];
            const restoredBack: (BattleCardType | null)[] = [null, null, null, null, null];

            deck.frontLine.forEach((saved: { appid: number }, idx: number) => {
              if (idx < 5) {
                const card = availableCards.find(c => c.appid === saved.appid);
                if (card) restoredFront[idx] = card;
              }
            });

            deck.backLine.forEach((saved: { appid: number }, idx: number) => {
              if (idx < 5) {
                const card = availableCards.find(c => c.appid === saved.appid);
                if (card) restoredBack[idx] = card;
              }
            });

            newDeckStates[deck.deckNumber] = {
              frontLine: restoredFront,
              backLine: restoredBack,
              isActive: deck.isActive,
            };

            // アクティブデッキを現在のデッキとして設定
            if (deck.isActive) {
              setCurrentDeckNumber(deck.deckNumber);
              setFrontLine(restoredFront);
              setBackLine(restoredBack);
            }
          }

          setDeckStates(newDeckStates);
        }
      } catch (error) {
        console.error('Failed to load decks:', error);
      } finally {
        setIsLoadingDecks(false);
      }
    };

    // availableCardsがロードされてから実行
    if (availableCards.length > 0) {
      loadDecks();
    }
  }, [steamId, availableCards]);

  // デッキを保存
  const saveDeckToServer = useCallback(async (deckNum: number, front: (BattleCardType | null)[], back: (BattleCardType | null)[]) => {
    if (!steamId) return;

    setIsSaving(true);
    try {
      const frontLine = front.filter(c => c !== null).map(c => ({ appid: c!.appid }));
      const backLine = back.filter(c => c !== null).map(c => ({ appid: c!.appid }));

      await fetch('/api/deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId,
          deckNumber: deckNum,
          frontLine,
          backLine,
        }),
      });
    } catch (error) {
      console.error('Failed to save deck:', error);
    } finally {
      setIsSaving(false);
    }
  }, [steamId]);

  // 現在のデッキを保存（デッキ変更時に自動保存）
  useEffect(() => {
    if (!steamId || isLoadingDecks) return;

    // デバウンス処理
    const timer = setTimeout(() => {
      saveDeckToServer(currentDeckNumber, frontLine, backLine);

      // ローカル状態も更新
      setDeckStates(prev => ({
        ...prev,
        [currentDeckNumber]: {
          frontLine,
          backLine,
          isActive: prev[currentDeckNumber]?.isActive || false,
        },
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [frontLine, backLine, currentDeckNumber, steamId, saveDeckToServer, isLoadingDecks]);

  // デッキ番号を切り替え
  const switchDeck = useCallback((deckNum: number) => {
    if (deckNum === currentDeckNumber) return;

    // 現在のデッキをローカル状態に保存
    setDeckStates(prev => ({
      ...prev,
      [currentDeckNumber]: {
        frontLine,
        backLine,
        isActive: prev[currentDeckNumber]?.isActive || false,
      },
    }));

    // 新しいデッキをロード
    const newDeck = deckStates[deckNum];
    if (newDeck) {
      setFrontLine(newDeck.frontLine);
      setBackLine(newDeck.backLine);
    } else {
      setFrontLine([null, null, null, null, null]);
      setBackLine([null, null, null, null, null]);
    }

    setCurrentDeckNumber(deckNum);
  }, [currentDeckNumber, frontLine, backLine, deckStates]);

  // デッキをアクティブに設定（防衛デッキも同時に登録）
  const setDeckActive = useCallback(async (deckNum: number) => {
    const deckCardCount = frontLine.filter(c => c !== null).length + backLine.filter(c => c !== null).length;
    if (!steamId || deckCardCount < 10) return;

    setIsSavingDefenseDeck(true);
    try {
      // アクティブデッキとして設定
      await fetch('/api/deck', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId, deckNumber: deckNum }),
      });

      // 同時に防衛デッキとしても登録
      const frontLineCards = frontLine.filter((c): c is BattleCardType => c !== null).map(card => ({
        appid: card.appid,
        name: card.name,
        headerImage: card.headerImage,
        hp: card.hp,
        maxHp: card.maxHp,
        attack: card.attack,
        rarity: card.rarity,
        genres: card.genres,
        skills: card.skills,
        developer: card.developer,
        publisher: card.publisher,
        tags: card.tags,
        playtimeMinutes: card.playtimeMinutes,
        reviewCount: card.reviewCount,
      }));

      const backLineCards = backLine.filter((c): c is BattleCardType => c !== null).map(card => ({
        appid: card.appid,
        name: card.name,
        headerImage: card.headerImage,
        hp: card.hp,
        maxHp: card.maxHp,
        attack: card.attack,
        rarity: card.rarity,
        genres: card.genres,
        skills: card.skills,
        developer: card.developer,
        publisher: card.publisher,
        tags: card.tags,
        playtimeMinutes: card.playtimeMinutes,
        reviewCount: card.reviewCount,
      }));

      await fetch('/api/defense-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId,
          frontLine: frontLineCards,
          backLine: backLineCards,
          personaName,
          avatarUrl,
        }),
      });

      // ローカル状態を更新
      setDeckStates(prev => {
        const newStates = { ...prev };
        Object.keys(newStates).forEach(key => {
          newStates[parseInt(key)].isActive = false;
        });
        if (newStates[deckNum]) {
          newStates[deckNum].isActive = true;
        } else {
          newStates[deckNum] = {
            frontLine: deckNum === currentDeckNumber ? frontLine : [null, null, null, null, null],
            backLine: deckNum === currentDeckNumber ? backLine : [null, null, null, null, null],
            isActive: true,
          };
        }
        return newStates;
      });
    } catch (error) {
      console.error('Failed to set active deck:', error);
    } finally {
      setIsSavingDefenseDeck(false);
    }
  }, [steamId, currentDeckNumber, frontLine, backLine, personaName, avatarUrl]);

  // 現在のデッキがアクティブかどうか
  const isCurrentDeckActive = deckStates[currentDeckNumber]?.isActive || false;

  // 選択済みカードのappid
  const selectedAppIds = useMemo(() => {
    const ids = new Set<number>();
    frontLine.forEach(card => card && ids.add(card.appid));
    backLine.forEach(card => card && ids.add(card.appid));
    return ids;
  }, [frontLine, backLine]);

  // レアリティの順序（高い順）
  const rarityOrder: Record<string, number> = {
    ultraRare: 4,
    superRare: 3,
    rare: 2,
    common: 1,
  };

  // ソートされたカード（安定ソート：同値の場合はappidでソート）
  const sortedCards = useMemo(() => {
    const cards = [...availableCards].filter(card => !selectedAppIds.has(card.appid));
    const multiplier = sortOrder === 'desc' ? 1 : -1;

    switch (sortBy) {
      case 'rarity':
        return cards.sort((a, b) => {
          const diff = ((rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0)) * multiplier;
          return diff !== 0 ? diff : a.appid - b.appid;
        });
      case 'attack':
        return cards.sort((a, b) => {
          const diff = (b.attack - a.attack) * multiplier;
          return diff !== 0 ? diff : a.appid - b.appid;
        });
      case 'hp':
        return cards.sort((a, b) => {
          const diff = (b.hp - a.hp) * multiplier;
          return diff !== 0 ? diff : a.appid - b.appid;
        });
      default:
        return cards;
    }
  }, [availableCards, selectedAppIds, sortBy, sortOrder]);

  // シナジー計算
  const synergies = useMemo(() => {
    const allCards = [...frontLine, ...backLine].filter((c): c is BattleCardType => c !== null);
    return calculateSynergies(allCards);
  }, [frontLine, backLine]);

  // 昇華済みゲーム（30分以上プレイ）を計算
  const sublimationBuff = useMemo(() => {
    // 30分以上プレイしたゲーム = 昇華済み
    const sublimatedGames: SublimatedGame[] = games
      .filter(game => game.playtime_forever >= BACKLOG_THRESHOLD_MINUTES)
      .map(game => {
        const details = gameDetails.get(game.appid);
        const reviewCount = details?.recommendations?.total ?? 10000;
        const rarity = calculateRarityFromReviews(reviewCount);
        return {
          appid: game.appid,
          name: game.name,
          rarity,
          playtimeMinutes: game.playtime_forever,
          isCompleted: false, // TODO: 実績100%達成のチェックは将来実装
        };
      });

    return calculateSublimationBuff(sublimatedGames);
  }, [games, gameDetails]);

  // デッキステータス計算
  const deckStats = useMemo(() => {
    const allCards = [...frontLine, ...backLine].filter((c): c is BattleCardType => c !== null);
    const totalAttack = allCards.reduce((sum, card) => sum + card.attack, 0);
    const totalHp = allCards.reduce((sum, card) => sum + card.hp, 0);
    const avgAttack = allCards.length > 0 ? Math.round(totalAttack / allCards.length) : 0;
    const avgHp = allCards.length > 0 ? Math.round(totalHp / allCards.length) : 0;

    // スキル集計
    const skillCount = new Map<GenreSkill, number>();
    allCards.forEach(card => {
      card.skills.forEach(skill => {
        skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
      });
    });

    // シナジーボーナス計算
    const synergyAttackBonus = synergies.reduce((sum, s) => sum + (s.effect.attackBonus || 0), 0);
    const synergyHpBonus = synergies.reduce((sum, s) => sum + (s.effect.hpBonus || 0), 0);

    // 昇華バフ込みの攻撃力
    const buffedAttack = Math.round(totalAttack * (1 + (sublimationBuff.totalBonus + synergyAttackBonus) / 100));
    const buffedHp = Math.round(totalHp * (1 + synergyHpBonus / 100));

    return {
      cardCount: allCards.length,
      totalAttack,
      totalHp,
      avgAttack,
      avgHp,
      buffedAttack,
      buffedHp,
      skillCount,
      synergyAttackBonus,
      synergyHpBonus,
    };
  }, [frontLine, backLine, synergies, sublimationBuff]);

  // カードを配置
  const placeCard = (card: BattleCardType, slot?: { line: 'front' | 'back'; index: number }) => {
    const targetSlot = slot || selectedSlot;
    if (!targetSlot) return;

    const { line, index } = targetSlot;

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

  // ドラッグ開始（カードリストから）
  const handleDragStart = (card: BattleCardType) => {
    setDraggedCard(card);
    setDraggedFromSlot(null);
  };

  // ドラッグ開始（デッキスロットから）
  const handleSlotDragStart = (card: BattleCardType, line: 'front' | 'back', index: number) => {
    setDraggedCard(card);
    setDraggedFromSlot({ line, index });
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedCard(null);
    setDraggedFromSlot(null);
    setDragOverSlot(null);
  };

  // スロットへのドラッグオーバー
  const handleDragOver = (e: DragEvent<HTMLDivElement>, line: 'front' | 'back', index: number) => {
    e.preventDefault();
    setDragOverSlot({ line, index });
  };

  // スロットへのドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, line: 'front' | 'back', index: number) => {
    e.preventDefault();
    if (draggedCard) {
      if (draggedFromSlot) {
        // デッキ内のカード移動（スワップ）
        const targetCard = line === 'front' ? frontLine[index] : backLine[index];

        // 元のスロットに移動先のカードを配置
        if (draggedFromSlot.line === 'front') {
          setFrontLine(prev => {
            const newLine = [...prev];
            newLine[draggedFromSlot.index] = targetCard;
            return newLine;
          });
        } else {
          setBackLine(prev => {
            const newLine = [...prev];
            newLine[draggedFromSlot.index] = targetCard;
            return newLine;
          });
        }

        // 移動先のスロットにドラッグしたカードを配置
        if (line === 'front') {
          setFrontLine(prev => {
            const newLine = [...prev];
            newLine[index] = draggedCard;
            return newLine;
          });
        } else {
          setBackLine(prev => {
            const newLine = [...prev];
            newLine[index] = draggedCard;
            return newLine;
          });
        }
      } else {
        // カードリストからの配置
        placeCard(draggedCard, { line, index });
      }
    }
    setDraggedCard(null);
    setDraggedFromSlot(null);
    setDragOverSlot(null);
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
        <div className="pop-card p-4 flex items-center justify-between flex-wrap gap-4">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">{personaName || 'Unknown'}</h3>
                {/* ランクティアとランキング（名前の隣に表示） */}
                {(() => {
                  const score = userStats?.score ?? 0;
                  const rankTier = getRankTier(score);
                  return (
                    <>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                        style={{ backgroundColor: rankTier.color, color: rankTier.color === '#E5E4E2' || rankTier.color === '#C0C0C0' || rankTier.color === '#B9F2FF' ? '#3D3D3D' : '#fff' }}
                      >
                        <span>{rankTier.icon}</span>
                        {rankTier.name[language]}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--pop-yellow)' }}>
                        <Trophy className="w-3 h-3" />
                        #{userStats?.rank ?? '-'}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--pop-yellow)' }}>{userStats?.score ?? 0}</p>
                <p className="text-xs text-gray-500">{language === 'ja' ? 'スコア' : 'Score'}</p>
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--pop-green)' }}>{userStats?.wins ?? 0}</p>
                <p className="text-xs text-gray-500">{language === 'ja' ? '勝利' : 'Wins'}</p>
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--pop-blue)' }}>{userStats?.sublimations ?? 0}</p>
                <p className="text-xs text-gray-500">{language === 'ja' ? '昇華' : 'Sublimated'}</p>
              </div>
            </div>
            <Link
              href="/battle/ranking"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] hover:opacity-90 text-white font-bold"
              style={{ backgroundColor: 'var(--pop-yellow)' }}
            >
              <Award className="w-4 h-4" />
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

      {/* デッキ番号選択 */}
      {steamId && (
        <div className="pop-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600">
                {language === 'ja' ? 'デッキ' : 'Deck'}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = num === currentDeckNumber;
                  const deckState = deckStates[num];
                  const isActive = deckState?.isActive || false;
                  const hasCards = deckState && (
                    deckState.frontLine.some(c => c !== null) ||
                    deckState.backLine.some(c => c !== null)
                  );

                  return (
                    <button
                      key={num}
                      onClick={() => switchDeck(num)}
                      className={`relative w-10 h-10 rounded-lg border-2 font-bold text-lg transition-all ${
                        isSelected
                          ? 'border-[#3D3D3D] bg-[#3D3D3D] text-white'
                          : hasCards
                          ? 'border-[#3D3D3D] bg-white text-[#3D3D3D] hover:bg-gray-100'
                          : 'border-gray-300 bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                      {/* アクティブマーク */}
                      {isActive && (
                        <div
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--pop-green)' }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {isSaving && (
                <span className="text-xs text-gray-400 ml-2">
                  {language === 'ja' ? '保存中...' : 'Saving...'}
                </span>
              )}
            </div>

            {/* バトル使用設定ボタン（防衛デッキも同時に登録） */}
            <button
              onClick={() => setDeckActive(currentDeckNumber)}
              disabled={isCurrentDeckActive || !isDeckComplete || isSavingDefenseDeck}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isCurrentDeckActive
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-[#3D3D3D] hover:bg-gray-100'
              } ${!isDeckComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={!isCurrentDeckActive && isDeckComplete ? { backgroundColor: 'var(--card-bg)' } : {}}
            >
              <Check className={`w-4 h-4 ${isCurrentDeckActive ? 'text-green-600' : ''}`} />
              {isSavingDefenseDeck
                ? (language === 'ja' ? '保存中...' : 'Saving...')
                : isCurrentDeckActive
                  ? (language === 'ja' ? 'バトル使用中' : 'Active for Battle')
                  : (language === 'ja' ? 'バトルで使う' : 'Use for Battle')
              }
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {language === 'ja'
              ? '防衛デッキを登録すると、他のプレイヤーがあなたのデッキと対戦できます。'
              : 'Register a defense deck to let other players battle against you.'}
          </p>
        </div>
      )}

      {/* デッキ編成とステータス（横並び） */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* デッキ配置エリア（左側） */}
        <div className="pop-card p-6 space-y-6 flex-1">
          {/* 前衛（上） */}
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
                <div
                  key={`front-${index}`}
                  className={`relative transition-transform ${dragOverSlot?.line === 'front' && dragOverSlot?.index === index ? 'scale-110 ring-2 ring-red-400' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'front', index)}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleDrop(e, 'front', index)}
                >
                  {card ? (
                    <div
                      draggable
                      onDragStart={() => handleSlotDragStart(card, 'front', index)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing ${draggedCard?.appid === card.appid && draggedFromSlot ? 'opacity-50' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        onClick={() => setPreviewCard(card)}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCard('front', index); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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

          {/* 後衛（下） */}
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
                <div
                  key={`back-${index}`}
                  className={`relative transition-transform ${dragOverSlot?.line === 'back' && dragOverSlot?.index === index ? 'scale-110 ring-2 ring-blue-400' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'back', index)}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleDrop(e, 'back', index)}
                >
                  {card ? (
                    <div
                      draggable
                      onDragStart={() => handleSlotDragStart(card, 'back', index)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing ${draggedCard?.appid === card.appid && draggedFromSlot ? 'opacity-50' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        onClick={() => setPreviewCard(card)}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCard('back', index); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
        </div>

        {/* デッキステータス（右側） */}
        <div className="pop-card p-4 lg:w-80 lg:flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-600 mb-3">
            {language === 'ja' ? 'デッキステータス' : 'Deck Status'}
          </h3>

          {/* 基本ステータス */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Swords className="w-4 h-4" style={{ color: 'var(--pop-red)' }} />
                <span className="text-xs text-gray-500">{language === 'ja' ? '総攻撃力' : 'Total ATK'}</span>
              </div>
              <p className="text-xl font-black" style={{ color: 'var(--pop-red)' }}>
                {deckStats.cardCount > 0 ? deckStats.buffedAttack : '-'}
              </p>
              {deckStats.cardCount > 0 && (sublimationBuff.totalBonus > 0 || deckStats.synergyAttackBonus > 0) && (
                <p className="text-xs text-gray-400">
                  ({deckStats.totalAttack} +{sublimationBuff.totalBonus + deckStats.synergyAttackBonus}%)
                </p>
              )}
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Heart className="w-4 h-4" style={{ color: 'var(--pop-green)' }} />
                <span className="text-xs text-gray-500">{language === 'ja' ? '総HP' : 'Total HP'}</span>
              </div>
              <p className="text-xl font-black" style={{ color: 'var(--pop-green)' }}>
                {deckStats.cardCount > 0 ? deckStats.buffedHp : '-'}
              </p>
              {deckStats.cardCount > 0 && deckStats.synergyHpBonus > 0 && (
                <p className="text-xs text-gray-400">
                  ({deckStats.totalHp} +{deckStats.synergyHpBonus}%)
                </p>
              )}
            </div>
          </div>

          {/* スキル一覧 */}
          {deckStats.skillCount.size > 0 ? (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">{language === 'ja' ? 'スキル' : 'Skills'}</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(deckStats.skillCount.entries()).map(([skill, count]) => (
                  <span
                    key={skill}
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--pop-purple)' }}
                  >
                    {SKILL_DESCRIPTIONS[skill][language]} x{count}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">{language === 'ja' ? 'スキル' : 'Skills'}</p>
              <p className="text-xs text-gray-400">{language === 'ja' ? 'カードを配置するとスキルが表示されます' : 'Place cards to see skills'}</p>
            </div>
          )}

          {/* シナジーボーナス */}
          {synergies.length > 0 ? (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">{language === 'ja' ? 'シナジー' : 'Synergies'}</p>
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
                      <span className="text-xs text-green-600">+{synergy.effect.attackBonus}%</span>
                    )}
                    {synergy.effect.hpBonus && (
                      <span className="text-xs text-red-600">+{synergy.effect.hpBonus}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">{language === 'ja' ? 'シナジー' : 'Synergies'}</p>
              <p className="text-xs text-gray-400">{language === 'ja' ? '同ジャンル3枚以上でシナジー発動' : '3+ same genre cards for synergy'}</p>
            </div>
          )}

          {/* 昇華バフ */}
          {sublimationBuff.sublimatedCount > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4" style={{ color: 'var(--pop-orange)' }} />
                <p className="text-xs font-bold text-gray-500">{language === 'ja' ? '昇華バフ' : 'Sublimation'}</p>
                <span className="text-sm font-black" style={{ color: 'var(--pop-orange)' }}>
                  +{sublimationBuff.totalBonus}% ATK
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sublimationBuff.breakdown
                  .filter(b => b.sublimationCount > 0)
                  .map(b => (
                    <div
                      key={b.rarity}
                      className="flex items-center gap-1 px-2 py-1 rounded border"
                      style={{ borderColor: RARITY_CONFIG[b.rarity].color }}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: RARITY_CONFIG[b.rarity].color }}
                      >
                        {RARITY_CONFIG[b.rarity].label[language]}
                      </span>
                      <span className="text-xs">x{b.sublimationCount}</span>
                      <span className="text-xs font-bold" style={{ color: 'var(--pop-orange)' }}>
                        +{b.bonus}%
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {language === 'ja'
                  ? `昇華済み${sublimationBuff.sublimatedCount}本のゲームがデッキを強化`
                  : `${sublimationBuff.sublimatedCount} sublimated games buffing your deck`}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4" style={{ color: 'var(--pop-orange)' }} />
                <p className="text-xs font-bold text-gray-500">{language === 'ja' ? '昇華バフ' : 'Sublimation'}</p>
              </div>
              <p className="text-xs text-gray-400">{language === 'ja' ? '30分以上プレイしたゲームがデッキを強化' : 'Games played 30+ min buff your deck'}</p>
            </div>
          )}
        </div>
      </div>

      {/* カード選択エリア（常に表示） */}
      <div className="pop-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-600">
            {language === 'ja' ? 'カードを選択' : 'Select Cards'}
          </h3>
          <div className="flex items-center gap-2">
            {/* ソートボタン */}
            <div className="flex gap-1">
              <button
                onClick={() => setSortBy('rarity')}
                className={`px-2 py-1 text-xs rounded border-2 border-[#3D3D3D] font-bold ${sortBy === 'rarity' ? 'text-white' : ''}`}
                style={{ backgroundColor: sortBy === 'rarity' ? 'var(--pop-purple)' : 'var(--card-bg)' }}
              >
                {language === 'ja' ? 'レア度' : 'Rarity'}
              </button>
              <button
                onClick={() => setSortBy('attack')}
                className={`px-2 py-1 text-xs rounded border-2 border-[#3D3D3D] font-bold ${sortBy === 'attack' ? 'text-white' : ''}`}
                style={{ backgroundColor: sortBy === 'attack' ? 'var(--pop-red)' : 'var(--card-bg)' }}
              >
                {language === 'ja' ? '攻撃力' : 'ATK'}
              </button>
              <button
                onClick={() => setSortBy('hp')}
                className={`px-2 py-1 text-xs rounded border-2 border-[#3D3D3D] font-bold ${sortBy === 'hp' ? 'text-white' : ''}`}
                style={{ backgroundColor: sortBy === 'hp' ? 'var(--pop-green)' : 'var(--card-bg)' }}
              >
                HP
              </button>
            </div>
            {/* 昇順/降順ボタン */}
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border-2 border-[#3D3D3D] font-bold"
              style={{ backgroundColor: 'var(--card-bg)' }}
              title={sortOrder === 'desc' ? (language === 'ja' ? '降順' : 'Descending') : (language === 'ja' ? '昇順' : 'Ascending')}
            >
              {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
              {sortOrder === 'desc' ? (language === 'ja' ? '降順' : 'DESC') : (language === 'ja' ? '昇順' : 'ASC')}
            </button>
            {selectedSlot && (
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: selectedSlot.line === 'front' ? 'var(--pop-red)' : 'var(--pop-blue)' }}>
                {language === 'ja'
                  ? `${selectedSlot.line === 'front' ? '前衛' : '後衛'}${selectedSlot.index + 1}番`
                  : `${selectedSlot.line === 'front' ? 'Front' : 'Back'} #${selectedSlot.index + 1}`}
              </span>
            )}
          </div>
        </div>
        {!selectedSlot && !draggedCard && (
          <p className="text-sm text-gray-500 mb-3">
            {language === 'ja' ? 'カードをドラッグしてスロットにドロップ' : 'Drag cards to slots'}
          </p>
        )}
        {draggedCard && (
          <p className="text-sm text-blue-500 mb-3 font-bold">
            {language === 'ja' ? 'スロットにドロップしてください' : 'Drop on a slot'}
          </p>
        )}
        <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto py-3 px-2">
          {sortedCards.map(card => (
            <div
              key={card.appid}
              draggable
              onDragStart={() => handleDragStart(card)}
              onDragEnd={handleDragEnd}
              className={`cursor-grab active:cursor-grabbing flex-shrink-0 ${draggedCard?.appid === card.appid ? 'opacity-50' : ''}`}
            >
              <BattleCard
                card={card}
                size="small"
                onClick={() => handleCardClick(card)}
                showStats={false}
              />
            </div>
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
              {/* 左側: ゲーム画像（クリックでSteamストアへ） */}
              <div className="flex-shrink-0">
                <a
                  href={`https://store.steampowered.com/app/${previewCard.appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity relative group"
                >
                  <img
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${previewCard.appid}/library_600x900.jpg`}
                    alt={previewCard.name}
                    className="w-48 h-72 object-cover rounded-xl border-3 border-[#3D3D3D]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${previewCard.appid}/header.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {language === 'ja' ? 'Steamで見る' : 'View on Steam'}
                    </span>
                  </div>
                </a>
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
          <Swords className="w-5 h-5" />
          {language === 'ja' ? 'バトル開始' : 'Start Battle'}
        </button>
      </div>
    </div>
  );
}
