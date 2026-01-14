'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Globe, Settings, ArrowLeft, LogOut, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AccountInfo {
  steamId: string;
  personaName: string;
  avatarUrl: string;
}

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  showBack?: boolean;
  backHref?: string;
  accountInfo?: AccountInfo;
}

export function Header({ showLogout, onLogout, showBack, backHref = '/', accountInfo }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showAccountPopup, setShowAccountPopup] = useState(false);

  return (
    <header className="border-b-3 border-[#3D3D3D] sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/icons/icom.png" alt={t('app.title')} width={48} height={48} />
          <div>
            <h1 className="text-2xl font-black gradient-text">
              {t('app.title')}
              <span className="text-sm font-medium text-gray-500 ml-1">
                {language === 'ja' ? '（β版）' : '(beta)'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">{t('app.subtitle')}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Globe className="w-4 h-4" />
            {language === 'ja' ? 'EN' : 'JA'}
          </button>
          {showBack && (
            <Link
              href={backHref}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'ja' ? '戻る' : 'Back'}</span>
            </Link>
          )}
          {showLogout && onLogout && (
            <div className="relative">
              <button
                onClick={() => setShowAccountPopup(!showAccountPopup)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'ja' ? 'アカウント' : 'Account'}</span>
              </button>

              {/* アカウントポップアップ */}
              {showAccountPopup && (
                <>
                  {/* オーバーレイ */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAccountPopup(false)}
                  />
                  {/* ポップアップ */}
                  <div
                    className="absolute right-0 top-full mt-2 w-72 rounded-xl border-3 border-[#3D3D3D] shadow-lg z-50 p-4"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">
                        {language === 'ja' ? 'アカウント情報' : 'Account Info'}
                      </h3>
                      <button
                        onClick={() => setShowAccountPopup(false)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {accountInfo ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={accountInfo.avatarUrl}
                            alt={accountInfo.personaName}
                            width={48}
                            height={48}
                            className="rounded-lg border-2 border-[#3D3D3D]"
                          />
                          <div>
                            <p className="font-bold">{accountInfo.personaName}</p>
                            <p className="text-xs text-gray-500">Steam ID: {accountInfo.steamId}</p>
                          </div>
                        </div>

                        <hr className="border-gray-300" />

                        <button
                          onClick={() => {
                            setShowAccountPopup(false);
                            onLogout();
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-red-400 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {language === 'ja' ? 'ログアウト' : 'Logout'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {language === 'ja' ? '情報を取得中...' : 'Loading...'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { language, t } = useLanguage();

  return (
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
  );
}
