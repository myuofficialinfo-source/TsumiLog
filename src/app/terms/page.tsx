'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsOfService() {
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
                  <li>バトル機能における不正行為（データ改ざん、チートツール使用等）</li>
                  <li>ランキング操作を目的とした行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. AIの利用について
                </h2>
                <p className="text-gray-600">
                  本サービスでは、以下の機能にGoogle Gemini APIを利用しています：
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>ゲーマータイプ診断・分析</li>
                  <li>積みゲーからのおすすめ提案</li>
                  <li>新作ゲームのレコメンド</li>
                </ul>
                <p className="text-gray-600 mt-2">
                  AIによる分析結果は参考情報であり、正確性を保証するものではありません。
                  なお、Gemini APIはモデルのトレーニングには利用されない設定で使用しています。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  6. バトル機能について
                </h2>
                <p className="text-gray-600 mb-2">
                  本サービスのバトル機能では、以下の点にご同意いただいたものとします：
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>あなたが作成したバトル用デッキは、他のユーザーとの対戦に使用されます</li>
                  <li>ランキングや対戦結果の正確性・公平性について保証しません</li>
                  <li>不正行為が確認された場合、予告なくデータ削除やアカウント制限を行う場合があります</li>
                  <li>バトルシステムのバランス調整により、過去の結果が変動する場合があります</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  7. 知的財産権
                </h2>
                <p className="text-gray-600">
                  Steam、およびSteamのロゴはValve Corporationの商標です。
                  ゲームのタイトル、画像等の権利は各権利者に帰属します。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  8. 規約の変更
                </h2>
                <p className="text-gray-600">
                  本規約は予告なく変更される場合があります。
                  変更後の規約は、本ページに掲載された時点で効力を生じます。
                </p>
              </section>

              <div className="pt-4 border-t-2 border-gray-200">
                <p className="text-sm text-gray-400">
                  最終更新日: 2026年1月
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
                  <li>Cheating in battle features (data manipulation, cheat tools, etc.)</li>
                  <li>Actions intended to manipulate rankings</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-purple)' }} />
                  5. Use of AI
                </h2>
                <p className="text-gray-600">
                  This service uses Google Gemini API for the following features:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-4">
                  <li>Gamer type diagnosis and analysis</li>
                  <li>Game recommendations from your backlog</li>
                  <li>New release recommendations</li>
                </ul>
                <p className="text-gray-600 mt-2">
                  AI analysis results are for reference only and accuracy is not guaranteed.
                  The Gemini API is configured not to be used for model training.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-yellow)' }} />
                  6. Battle Features
                </h2>
                <p className="text-gray-600 mb-2">
                  By using the battle features of this service, you agree to the following:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                  <li>Your battle deck will be used in battles against other users</li>
                  <li>We do not guarantee the accuracy or fairness of rankings or battle results</li>
                  <li>If cheating is detected, we may delete data or restrict accounts without notice</li>
                  <li>Past results may change due to battle system balance adjustments</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-green)' }} />
                  7. Intellectual Property
                </h2>
                <p className="text-gray-600">
                  Steam and the Steam logo are trademarks of Valve Corporation.
                  Rights to game titles, images, etc. belong to their respective owners.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pop-pink)' }} />
                  8. Changes to Terms
                </h2>
                <p className="text-gray-600">
                  These terms may be changed without notice.
                  Updated terms become effective upon posting on this page.
                </p>
              </section>

              <div className="pt-4 border-t-2 border-gray-200">
                <p className="text-sm text-gray-400">
                  Last updated: January 2026
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
