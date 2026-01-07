'use client';

import Image from 'next/image';
import { Gamepad2, Clock, Package, PlayCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileCardProps {
  profile: {
    personaName: string;
    avatarUrl: string;
    profileUrl: string;
  };
  stats: {
    totalGames: number;
    backlogCount: number;
    totalPlaytimeHours: number;
    playedGames: number;
  };
}

export default function ProfileCard({ profile, stats }: ProfileCardProps) {
  const { language, t } = useLanguage();
  const backlogPercentage = Math.round((stats.backlogCount / stats.totalGames) * 100);

  // プレイ時間を日と時間に変換
  const formatPlaytime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (language === 'ja') {
      if (days > 0) {
        return remainingHours > 0 ? `${days}${t('time.days')}${remainingHours}${t('time.hours')}` : `${days}${t('time.days')}`;
      }
      return `${hours}${t('time.hours')}`;
    } else {
      if (days > 0) {
        return remainingHours > 0 ? `${days}${t('time.days')} ${remainingHours}${t('time.hours')}` : `${days}${t('time.days')}`;
      }
      return `${hours}${t('time.hours')}`;
    }
  };

  return (
    <div className="pop-card p-6">
      <div className="flex items-center gap-4 mb-6">
        <Image
          src={profile.avatarUrl}
          alt={profile.personaName}
          width={80}
          height={80}
          className="rounded-xl border-3 border-[#3D3D3D]"
        />
        <div>
          <h2 className="text-2xl font-black text-[#3D3D3D]">{profile.personaName}</h2>
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline text-sm"
            style={{ color: 'var(--pop-blue)' }}
          >
            {language === 'ja' ? 'Steamプロフィールを見る' : 'View Steam Profile'}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Gamepad2 className="w-5 h-5" style={{ color: 'var(--pop-blue)' }} />}
          label={t('profile.totalGames')}
          value={stats.totalGames.toLocaleString()}
          color="var(--pop-blue)"
        />
        <StatCard
          icon={<Package className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />}
          label={t('profile.backlog')}
          value={stats.backlogCount.toLocaleString()}
          subtext={`${backlogPercentage}%`}
          color="var(--pop-red)"
        />
        <StatCard
          icon={<PlayCircle className="w-5 h-5" style={{ color: 'var(--pop-green)' }} />}
          label={language === 'ja' ? 'プレイ済み' : 'Played'}
          value={stats.playedGames.toLocaleString()}
          color="var(--pop-green)"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" style={{ color: 'var(--pop-purple)' }} />}
          label={t('profile.playtime')}
          value={formatPlaytime(stats.totalPlaytimeHours)}
          color="var(--pop-purple)"
        />
      </div>

      {/* 積みゲー度プログレスバー */}
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">{t('profile.backlogRate')}</span>
          <span className="font-black" style={{ color: 'var(--pop-red)' }}>{backlogPercentage}%</span>
        </div>
        <div className="h-4 bg-[#E8D5B7] rounded-full overflow-hidden border-2 border-[#3D3D3D]">
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${backlogPercentage}%`,
              background: 'linear-gradient(90deg, var(--pop-yellow), var(--pop-red))'
            }}
          />
        </div>
      </div>

      {/* Steam API制限の注意書き */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        {t('profile.notice')}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 border-2 border-[#3D3D3D]"
      style={{ backgroundColor: 'var(--background-secondary)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black" style={{ color }}>{value}</span>
        {subtext && <span className="text-sm text-gray-500 font-medium">{subtext}</span>}
      </div>
    </div>
  );
}
