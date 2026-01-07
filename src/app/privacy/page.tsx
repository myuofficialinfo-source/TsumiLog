'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPolicy() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/icons/icom.png" alt={t('app.title')} width={48} height={48} />
            <div>
              <h1 className="text-2xl font-black gradient-text">{t('app.title')}<span className="text-sm font-medium text-gray-500 ml-1">{language === 'ja' ? '（β版）' : '(beta)'}</span></h1>
              <p className="text-xs text-gray-500 font-medium">{t('app.subtitle')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* 言語切り替えボタン */}
            <button
              onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'ja' ? 'EN' : 'JA'}
            </button>
          </div>
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
            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
            <h1 className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>
              {language === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
            </h1>
          </div>

          {language === 'ja' ? (
            <div className="space-y-6" style={{ color: 'var(--foreground)' }}>
              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-red)' }} />
                  1. 収集する情報
                </h2>
                <p className="text-gray-600">本サービスでは、以下の情報を取得します：</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>Steam ID（Steam認証を通じて取得）</li>
                  <li>Steamプロフィール情報（表示名、アバター）</li>
                  <li>ゲームライブラリ情報（所有ゲーム、プレイ時間）</li>
                  <li>ウィッシュリスト情報</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  2. 情報の利用目的
                </h2>
                <p className="text-gray-600">取得した情報は以下の目的で利用します：</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>積みゲーの分析・可視化</li>
                  <li>ゲームのおすすめ機能の提供</li>
                  <li>共有機能でのOG画像生成</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  3. 情報の保存
                </h2>
                <p className="text-gray-600">
                  Steam IDはブラウザのローカルストレージに保存されます。
                  サーバー側でのユーザーデータの永続的な保存は行っておりません。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
                  4. 第三者への提供
                </h2>
                <p className="text-gray-600">
                  取得した情報は第三者に提供・販売することはありません。
                  ただし、Steam Web APIを通じてValve社のサービスを利用しています。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. アクセス解析
                </h2>
                <p className="text-gray-600">
                  本サービスではVercel Analyticsを使用してアクセス状況を分析しています。
                  これは匿名化されたデータの収集であり、個人を特定することはできません。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  6. お問い合わせ
                </h2>
                <p className="text-gray-600">
                  プライバシーに関するお問い合わせは、
                  <a
                    href="https://x.com/myu060309"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold hover:underline"
                    style={{ color: 'var(--pop-blue)' }}
                  >
                    X（旧Twitter）
                  </a>
                  にてお受けしております。
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
                  1. Information We Collect
                </h2>
                <p className="text-gray-600">This service collects the following information:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>Steam ID (obtained through Steam authentication)</li>
                  <li>Steam profile information (display name, avatar)</li>
                  <li>Game library information (owned games, playtime)</li>
                  <li>Wishlist information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  2. How We Use Information
                </h2>
                <p className="text-gray-600">We use the collected information for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>Analyzing and visualizing your backlog</li>
                  <li>Providing game recommendations</li>
                  <li>Generating OG images for the share feature</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  3. Data Storage
                </h2>
                <p className="text-gray-600">
                  Your Steam ID is stored in your browser&apos;s local storage.
                  We do not permanently store user data on our servers.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-blue)' }} />
                  4. Third-Party Sharing
                </h2>
                <p className="text-gray-600">
                  We do not sell or share your information with third parties.
                  However, we use Valve&apos;s services through the Steam Web API.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. Analytics
                </h2>
                <p className="text-gray-600">
                  This service uses Vercel Analytics to analyze traffic.
                  This involves anonymized data collection and cannot identify individuals.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  6. Contact
                </h2>
                <p className="text-gray-600">
                  For privacy-related inquiries, please reach out via{' '}
                  <a
                    href="https://x.com/myu060309"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold hover:underline"
                    style={{ color: 'var(--pop-blue)' }}
                  >
                    X (formerly Twitter)
                  </a>
                  .
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
            <Image src="/icons/icom.png" alt={t('app.title')} width={40} height={40} />
          </div>
          <p className="font-bold text-gray-600">{t('app.title')} - {t('app.subtitle')}</p>
          <p className="text-sm text-gray-500 mt-2">
            A personal project | Powered by Steam
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">
              {language === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">
              {language === 'ja' ? '利用規約' : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
