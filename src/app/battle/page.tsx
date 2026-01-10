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
import { Loader2, ArrowLeft, Globe } from 'lucide-react';

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

// ダミーゲームデータ（テスト用）
const DUMMY_GAMES: Game[] = [
  // レジェンダリー級（インディー・レア）
  { appid: 251570, name: '7 Days to Die', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 108600, name: 'Project Zomboid', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 322330, name: "Don't Starve Together", playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 242760, name: 'The Forest', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 892970, name: 'Valheim', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  // エピック級（RPG）
  { appid: 814380, name: 'Sekiro: Shadows Die Twice', playtime_forever: 150, playtimeHours: 2.5, isBacklog: true, headerImage: '' },
  { appid: 1245620, name: 'ELDEN RING', playtime_forever: 180, playtimeHours: 3, isBacklog: true, headerImage: '' },
  { appid: 374320, name: 'DARK SOULS III', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 1091500, name: 'Cyberpunk 2077', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 1174180, name: 'Red Dead Redemption 2', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  // レア級（アクション）
  { appid: 292030, name: 'The Witcher 3: Wild Hunt', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 1151640, name: 'Horizon Zero Dawn', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 1593500, name: "God of War", playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 1817070, name: 'Marvels Spider-Man Remastered', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1817190, name: 'Marvels Spider-Man: Miles Morales', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  // アンコモン級（ストラテジー）
  { appid: 289070, name: 'Civilization VI', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 281990, name: 'Stellaris', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 236390, name: 'War Thunder', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1158310, name: 'Crusader Kings III', playtime_forever: 150, playtimeHours: 2.5, isBacklog: true, headerImage: '' },
  { appid: 394360, name: 'Hearts of Iron IV', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  // コモン級（人気ゲー）
  { appid: 730, name: 'Counter-Strike 2', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 570, name: 'Dota 2', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 440, name: 'Team Fortress 2', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 271590, name: 'Grand Theft Auto V', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 252490, name: 'Rust', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  // ホラー
  { appid: 381210, name: 'Dead by Daylight', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 268500, name: 'Outlast', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 251060, name: 'Resident Evil 2', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 1196590, name: 'Resident Evil Village', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 418370, name: 'Resident Evil 7 Biohazard', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  // パズル
  { appid: 400, name: 'Portal', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 620, name: 'Portal 2', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 504230, name: 'Celeste', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 367520, name: 'Hollow Knight', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 1794680, name: 'Vampire Survivors', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  // シミュレーション
  { appid: 255710, name: 'Cities: Skylines', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 313160, name: 'Farming Simulator 15', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 294100, name: 'RimWorld', playtime_forever: 150, playtimeHours: 2.5, isBacklog: true, headerImage: '' },
  { appid: 526870, name: 'Satisfactory', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 427520, name: 'Factorio', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  // 追加インディー
  { appid: 413150, name: 'Stardew Valley', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 105600, name: 'Terraria', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 548430, name: 'Deep Rock Galactic', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 1145360, name: 'Hades', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 960090, name: 'Bloons TD 6', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // FPS
  { appid: 1085660, name: 'Destiny 2', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 359550, name: "Tom Clancy's Rainbow Six Siege", playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 578080, name: 'PUBG: BATTLEGROUNDS', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 1172470, name: 'Apex Legends', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 1938090, name: 'Call of Duty', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // 格ゲー
  { appid: 678950, name: 'DRAGON BALL FighterZ', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1384160, name: 'Guilty Gear -Strive-', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 310950, name: 'Mortal Kombat X', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 1496790, name: 'TEKKEN 8', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 1811260, name: 'Street Fighter 6', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // レース
  { appid: 1551360, name: 'Forza Horizon 5', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1293830, name: 'Forza Horizon 4', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 244210, name: 'Assetto Corsa', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 805550, name: 'BeamNG.drive', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 310560, name: 'DiRT Rally', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // VR
  { appid: 546560, name: 'Half-Life: Alyx', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 438100, name: 'VRChat', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 617830, name: 'SUPERHOT VR', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 450540, name: 'Hot Dogs, Horseshoes & Hand Grenades', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 620980, name: 'Beat Saber', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // MMO/オンライン
  { appid: 306130, name: 'The Elder Scrolls Online', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1449850, name: 'Yu-Gi-Oh! Master Duel', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 230410, name: 'Warframe', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 39210, name: 'FINAL FANTASY XIV Online', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 582010, name: 'Monster Hunter: World', playtime_forever: 150, playtimeHours: 2.5, isBacklog: true, headerImage: '' },
  // アドベンチャー
  { appid: 391540, name: 'Undertale', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  { appid: 1382330, name: 'Persona 5 Royal', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 1113560, name: 'NieR Replicant', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 524220, name: 'NieR:Automata', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 1366540, name: 'Dyson Sphere Program', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  // スポーツ
  { appid: 1811270, name: 'EA SPORTS FC 24', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 252950, name: 'Rocket League', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 2369390, name: 'NBA 2K24', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 1151340, name: 'Fallout 76', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 377160, name: 'Fallout 4', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // クラフト/サバイバル
  { appid: 346110, name: 'ARK: Survival Evolved', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 22380, name: 'Fallout: New Vegas', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 304930, name: 'Unturned', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 4000, name: "Garry's Mod", playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 550, name: 'Left 4 Dead 2', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // ローグライク
  { appid: 250900, name: 'The Binding of Isaac: Rebirth', playtime_forever: 60, playtimeHours: 1, isBacklog: true, headerImage: '' },
  { appid: 632360, name: 'Risk of Rain 2', playtime_forever: 90, playtimeHours: 1.5, isBacklog: true, headerImage: '' },
  { appid: 1092790, name: 'Inscryption', playtime_forever: 45, playtimeHours: 0.75, isBacklog: true, headerImage: '' },
  { appid: 242680, name: 'Nuclear Throne', playtime_forever: 120, playtimeHours: 2, isBacklog: true, headerImage: '' },
  { appid: 311690, name: 'Enter the Gungeon', playtime_forever: 30, playtimeHours: 0.5, isBacklog: true, headerImage: '' },
  // 弱めの育成中カード（0-30分）
  { appid: 1172620, name: 'Sea of Thieves', playtime_forever: 15, playtimeHours: 0.25, isBacklog: true, headerImage: '' },
  { appid: 601150, name: 'Devil May Cry 5', playtime_forever: 20, playtimeHours: 0.33, isBacklog: true, headerImage: '' },
  { appid: 814380, name: 'DOOM Eternal', playtime_forever: 25, playtimeHours: 0.42, isBacklog: true, headerImage: '' },
  { appid: 1238810, name: 'Battlefield 2042', playtime_forever: 10, playtimeHours: 0.17, isBacklog: true, headerImage: '' },
  { appid: 1599340, name: "Call of Duty: Modern Warfare II", playtime_forever: 5, playtimeHours: 0.08, isBacklog: true, headerImage: '' },
];

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
  const { language, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, GameDetail>>(new Map());
  const [phase, setPhase] = useState<'deck' | 'battle' | 'result'>('deck');
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<Deck | null>(null);
  const [, setBattleResult] = useState<BattleResult | null>(null);

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
          // ダミーゲームを追加（テスト用）
          const existingAppIds = new Set(data.games.map((g: Game) => g.appid));
          const newDummyGames = DUMMY_GAMES.filter(g => !existingAppIds.has(g.appid));
          data.games = [...data.games, ...newDummyGames];
          data.stats.totalGames = data.games.length;
          data.stats.backlogCount = data.games.filter((g: Game) => g.isBacklog).length;
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
