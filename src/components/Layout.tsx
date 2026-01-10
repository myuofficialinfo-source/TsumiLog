'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Globe, LogOut, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  showBack?: boolean;
  backHref?: string;
}

export function Header({ showLogout, onLogout, showBack, backHref = '/' }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();

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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'ja' ? '戻る' : 'Back'}
            </Link>
          )}
          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <LogOut className="w-4 h-4" />
              {language === 'ja' ? 'ログアウト' : 'Logout'}
            </button>
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
