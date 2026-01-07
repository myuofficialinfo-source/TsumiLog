'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ja: {
    // ヘッダー
    'app.title': 'ツミナビ',
    'app.subtitle': 'Tsumi-Navi',
    'header.logout': 'ログアウト',

    // ログイン画面
    'login.title': '積みゲーを可視化しよう！',
    'login.description': 'Steamアカウントと連携して、あなたのゲームライブラリを分析。',
    'login.backlog': '積みゲー',
    'login.recommend': 'おすすめ',
    'login.toRecommend': 'をレコメンド！',
    'login.button': 'Steamでログイン',
    'login.notice': 'ご注意：',
    'login.noticeText': 'ゲームデータを取得するには、Steamのプロフィール設定で',
    'login.noticePublic': '「ゲームの詳細」を公開',
    'login.noticeEnd': 'に設定してください。',
    'login.privacyLink': 'Steam プライバシー設定を開く',
    'login.authError': 'Steam認証に失敗しました。もう一度お試しください。',
    'login.loading': 'ゲームデータを取得中...',

    // プロフィールカード
    'profile.totalGames': '所持ゲーム',
    'profile.backlog': '積みゲー',
    'profile.playtime': 'プレイ時間',
    'profile.backlogRate': '積みゲー率',
    'profile.notice': '※Steamの公開設定によっては一部のゲームが取得できない場合があります',

    // AI分析
    'ai.title': '分析',
    'ai.recommend': 'おすすめ',
    'ai.analyze': '傾向分析',
    'ai.newReleases': '新作紹介',
    'ai.noBacklog.title': '積みゲーゼロ！素晴らしい！',
    'ai.noBacklog.description': 'あなたは購入したゲームをしっかりプレイする',
    'ai.noBacklog.type': '計画的なゲーマー',
    'ai.noBacklog.note': '積みゲーがないので、おすすめの提案はありません。\nこの調子でゲームライフを楽しんでください！',
    'ai.newReleases.description': '直近3ヶ月でリリースされたゲームの中からあなたにおすすめのゲームを紹介します',
    'ai.newReleases.button': '新作を探す',
    'ai.newReleases.searching': '検索中...',
    'ai.newReleases.refresh': '再検索',
    'ai.newReleases.note': '※クリックでSteamストアページを開きます',
    'ai.recommend.description': 'あなたの積みゲーと好みを分析し、おすすめを提案します',
    'ai.analyze.description': 'あなたのゲーマーとしての傾向を分析します',
    'ai.generate': 'おすすめを生成',
    'ai.analyzeButton': '傾向を分析',
    'ai.analyzing': '分析中...',
    'ai.regenerate': '再生成',
    'ai.waiting': 'ゲーム詳細の読み込みを待っています...',
    'ai.gamerType': 'あなたのゲーマータイプ',
    'ai.shareToX': 'Xでシェアする',

    // ゲームリスト
    'gameList.title': 'ゲームライブラリ',
    'gameList.all': 'すべて',
    'gameList.backlog': '積みゲー',
    'gameList.played': 'プレイ済み',
    'gameList.sort.playtime': 'プレイ時間順',
    'gameList.sort.name': '名前順',
    'gameList.hours': '時間',
    'gameList.notPlayed': '未プレイ',

    // ジャンルチャート
    'genre.title': 'ジャンル分布',
    'genre.games': '本',

    // シェア
    'share.title': '【ツミナビ診断結果】',
    'share.type': '私のゲーマータイプは...',
    'share.games': '所持ゲーム',
    'share.backlog': '積みゲー',
    'share.playtime': '総プレイ時間',
    'share.cta': 'あなたの積みゲーも診断してみよう！',

    // 時間表示
    'time.days': '日',
    'time.hours': '時間',
  },
  en: {
    // Header
    'app.title': 'TsumiNavi',
    'app.subtitle': 'Backlog Navigator',
    'header.logout': 'Logout',

    // Login screen
    'login.title': 'Visualize Your Backlog!',
    'login.description': 'Connect your Steam account to analyze your game library.',
    'login.backlog': 'backlog',
    'login.recommend': 'recommendations',
    'login.toRecommend': '!',
    'login.button': 'Login with Steam',
    'login.notice': 'Note:',
    'login.noticeText': 'To fetch game data, please set',
    'login.noticePublic': '"Game details" to public',
    'login.noticeEnd': ' in your Steam privacy settings.',
    'login.privacyLink': 'Open Steam Privacy Settings',
    'login.authError': 'Steam authentication failed. Please try again.',
    'login.loading': 'Fetching game data...',

    // Profile card
    'profile.totalGames': 'Total Games',
    'profile.backlog': 'Backlog',
    'profile.playtime': 'Playtime',
    'profile.backlogRate': 'Backlog Rate',
    'profile.notice': '*Some games may not be retrieved depending on Steam privacy settings',

    // AI Analysis
    'ai.title': 'Analysis',
    'ai.recommend': 'Recommend',
    'ai.analyze': 'Analyze',
    'ai.newReleases': 'New Releases',
    'ai.noBacklog.title': 'Zero Backlog! Amazing!',
    'ai.noBacklog.description': 'You actually play the games you buy.',
    'ai.noBacklog.type': 'Disciplined Gamer',
    'ai.noBacklog.note': 'No backlog means no recommendations needed.\nKeep enjoying your games!',
    'ai.newReleases.description': 'Discover games released in the last 3 months that match your preferences',
    'ai.newReleases.button': 'Find New Games',
    'ai.newReleases.searching': 'Searching...',
    'ai.newReleases.refresh': 'Refresh',
    'ai.newReleases.note': '*Click to open Steam store page',
    'ai.recommend.description': 'Analyze your backlog and preferences to suggest what to play next',
    'ai.analyze.description': 'Analyze your gaming tendencies',
    'ai.generate': 'Generate Recommendations',
    'ai.analyzeButton': 'Analyze Tendencies',
    'ai.analyzing': 'Analyzing...',
    'ai.regenerate': 'Regenerate',
    'ai.waiting': 'Waiting for game details to load...',
    'ai.gamerType': 'Your Gamer Type',
    'ai.shareToX': 'Share on X',

    // Game list
    'gameList.title': 'Game Library',
    'gameList.all': 'All',
    'gameList.backlog': 'Backlog',
    'gameList.played': 'Played',
    'gameList.sort.playtime': 'By Playtime',
    'gameList.sort.name': 'By Name',
    'gameList.hours': 'hrs',
    'gameList.notPlayed': 'Not Played',

    // Genre chart
    'genre.title': 'Genre Distribution',
    'genre.games': 'games',

    // Share
    'share.title': '【TsumiNavi Results】',
    'share.type': 'My gamer type is...',
    'share.games': 'Total Games',
    'share.backlog': 'Backlog',
    'share.playtime': 'Total Playtime',
    'share.cta': 'Check your backlog too!',

    // Time display
    'time.days': 'd',
    'time.hours': 'h',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ja');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'ja' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
