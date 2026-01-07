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
  title: "ツミナビ | Tsumi-Navi - Steam積みゲー管理",
  description: "Steamの積みゲーを可視化・管理。AIがあなたのゲームライブラリを分析しておすすめを提案します。",
  metadataBase: new URL('https://tsumi-navi.vercel.app'),
  icons: {
    icon: '/icons/icom.ico',
    apple: '/icons/icom.png',
  },
  openGraph: {
    title: "ツミナビ | Tsumi-Navi - Steam積みゲー管理",
    description: "Steamの積みゲーを可視化・管理。AIがあなたのゲームライブラリを分析して、あなたのゲーマータイプを診断！",
    url: 'https://tsumi-navi.vercel.app',
    siteName: 'ツミナビ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ツミナビ - Steam積みゲー管理',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "ツミナビ | Tsumi-Navi - Steam積みゲー管理",
    description: "Steamの積みゲーを可視化・管理。AIがあなたのゲーマータイプを診断！",
    images: ['/og-image.png'],
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
