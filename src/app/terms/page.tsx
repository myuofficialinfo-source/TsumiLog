'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsOfService() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/icons/icom.png" alt="TsumiNavi" width={48} height={48} />
            <div>
              <h1 className="text-2xl font-black gradient-text">
                {language === 'ja' ? 'ツミナビ' : 'TsumiNavi'}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {language === 'ja' ? 'Steam積みゲー管理' : 'Steam Backlog Manager'}
              </p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-3xl mx-auto px-4 py-8 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold mb-6 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--pop-blue)' }}
        >
          <ArrowLeft size={20} />
          {language === 'ja' ? 'トップページに戻る' : 'Back to Home'}
        </Link>

        <div className="pop-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
            <h1 className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>
              {language === 'ja' ? '利用規約' : 'Terms of Service'}
            </h1>
          </div>

          {language === 'ja' ? (
            <div className="space-y-6" style={{ color: 'var(--foreground)' }}>
              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-red)' }} />
                  1. サービスについて
                </h2>
                <p className="text-gray-600">
                  ツミナビ（以下「本サービス」）は、Steamのゲームライブラリを分析・可視化する
                  個人開発のWebサービスです。本サービスはValve Corporationとは無関係です。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  2. 利用条件
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>本サービスは無料でご利用いただけます</li>
                  <li>Steamアカウントのプロフィール設定が公開である必要があります</li>
                  <li>Steam Web APIの利用規約に準拠してご利用ください</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  3. 免責事項
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>本サービスは「現状のまま」提供されます</li>
                  <li>データの正確性、完全性、信頼性について保証しません</li>
                  <li>本サービスの利用により生じた損害について責任を負いません</li>
                  <li>予告なくサービス内容の変更や停止を行う場合があります</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
                  4. 禁止事項
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>本サービスへの不正アクセス</li>
                  <li>サービスの運営を妨害する行為</li>
                  <li>他のユーザーになりすます行為</li>
                  <li>APIの過度な利用やスクレイピング</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. 知的財産権
                </h2>
                <p className="text-gray-600">
                  Steam、およびSteamのロゴはValve Corporationの商標です。
                  ゲームのタイトル、画像等の権利は各権利者に帰属します。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  6. 規約の変更
                </h2>
                <p className="text-gray-600">
                  本規約は予告なく変更される場合があります。
                  変更後の規約は、本ページに掲載された時点で効力を生じます。
                </p>
              </section>

              <div className="pt-4 border-t-2 border-gray-200">
                <p className="text-sm text-gray-400">
                  最終更新日: 2025年1月
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6" style={{ color: 'var(--foreground)' }}>
              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-red)' }} />
                  1. About the Service
                </h2>
                <p className="text-gray-600">
                  TsumiNavi (hereinafter &quot;the Service&quot;) is a personal web service that analyzes
                  and visualizes your Steam game library. This service is not affiliated with Valve Corporation.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  2. Terms of Use
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>This service is free to use</li>
                  <li>Your Steam profile must be set to public</li>
                  <li>Please comply with Steam Web API terms of service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  3. Disclaimer
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>This service is provided &quot;as is&quot;</li>
                  <li>We do not guarantee accuracy, completeness, or reliability of data</li>
                  <li>We are not liable for any damages arising from use of this service</li>
                  <li>Service content may be changed or discontinued without notice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
                  4. Prohibited Actions
                </h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>Unauthorized access to the service</li>
                  <li>Actions that interfere with service operation</li>
                  <li>Impersonating other users</li>
                  <li>Excessive API usage or scraping</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. Intellectual Property
                </h2>
                <p className="text-gray-600">
                  Steam and the Steam logo are trademarks of Valve Corporation.
                  Rights to game titles, images, etc. belong to their respective owners.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  6. Changes to Terms
                </h2>
                <p className="text-gray-600">
                  These terms may be changed without notice.
                  Updated terms become effective upon posting on this page.
                </p>
              </section>

              <div className="pt-4 border-t-2 border-gray-200">
                <p className="text-sm text-gray-400">
                  Last updated: January 2025
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 装飾 */}
        <div className="mt-8 flex justify-center gap-4">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-red)' }} />
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t-3 border-[#3D3D3D] py-8 mt-auto" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/icons/icom.png" alt="TsumiNavi" width={40} height={40} />
          </div>
          <p className="font-bold text-gray-600">
            {language === 'ja' ? 'ツミナビ - Steam積みゲー管理' : 'TsumiNavi - Steam Backlog Manager'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            A personal project | Powered by Steam
          </p>
        </div>
      </footer>
    </div>
  );
}
