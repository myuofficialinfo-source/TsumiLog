import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
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
  title: "ツミログ | TsumiLog - Steam積みゲー管理",
  description: "Steamの積みゲーを可視化・管理。AIがあなたのゲームライブラリを分析しておすすめを提案します。",
  metadataBase: new URL('https://tsumi-log.vercel.app'),
  icons: {
    icon: '/icons/icom.ico',
    apple: '/icons/icom.png',
  },
  openGraph: {
    title: "ツミログ | TsumiLog - Steam積みゲー管理",
    description: "Steamの積みゲーを可視化・管理。AIがあなたのゲームライブラリを分析して、あなたのゲーマータイプを診断！",
    url: 'https://tsumi-log.vercel.app',
    siteName: 'ツミログ',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ツミログ | TsumiLog - Steam積みゲー管理",
    description: "Steamの積みゲーを可視化・管理。AIがあなたのゲーマータイプを診断！",
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
