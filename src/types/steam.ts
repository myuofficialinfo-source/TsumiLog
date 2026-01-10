export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // 分単位
  playtime_2weeks?: number;
  img_icon_url?: string;
  img_logo_url?: string;
}

export interface SteamGameDetails {
  appid: number;
  name: string;
  description: string;
  genres: { id: string; description: string }[];
  categories: { id: number; description: string }[];
  tags?: string[];
  header_image: string;
  release_date: { coming_soon: boolean; date: string };
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  // レビュー情報（レアリティ判定用）
  recommendations?: {
    total: number;  // 総レビュー数
  };
  metacritic?: {
    score: number;
  };
  // 高評価率（HP計算用）
  positiveRate?: number;  // 0-100のパーセンテージ
  // ユーザータグ（SteamSpyから取得）
  userTags?: string[];
}

export interface BacklogGame extends SteamGame {
  details?: SteamGameDetails;
  addedAt: string;
  status: 'backlog' | 'playing' | 'completed' | 'dropped';
}

export interface WishlistGame {
  appid: number;
  name: string;
  priority: number;
  added: number;
}

export interface UserProfile {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface GenreStats {
  genre: string;
  count: number;
  totalPlaytime: number;
}

export interface TagStats {
  tag: string;
  count: number;
}
