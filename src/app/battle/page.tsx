'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DeckBuilder from '@/components/DeckBuilder';
import BattleArena from '@/components/BattleArena';
import {
  BattleCard as BattleCardType,
  Deck,
  BattleResult,
  GENRE_SKILL_MAP,
  calculateAttack,
  calculateHP,
  isBacklogGame,
  GenreSkill,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import { Header, Footer } from '@/components/Layout';

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
  recommendations?: { total: number };
  positiveRate?: number;
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


// AIのデッキを生成（積みゲーのみ）
function generateAIDeck(availableCards: BattleCardType[]): Deck {
  const shuffled = [...availableCards]
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

// レビュー数からレアリティを計算
function calculateRarityFromReviews(reviewCount: number): 'common' | 'rare' | 'superRare' | 'ultraRare' {
  if (reviewCount >= 50000) return 'common';      // 5万件以上 → C
  if (reviewCount >= 10000) return 'rare';        // 1万件以上 → R
  if (reviewCount >= 500) return 'superRare';     // 500件以上 → SR
  return 'ultraRare';                              // 500件未満 → UC
}

// ゲームからバトルカードを生成
function createBattleCard(
  game: Game,
  details: GameDetail | undefined
): BattleCardType {
  // レビュー数からレアリティを決定（取得できない場合は中間値=R）
  const reviewCount = details?.recommendations?.total ?? 10000;
  const rarity = calculateRarityFromReviews(reviewCount);

  const genres = details?.genres?.map(g => g.description) || [];
  const skills: GenreSkill[] = genres
    .map(genre => GENRE_SKILL_MAP[genre])
    .filter((skill): skill is GenreSkill => skill !== undefined);

  // 高評価率でHP決定（取得できない場合はnullを渡してデフォルトHP200）
  const positiveRate = details?.positiveRate ?? null;

  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    hp: calculateHP(positiveRate),
    maxHp: calculateHP(positiveRate),
    attack: calculateAttack(game.playtime_forever, rarity),
    rarity,
    genres,
    skills: [...new Set(skills)],
    developer: details?.developers?.[0],
    publisher: details?.publishers?.[0],
    playtimeMinutes: game.playtime_forever,
    reviewCount,
  };
}

function BattleContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [steamId, setSteamId] = useState<string | null>(null);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, GameDetail>>(new Map());
  const [phase, setPhase] = useState<'deck' | 'battle' | 'result'>('deck');
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<Deck | null>(null);
  const [, setBattleResult] = useState<BattleResult | null>(null);

  // Steam IDの取得とデータ読み込み（キャッシュ対応）
  useEffect(() => {
    const savedSteamId = localStorage.getItem('steamId');
    if (!savedSteamId) {
      router.push('/');
      return;
    }
    setSteamId(savedSteamId);

    // セッションキャッシュを確認
    const cacheKey = `battleSteamData_${savedSteamId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setSteamData(parsed);
        setIsLoading(false);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(savedSteamId)}`);
        const data = await response.json();
        if (response.ok) {
          setSteamData(data);
          // セッションにキャッシュ
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
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

  // ゲーム詳細の取得（キャッシュ対応、全部読み込んでから表示）
  useEffect(() => {
    if (!steamData?.games || !steamId) return;

    const detailsCacheKey = `battleGameDetails_${steamId}_${language}`;

    // キャッシュを確認
    const cachedDetails = sessionStorage.getItem(detailsCacheKey);
    if (cachedDetails) {
      try {
        const parsed = JSON.parse(cachedDetails);
        setGameDetails(new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v as GameDetail])));
        setIsLoadingDetails(false);
        return;
      } catch {
        sessionStorage.removeItem(detailsCacheKey);
      }
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      const gamesToFetch = steamData.games.slice(0, 50);
      const batchSize = 5;
      setLoadingProgress({ current: 0, total: gamesToFetch.length });

      const allDetails = new Map<number, GameDetail>();

      for (let i = 0; i < gamesToFetch.length; i += batchSize) {
        const batch = gamesToFetch.slice(i, i + batchSize);
        const appIds = batch.map(g => g.appid).join(',');

        try {
          const response = await fetch(`/api/steam/details?appIds=${appIds}&language=${language}`);
          const data = await response.json();

          if (data.details) {
            data.details.forEach((detail: GameDetail & { appid: number }) => {
              allDetails.set(detail.appid, detail);
            });
          }
        } catch {
          console.error('Failed to fetch game details');
        }

        // 進捗を更新
        setLoadingProgress({ current: Math.min(i + batchSize, gamesToFetch.length), total: gamesToFetch.length });

        // 最後のバッチ以外は遅延
        if (i + batchSize < gamesToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 全部読み込んでから一括で設定
      setGameDetails(allDetails);
      setIsLoadingDetails(false);

      // キャッシュに保存
      const detailsObj: Record<number, GameDetail> = {};
      allDetails.forEach((v, k) => { detailsObj[k] = v; });
      sessionStorage.setItem(detailsCacheKey, JSON.stringify(detailsObj));
    };

    fetchDetails();
  }, [steamData?.games, steamId, language]);

  // デッキ完成時
  const handleDeckComplete = (deck: Deck) => {
    setPlayerDeck(deck);

    // AI対戦相手のデッキを生成（積みゲーのみ = 30分未満）
    if (steamData) {
      const availableCards = steamData.games
        .filter(g => isBacklogGame(g.playtime_forever))
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

  // ゲーム詳細読み込み中
  if (isLoadingDetails && phase === 'deck') {
    const progressPercent = loadingProgress.total > 0
      ? Math.round((loadingProgress.current / loadingProgress.total) * 100)
      : 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--pop-blue)' }} />
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
            {language === 'ja' ? 'カードデータを読み込み中...' : 'Loading card data...'}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            {loadingProgress.current} / {loadingProgress.total} ({progressPercent}%)
          </p>
          <div className="w-64 h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--pop-blue)'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <Header showBack backHref="/" />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* デッキ構築フェーズ */}
        {phase === 'deck' && (
          <DeckBuilder
            games={steamData.games}
            gameDetails={gameDetails}
            onDeckComplete={handleDeckComplete}
            onCancel={handleCancel}
            steamId={steamId || undefined}
            personaName={steamData?.profile?.personaName}
            avatarUrl={steamData?.profile?.avatarUrl}
          />
        )}

        {/* バトルフェーズ */}
        {phase === 'battle' && playerDeck && opponentDeck && (
          <BattleArena
            playerDeck={playerDeck}
            opponentDeck={opponentDeck}
            onBattleEnd={handleBattleEnd}
            onRematch={handleRematch}
            onBackToLobby={handleCancel}
            steamId={steamId || undefined}
            personaName={steamData?.profile?.personaName}
            avatarUrl={steamData?.profile?.avatarUrl}
          />
        )}
      </main>

      <Footer />
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
