'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import DeckBuilder from '@/components/DeckBuilder';
import BattleArena from '@/components/BattleArena';
import {
  BattleCard as BattleCardType,
  Deck,
  BattleResult,
  GENRE_SKILL_MAP,
  calculateRarity,
  calculateAttack,
  calculateHP,
  getGrowthStage,
  GenreSkill,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, ArrowLeft, Swords, Globe, LogOut } from 'lucide-react';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  playtimeHours: number;
  isBacklog: boolean;
  headerImage: string;
}

interface GameDetail {
  genres: { description: string }[];
  developers?: string[];
  publishers?: string[];
}

interface SteamData {
  profile: {
    personaName: string;
    avatarUrl: string;
    profileUrl: string;
  };
  stats: {
    totalGames: number;
    backlogCount: number;
    totalPlaytimeHours: number;
    playedGames: number;
  };
  games: Game[];
}

// AIのデッキを生成
function generateAIDeck(availableCards: BattleCardType[]): Deck {
  const shuffled = [...availableCards]
    .filter(c => !c.isGraduated)
    .sort(() => Math.random() - 0.5);

  const frontLine: (BattleCardType | null)[] = [];
  const backLine: (BattleCardType | null)[] = [];

  for (let i = 0; i < 5 && i < shuffled.length; i++) {
    frontLine.push(shuffled[i]);
  }
  for (let i = 5; i < 10 && i < shuffled.length; i++) {
    backLine.push(shuffled[i]);
  }

  while (frontLine.length < 5) frontLine.push(null);
  while (backLine.length < 5) backLine.push(null);

  return { frontLine, backLine, synergies: [] };
}

// ゲームからバトルカードを生成
function createBattleCard(
  game: Game,
  details: GameDetail | undefined
): BattleCardType {
  const ownershipRate = Math.random() * 100;
  const rarity = calculateRarity(ownershipRate);
  const genres = details?.genres?.map(g => g.description) || [];
  const skills: GenreSkill[] = genres
    .map(genre => GENRE_SKILL_MAP[genre])
    .filter((skill): skill is GenreSkill => skill !== undefined);

  const baseAttack = 50;
  const reviewScore = 75;

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
    skills: [...new Set(skills)],
    developer: details?.developers?.[0],
    publisher: details?.publishers?.[0],
    playtimeMinutes: game.playtime_forever,
    isGraduated: getGrowthStage(game.playtime_forever) === 'graduated',
    ownershipRate,
  };
}

function BattleContent() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, GameDetail>>(new Map());
  const [phase, setPhase] = useState<'deck' | 'battle' | 'result'>('deck');
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<Deck | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // Steam IDの取得とデータ読み込み
  useEffect(() => {
    const savedSteamId = localStorage.getItem('steamId');
    if (!savedSteamId) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(savedSteamId)}`);
        const data = await response.json();
        if (response.ok) {
          setSteamData(data);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ゲーム詳細の取得
  useEffect(() => {
    if (!steamData?.games) return;

    const fetchDetails = async () => {
      const gamesToFetch = steamData.games.slice(0, 50);
      const batchSize = 5;

      for (let i = 0; i < gamesToFetch.length; i += batchSize) {
        const batch = gamesToFetch.slice(i, i + batchSize);
        const appIds = batch.map(g => g.appid).join(',');

        try {
          const response = await fetch(`/api/steam/details?appIds=${appIds}&language=${language}`);
          const data = await response.json();

          if (data.details) {
            setGameDetails(prev => {
              const newMap = new Map(prev);
              data.details.forEach((detail: GameDetail & { appid: number }) => {
                newMap.set(detail.appid, detail);
              });
              return newMap;
            });
          }
        } catch {
          console.error('Failed to fetch game details');
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    fetchDetails();
  }, [steamData?.games, language]);

  // デッキ完成時
  const handleDeckComplete = (deck: Deck) => {
    setPlayerDeck(deck);

    // AI対戦相手のデッキを生成
    if (steamData) {
      const availableCards = steamData.games
        .filter(g => getGrowthStage(g.playtime_forever) !== 'graduated')
        .map(g => createBattleCard(g, gameDetails.get(g.appid)));
      const aiDeck = generateAIDeck(availableCards);
      setOpponentDeck(aiDeck);
    }

    setPhase('battle');
  };

  // バトル終了時
  const handleBattleEnd = (result: BattleResult) => {
    setBattleResult(result);
    setPhase('result');
  };

  // 再戦
  const handleRematch = () => {
    setPlayerDeck(null);
    setOpponentDeck(null);
    setBattleResult(null);
    setPhase('deck');
  };

  // キャンセル
  const handleCancel = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--pop-blue)' }} />
      </div>
    );
  }

  if (!steamData) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/icons/icom.png" alt="TsumiNavi" width={48} height={48} />
              <div>
                <h1 className="text-2xl font-black gradient-text">
                  {language === 'ja' ? '積みゲーバトル' : 'Backlog Battle'}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {language === 'ja' ? '積みゲーで対戦しよう' : 'Battle with your backlog'}
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'ja' ? 'EN' : 'JA'}
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'ja' ? '戻る' : 'Back'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* デッキ構築フェーズ */}
        {phase === 'deck' && (
          <DeckBuilder
            games={steamData.games}
            gameDetails={gameDetails}
            onDeckComplete={handleDeckComplete}
            onCancel={handleCancel}
          />
        )}

        {/* バトルフェーズ */}
        {phase === 'battle' && playerDeck && opponentDeck && (
          <BattleArena
            playerDeck={playerDeck}
            opponentDeck={opponentDeck}
            onBattleEnd={handleBattleEnd}
            onRematch={handleRematch}
          />
        )}
      </main>

      {/* フッター */}
      <footer className="border-t-3 border-[#3D3D3D] py-4 mt-auto" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            {language === 'ja' ? '積みゲーバトル - TsumiNavi' : 'Backlog Battle - TsumiNavi'}
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--pop-blue)' }} />
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BattleContent />
    </Suspense>
  );
}
