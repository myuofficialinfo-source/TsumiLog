'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import ProfileCard from '@/components/ProfileCard';
import GameList from '@/components/GameList';
import GenreChart from '@/components/GenreChart';
import AIRecommend from '@/components/AIRecommend';
import { Loader2, LogOut, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface WishlistGame {
  appid: number;
  name: string;
  priority: number;
  added: number;
}

interface SteamData {
  profile: Profile;
  stats: Stats;
  games: Game[];
  wishlist?: WishlistGame[];
}

function HomeContent() {
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [gameDetails, setGameDetails] = useState<Map<number, { genres: { description: string }[] }>>(new Map());
  const [steamId, setSteamId] = useState<string | null>(null);

  // 起動時にlocalStorageからsteamIdを復元
  useEffect(() => {
    const savedSteamId = localStorage.getItem('steamId');
    if (savedSteamId) {
      setSteamId(savedSteamId);
      fetchSteamData(savedSteamId);
    }
  }, []);

  // URLパラメータからSteam IDを取得（OpenID認証後）
  useEffect(() => {
    const urlSteamId = searchParams.get('steamId');
    const authenticated = searchParams.get('authenticated');
    const authError = searchParams.get('error');

    if (authError) {
      setError('Steam認証に失敗しました。もう一度お試しください。');
      return;
    }

    if (urlSteamId && authenticated === 'true') {
      // localStorageに保存
      localStorage.setItem('steamId', urlSteamId);
      setSteamId(urlSteamId);
      fetchSteamData(urlSteamId);
      // URLをクリーンアップ
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const fetchSteamData = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(id)}&wishlist=true`);
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

  const handleLogout = () => {
    localStorage.removeItem('steamId');
    setSteamId(null);
    setSteamData(null);
    setGameDetails(new Map());
  };

  // ゲーム詳細を少しずつ取得（言語変更時も再取得）
  useEffect(() => {
    if (!steamData?.games) return;

    // 言語が変わったらキャッシュをクリア
    setGameDetails(new Map());

    const fetchDetails = async () => {
      const gamesToFetch = steamData.games.slice(0, 50);
      const batchSize = 5;

      for (let i = 0; i < gamesToFetch.length; i += batchSize) {
        const batch = gamesToFetch.slice(i, i + batchSize);
        const appIds = batch.map((g) => g.appid).join(',');

        try {
          const response = await fetch(`/api/steam/details?appIds=${appIds}&language=${language}`);
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
  }, [steamData?.games, language]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* ロゴアイコン */}
            <Image src="/icons/icom.png" alt={t('app.title')} width={48} height={48} />
            <div>
              <h1 className="text-2xl font-black gradient-text">{t('app.title')}<span className="text-sm font-medium text-gray-500 ml-1">{language === 'ja' ? '（β版）' : '(beta)'}</span></h1>
              <p className="text-xs text-gray-500 font-medium">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 言語切り替えボタン */}
            <button
              onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'ja' ? 'EN' : 'JA'}
            </button>
            {steamId && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <LogOut className="w-4 h-4" />
                {t('header.logout')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* ローディング */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--pop-blue)' }} />
            <p className="mt-4 text-lg font-medium">{t('login.loading')}</p>
          </div>
        )}

        {/* 入力フォーム */}
        {!steamData && !isLoading && (
          <div className="flex flex-col items-center justify-center py-2">
            {/* メインアイコン */}
            <div className="mb-3">
              <Image src="/icons/icom.png" alt={t('app.title')} width={160} height={160} />
            </div>

            <h2 className="text-4xl font-black mb-2 text-center gradient-text">
              {t('login.title')}
            </h2>
            <p className="text-gray-600 mb-4 text-center max-w-md text-lg">
              {t('login.description')}
              <br />
              <span className="font-bold" style={{ color: 'var(--pop-red)' }}>{t('login.backlog')}</span>
              {language === 'ja' ? 'を把握して、' : ' tracking, get '}
              <span className="font-bold" style={{ color: 'var(--pop-blue)' }}>{t('login.recommend')}</span>
              {t('login.toRecommend')}
            </p>

            {/* Steamログインボタン */}
            <button
              onClick={handleSteamLogin}
              className="pop-button flex items-center gap-3 px-8 py-4 text-white font-bold text-lg"
            >
              <svg className="w-8 h-8" viewBox="0 0 256 259" xmlns="http://www.w3.org/2000/svg">
                <path d="M127.779 0C60.42 0 5.24 52.412 0 119.014l68.724 28.674c5.823-3.97 12.847-6.286 20.407-6.286.682 0 1.356.017 2.02.051l30.572-44.766v-.63c0-28.465 22.882-51.621 51.015-51.621 28.133 0 51.027 23.156 51.027 51.621 0 28.465-22.894 51.627-51.027 51.627-.394 0-.778-.017-1.166-.023l-43.592 31.408c.017.556.04 1.107.04 1.67 0 21.357-17.163 38.715-38.269 38.715-18.697 0-34.318-13.535-37.593-31.375L3.61 166.942C21.593 219.77 70.476 258.603 128.221 258.603c70.698 0 128.003-57.864 128.003-129.242C256.224 57.864 198.919 0 128.221 0h-.442z" fill="#fff"/>
              </svg>
              <span>{t('login.button')}</span>
            </button>

            {/* 注意事項 */}
            <div
              className="mt-4 px-6 py-3 rounded-xl border-2 border-[#3D3D3D] max-w-md text-center"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              <p className="text-sm text-gray-600 font-medium">
                <span className="font-bold" style={{ color: 'var(--pop-yellow)' }}>{t('login.notice')}</span>
                {t('login.noticeText')}
                <span className="font-bold">{t('login.noticePublic')}</span>
                {t('login.noticeEnd')}
              </p>
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm font-bold hover:underline"
                style={{ color: 'var(--pop-blue)' }}
              >
                {t('login.privacyLink')}
              </a>
            </div>

            {error && (
              <div
                className="mt-6 px-6 py-4 rounded-xl border-3 border-[#3D3D3D] font-medium"
                style={{ backgroundColor: '#FEE2E2', color: 'var(--pop-red)' }}
              >
                {error}
              </div>
            )}

            {/* 装飾 */}
            <div className="mt-6 flex gap-4">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-red)' }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {steamData && !isLoading && (
          <div className="space-y-6">
            {/* プロフィールカード */}
            <ProfileCard profile={steamData.profile} stats={steamData.stats} />

            {/* グリッドレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ジャンルチャート */}
              <GenreChart games={steamData.games} gameDetails={gameDetails} />

              {/* AI分析 */}
              <AIRecommend games={steamData.games} gameDetails={gameDetails} stats={steamData.stats} wishlist={steamData.wishlist} />
            </div>

            {/* ゲームリスト */}
            <GameList games={steamData.games} />
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t-3 border-[#3D3D3D] py-8 mt-auto" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/icons/icom.png" alt={t('app.title')} width={40} height={40} />
          </div>
          <p className="font-bold text-gray-600">{t('app.title')} - {t('app.subtitle')}</p>
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

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
