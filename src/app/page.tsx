'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SteamInput from '@/components/SteamInput';
import ProfileCard from '@/components/ProfileCard';
import GameList from '@/components/GameList';
import GenreChart from '@/components/GenreChart';
import AIRecommend from '@/components/AIRecommend';
import { Gamepad2, Loader2 } from 'lucide-react';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  playtimeHours: number;
  isBacklog: boolean;
  headerImage: string;
}

interface Profile {
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

interface Stats {
  totalGames: number;
  backlogCount: number;
  totalPlaytimeHours: number;
  playedGames: number;
}

interface SteamData {
  profile: Profile;
  stats: Stats;
  games: Game[];
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, { genres: { description: string }[] }>>(new Map());
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // URLパラメータからSteam IDを取得（OpenID認証後）
  useEffect(() => {
    const steamId = searchParams.get('steamId');
    const authenticated = searchParams.get('authenticated');
    const authError = searchParams.get('error');

    if (authError) {
      setError('Steam認証に失敗しました。もう一度お試しください。');
      return;
    }

    if (steamId && authenticated === 'true') {
      setIsAuthenticated(true);
      fetchSteamData(steamId);
      // URLをクリーンアップ
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const fetchSteamData = async (steamId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(steamId)}&wishlist=true`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'データの取得に失敗しました');
      }

      setSteamData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSteamLogin = () => {
    window.location.href = '/api/auth/steam?action=login';
  };

  // ゲーム詳細を少しずつ取得
  useEffect(() => {
    if (!steamData?.games) return;

    const fetchDetails = async () => {
      const gamesToFetch = steamData.games.slice(0, 50);
      const batchSize = 5;

      for (let i = 0; i < gamesToFetch.length; i += batchSize) {
        const batch = gamesToFetch.slice(i, i + batchSize);
        const appIds = batch.map((g) => g.appid).join(',');

        try {
          const response = await fetch(`/api/steam/details?appIds=${appIds}`);
          const data = await response.json();

          if (data.details) {
            setGameDetails((prev) => {
              const newMap = new Map(prev);
              data.details.forEach((detail: { appid: number; genres: { description: string }[] }) => {
                newMap.set(detail.appid, { genres: detail.genres });
              });
              return newMap;
            });
          }
        } catch {
          console.error('Failed to fetch game details');
        }

        // レート制限対策
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    fetchDetails();
  }, [steamData?.games]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">積みゲー管理</h1>
              <p className="text-xs text-gray-400">Steam Backlog Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <span className="text-green-400 text-sm">Steam連携済み</span>
            )}
            <span className="text-gray-400 text-sm">v1.1</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 入力フォーム */}
        {!steamData && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-8">
              <Gamepad2 className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              積みゲーを可視化しよう
            </h2>
            <p className="text-gray-400 mb-8 text-center max-w-md">
              Steamアカウントと連携して、あなたのゲームライブラリを分析。
              積みゲーを把握し、AIがおすすめをレコメンドします。
            </p>

            {/* Steamログインボタン */}
            <button
              onClick={handleSteamLogin}
              className="flex items-center gap-3 px-8 py-4 bg-[#1b2838] hover:bg-[#2a475e] border border-[#66c0f4] rounded-xl text-white font-medium transition-all mb-6"
            >
              <svg className="w-8 h-8" viewBox="0 0 256 259" xmlns="http://www.w3.org/2000/svg">
                <path d="M127.779 0C60.42 0 5.24 52.412 0 119.014l68.724 28.674c5.823-3.97 12.847-6.286 20.407-6.286.682 0 1.356.017 2.02.051l30.572-44.766v-.63c0-28.465 22.882-51.621 51.015-51.621 28.133 0 51.027 23.156 51.027 51.621 0 28.465-22.894 51.627-51.027 51.627-.394 0-.778-.017-1.166-.023l-43.592 31.408c.017.556.04 1.107.04 1.67 0 21.357-17.163 38.715-38.269 38.715-18.697 0-34.318-13.535-37.593-31.375L3.61 166.942C21.593 219.77 70.476 258.603 128.221 258.603c70.698 0 128.003-57.864 128.003-129.242C256.224 57.864 198.919 0 128.221 0h-.442z" fill="#fff"/>
              </svg>
              <span className="text-lg">Steamでログイン</span>
            </button>

            <div className="flex items-center gap-4 mb-6 w-full max-w-2xl">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-sm">または</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* 手動入力 */}
            <div className="w-full max-w-2xl">
              <p className="text-gray-400 text-sm text-center mb-4">
                Steam IDを直接入力（公開プロフィールのみ）
              </p>
              <SteamInput onSubmit={fetchSteamData} isLoading={isLoading} />
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {/* 結果表示 */}
        {steamData && (
          <div className="space-y-6">
            {/* 検索バー（上部に固定） */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <p className="text-gray-400 text-sm">別のアカウントを検索:</p>
                <div className="flex-1 max-w-xl">
                  <SteamInput onSubmit={fetchSteamData} isLoading={isLoading} />
                </div>
              </div>
            </div>

            {/* プロフィールカード */}
            <ProfileCard profile={steamData.profile} stats={steamData.stats} />

            {/* グリッドレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ジャンルチャート */}
              <GenreChart games={steamData.games} gameDetails={gameDetails} />

              {/* AI分析 */}
              <AIRecommend games={steamData.games} gameDetails={gameDetails} />
            </div>

            {/* ゲームリスト */}
            <GameList games={steamData.games} />
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>積みゲー管理 - Steam Backlog Manager</p>
          <p className="mt-2">
            Powered by Steam API & Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
