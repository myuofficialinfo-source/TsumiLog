'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Search, Gamepad2 } from 'lucide-react';
import { GameEvent } from '@/types/calendar';

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  headerImage: string;
}

interface AddEventModalProps {
  date: string;
  games: SteamGame[];
  onAdd: (event: Omit<GameEvent, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  language: string;
}

export default function AddEventModal({ date, games, onAdd, onClose, language }: AddEventModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [eventType, setEventType] = useState<GameEvent['type']>('planned');
  const [note, setNote] = useState('');

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!selectedGame) return;

    onAdd({
      date,
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
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-500">
              {language === 'ja' ? '日付:' : 'Date:'}
            </span>
            <span className="font-bold">{formatDate(date)}</span>
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

            {/* 選択中のゲーム */}
            {selectedGame && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#3D3D3D] mb-3"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                <Image
                  src={selectedGame.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.appid}/header.jpg`}
                  alt={selectedGame.name}
                  width={92}
                  height={43}
                  className="rounded border border-gray-300"
                />
                <div className="flex-grow">
                  <p className="font-bold text-sm">{selectedGame.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(selectedGame.playtime_forever / 60)}{language === 'ja' ? '時間プレイ' : 'h played'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="p-1 rounded hover:bg-gray-200"
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
                  {filteredGames.length === 0 ? (
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
                        <Image
                          src={game.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                          alt={game.name}
                          width={46}
                          height={21}
                          className="rounded border border-gray-300"
                        />
                        <span className="text-sm font-medium truncate">{game.name}</span>
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
