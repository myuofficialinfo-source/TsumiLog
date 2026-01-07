import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ツミナビ | TsumiNavi - Steam積みゲー管理・分析ツール",
    template: "%s | ツミナビ",
  },
  description: "Steamの積みゲーを可視化・管理。あなたのゲームライブラリを分析して、ゲーマータイプを診断！積みゲーからおすすめを提案します。Steam backlog manager with analysis.",
  keywords: [
    "Steam", "積みゲー", "バックログ", "ゲーム管理", "Steam backlog",
    "backlog manager", "game library", "分析", "ゲーマー診断",
    "TsumiNavi", "ツミナビ", "Steam games", "unplayed games"
  ],
  authors: [{ name: "TsumiNavi" }],
  creator: "TsumiNavi",
  publisher: "TsumiNavi",
  metadataBase: new URL('https://tsumi-navi.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'ja': '/',
      'en': '/?lang=en',
    },
  },
  icons: {
    icon: '/icons/icom.ico',
    apple: '/icons/icom.png',
  },
  // Block indexing until launch - remove robots when ready
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "ツミナビ | TsumiNavi - Steam積みゲー管理・分析ツール",
    description: "Steamの積みゲーを可視化・管理。あなたのゲームライブラリを分析して、ゲーマータイプを診断！| Visualize and manage your Steam backlog with analysis.",
    url: 'https://tsumi-navi.vercel.app',
    siteName: 'ツミナビ | TsumiNavi',
    locale: 'ja_JP',
    alternateLocale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://tsumi-navi.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ツミナビ - Steam積みゲー管理 | TsumiNavi - Steam Backlog Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "ツミナビ | TsumiNavi - Steam積みゲー管理",
    description: "Steamの積みゲーを可視化・管理。あなたのゲーマータイプを診断！| Steam backlog analysis",
    images: ['https://tsumi-navi.vercel.app/og-image.png'],
    creator: '@tsuninavi',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
