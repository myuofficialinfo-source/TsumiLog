'use client';

import { useState, useEffect } from 'react';
import SteamInput from '@/components/SteamInput';
import ProfileCard from '@/components/ProfileCard';
import GameList from '@/components/GameList';
import GenreChart from '@/components/GenreChart';
import AIRecommend from '@/components/AIRecommend';
import { Gamepad2 } from 'lucide-react';

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

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, { genres: { description: string }[] }>>(new Map());

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
          <div className="text-gray-400 text-sm">
            v1.0
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
              Steam IDを入力して、あなたのゲームライブラリを分析。
              積みゲーを把握し、AIがおすすめをレコメンドします。
            </p>
            <SteamInput onSubmit={fetchSteamData} isLoading={isLoading} />
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
