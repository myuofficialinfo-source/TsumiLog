'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Brain, RefreshCw, Rocket, ExternalLink, Gamepad2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  isBacklog: boolean;
}

interface Stats {
  totalGames: number;
  backlogCount: number;
  totalPlaytimeHours: number;
  playedGames: number;
}

interface GenreData {
  name: string;
  count: number;
}

interface NewGameRecommendation {
  appid: number;
  name: string;
  reason: string;
  genre: string;
  storeUrl: string;
  headerImage: string;
}

interface WishlistGame {
  appid: number;
  name: string;
  priority: number;
  added: number;
}

interface AIRecommendProps {
  games: Game[];
  gameDetails: Map<number, { genres: { description: string }[] }>;
  stats?: Stats;
  wishlist?: WishlistGame[];
}

export default function AIRecommend({ games, gameDetails, stats, wishlist }: AIRecommendProps) {
  const { language, t } = useLanguage();
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [newReleases, setNewReleases] = useState<NewGameRecommendation[] | null>(null);
  const [catchphrase, setCatchphrase] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommend' | 'analyze' | 'new-releases'>('recommend');

  // プレイ時間を日と時間に変換
  const formatPlaytime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (language === 'ja') {
      if (days > 0) {
        return remainingHours > 0 ? `${days}${t('time.days')}${remainingHours}${t('time.hours')}` : `${days}${t('time.days')}`;
      }
      return `${hours}${t('time.hours')}`;
    } else {
      if (days > 0) {
        return remainingHours > 0 ? `${days}${t('time.days')} ${remainingHours}${t('time.hours')}` : `${days}${t('time.days')}`;
      }
      return `${hours}${t('time.hours')}`;
    }
  };

  // 積みゲーの数を取得
  const backlogCount = stats?.backlogCount ?? games.filter(g => g.isBacklog).length;

  const generateGenreStats = () => {
    const statsMap = new Map<string, { count: number; playtime: number }>();

    games.forEach((game) => {
      const details = gameDetails.get(game.appid);
      if (!details?.genres) return;

      details.genres.forEach((genre) => {
        const current = statsMap.get(genre.description) || { count: 0, playtime: 0 };
        statsMap.set(genre.description, {
          count: current.count + 1,
          playtime: current.playtime + game.playtime_forever,
        });
      });
    });

    return Array.from(statsMap.entries()).map(([genre, data]) => ({
      genre,
      count: data.count,
      totalPlaytime: data.playtime,
    }));
  };

  const fetchRecommendation = async () => {
    setIsLoading(true);
    try {
      const backlogGames = games
        .filter((g) => g.isBacklog)
        .map((g) => ({
          ...g,
          addedAt: new Date().toISOString(),
          status: 'backlog' as const,
        }));

      const genreStats = generateGenreStats();

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backlogGames,
          genreStats,
          type: 'recommend',
          language,
        }),
      });

      const data = await response.json();
      if (data.recommendations) {
        setRecommendation(data.recommendations);
      }
    } catch (error) {
      console.error('Recommendation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const genreStats = generateGenreStats();
      const totalPlaytime = games.reduce((sum, g) => sum + g.playtime_forever, 0);

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genreStats,
          totalGames: games.length,
          totalPlaytime,
          type: 'analyze',
          language,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        // キャッチコピーを抽出
        const lines = data.analysis.split('\n');
        let foundCatchphrase = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('【') && !trimmed.startsWith('---') && !trimmed.startsWith('1.') && !trimmed.startsWith('*')) {
            // 「」で囲まれているか確認（日本語）
            const jaMatch = trimmed.match(/「(.+?)」/);
            // "quotes" で囲まれているか確認（英語）
            const enMatch = trimmed.match(/"(.+?)"/);
            if (jaMatch) {
              foundCatchphrase = jaMatch[1];
              break;
            } else if (enMatch) {
              foundCatchphrase = enMatch[1];
              break;
            } else if (trimmed.length < 40 && trimmed.length > 3) {
              foundCatchphrase = trimmed;
              break;
            }
          }
        }
        setCatchphrase(foundCatchphrase || (language === 'ja' ? 'ゲーマー' : 'Gamer'));
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewReleases = async () => {
    setIsLoading(true);
    try {
      const genreStats = generateGenreStats();

      // プレイ時間順でソートしたゲーム情報（上位20本）
      const favoriteGames = [...games]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 20)
        .map(g => {
          const details = gameDetails.get(g.appid);
          const genres = details?.genres?.map(genre => genre.description) || [];
          return {
            name: g.name,
            playtime: Math.round(g.playtime_forever / 60),
            genres,
          };
        });

      // ウィッシュリスト情報
      const wishlistNames = wishlist?.slice(0, 10).map(w => w.name) || [];

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genreStats,
          favoriteGames,
          wishlistNames,
          type: 'new-releases',
          language,
        }),
      });

      const data = await response.json();
      if (data.newReleases) {
        setNewReleases(data.newReleases);
      }
    } catch (error) {
      console.error('New releases error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (activeTab === 'recommend') {
      fetchRecommendation();
    } else if (activeTab === 'analyze') {
      fetchAnalysis();
    } else {
      fetchNewReleases();
    }
  };

  // ジャンル統計を取得
  const getTopGenres = (): GenreData[] => {
    const statsMap = new Map<string, number>();
    games.forEach((game) => {
      const details = gameDetails.get(game.appid);
      if (!details?.genres) return;
      details.genres.forEach((genre) => {
        statsMap.set(genre.description, (statsMap.get(genre.description) || 0) + 1);
      });
    });
    return Array.from(statsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // シェア用ページのURLを生成
  const generateShareUrl = () => {
    if (!catchphrase || !stats) return 'https://tsumi-log.vercel.app';
    const topGenres = getTopGenres();
    const genresParam = topGenres.map(g => `${g.name}:${g.count}`).join(',');

    const params = new URLSearchParams({
      catchphrase,
      totalGames: stats.totalGames.toString(),
      backlogCount: stats.backlogCount.toString(),
      playtime: stats.totalPlaytimeHours.toString(),
      genres: genresParam,
    });

    return `https://tsumi-log.vercel.app/share?${params.toString()}`;
  };

  const shareToX = () => {
    if (!catchphrase || !stats) return;

    const backlogPercent = Math.round((stats.backlogCount / stats.totalGames) * 100);

    const text = language === 'ja'
      ? `【ツミナビ診断結果】

私のゲーマータイプは...
「${catchphrase}」

📚 所持ゲーム: ${stats.totalGames}本
📦 積みゲー: ${stats.backlogCount}本 (${backlogPercent}%)
⏱️ 総プレイ時間: ${formatPlaytime(stats.totalPlaytimeHours)}

あなたの積みゲーも診断してみよう！
#ツミナビ #積みゲー #Steam`
      : `【TsumiNavi Results】

My gamer type is...
"${catchphrase}"

📚 Total Games: ${stats.totalGames}
📦 Backlog: ${stats.backlogCount} (${backlogPercent}%)
⏱️ Total Playtime: ${formatPlaytime(stats.totalPlaytimeHours)}

Check your backlog too!
#TsumiNavi #SteamBacklog #Steam`;

    const shareUrl = generateShareUrl();
    // 開発時に確認用
    console.log('Share URL:', shareUrl);
    console.log('OG Image URL:', shareUrl.replace('/share?', '/share/opengraph-image?'));

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
  };

  const currentContent = activeTab === 'recommend' ? recommendation : activeTab === 'analyze' ? analysis : null;

  return (
    <div className="pop-card p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-xl font-black text-[#3D3D3D] flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: 'var(--pop-yellow)' }} />
          {t('ai.title')}
        </h3>

        <div className="flex rounded-lg overflow-hidden border-2 border-[#3D3D3D]">
          <button
            onClick={() => setActiveTab('recommend')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'recommend'
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ backgroundColor: activeTab === 'recommend' ? 'var(--pop-yellow)' : 'var(--card-bg)' }}
          >
            <Sparkles className="w-4 h-4" />
            {t('ai.recommend')}
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'analyze'
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ backgroundColor: activeTab === 'analyze' ? 'var(--pop-purple)' : 'var(--card-bg)' }}
          >
            <Brain className="w-4 h-4" />
            {t('ai.analyze')}
          </button>
          <button
            onClick={() => setActiveTab('new-releases')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'new-releases'
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ backgroundColor: activeTab === 'new-releases' ? 'var(--pop-green)' : 'var(--card-bg)' }}
          >
            <Rocket className="w-4 h-4" />
            {t('ai.newReleases')}
          </button>
        </div>
      </div>

      {/* 積みゲーゼロの場合（おすすめタブのみ） */}
      {activeTab === 'recommend' && backlogCount === 0 ? (
        <div className="text-center py-12">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 border-3 border-[#3D3D3D]"
            style={{ backgroundColor: 'var(--pop-green)', opacity: 0.9 }}
          >
            <span className="text-4xl">🎉</span>
          </div>
          <h3 className="text-2xl font-black mb-4" style={{ color: 'var(--pop-green)' }}>
            {t('ai.noBacklog.title')}
          </h3>
          <p className="text-gray-700 mb-4 font-medium max-w-md mx-auto leading-relaxed">
            {t('ai.noBacklog.description')}<br />
            <span className="font-black" style={{ color: 'var(--pop-blue)' }}>{t('ai.noBacklog.type')}</span>{language === 'ja' ? 'ですね！' : '!'}
          </p>
          <p className="text-gray-600 text-sm font-medium whitespace-pre-line">
            {t('ai.noBacklog.note')}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
          </div>
        </div>
      ) : activeTab === 'new-releases' && !newReleases ? (
        <div className="text-center py-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border-3 border-[#3D3D3D]"
            style={{ backgroundColor: 'var(--background-secondary)' }}
          >
            <Rocket className="w-8 h-8" style={{ color: 'var(--pop-green)' }} />
          </div>
          <p className="text-gray-600 mb-6 font-medium">
            {t('ai.newReleases.description')}
          </p>
          <button
            onClick={handleGenerate}
            disabled={isLoading || gameDetails.size === 0}
            className="pop-button px-6 py-3 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('ai.newReleases.searching')}
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                {t('ai.newReleases.button')}
              </>
            )}
          </button>
          {gameDetails.size === 0 && (
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {t('ai.waiting')}
            </p>
          )}
        </div>
      ) : activeTab === 'new-releases' && newReleases ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border-2 border-[#3D3D3D] disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('ai.newReleases.refresh')}
            </button>
          </div>
          <div className="space-y-3">
            {newReleases.map((game) => (
              <NewReleaseCard key={game.appid} game={game} />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            {t('ai.newReleases.note')}
          </p>
        </div>
      ) : !currentContent ? (
        <div className="text-center py-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border-3 border-[#3D3D3D]"
            style={{ backgroundColor: 'var(--background-secondary)' }}
          >
            {activeTab === 'recommend' ? (
              <Sparkles className="w-8 h-8" style={{ color: 'var(--pop-yellow)' }} />
            ) : (
              <Brain className="w-8 h-8" style={{ color: 'var(--pop-purple)' }} />
            )}
          </div>
          <p className="text-gray-600 mb-6 font-medium">
            {activeTab === 'recommend'
              ? t('ai.recommend.description')
              : t('ai.analyze.description')}
          </p>
          <button
            onClick={handleGenerate}
            disabled={isLoading || gameDetails.size === 0}
            className="pop-button px-6 py-3 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('ai.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {activeTab === 'recommend' ? t('ai.generate') : t('ai.analyzeButton')}
              </>
            )}
          </button>
          {gameDetails.size === 0 && (
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {t('ai.waiting')}
            </p>
          )}
        </div>
      ) : (
        <div>
          {/* 傾向分析の場合：キャッチコピーカード */}
          {activeTab === 'analyze' && catchphrase && (
            <div
              className="mb-6 p-6 rounded-xl border-3 border-[#3D3D3D] text-center"
              style={{ background: 'linear-gradient(135deg, var(--pop-purple), var(--pop-pink))' }}
            >
              <p className="text-white text-sm font-medium mb-2">{t('ai.gamerType')}</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                {language === 'ja' ? `「${catchphrase}」` : `"${catchphrase}"`}
              </h2>

              {/* 統計情報 */}
              {stats && (
                <div className="flex justify-center gap-4 mb-4 flex-wrap">
                  <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                    📚 {stats.totalGames}{language === 'ja' ? '本' : ' games'}
                  </div>
                  <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                    📦 {language === 'ja' ? `積み${stats.backlogCount}本` : `${stats.backlogCount} backlog`}
                  </div>
                  <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                    ⏱️ {formatPlaytime(stats.totalPlaytimeHours)}
                  </div>
                </div>
              )}

              {/* Xシェアボタン */}
              <button
                onClick={shareToX}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors border-2 border-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {t('ai.shareToX')}
              </button>
            </div>
          )}

          <div className="flex justify-end mb-4 gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border-2 border-[#3D3D3D] disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('ai.regenerate')}
            </button>
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-black text-[#3D3D3D] mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-black text-[#3D3D3D] mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold text-[#3D3D3D] mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold" style={{ color: 'var(--pop-red)' }}>{children}</strong>
                ),
              }}
            >
              {currentContent}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// 新作ゲームカードコンポーネント
function NewReleaseCard({ game }: { game: NewGameRecommendation }) {
  const [imageError, setImageError] = useState(false);

  return (
    <a
      href={game.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl hover:scale-[1.02] transition-all border-2 border-[#3D3D3D]"
      style={{ backgroundColor: 'var(--background-secondary)' }}
    >
      <div className="relative w-24 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--card-bg)' }}>
        {!imageError ? (
          <Image
            src={game.headerImage}
            alt={game.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-[#3D3D3D] text-sm font-bold truncate group-hover:text-[var(--pop-blue)] transition-colors">
            {game.name}
          </h4>
          <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--pop-blue)' }} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'var(--pop-green)', color: 'white' }}
          >
            {game.genre}
          </span>
        </div>
        <p className="text-gray-600 text-xs mt-1 line-clamp-2">{game.reason}</p>
      </div>
    </a>
  );
}
