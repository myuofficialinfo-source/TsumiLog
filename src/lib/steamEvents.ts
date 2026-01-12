// Steamセール・フェスイベントデータ（2025-2026）

export interface SteamEvent {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  name: string;
  nameEn: string;
  type: 'sale' | 'fest' | 'nextfest';
  color: string; // 表示色
}

export const steamEvents: SteamEvent[] = [
  // 2025年イベント
  {
    id: 'steam-4x-fest-2025',
    startDate: '2025-08-11',
    endDate: '2025-08-18',
    name: '4Xフェス',
    nameEn: '4X Fest',
    type: 'fest',
    color: '#7C3AED', // purple
  },
  {
    id: 'steam-tps-fest-2025',
    startDate: '2025-08-25',
    endDate: '2025-09-01',
    name: 'TPSフェス',
    nameEn: 'TPS Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-political-sim-2025',
    startDate: '2025-09-08',
    endDate: '2025-09-15',
    name: '政治シミュフェス',
    nameEn: 'Political Sim Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-autumn-sale-2025',
    startDate: '2025-09-29',
    endDate: '2025-10-06',
    name: 'オータムセール',
    nameEn: 'Autumn Sale',
    type: 'sale',
    color: '#F59E0B', // amber
  },
  {
    id: 'steam-next-fest-oct-2025',
    startDate: '2025-10-13',
    endDate: '2025-10-20',
    name: 'Next Fest',
    nameEn: 'Next Fest',
    type: 'nextfest',
    color: '#10B981', // emerald
  },
  {
    id: 'steam-winter-sale-2025',
    startDate: '2025-12-18',
    endDate: '2026-01-05',
    name: 'ウィンターセール',
    nameEn: 'Winter Sale',
    type: 'sale',
    color: '#3B82F6', // blue
  },

  // 2026年イベント
  {
    id: 'steam-detective-fest-2026',
    startDate: '2026-01-12',
    endDate: '2026-01-19',
    name: '探偵フェス',
    nameEn: 'Detective Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-board-game-fest-2026',
    startDate: '2026-01-26',
    endDate: '2026-02-02',
    name: 'ボードゲームフェス',
    nameEn: 'Board Game Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-typing-fest-2026',
    startDate: '2026-02-05',
    endDate: '2026-02-09',
    name: 'タイピングフェス',
    nameEn: 'Typing Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-pvp-fest-2026',
    startDate: '2026-02-09',
    endDate: '2026-02-16',
    name: 'PvPフェス',
    nameEn: 'PvP Fest',
    type: 'fest',
    color: '#EF4444', // red
  },
  {
    id: 'steam-horse-fest-2026',
    startDate: '2026-02-19',
    endDate: '2026-02-23',
    name: '馬フェス',
    nameEn: 'Horse Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-next-fest-feb-2026',
    startDate: '2026-02-23',
    endDate: '2026-03-02',
    name: 'Next Fest',
    nameEn: 'Next Fest',
    type: 'nextfest',
    color: '#10B981',
  },
  {
    id: 'steam-tower-defense-fest-2026',
    startDate: '2026-03-09',
    endDate: '2026-03-16',
    name: 'タワーディフェンスフェス',
    nameEn: 'Tower Defense Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-spring-sale-2026',
    startDate: '2026-03-19',
    endDate: '2026-03-26',
    name: 'スプリングセール',
    nameEn: 'Spring Sale',
    type: 'sale',
    color: '#EC4899', // pink
  },
  {
    id: 'steam-house-home-fest-2026',
    startDate: '2026-03-30',
    endDate: '2026-04-06',
    name: 'ハウス＆ホームフェス',
    nameEn: 'House & Home Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-hidden-object-fest-2026',
    startDate: '2026-04-09',
    endDate: '2026-04-13',
    name: '隠しオブジェクトフェス',
    nameEn: 'Hidden Object Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-medieval-fest-2026',
    startDate: '2026-04-20',
    endDate: '2026-04-27',
    name: '中世フェス',
    nameEn: 'Medieval Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-deckbuilders-fest-2026',
    startDate: '2026-05-04',
    endDate: '2026-05-11',
    name: 'デッキビルダーフェス',
    nameEn: 'Deckbuilders Fest',
    type: 'fest',
    color: '#7C3AED',
  },
  {
    id: 'steam-ocean-fest-2026',
    startDate: '2026-05-18',
    endDate: '2026-05-25',
    name: 'オーシャンフェス',
    nameEn: 'Ocean Fest',
    type: 'fest',
    color: '#06B6D4', // cyan
  },
  {
    id: 'steam-summer-sale-2026',
    startDate: '2026-06-25',
    endDate: '2026-07-09',
    name: 'サマーセール',
    nameEn: 'Summer Sale',
    type: 'sale',
    color: '#F59E0B',
  },
  {
    id: 'steam-autumn-sale-2026',
    startDate: '2026-09-28',
    endDate: '2026-10-05',
    name: 'オータムセール',
    nameEn: 'Autumn Sale',
    type: 'sale',
    color: '#F59E0B',
  },
];

// 指定日に開催中のイベントを取得
export function getEventsForDate(date: string): SteamEvent[] {
  return steamEvents.filter(event => {
    return date >= event.startDate && date <= event.endDate;
  });
}

// 指定月のイベントを取得
export function getEventsForMonth(year: number, month: number): SteamEvent[] {
  const monthStr = String(month + 1).padStart(2, '0');
  const startOfMonth = `${year}-${monthStr}-01`;
  const endOfMonth = `${year}-${monthStr}-31`;

  return steamEvents.filter(event => {
    // イベント期間が月と重なるかチェック
    return event.startDate <= endOfMonth && event.endDate >= startOfMonth;
  });
}

// イベントの開始日かどうか
export function isEventStartDate(date: string): SteamEvent | undefined {
  return steamEvents.find(event => event.startDate === date);
}
