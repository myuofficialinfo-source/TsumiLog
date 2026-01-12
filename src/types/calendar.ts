// カレンダー関連の型定義

export interface GameEvent {
  id: string;
  date: string; // YYYY-MM-DD形式（開始日）
  endDate?: string; // YYYY-MM-DD形式（終了日、期間イベント用）
  gameId: number; // Steam appid
  gameName: string;
  gameImage: string;
  type: 'planned' | 'played' | 'release';
  note?: string;
  playtimeMinutes?: number; // 実際にプレイした時間
  createdAt: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: GameEvent[];
}

export interface RecentlyPlayedGame {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
  img_icon_url: string;
}

export type CalendarView = 'month' | 'week';
