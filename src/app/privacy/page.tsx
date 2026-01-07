'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPolicy() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8"
        >
          <ArrowLeft size={20} />
          {language === 'ja' ? 'トップページに戻る' : 'Back to Home'}
        </Link>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/icons/icom.png" alt="TsumiNavi" width={40} height={40} />
            <h1 className="text-2xl font-bold">
              {language === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
            </h1>
          </div>

          {language === 'ja' ? (
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. 収集する情報</h2>
                <p>本サービスでは、以下の情報を取得します：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Steam ID（Steam認証を通じて取得）</li>
                  <li>Steamプロフィール情報（表示名、アバター）</li>
                  <li>ゲームライブラリ情報（所有ゲーム、プレイ時間）</li>
                  <li>ウィッシュリスト情報</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. 情報の利用目的</h2>
                <p>取得した情報は以下の目的で利用します：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>積みゲーの分析・可視化</li>
                  <li>ゲームのおすすめ機能の提供</li>
                  <li>共有機能でのOG画像生成</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. 情報の保存</h2>
                <p>
                  Steam IDはブラウザのローカルストレージに保存されます。
                  サーバー側でのユーザーデータの永続的な保存は行っておりません。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. 第三者への提供</h2>
                <p>
                  取得した情報は第三者に提供・販売することはありません。
                  ただし、Steam Web APIを通じてValve社のサービスを利用しています。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. アクセス解析</h2>
                <p>
                  本サービスではVercel Analyticsを使用してアクセス状況を分析しています。
                  これは匿名化されたデータの収集であり、個人を特定することはできません。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. お問い合わせ</h2>
                <p>
                  プライバシーに関するお問い合わせは、GitHubのIssueまたはX（旧Twitter）にてお受けしております。
                </p>
              </section>

              <p className="text-sm text-gray-400 mt-8">
                最終更新日: 2025年1月
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
                <p>This service collects the following information:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Steam ID (obtained through Steam authentication)</li>
                  <li>Steam profile information (display name, avatar)</li>
                  <li>Game library information (owned games, playtime)</li>
                  <li>Wishlist information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Information</h2>
                <p>We use the collected information for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Analyzing and visualizing your backlog</li>
                  <li>Providing game recommendations</li>
                  <li>Generating OG images for the share feature</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage</h2>
                <p>
                  Your Steam ID is stored in your browser&apos;s local storage.
                  We do not permanently store user data on our servers.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Sharing</h2>
                <p>
                  We do not sell or share your information with third parties.
                  However, we use Valve&apos;s services through the Steam Web API.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. Analytics</h2>
                <p>
                  This service uses Vercel Analytics to analyze traffic.
                  This involves anonymized data collection and cannot identify individuals.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. Contact</h2>
                <p>
                  For privacy-related inquiries, please reach out via GitHub Issues or X (formerly Twitter).
                </p>
              </section>

              <p className="text-sm text-gray-400 mt-8">
                Last updated: January 2025
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
