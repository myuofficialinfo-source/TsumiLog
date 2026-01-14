'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Header } from '@/components/Layout';
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

// localStorageから初期イベントを取得（SSR対応）
function getInitialEvents(): GameEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('calendarEvents');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // エラーは無視
  }
  return [];
}

// localStorageから初期ゲームリストを取得（SSR対応）
function getInitialGames(): SteamGame[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('cachedGames');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // エラーは無視
  }
  return [];
}

export default function CalendarPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [games, setGames] = useState<SteamGame[]>(getInitialGames);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [wishlistReleases, setWishlistReleases] = useState<WishlistRelease[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<GameEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resizeInfo, setResizeInfo] = useState<{
    eventId: string;
    startY: number;
    originalEndTime: string;
  } | null>(null);

  // steamIdを取得し、DBからイベントを読み込み
  useEffect(() => {
    const savedSteamId = localStorage.getItem('steamId');
    if (!savedSteamId) {
      router.push('/');
      return;
    }
    setSteamId(savedSteamId);

    // DBからイベントを取得
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/calendar-events?steamId=${encodeURIComponent(savedSteamId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.events && Array.isArray(data.events)) {
            // DBの形式からフロントエンドの形式に変換
            // DBのidはnumber型なのでstringに変換
            const convertedEvents: GameEvent[] = data.events.map((e: {
              id: number | string;
              date: string;
              endDate?: string;
              startTime?: string;
              endTime?: string;
              gameId: number;
              gameName: string;
              gameImage?: string;
              type: 'planned' | 'played' | 'release';
              note?: string;
              playtimeMinutes?: number;
              createdAt: string;
            }) => ({
              id: String(e.id),
              date: e.date,
              endDate: e.endDate,
              startTime: e.startTime,
              endTime: e.endTime,
              gameId: e.gameId,
              gameName: e.gameName,
              gameImage: e.gameImage,
              type: e.type,
              note: e.note,
              playtimeMinutes: e.playtimeMinutes,
              createdAt: e.createdAt,
            }));
            setEvents(convertedEvents);
            // localStorageにもキャッシュ
            localStorage.setItem('calendarEvents', JSON.stringify(convertedEvents));
          }
        } else {
          // API失敗時はlocalStorageから読み込み
          const savedEvents = localStorage.getItem('calendarEvents');
          if (savedEvents) {
            setEvents(JSON.parse(savedEvents));
          }
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        // エラー時はlocalStorageから読み込み
        const savedEvents = localStorage.getItem('calendarEvents');
        if (savedEvents) {
          setEvents(JSON.parse(savedEvents));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  // ゲームリストを取得（localStorageからのフォールバック付き）
  useEffect(() => {
    if (!steamId) return;

    const fetchGames = async () => {
      try {
        // まずlocalStorageからキャッシュを読み込む
        const cachedGames = localStorage.getItem('cachedGames');
        if (cachedGames) {
          const parsed = JSON.parse(cachedGames);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setGames(parsed);
          }
        }

        // APIからも取得を試みる
        const response = await fetch(`/api/steam/games?steamId=${encodeURIComponent(steamId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.games && Array.isArray(data.games) && data.games.length > 0) {
            setGames(data.games);
            // 成功したらキャッシュを更新
            localStorage.setItem('cachedGames', JSON.stringify(data.games));
          }
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
        // エラー時はキャッシュを使用（既に読み込み済み）
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
        console.log('[Calendar] Wishlist releases API response:', JSON.stringify(data, null, 2));
        if (data.releases) {
          setWishlistReleases(data.releases);
        }
      } catch (error) {
        console.error('Failed to fetch wishlist releases:', error);
      }
    };

    fetchWishlistReleases();
  }, [steamId]);

  // イベント変更時にlocalStorageに保存（DBはハンドラで直接更新）
  useEffect(() => {
    // localStorageは常に同期
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  // リサイズ用のグローバルマウスイベント
  useEffect(() => {
    if (!resizeInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeInfo.startY;
      const deltaMinutes = Math.round(deltaY / 50 * 60 / 15) * 15;

      const origEndHour = parseInt(resizeInfo.originalEndTime.split(':')[0]);
      const origEndMin = parseInt(resizeInfo.originalEndTime.split(':')[1]);

      const targetEvent = events.find(ev => ev.id === resizeInfo.eventId);
      if (!targetEvent) return;

      const startTimeMin = targetEvent.startTime
        ? parseInt(targetEvent.startTime.split(':')[0]) * 60 + parseInt(targetEvent.startTime.split(':')[1])
        : 0;

      const newEndTotalMin = Math.max(
        startTimeMin + 15,
        Math.min(24 * 60, origEndHour * 60 + origEndMin + deltaMinutes)
      );
      const newEndHour = Math.floor(newEndTotalMin / 60);
      const newEndMin = newEndTotalMin % 60;
      const newEndTime = `${String(newEndHour).padStart(2, '0')}:${String(newEndMin).padStart(2, '0')}`;

      setEvents(prev => prev.map(ev =>
        ev.id === resizeInfo.eventId ? { ...ev, endTime: newEndTime } : ev
      ));
    };

    const handleMouseUp = async () => {
      // リサイズ終了時にDBを更新
      const updatedEvent = events.find(ev => ev.id === resizeInfo.eventId);
      if (updatedEvent && steamId) {
        try {
          const response = await fetch('/api/calendar-events', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              steamId,
              eventId: updatedEvent.id,
              updates: {
                endTime: updatedEvent.endTime,
              },
            }),
          });
          if (!response.ok) {
            throw new Error('Failed to update');
          }
          // 成功したらlocalStorageも更新
          setEvents(prev => {
            localStorage.setItem('calendarEvents', JSON.stringify(prev));
            return prev;
          });
        } catch (err) {
          console.error('Failed to update event after resize:', err);
          // ロールバック
          setEvents(prev => prev.map(ev =>
            ev.id === resizeInfo.eventId ? { ...ev, endTime: resizeInfo.originalEndTime } : ev
          ));
        }
      }
      setResizeInfo(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeInfo, events, steamId]);

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

  const navigateWeek = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction * 7);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 週表示用の日付配列を取得
  const weekViewDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // 日曜始まり

    const days: CalendarDayExtended[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDateKey(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: date.getTime() === today.getTime(),
        events: events.filter(e => {
          if (e.date === dateStr) return true;
          if (e.endDate && dateStr > e.date && dateStr <= e.endDate) return true;
          return false;
        }),
        holiday: getHoliday(dateStr),
        dateStr,
      });
    }
    return days;
  }, [currentDate, events]);

  // 時間スロット (0-23時)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateKey(date));
    setShowAddModal(true);
  };

  const handleAddEvent = async (event: Omit<GameEvent, 'id' | 'createdAt'>) => {
    if (!steamId) return;

    // まずUIを即座に更新（楽観的更新）
    const tempId = crypto.randomUUID();
    const tempEvent: GameEvent = {
      ...event,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, tempEvent]);
    setShowAddModal(false);
    setSelectedDate(null);

    // DBに保存
    try {
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId,
          event: {
            date: event.date,
            endDate: event.endDate,
            startTime: event.startTime,
            endTime: event.endTime,
            gameId: event.gameId,
            gameName: event.gameName,
            gameImage: event.gameImage,
            type: event.type,
            note: event.note,
            playtimeMinutes: event.playtimeMinutes,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // DBから返されたIDで更新（DBのidはnumberなのでstringに変換）
        setEvents(prev => prev.map(e =>
          e.id === tempId
            ? { ...e, id: String(data.event.id), createdAt: data.event.createdAt }
            : e
        ));
      } else {
        console.error('Failed to save event to DB');
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!steamId) return;

    // まずUIを即座に更新
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setSelectedEvent(null);

    // DBから削除
    try {
      await fetch(`/api/calendar-events?steamId=${encodeURIComponent(steamId)}&eventId=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleUpdateEvent = async (updatedEvent: GameEvent) => {
    if (!steamId) return;

    // まずUIを即座に更新
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setSelectedEvent(null);

    // DBを更新
    try {
      await fetch('/api/calendar-events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId,
          eventId: updatedEvent.id,
          updates: {
            date: updatedEvent.date,
            endDate: updatedEvent.endDate || null,
            startTime: updatedEvent.startTime || null,
            endTime: updatedEvent.endTime || null,
            type: updatedEvent.type,
            note: updatedEvent.note || null,
            playtimeMinutes: updatedEvent.playtimeMinutes || null,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, event: GameEvent) => {
    const target = e.currentTarget as HTMLElement;
    // カスタムドラッグ画像を設定（要素自体をクローン）
    const dragElement = target.cloneNode(true) as HTMLElement;
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-9999px';
    dragElement.style.left = '-9999px';
    dragElement.style.width = `${target.offsetWidth}px`;
    dragElement.style.opacity = '1';
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, target.offsetWidth / 2, 10);
    // クローン要素を遅延削除
    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 0);
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
  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!draggedEvent || !steamId) return;

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

    const originalEvent = draggedEvent;
    setEvents(prev => prev.map(e => e.id === draggedEvent.id ? updatedEvent : e));
    setDraggedEvent(null);

    // DBを更新（失敗時はロールバック）
    try {
      const response = await fetch('/api/calendar-events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId,
          eventId: updatedEvent.id,
          updates: {
            date: updatedEvent.date,
            endDate: updatedEvent.endDate || null,
          },
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update');
      }
      // 成功したらlocalStorageも更新
      setEvents(prev => {
        const newEvents = prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        localStorage.setItem('calendarEvents', JSON.stringify(newEvents));
        return newEvents;
      });
    } catch (error) {
      console.error('Failed to update event after drag:', error);
      // ロールバック
      setEvents(prev => prev.map(e => e.id === originalEvent.id ? originalEvent : e));
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
        <Header showBack backHref="/" />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">
              {language === 'ja' ? 'カレンダーを読み込み中...' : 'Loading calendar...'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー（積みゲーバトルと同じスタイル） */}
      <Header showBack backHref="/" />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full">
        {/* カレンダーナビゲーション */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => view === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
              className="p-1.5 sm:p-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h2 className="text-lg sm:text-2xl font-black min-w-[140px] sm:min-w-[200px] text-center">
              {view === 'month' ? (
                <>{currentDate.getFullYear()}{language === 'ja' ? '年' : ''} {monthNames[currentDate.getMonth()]}</>
              ) : (
                <>
                  {weekViewDays[0]?.date.getMonth() === weekViewDays[6]?.date.getMonth() ? (
                    <>{currentDate.getFullYear()}{language === 'ja' ? '年' : ''} {monthNames[weekViewDays[0]?.date.getMonth() || 0]}</>
                  ) : (
                    <>{weekViewDays[0]?.date.getMonth() + 1}/{weekViewDays[0]?.date.getDate()} - {weekViewDays[6]?.date.getMonth() + 1}/{weekViewDays[6]?.date.getDate()}</>
                  )}
                </>
              )}
            </h2>
            <button
              onClick={() => view === 'month' ? navigateMonth(1) : navigateWeek(1)}
              className="p-1.5 sm:p-2 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 flex-wrap justify-center">
            {/* View切り替え */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView('month')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                  view === 'month' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: view === 'month' ? 'var(--pop-blue)' : 'var(--card-bg)'
                }}
              >
                {language === 'ja' ? '月' : 'M'}
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg border-2 border-[#3D3D3D] transition-colors ${
                  view === 'week' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: view === 'week' ? 'var(--pop-blue)' : 'var(--card-bg)'
                }}
              >
                {language === 'ja' ? '週' : 'W'}
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              {language === 'ja' ? '今日' : 'Today'}
            </button>
            <button
              onClick={() => {
                setSelectedDate(formatDateKey(new Date()));
                setShowAddModal(true);
              }}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-bold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--pop-blue)' }}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{language === 'ja' ? '予定追加' : 'Add'}</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>

        {/* 月表示 */}
        {view === 'month' && (
        <div className="pop-card overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid border-b-2 border-[#3D3D3D]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((day, index) => (
              <div
                key={day}
                className="py-2 text-center"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                <div className={`text-xs font-medium ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {day}
                </div>
              </div>
            ))}
          </div>

          {/* 週ごとの表示 */}
          {[0, 1, 2, 3, 4].map(weekIndex => {
            const weekDays = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);
            const bars = weekEventBars[weekIndex] || [];
            const maxRow = Math.max(0, ...bars.map(b => b.row));
            const barAreaHeight = bars.length > 0 ? (maxRow + 1) * 22 : 0;

            return (
              <div key={weekIndex} className="relative">
                {/* Steamイベントバー（期間表示）- 日付のすぐ下に表示 */}
                {bars.length > 0 && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: '24px',
                      left: 0,
                      right: 0,
                      height: `${barAreaHeight}px`,
                      zIndex: 1,
                    }}
                  >
                    {bars.map((bar, barIndex) => (
                      <div
                        key={`${bar.event.id}-${barIndex}`}
                        className="absolute flex items-center text-[10px] font-bold truncate"
                        style={{
                          left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
                          width: `calc(${(bar.span / 7) * 100}% - 8px)`,
                          top: `${bar.row * 22}px`,
                          height: '20px',
                          backgroundColor: bar.event.color,
                          opacity: 0.4,
                          color: 'white',
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
                <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {weekDays.map((day, dayIndex) => {
                    const dayOfWeek = day.date.getDay();
                    const hasHoliday = !!day.holiday;

                    return (
                      <div
                        key={dayIndex}
                        onClick={() => handleDateClick(day.date)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.dateStr)}
                        className={`relative border-b border-r border-[#E5E5E5] cursor-pointer hover:bg-gray-50/50 transition-colors overflow-hidden ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        } ${day.isToday ? 'ring-2 ring-inset' : ''} ${draggedEvent ? 'hover:bg-blue-50' : ''}`}
                        style={{
                          backgroundColor: day.isToday ? 'var(--background-secondary)' : 'var(--card-bg)',
                          height: `${Math.max(130, 24 + barAreaHeight + 10)}px`,
                          ...(day.isToday && { '--tw-ring-color': 'var(--pop-blue)' } as React.CSSProperties)
                        }}
                      >
                        {/* 日付と祝日名（固定位置） */}
                        <div className="flex items-start justify-between px-2 pt-1 pb-0.5">
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

                        {/* ユーザーイベント表示 - Steamイベントバーに重ねてオーバーレイ */}
                        <div
                          className="px-1 space-y-0.5 relative overflow-hidden"
                          style={{ zIndex: 10, maxHeight: 'calc(100% - 28px)' }}
                        >
                          {day.events.map(event => (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, event)}
                              onDragEnd={() => setDraggedEvent(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                              className="px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-medium text-white truncate cursor-grab hover:opacity-80 active:cursor-grabbing shadow-sm"
                              style={{ backgroundColor: getEventTypeColor(event.type) }}
                            >
                              {event.gameName}
                            </div>
                          ))}
                          {/* ウィッシュリスト発売日 */}
                          {getWishlistReleasesForDate(day.dateStr).slice(0, 2).map(release => (
                            <div
                              key={`wl-${release.appid}`}
                              className="px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-medium text-white truncate"
                              style={{ backgroundColor: 'var(--pop-yellow)' }}
                              title={`${language === 'ja' ? '発売日' : 'Release'}: ${release.name}`}
                            >
                              {release.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* 週表示 */}
        {view === 'week' && (
        <div className="pop-card overflow-hidden">
          {/* 曜日と日付ヘッダー */}
          <div className="grid border-b-2 border-[#3D3D3D]" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
            {/* 時間列のヘッダー */}
            <div
              className="py-2 text-center font-bold text-xs text-gray-500"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
            </div>
            {weekViewDays.map((day, index) => {
              const dayOfWeek = day.date.getDay();
              const hasHoliday = !!day.holiday;
              return (
                <div
                  key={index}
                  className={`py-2 text-center ${day.isToday ? 'ring-2 ring-inset' : ''}`}
                  style={{
                    backgroundColor: day.isToday ? 'var(--background-secondary)' : 'var(--background-secondary)',
                    ...(day.isToday && { '--tw-ring-color': 'var(--pop-blue)' } as React.CSSProperties)
                  }}
                >
                  <div className={`text-xs font-medium ${
                    hasHoliday || dayOfWeek === 0 ? 'text-red-500' :
                    dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-500'
                  }`}>
                    {weekDays[dayOfWeek]}
                  </div>
                  <div className={`text-lg font-black ${
                    hasHoliday || dayOfWeek === 0 ? 'text-red-500' :
                    dayOfWeek === 6 ? 'text-blue-500' : ''
                  }`}>
                    {day.date.getDate()}
                  </div>
                  {hasHoliday && (
                    <div className="text-[9px] text-red-500 truncate px-1">
                      {language === 'ja' ? day.holiday!.name : day.holiday!.nameEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* タイムグリッド（オーバーレイ対応） */}
          <div className="max-h-[608px] overflow-y-auto relative">
            <div className="grid" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
              {/* 時間ラベル列 */}
              <div>
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="h-[50px] px-1 text-right text-xs text-gray-500 border-b border-r border-[#E5E5E5] flex items-start justify-end pt-1"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* 各曜日の列（グリッドの子要素として直接配置） */}
              {weekViewDays.map((day, dayIndex) => {
                const dayOfWeek = day.date.getDay();
                return (
                  <div key={dayIndex} className="relative">
                    {/* グリッド背景（クリック用） */}
                    {timeSlots.map(hour => (
                      <div
                        key={hour}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setShowAddModal(true);
                        }}
                        className={`h-[50px] border-b border-r border-[#E5E5E5] cursor-pointer hover:bg-gray-100/50 transition-colors ${
                          dayOfWeek === 0 || dayOfWeek === 6 ? 'bg-gray-50/30' : ''
                        }`}
                        style={{ backgroundColor: day.isToday ? 'rgba(59, 130, 246, 0.03)' : 'var(--card-bg)' }}
                      />
                    ))}

                    {/* この日のイベントをオーバーレイ表示 */}
                    {day.events.map(event => {
                      // 時間からピクセル位置を計算
                      const startHour = event.startTime ? parseInt(event.startTime.split(':')[0]) : 0;
                      const startMin = event.startTime ? parseInt(event.startTime.split(':')[1]) : 0;
                      const endHour = event.endTime ? parseInt(event.endTime.split(':')[0]) : startHour + 1;
                      const endMin = event.endTime ? parseInt(event.endTime.split(':')[1]) : 0;

                      const topPx = (startHour * 50) + (startMin / 60 * 50);
                      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                      const heightPx = Math.max(25, (durationMinutes / 60) * 50);

                      return (
                        <div
                          key={event.id}
                          draggable={!resizeInfo}
                          onDragStart={(e) => {
                            if (resizeInfo) {
                              e.preventDefault();
                              return;
                            }
                            const target = e.currentTarget as HTMLElement;
                            // カスタムドラッグ画像を設定（要素自体をクローン）
                            const dragElement = target.cloneNode(true) as HTMLElement;
                            dragElement.style.position = 'absolute';
                            dragElement.style.top = '-9999px';
                            dragElement.style.left = '-9999px';
                            dragElement.style.width = `${target.offsetWidth}px`;
                            dragElement.style.opacity = '1';
                            document.body.appendChild(dragElement);
                            e.dataTransfer.setDragImage(dragElement, target.offsetWidth / 2, 10);
                            // クローン要素を遅延削除
                            setTimeout(() => {
                              document.body.removeChild(dragElement);
                            }, 0);
                            e.dataTransfer.setData('eventId', event.id);
                            e.dataTransfer.setData('type', 'move');
                            setDraggedEvent(event);
                          }}
                          onDragEnd={() => setDraggedEvent(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!resizeInfo) {
                              setSelectedEvent(event);
                            }
                          }}
                          className="absolute left-1 right-1 rounded-lg shadow-sm cursor-grab active:cursor-grabbing overflow-hidden group"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            backgroundColor: getEventTypeColor(event.type),
                            zIndex: resizeInfo?.eventId === event.id ? 20 : 10,
                            opacity: draggedEvent?.id === event.id ? 0.5 : 1,
                          }}
                        >
                          <div className="p-1 h-full flex flex-col pointer-events-none">
                            <div className="text-[10px] font-bold text-white truncate">
                              {event.gameName}
                            </div>
                            {heightPx > 30 && (
                              <div className="text-[9px] text-white/80">
                                {event.startTime || '00:00'} - {event.endTime || '01:00'}
                              </div>
                            )}
                          </div>
                          {/* リサイズハンドル（下部）- マウスイベントで処理 */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize bg-black/30 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const originalEndTime = event.endTime || `${String(startHour + 1).padStart(2, '0')}:00`;
                              setResizeInfo({
                                eventId: event.id,
                                startY: e.clientY,
                                originalEndTime,
                              });
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* ドロップターゲット（週表示での移動用） */}
                    {draggedEvent && (
                      <div
                        className="absolute inset-0"
                        style={{
                          zIndex: 5,
                          pointerEvents: 'auto',
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const eventId = e.dataTransfer.getData('eventId');
                          const dragType = e.dataTransfer.getData('type');

                          if (dragType === 'move' && draggedEvent) {
                            // 移動処理
                            const rect = e.currentTarget.getBoundingClientRect();
                            const relativeY = e.clientY - rect.top;
                            const hour = Math.floor(relativeY / 50);
                            const minutes = Math.round((relativeY % 50) / 50 * 60 / 15) * 15;
                            const newStartTime = `${String(Math.min(23, Math.max(0, hour))).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                            // 元の時間差を維持
                            const oldStartHour = draggedEvent.startTime ? parseInt(draggedEvent.startTime.split(':')[0]) : 0;
                            const oldStartMin = draggedEvent.startTime ? parseInt(draggedEvent.startTime.split(':')[1]) : 0;
                            const oldEndHour = draggedEvent.endTime ? parseInt(draggedEvent.endTime.split(':')[0]) : oldStartHour + 1;
                            const oldEndMin = draggedEvent.endTime ? parseInt(draggedEvent.endTime.split(':')[1]) : 0;
                            const durationMin = (oldEndHour * 60 + oldEndMin) - (oldStartHour * 60 + oldStartMin);

                            const newEndTotalMin = hour * 60 + minutes + durationMin;
                            const newEndHour = Math.min(23, Math.floor(newEndTotalMin / 60));
                            const newEndMin = newEndTotalMin % 60;
                            const newEndTime = `${String(newEndHour).padStart(2, '0')}:${String(newEndMin).padStart(2, '0')}`;

                            const updatedEvent: GameEvent = {
                              ...draggedEvent,
                              date: day.dateStr,
                              startTime: newStartTime,
                              endTime: newEndTime,
                            };
                            const originalEvent = draggedEvent;
                            setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev));

                            // DBを更新（失敗時はロールバック）
                            if (steamId) {
                              (async () => {
                                try {
                                  const response = await fetch('/api/calendar-events', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      steamId,
                                      eventId: updatedEvent.id,
                                      updates: {
                                        date: updatedEvent.date,
                                        startTime: updatedEvent.startTime,
                                        endTime: updatedEvent.endTime,
                                      },
                                    }),
                                  });
                                  if (!response.ok) {
                                    throw new Error('Failed to update event');
                                  }
                                  // 成功したらlocalStorageも更新
                                  setEvents(prev => {
                                    const newEvents = prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev);
                                    localStorage.setItem('calendarEvents', JSON.stringify(newEvents));
                                    return newEvents;
                                  });
                                } catch (err) {
                                  console.error('Failed to update event after drag:', err);
                                  // ロールバック
                                  setEvents(prev => prev.map(ev => ev.id === originalEvent.id ? originalEvent : ev));
                                }
                              })();
                            }
                          }
                          setDraggedEvent(null);
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

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
            <div className="w-3 h-3 rounded bg-amber-500 opacity-60" />
            <span>{language === 'ja' ? 'Steamセール' : 'Steam Sale'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-600 opacity-60" />
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
