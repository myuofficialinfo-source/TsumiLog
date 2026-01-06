'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Brain, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  isBacklog: boolean;
}

interface AIRecommendProps {
  games: Game[];
  gameDetails: Map<number, { genres: { description: string }[] }>;
}

export default function AIRecommend({ games, gameDetails }: AIRecommendProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommend' | 'analyze'>('recommend');

  const generateGenreStats = () => {
    const stats = new Map<string, { count: number; playtime: number }>();

    games.forEach((game) => {
      const details = gameDetails.get(game.appid);
      if (!details?.genres) return;

      details.genres.forEach((genre) => {
        const current = stats.get(genre.description) || { count: 0, playtime: 0 };
        stats.set(genre.description, {
          count: current.count + 1,
          playtime: current.playtime + game.playtime_forever,
        });
      });
    });

    return Array.from(stats.entries()).map(([genre, data]) => ({
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
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (activeTab === 'recommend') {
      fetchRecommendation();
    } else {
      fetchAnalysis();
    }
  };

  const currentContent = activeTab === 'recommend' ? recommendation : analysis;

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          AI分析
        </h3>

        <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setActiveTab('recommend')}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'recommend'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            おすすめ
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'analyze'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Brain className="w-4 h-4" />
            傾向分析
          </button>
        </div>
      </div>

      {!currentContent ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
            {activeTab === 'recommend' ? (
              <Sparkles className="w-8 h-8 text-yellow-400" />
            ) : (
              <Brain className="w-8 h-8 text-purple-400" />
            )}
          </div>
          <p className="text-gray-400 mb-6">
            {activeTab === 'recommend'
              ? 'AIがあなたの積みゲーと好みを分析し、おすすめを提案します'
              : 'AIがあなたのゲーマーとしての傾向を分析します'}
          </p>
          <button
            onClick={handleGenerate}
            disabled={isLoading || gameDetails.size === 0}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {activeTab === 'recommend' ? 'おすすめを生成' : '傾向を分析'}
              </>
            )}
          </button>
          {gameDetails.size === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              ゲーム詳細の読み込みを待っています...
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              再生成
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-white mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                strong: ({ children }) => (
                  <strong className="text-white font-semibold">{children}</strong>
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
