'use client';

import { useState, useEffect } from 'react';
import { X, Search, Gamepad2, Loader2 } from 'lucide-react';
import { GameEvent } from '@/types/calendar';

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  headerImage: string;
  isBacklog?: boolean;
  isCompleted?: boolean;
}

// DBから取得するゲーム情報の型
interface DBGame {
  appid: number;
  name: string;
  playtime: number;
  is_backlog: boolean;
  is_completed: boolean;
}

type GameFilter = 'all' | 'playing' | 'backlog';

interface AddEventModalProps {
  date: string;
  games: SteamGame[];
  steamId?: string;
  onAdd: (event: Omit<GameEvent, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  language: string;
}

export default function AddEventModal({ date, games: propGames, steamId, onAdd, onClose, language }: AddEventModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [eventType, setEventType] = useState<GameEvent['type']>('planned');
  const [note, setNote] = useState('');
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const [dbGames, setDbGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // DBからゲーム情報を取得
  useEffect(() => {
    if (!steamId) {
      setDbGames(propGames);
      return;
    }

    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user-games?steamId=${steamId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.games && Array.isArray(data.games)) {
            const converted: SteamGame[] = data.games.map((g: DBGame) => ({
              appid: g.appid,
              name: g.name,
              playtime_forever: g.playtime,
              headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
              isBacklog: g.is_backlog,
              isCompleted: g.is_completed,
            }));
            setDbGames(converted);
          } else {
            setDbGames(propGames);
          }
        } else {
          setDbGames(propGames);
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
        setDbGames(propGames);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [steamId, propGames]);

  // フィルター適用したゲームリスト
  const games = dbGames.length > 0 ? dbGames : propGames;

  // フィルターとソート適用
  const filteredGames = games
    .filter(game => {
      // nameがundefinedのゲームを除外
      if (!game.name) {
        return false;
      }
      // 検索クエリでフィルター
      if (!game.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // カテゴリーでフィルター
      if (gameFilter === 'playing') {
        return !game.isBacklog && !game.isCompleted;
      }
      if (gameFilter === 'backlog') {
        return game.isBacklog && !game.isCompleted;
      }
      return true;
    })
    .sort((a, b) => {
      // プレイ中を先に、次に積みゲー
      if (gameFilter === 'all') {
        if (!a.isBacklog && b.isBacklog) return -1;
        if (a.isBacklog && !b.isBacklog) return 1;
      }
      // プレイ時間でソート
      return b.playtime_forever - a.playtime_forever;
    });

  const handleSubmit = () => {
    if (!selectedGame) return;

    onAdd({
      date,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      gameId: selectedGame.appid,
      gameName: selectedGame.name,
      gameImage: selectedGame.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.appid}/header.jpg`,
      type: eventType,
      note: note || undefined,
    });
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    if (language === 'ja') {
      return `${year}年${parseInt(month)}月${parseInt(day)}日`;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-lg rounded-2xl border-3 border-[#3D3D3D] shadow-xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#3D3D3D]">
          <h2 className="text-lg font-black">
            {language === 'ja' ? '予定を追加' : 'Add Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4 overflow-y-auto flex-grow">
          {/* 日付表示 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-500">
                {language === 'ja' ? '開始日:' : 'Start:'}
              </span>
              <span className="font-bold">{formatDate(date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                {language === 'ja' ? '終了日:' : 'End:'}
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
                className="flex-1 px-3 py-1.5 rounded-lg border-2 border-[#3D3D3D] text-sm"
                style={{ backgroundColor: 'var(--background)' }}
                placeholder={language === 'ja' ? '任意' : 'Optional'}
              />
              {endDate && (
                <button
                  onClick={() => setEndDate('')}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* 時間入力（週表示用） */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                {language === 'ja' ? '時間:' : 'Time:'}
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-1.5 rounded-lg border-2 border-[#3D3D3D] text-sm"
                style={{ backgroundColor: 'var(--background)' }}
              />
              <span className="text-gray-400">〜</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-3 py-1.5 rounded-lg border-2 border-[#3D3D3D] text-sm"
                style={{ backgroundColor: 'var(--background)' }}
              />
              {(startTime || endTime) && (
                <button
                  onClick={() => { setStartTime(''); setEndTime(''); }}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              {language === 'ja' ? '※時間は週表示で詳細に表示されます' : '* Time is shown in detail in week view'}
            </p>
          </div>

          {/* イベントタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {language === 'ja' ? '種類' : 'Type'}
            </label>
            <div className="flex gap-2">
              {[
                { value: 'planned', label: language === 'ja' ? '予定' : 'Planned', color: 'var(--pop-blue)' },
                { value: 'played', label: language === 'ja' ? 'プレイ済み' : 'Played', color: 'var(--pop-green)' },
                { value: 'release', label: language === 'ja' ? '発売日' : 'Release', color: 'var(--pop-yellow)' },
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setEventType(type.value as GameEvent['type'])}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                    eventType === type.value ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: eventType === type.value ? type.color : 'var(--card-bg)'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* ゲーム検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {language === 'ja' ? 'ゲームを選択' : 'Select Game'}
            </label>

            {/* フィルタータブ */}
            <div className="flex gap-1 mb-3 p-1 rounded-lg border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--background)' }}>
              {[
                { value: 'all', label: language === 'ja' ? 'すべて' : 'All' },
                { value: 'playing', label: language === 'ja' ? 'プレイ中' : 'Playing' },
                { value: 'backlog', label: language === 'ja' ? '積みゲー' : 'Backlog' },
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setGameFilter(filter.value as GameFilter)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    gameFilter === filter.value
                      ? 'text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: gameFilter === filter.value ? 'var(--pop-blue)' : 'transparent'
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* 選択中のゲーム */}
            {selectedGame && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#3D3D3D] mb-3"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.appid}/capsule_184x69.jpg`}
                  alt={selectedGame.name}
                  width={92}
                  height={34}
                  className="rounded border border-gray-300 flex-shrink-0 object-cover"
                />
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-sm truncate">{selectedGame.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(selectedGame.playtime_forever / 60)}{language === 'ja' ? '時間プレイ' : 'h played'}
                    {selectedGame.isBacklog && <span className="ml-1 text-orange-500">積みゲー</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}

            {/* 検索ボックス */}
            {!selectedGame && (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ja' ? 'ゲーム名で検索...' : 'Search games...'}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-[#3D3D3D] text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: 'var(--background)' }}
                  />
                </div>

                {/* ゲームリスト */}
                <div
                  className="max-h-[200px] overflow-y-auto rounded-lg border-2 border-[#3D3D3D]"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                      {language === 'ja' ? '読み込み中...' : 'Loading...'}
                    </div>
                  ) : filteredGames.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {language === 'ja' ? 'ゲームが見つかりません' : 'No games found'}
                    </div>
                  ) : (
                    filteredGames.slice(0, 20).map(game => (
                      <button
                        key={game.appid}
                        onClick={() => setSelectedGame(game)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
                          alt={game.name}
                          width={69}
                          height={26}
                          className="rounded border border-gray-300 flex-shrink-0 object-cover"
                        />
                        <div className="flex-grow text-left min-w-0">
                          <span className="text-sm font-medium truncate block">{game.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {Math.round(game.playtime_forever / 60)}{language === 'ja' ? '時間' : 'h'}
                            {game.isBacklog && <span className="ml-1 text-orange-500">積みゲー</span>}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {language === 'ja' ? 'メモ（任意）' : 'Note (optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === 'ja' ? '例: ストーリークリアを目指す' : 'e.g., Complete the main story'}
              className="w-full px-3 py-2 rounded-lg border-2 border-[#3D3D3D] text-sm resize-none focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--background)' }}
              rows={2}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-3 p-4 border-t-2 border-[#3D3D3D]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedGame}
            className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--pop-blue)' }}
          >
            {language === 'ja' ? '追加' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
