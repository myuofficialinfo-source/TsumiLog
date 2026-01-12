// 日本の祝日データ（2025-2026）
// 振替休日も含む

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  nameEn: string;
}

// 2025年の祝日
const holidays2025: Holiday[] = [
  { date: '2025-01-01', name: '元日', nameEn: "New Year's Day" },
  { date: '2025-01-13', name: '成人の日', nameEn: 'Coming of Age Day' },
  { date: '2025-02-11', name: '建国記念の日', nameEn: 'National Foundation Day' },
  { date: '2025-02-23', name: '天皇誕生日', nameEn: "Emperor's Birthday" },
  { date: '2025-02-24', name: '振替休日', nameEn: 'Substitute Holiday' },
  { date: '2025-03-20', name: '春分の日', nameEn: 'Vernal Equinox Day' },
  { date: '2025-04-29', name: '昭和の日', nameEn: 'Showa Day' },
  { date: '2025-05-03', name: '憲法記念日', nameEn: 'Constitution Day' },
  { date: '2025-05-04', name: 'みどりの日', nameEn: 'Greenery Day' },
  { date: '2025-05-05', name: 'こどもの日', nameEn: "Children's Day" },
  { date: '2025-05-06', name: '振替休日', nameEn: 'Substitute Holiday' },
  { date: '2025-07-21', name: '海の日', nameEn: 'Marine Day' },
  { date: '2025-08-11', name: '山の日', nameEn: 'Mountain Day' },
  { date: '2025-09-15', name: '敬老の日', nameEn: 'Respect for the Aged Day' },
  { date: '2025-09-23', name: '秋分の日', nameEn: 'Autumnal Equinox Day' },
  { date: '2025-10-13', name: 'スポーツの日', nameEn: 'Sports Day' },
  { date: '2025-11-03', name: '文化の日', nameEn: 'Culture Day' },
  { date: '2025-11-23', name: '勤労感謝の日', nameEn: 'Labor Thanksgiving Day' },
  { date: '2025-11-24', name: '振替休日', nameEn: 'Substitute Holiday' },
];

// 2026年の祝日
const holidays2026: Holiday[] = [
  { date: '2026-01-01', name: '元日', nameEn: "New Year's Day" },
  { date: '2026-01-12', name: '成人の日', nameEn: 'Coming of Age Day' },
  { date: '2026-02-11', name: '建国記念の日', nameEn: 'National Foundation Day' },
  { date: '2026-02-23', name: '天皇誕生日', nameEn: "Emperor's Birthday" },
  { date: '2026-03-20', name: '春分の日', nameEn: 'Vernal Equinox Day' },
  { date: '2026-04-29', name: '昭和の日', nameEn: 'Showa Day' },
  { date: '2026-05-03', name: '憲法記念日', nameEn: 'Constitution Day' },
  { date: '2026-05-04', name: 'みどりの日', nameEn: 'Greenery Day' },
  { date: '2026-05-05', name: 'こどもの日', nameEn: "Children's Day" },
  { date: '2026-05-06', name: '振替休日', nameEn: 'Substitute Holiday' },
  { date: '2026-07-20', name: '海の日', nameEn: 'Marine Day' },
  { date: '2026-08-11', name: '山の日', nameEn: 'Mountain Day' },
  { date: '2026-09-21', name: '敬老の日', nameEn: 'Respect for the Aged Day' },
  { date: '2026-09-22', name: '国民の休日', nameEn: 'Citizens Holiday' },
  { date: '2026-09-23', name: '秋分の日', nameEn: 'Autumnal Equinox Day' },
  { date: '2026-10-12', name: 'スポーツの日', nameEn: 'Sports Day' },
  { date: '2026-11-03', name: '文化の日', nameEn: 'Culture Day' },
  { date: '2026-11-23', name: '勤労感謝の日', nameEn: 'Labor Thanksgiving Day' },
];

export const holidays: Holiday[] = [...holidays2025, ...holidays2026];

export function getHoliday(date: string): Holiday | undefined {
  return holidays.find(h => h.date === date);
}

export function isHoliday(date: string): boolean {
  return holidays.some(h => h.date === date);
}
