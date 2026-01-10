'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Medal, Crown, Gamepad2, Users, Star } from 'lucide-react';
import { Header, Footer } from '@/components/Layout';

interface RankingUser {
  rank: number;
  steamId: string;
  personaName: string;
  avatarUrl: string;
  sublimations: number;
  wins: number;
  score: number;
}

interface GameUsage {
  rank: number;
  appid: number;
  gameName: string;
  usageCount: number;
  uniqueUsers: number;
}

export default function RankingPage() {
  const { language } = useLanguage();
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [gameUsage, setGameUsage] = useState<GameUsage[]>([]);
  const [userInfo, setUserInfo] = useState<RankingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'players' | 'games'>('players');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Steam IDを取得
        const steamId = localStorage.getItem('steam_id');

        // ランキング取得
        const rankingRes = await fetch(`/api/ranking${steamId ? `?steamId=${steamId}` : ''}`);
        if (rankingRes.ok) {
          const data = await rankingRes.json();
          setRanking(data.ranking || []);
          if (data.userInfo) {
            setUserInfo(data.userInfo);
          }
        }

        // ゲーム使用率取得
        const gameRes = await fetch('/api/game-usage');
        if (gameRes.ok) {
          const data = await gameRes.json();
          setGameUsage(data.games || []);
        }
      } catch (error) {
        console.error('Failed to fetch ranking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-500">{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300';
    return 'bg-white border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4" style={{ borderColor: 'var(--pop-yellow)', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-600">{language === 'ja' ? '読み込み中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <Header showBack backHref="/battle" />

      <main className="flex-grow py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ページタイトル */}
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8" style={{ color: 'var(--pop-yellow)' }} />
            <h1 className="text-2xl font-black text-[#3D3D3D]">
              {language === 'ja' ? '世界ランキング' : 'World Ranking'}
            </h1>
          </div>

          {/* ユーザー情報 */}
        {userInfo && (
          <div className="pop-card p-4 mb-6 border-4" style={{ borderColor: 'var(--pop-yellow)' }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                {userInfo.avatarUrl ? (
                  <img
                    src={userInfo.avatarUrl}
                    alt={userInfo.personaName}
                    className="w-16 h-16 rounded-full border-2 border-[#3D3D3D]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-[#3D3D3D]">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-[#3D3D3D]">
                  #{userInfo.rank || '?'}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{userInfo.personaName || 'Unknown'}</h2>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {language === 'ja' ? 'スコア' : 'Score'}: <strong>{userInfo.score}</strong>
                  </span>
                  <span className="text-green-600">
                    {language === 'ja' ? '勝利' : 'Wins'}: {userInfo.wins}
                  </span>
                  <span className="text-blue-600">
                    {language === 'ja' ? '昇華' : 'Sublimated'}: {userInfo.sublimations}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] font-bold transition-all ${
              activeTab === 'players' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'players' ? 'var(--pop-yellow)' : 'var(--card-bg)',
            }}
          >
            <Trophy className="w-4 h-4" />
            {language === 'ja' ? 'プレイヤー' : 'Players'}
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] font-bold transition-all ${
              activeTab === 'games' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'games' ? 'var(--pop-blue)' : 'var(--card-bg)',
            }}
          >
            <Gamepad2 className="w-4 h-4" />
            {language === 'ja' ? 'ゲーム使用率' : 'Game Usage'}
          </button>
        </div>

        {/* プレイヤーランキング */}
        {activeTab === 'players' && (
          <div className="pop-card p-4">
            {ranking.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'ja' ? 'まだランキングデータがありません' : 'No ranking data yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {ranking.map((user) => (
                  <div
                    key={user.steamId}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 ${getRankBgColor(user.rank)}`}
                  >
                    <div className="flex-shrink-0">
                      {getRankIcon(user.rank)}
                    </div>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.personaName}
                        className="w-10 h-10 rounded-full border-2 border-[#3D3D3D]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-[#3D3D3D]">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{user.personaName || 'Unknown'}</p>
                      <div className="flex gap-3 text-xs text-gray-600">
                        <span>{language === 'ja' ? '勝利' : 'Wins'}: {user.wins}</span>
                        <span>{language === 'ja' ? '昇華' : 'Sub'}: {user.sublimations}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black" style={{ color: 'var(--pop-yellow)' }}>
                        {user.score}
                      </p>
                      <p className="text-xs text-gray-500">
                        {language === 'ja' ? 'スコア' : 'Score'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ゲーム使用率ランキング */}
        {activeTab === 'games' && (
          <div className="pop-card p-4">
            {gameUsage.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'ja' ? 'まだゲーム使用データがありません' : 'No game usage data yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {gameUsage.map((game) => (
                  <div
                    key={game.appid}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 ${getRankBgColor(game.rank)}`}
                  >
                    <div className="flex-shrink-0">
                      {getRankIcon(game.rank)}
                    </div>
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                      alt={game.gameName}
                      className="w-20 h-10 rounded border-2 border-[#3D3D3D] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-game.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{game.gameName}</p>
                      <div className="flex gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {game.uniqueUsers} {language === 'ja' ? '人' : 'users'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black" style={{ color: 'var(--pop-blue)' }}>
                        {game.usageCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {language === 'ja' ? '使用回数' : 'Uses'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* スコア計算方法の説明 */}
          <div className="mt-6 pop-card p-4 text-sm text-gray-600">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              {language === 'ja' ? 'スコア計算方法' : 'Score Calculation'}
            </h3>
            <p>
              {language === 'ja'
                ? 'スコア = (昇華数 × 10) + 勝利数。積みゲーを10時間以上プレイすると「昇華」になり、バトルに勝つとボーナスポイントになります！'
                : 'Score = (Sublimated × 10) + Wins. Play backlog games for 10+ hours to sublimate them, and win battles to earn bonus points!'}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
