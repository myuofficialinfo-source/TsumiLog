'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsOfService() {
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
              {language === 'ja' ? '利用規約' : 'Terms of Service'}
            </h1>
          </div>

          {language === 'ja' ? (
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. サービスについて</h2>
                <p>
                  ツミナビ（以下「本サービス」）は、Steamのゲームライブラリを分析・可視化する
                  個人開発のWebサービスです。本サービスはValve Corporationとは無関係です。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. 利用条件</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>本サービスは無料でご利用いただけます</li>
                  <li>Steamアカウントのプロフィール設定が公開である必要があります</li>
                  <li>Steam Web APIの利用規約に準拠してご利用ください</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. 免責事項</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>本サービスは「現状のまま」提供されます</li>
                  <li>データの正確性、完全性、信頼性について保証しません</li>
                  <li>本サービスの利用により生じた損害について責任を負いません</li>
                  <li>予告なくサービス内容の変更や停止を行う場合があります</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. 禁止事項</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>本サービスへの不正アクセス</li>
                  <li>サービスの運営を妨害する行為</li>
                  <li>他のユーザーになりすます行為</li>
                  <li>APIの過度な利用やスクレイピング</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. 知的財産権</h2>
                <p>
                  Steam、およびSteamのロゴはValve Corporationの商標です。
                  ゲームのタイトル、画像等の権利は各権利者に帰属します。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. 規約の変更</h2>
                <p>
                  本規約は予告なく変更される場合があります。
                  変更後の規約は、本ページに掲載された時点で効力を生じます。
                </p>
              </section>

              <p className="text-sm text-gray-400 mt-8">
                最終更新日: 2025年1月
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. About the Service</h2>
                <p>
                  TsumiNavi (hereinafter &quot;the Service&quot;) is a personal web service that analyzes
                  and visualizes your Steam game library. This service is not affiliated with Valve Corporation.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. Terms of Use</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>This service is free to use</li>
                  <li>Your Steam profile must be set to public</li>
                  <li>Please comply with Steam Web API terms of service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. Disclaimer</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>This service is provided &quot;as is&quot;</li>
                  <li>We do not guarantee accuracy, completeness, or reliability of data</li>
                  <li>We are not liable for any damages arising from use of this service</li>
                  <li>Service content may be changed or discontinued without notice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. Prohibited Actions</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Unauthorized access to the service</li>
                  <li>Actions that interfere with service operation</li>
                  <li>Impersonating other users</li>
                  <li>Excessive API usage or scraping</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. Intellectual Property</h2>
                <p>
                  Steam and the Steam logo are trademarks of Valve Corporation.
                  Rights to game titles, images, etc. belong to their respective owners.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. Changes to Terms</h2>
                <p>
                  These terms may be changed without notice.
                  Updated terms become effective upon posting on this page.
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
