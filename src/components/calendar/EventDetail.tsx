'use client';

import { useState } from 'react';
import { X, Trash2, ExternalLink, Edit2, Save, Calendar } from 'lucide-react';
import { GameEvent } from '@/types/calendar';

interface EventDetailProps {
  event: GameEvent;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onUpdate: (event: GameEvent) => void;
  language: string;
}

export default function EventDetail({ event, onClose, onDelete, onUpdate, language }: EventDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(event.date);
  const [editedEndDate, setEditedEndDate] = useState(event.endDate || '');
  const [editedNote, setEditedNote] = useState(event.note || '');
  const [editedType, setEditedType] = useState(event.type);

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

  const handleSave = () => {
    const updatedEvent: GameEvent = {
      ...event,
      date: editedDate,
      endDate: editedEndDate || undefined,
      note: editedNote || undefined,
      type: editedType,
    };
    onUpdate(updatedEvent);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-2xl border-3 border-[#3D3D3D] shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* ゲーム画像ヘッダー */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${event.gameId}/header.jpg`}
            alt={event.gameName}
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
            style={{ backgroundColor: getTypeColor(isEditing ? editedType : event.type) }}
          >
            {getTypeLabel(isEditing ? editedType : event.type)}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* ゲーム名 */}
          <div>
            <h2 className="text-xl font-black">{event.gameName}</h2>

            {isEditing ? (
              <div className="mt-3 space-y-3">
                {/* 日付入力 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {language === 'ja' ? '開始日' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-[#3D3D3D] text-sm"
                    style={{ backgroundColor: 'var(--background)' }}
                  />
                </div>

                {/* 終了日入力 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {language === 'ja' ? '終了日（任意）' : 'End Date (optional)'}
                  </label>
                  <input
                    type="date"
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    min={editedDate}
                    className="w-full px-3 py-2 rounded-lg border-2 border-[#3D3D3D] text-sm"
                    style={{ backgroundColor: 'var(--background)' }}
                  />
                </div>

                {/* タイプ選択 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {language === 'ja' ? '種類' : 'Type'}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'planned', label: language === 'ja' ? '予定' : 'Planned', color: 'var(--pop-blue)' },
                      { value: 'played', label: language === 'ja' ? 'プレイ済み' : 'Played', color: 'var(--pop-green)' },
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => setEditedType(type.value as GameEvent['type'])}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                          editedType === type.value ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: editedType === type.value ? type.color : 'var(--card-bg)'
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
                {event.endDate && (
                  <>
                    <span>〜</span>
                    <span>{formatDate(event.endDate)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* メモ */}
          {isEditing ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {language === 'ja' ? 'メモ' : 'Note'}
              </label>
              <textarea
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                placeholder={language === 'ja' ? '例: ストーリークリアを目指す' : 'e.g., Complete the main story'}
                className="w-full px-3 py-2 rounded-lg border-2 border-[#3D3D3D] text-sm resize-none"
                style={{ backgroundColor: 'var(--background)' }}
                rows={2}
              />
            </div>
          ) : event.note ? (
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              <p className="text-sm text-gray-600">{event.note}</p>
            </div>
          ) : null}

          {/* プレイ時間 */}
          {event.playtimeMinutes && !isEditing && (
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
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)' }}
                >
                  {language === 'ja' ? 'キャンセル' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--pop-green)' }}
                >
                  <Save className="w-4 h-4" />
                  {language === 'ja' ? '保存' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)' }}
                >
                  <Edit2 className="w-4 h-4" />
                  {language === 'ja' ? '編集' : 'Edit'}
                </button>
                <a
                  href={`https://store.steampowered.com/app/${event.gameId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)' }}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--pop-red)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
