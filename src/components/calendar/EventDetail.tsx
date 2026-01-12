'use client';

import Image from 'next/image';
import { X, Trash2, ExternalLink } from 'lucide-react';
import { GameEvent } from '@/types/calendar';

interface EventDetailProps {
  event: GameEvent;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  language: string;
}

export default function EventDetail({ event, onClose, onDelete, language }: EventDetailProps) {
  const getTypeLabel = (type: GameEvent['type']) => {
    switch (type) {
      case 'planned':
        return language === 'ja' ? '予定' : 'Planned';
      case 'played':
        return language === 'ja' ? 'プレイ済み' : 'Played';
      case 'release':
        return language === 'ja' ? '発売日' : 'Release';
    }
  };

  const getTypeColor = (type: GameEvent['type']) => {
    switch (type) {
      case 'planned': return 'var(--pop-blue)';
      case 'played': return 'var(--pop-green)';
      case 'release': return 'var(--pop-yellow)';
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    if (language === 'ja') {
      return `${year}年${parseInt(month)}月${parseInt(day)}日`;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const handleDelete = () => {
    if (confirm(language === 'ja' ? 'この予定を削除しますか？' : 'Delete this event?')) {
      onDelete(event.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-2xl border-3 border-[#3D3D3D] shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* ゲーム画像ヘッダー */}
        <div className="relative">
          <Image
            src={event.gameImage}
            alt={event.gameName}
            width={460}
            height={215}
            className="w-full h-auto"
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* タイプバッジ */}
          <div
            className="absolute bottom-2 left-2 px-3 py-1 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: getTypeColor(event.type) }}
          >
            {getTypeLabel(event.type)}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* ゲーム名 */}
          <div>
            <h2 className="text-xl font-black">{event.gameName}</h2>
            <p className="text-sm text-gray-500 mt-1">{formatDate(event.date)}</p>
          </div>

          {/* メモ */}
          {event.note && (
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              <p className="text-sm text-gray-600">{event.note}</p>
            </div>
          )}

          {/* プレイ時間 */}
          {event.playtimeMinutes && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{language === 'ja' ? 'プレイ時間:' : 'Playtime:'}</span>
              <span className="font-bold">
                {Math.floor(event.playtimeMinutes / 60)}{language === 'ja' ? '時間' : 'h'}
                {event.playtimeMinutes % 60}{language === 'ja' ? '分' : 'm'}
              </span>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <a
              href={`https://store.steampowered.com/app/${event.gameId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ExternalLink className="w-4 h-4" />
              Steam
            </a>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--pop-red)' }}
            >
              <Trash2 className="w-4 h-4" />
              {language === 'ja' ? '削除' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
