'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameEvent, CalendarDay, CalendarView } from '@/types/calendar';
import { getHoliday, Holiday } from '@/lib/holidays';
import { steamEvents, SteamEvent } from '@/lib/steamEvents';
import AddEventModal from '@/components/calendar/AddEventModal';
import EventDetail from '@/components/calendar/EventDetail';

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  headerImage: string;
}

interface WishlistRelease {
  appid: number;
  name: string;
  releaseDate: string | null;
  comingSoon: boolean;
  headerImage: string;
}

interface CalendarDayExtended extends CalendarDay {
  holiday?: Holiday;
  dateStr: string;
}

// 週ごとの期間イベント情報
interface WeekEventBar {
  event: SteamEvent;
  startCol: number; // 0-6 (日-土)
  span: number;     // 何日分か
  isStart: boolean; // この週でイベントが開始するか
  isEnd: boolean;   // この週でイベントが終了するか
  row: number;      // 表示行（重なり回避用）
}

export default function CalendarPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [games, setGames] = useState<SteamGame[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [wishlistReleases, setWishlistReleases] = useState<WishlistRelease[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<GameEvent | null>(null);

  // localStorageからsteamIdとイベントを復元
  useEffect(() => {
    const savedSteamId = localStorage.getItem('steamId');
    if (!savedSteamId) {
      router.push('/');
      return;
    }
    setSteamId(savedSteamId);

    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, [router]);

  // ゲームリストを取得
  useEffect(() => {
    if (!steamId) return;

    const fetchGames = async () => {
      try {
        const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(steamId)}`);
        const data = await response.json();
        if (data.games) {
          setGames(data.games);
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
      }
    };

    fetchGames();
  }, [steamId]);

  // ウィッシュリストの発売日を取得
  useEffect(() => {
    if (!steamId) return;

    const fetchWishlistReleases = async () => {
      try {
        const response = await fetch(`/api/wishlist-releases?steamId=${encodeURIComponent(steamId)}`);
        const data = await response.json();
        if (data.releases) {
          setWishlistReleases(data.releases);
        }
      } catch (error) {
        console.error('Failed to fetch wishlist releases:', error);
      }
    };

    fetchWishlistReleases();
  }, [steamId]);

  // イベントをlocalStorageに保存
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('calendarEvents', JSON.stringify(events));
    }
  }, [events]);

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // カレンダーの日付を生成
  const calendarDays = useMemo((): CalendarDayExtended[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDayExtended[] = [];

    // イベントがその日に該当するかチェック（期間イベント対応）
    const getEventsForDate = (dateStr: string) => {
      return events.filter(e => {
        // 開始日と一致
        if (e.date === dateStr) return true;
        // 期間イベントの場合、範囲内かチェック
        if (e.endDate && dateStr > e.date && dateStr <= e.endDate) return true;
        return false;
      });
    };

    // 前月の日付を埋める
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStr = formatDateKey(date);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(dateStr),
        holiday: getHoliday(dateStr),
        dateStr,
      });
    }

    // 当月の日付
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateKey(date);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        events: getEventsForDate(dateStr),
        holiday: getHoliday(dateStr),
        dateStr,
      });
    }

    // 次月の日付を埋める（5週間分になるように）
    const remainingDays = 35 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = formatDateKey(date);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(dateStr),
        holiday: getHoliday(dateStr),
        dateStr,
      });
    }

    return days;
  }, [currentDate, events]);

  // 週ごとにSteamイベントバーを計算
  const weekEventBars = useMemo(() => {
    const weeks: WeekEventBar[][] = [];

    for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
      const weekStart = calendarDays[weekIndex * 7];
      const weekEnd = calendarDays[weekIndex * 7 + 6];
      if (!weekStart || !weekEnd) continue;

      const weekStartStr = weekStart.dateStr;
      const weekEndStr = weekEnd.dateStr;

      const bars: WeekEventBar[] = [];

      // この週に重なるイベントを探す
      steamEvents.forEach(event => {
        // イベントがこの週と重なるか
        if (event.endDate < weekStartStr || event.startDate > weekEndStr) {
          return; // 重ならない
        }

        // 開始日を計算（週の中での位置）
        let startCol = 0;
        if (event.startDate >= weekStartStr) {
          // イベントがこの週で始まる
          for (let i = 0; i < 7; i++) {
            if (calendarDays[weekIndex * 7 + i].dateStr === event.startDate) {
              startCol = i;
              break;
            }
          }
        }

        // 終了日を計算（週の中での位置）
        let endCol = 6;
        if (event.endDate <= weekEndStr) {
          // イベントがこの週で終わる
          for (let i = 0; i < 7; i++) {
            if (calendarDays[weekIndex * 7 + i].dateStr === event.endDate) {
              endCol = i;
              break;
            }
          }
        }

        const span = endCol - startCol + 1;
        const isStart = event.startDate >= weekStartStr && event.startDate <= weekEndStr;
        const isEnd = event.endDate >= weekStartStr && event.endDate <= weekEndStr;

        bars.push({
          event,
          startCol,
          span,
          isStart,
          isEnd,
          row: 0, // 後で計算
        });
      });

      // 行を割り当て（重なりを回避）
      bars.sort((a, b) => a.startCol - b.startCol);
      bars.forEach(bar => {
        let row = 0;
        while (true) {
          const conflict = bars.some(other =>
            other !== bar &&
            other.row === row &&
            !(bar.startCol >= other.startCol + other.span || bar.startCol + bar.span <= other.startCol)
          );
          if (!conflict) {
            bar.row = row;
            break;
          }
          row++;
        }
      });

      weeks.push(bars);
    }

    return weeks;
  }, [calendarDays]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateKey(date));
    setShowAddModal(true);
  };

  const handleAddEvent = (event: Omit<GameEvent, 'id' | 'createdAt'>) => {
    const newEvent: GameEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    setShowAddModal(false);
    setSelectedDate(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setSelectedEvent(null);
  };

  const handleUpdateEvent = (updatedEvent: GameEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setSelectedEvent(null);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, event: GameEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!draggedEvent) return;

    // 期間イベントの場合、日数の差分を計算して両方の日付を更新
    const daysDiff = Math.floor(
      (new Date(targetDate).getTime() - new Date(draggedEvent.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    let newEndDate: string | undefined;
    if (draggedEvent.endDate) {
      const endDate = new Date(draggedEvent.endDate);
      endDate.setDate(endDate.getDate() + daysDiff);
      newEndDate = formatDateKey(endDate);
    }

    const updatedEvent: GameEvent = {
      ...draggedEvent,
      date: targetDate,
      endDate: newEndDate,
    };

    setEvents(prev => prev.map(e => e.id === draggedEvent.id ? updatedEvent : e));
    setDraggedEvent(null);
  };

  const weekDays = language === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthNames = language === 'ja'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getEventTypeColor = (type: GameEvent['type']) => {
    switch (type) {
      case 'planned': return 'var(--pop-blue)';
      case 'played': return 'var(--pop-green)';
      case 'release': return 'var(--pop-yellow)';
      default: return 'var(--pop-purple)';
    }
  };

  // ウィッシュリストの発売日を日付文字列に変換
  const parseReleaseDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;

    // "2025年1月15日" 形式
    const jaMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jaMatch) {
      return `${jaMatch[1]}-${jaMatch[2].padStart(2, '0')}-${jaMatch[3].padStart(2, '0')}`;
    }

    // "Jan 15, 2025" 形式
    const enMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (enMatch) {
      const months: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = months[enMatch[1]] || '01';
      return `${enMatch[3]}-${month}-${enMatch[2].padStart(2, '0')}`;
    }

    // "2025-01-15" 形式
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    return null;
  };

  // 特定の日付のウィッシュリスト発売日を取得
  const getWishlistReleasesForDate = (dateStr: string): WishlistRelease[] => {
    return wishlistReleases.filter(release => {
      const parsedDate = parseReleaseDate(release.releaseDate);
      return parsedDate === dateStr && !release.comingSoon;
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5" />
              <Image src="/icons/icom.png" alt="ツミナビ" width={40} height={40} />
            </Link>
            <div>
              <h1 className="text-xl font-black gradient-text flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                {language === 'ja' ? 'ゲームカレンダー' : 'Game Calendar'}
              </h1>
              <p className="text-xs text-gray-500">
                {language === 'ja' ? 'ゲームの予定を管理' : 'Manage your gaming schedule'}
              </p>
            </div>
          </div>

          {/* View切り替え */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                view === 'month' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: view === 'month' ? 'var(--pop-blue)' : 'var(--card-bg)'
              }}
            >
              {language === 'ja' ? '月' : 'Month'}
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                view === 'week' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: view === 'week' ? 'var(--pop-blue)' : 'var(--card-bg)'
              }}
            >
              {language === 'ja' ? '週' : 'Week'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
        {/* カレンダーナビゲーション */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-black min-w-[200px] text-center">
              {currentDate.getFullYear()}{language === 'ja' ? '年' : ''} {monthNames[currentDate.getMonth()]}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              {language === 'ja' ? '今日' : 'Today'}
            </button>
            <button
              onClick={() => {
                setSelectedDate(formatDateKey(new Date()));
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--pop-blue)' }}
            >
              <Plus className="w-4 h-4" />
              {language === 'ja' ? '予定追加' : 'Add Event'}
            </button>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className="pop-card overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b-2 border-[#3D3D3D]">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center font-bold text-sm ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 週ごとの表示 */}
          {[0, 1, 2, 3, 4].map(weekIndex => {
            const weekDays = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);
            const bars = weekEventBars[weekIndex] || [];
            const maxRow = Math.max(0, ...bars.map(b => b.row));
            const barAreaHeight = bars.length > 0 ? (maxRow + 1) * 22 : 0; // イベントがある時のみバーエリアを確保

            return (
              <div key={weekIndex} className="relative">
                {/* Steamイベントバー（期間表示） */}
                {bars.length > 0 && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: '28px', height: `${barAreaHeight}px` }}
                  >
                    {bars.map((bar, barIndex) => (
                      <div
                        key={`${bar.event.id}-${barIndex}`}
                        className="absolute flex items-center text-[10px] font-bold text-white truncate pointer-events-auto cursor-default"
                        style={{
                          left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
                          width: `calc(${(bar.span / 7) * 100}% - 8px)`,
                          top: `${bar.row * 22}px`,
                          height: '20px',
                          backgroundColor: bar.event.color,
                          borderRadius: bar.isStart && bar.isEnd ? '4px' :
                                        bar.isStart ? '4px 0 0 4px' :
                                        bar.isEnd ? '0 4px 4px 0' : '0',
                          paddingLeft: bar.isStart ? '6px' : '2px',
                          paddingRight: bar.isEnd ? '6px' : '2px',
                        }}
                        title={`${language === 'ja' ? bar.event.name : bar.event.nameEn} (${bar.event.startDate} - ${bar.event.endDate})`}
                      >
                        <span className="truncate">
                          {language === 'ja' ? bar.event.name : bar.event.nameEn}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 日付グリッド */}
                <div className="grid grid-cols-7">
                  {weekDays.map((day, dayIndex) => {
                    const dayOfWeek = day.date.getDay();
                    const hasHoliday = !!day.holiday;

                    return (
                      <div
                        key={dayIndex}
                        onClick={() => handleDateClick(day.date)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.dateStr)}
                        className={`border-b border-r border-[#E5E5E5] cursor-pointer hover:bg-gray-50 transition-colors ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        } ${day.isToday ? 'ring-2 ring-inset' : ''} ${draggedEvent ? 'hover:bg-blue-50' : ''}`}
                        style={{
                          backgroundColor: day.isToday ? 'var(--background-secondary)' : 'var(--card-bg)',
                          minHeight: '130px', // 固定の高さで縦に伸ばす
                          paddingTop: `${28 + barAreaHeight + 4}px`,
                          paddingLeft: '8px',
                          paddingRight: '8px',
                          paddingBottom: '8px',
                          ...(day.isToday && { '--tw-ring-color': 'var(--pop-blue)' } as React.CSSProperties)
                        }}
                      >
                        {/* 日付と祝日名（固定位置） */}
                        <div
                          className="absolute flex items-start justify-between"
                          style={{
                            top: '4px',
                            left: `calc(${(dayIndex / 7) * 100}% + 8px)`,
                            right: `calc(${((6 - dayIndex) / 7) * 100}% + 8px)`,
                          }}
                        >
                          <span className={`text-sm font-bold ${
                            hasHoliday || dayOfWeek === 0 ? 'text-red-500' :
                            dayOfWeek === 6 ? 'text-blue-500' :
                            'text-gray-700'
                          }`}>
                            {day.date.getDate()}
                          </span>
                          {hasHoliday && (
                            <span className="text-[10px] text-red-500 font-medium truncate max-w-[50px]">
                              {language === 'ja' ? day.holiday!.name : day.holiday!.nameEn}
                            </span>
                          )}
                        </div>

                        {/* ユーザーイベント表示 - 自分の予定を先に表示 */}
                        <div className="space-y-1">
                          {/* ユーザーの予定（最大3件） */}
                          {day.events.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, event)}
                              onDragEnd={() => setDraggedEvent(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate cursor-grab hover:opacity-80 active:cursor-grabbing"
                              style={{ backgroundColor: getEventTypeColor(event.type) }}
                            >
                              <Image
                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${event.gameId}/capsule_sm_120.jpg`}
                                alt={event.gameName}
                                width={20}
                                height={9}
                                className="rounded-sm flex-shrink-0"
                              />
                              <span className="truncate text-[10px]">{event.gameName}</span>
                            </div>
                          ))}
                          {/* ウィッシュリスト発売日（予定がない場合のみ表示） */}
                          {day.events.length === 0 && getWishlistReleasesForDate(day.dateStr).slice(0, 2).map(release => (
                            <div
                              key={`wl-${release.appid}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate"
                              style={{ backgroundColor: 'var(--pop-yellow)' }}
                              title={`${language === 'ja' ? '発売日' : 'Release'}: ${release.name}`}
                            >
                              <Image
                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${release.appid}/capsule_sm_120.jpg`}
                                alt={release.name}
                                width={20}
                                height={9}
                                className="rounded-sm flex-shrink-0"
                              />
                              <span className="truncate text-[10px]">🎮 {release.name}</span>
                            </div>
                          ))}
                          {(day.events.length > 3 || (day.events.length === 0 && getWishlistReleasesForDate(day.dateStr).length > 2)) && (
                            <span className="text-[10px] text-gray-500 font-medium">
                              +{Math.max(0, day.events.length - 3) + (day.events.length === 0 ? Math.max(0, getWishlistReleasesForDate(day.dateStr).length - 2) : 0)} {language === 'ja' ? '件' : 'more'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--pop-blue)' }} />
            <span>{language === 'ja' ? '予定' : 'Planned'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--pop-green)' }} />
            <span>{language === 'ja' ? 'プレイ済み' : 'Played'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--pop-yellow)' }} />
            <span>{language === 'ja' ? '発売日 / WL発売' : 'Release / WL Release'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>{language === 'ja' ? 'Steamセール' : 'Steam Sale'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-600" />
            <span>{language === 'ja' ? 'Steamフェス' : 'Steam Fest'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-xs">●</span>
            <span>{language === 'ja' ? '祝日' : 'Holiday'}</span>
          </div>
        </div>
      </main>

      {/* 予定追加モーダル */}
      {showAddModal && selectedDate && (
        <AddEventModal
          date={selectedDate}
          games={games}
          steamId={steamId || undefined}
          onAdd={handleAddEvent}
          onClose={() => {
            setShowAddModal(false);
            setSelectedDate(null);
          }}
          language={language}
        />
      )}

      {/* イベント詳細モーダル */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
          onUpdate={handleUpdateEvent}
          language={language}
        />
      )}
    </div>
  );
}
