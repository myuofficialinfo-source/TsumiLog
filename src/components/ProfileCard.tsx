'use client';

import Image from 'next/image';
import { Gamepad2, Clock, Package, PlayCircle } from 'lucide-react';

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
  const backlogPercentage = Math.round((stats.backlogCount / stats.totalGames) * 100);

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center gap-4 mb-6">
        <Image
          src={profile.avatarUrl}
          alt={profile.personaName}
          width={80}
          height={80}
          className="rounded-xl"
        />
        <div>
          <h2 className="text-2xl font-bold text-white">{profile.personaName}</h2>
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline text-sm"
          >
            Steamプロフィールを見る
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Gamepad2 className="w-5 h-5 text-blue-400" />}
          label="総ゲーム数"
          value={stats.totalGames.toLocaleString()}
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-orange-400" />}
          label="積みゲー"
          value={stats.backlogCount.toLocaleString()}
          subtext={`${backlogPercentage}%`}
        />
        <StatCard
          icon={<PlayCircle className="w-5 h-5 text-green-400" />}
          label="プレイ済み"
          value={stats.playedGames.toLocaleString()}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-purple-400" />}
          label="総プレイ時間"
          value={`${stats.totalPlaytimeHours.toLocaleString()}h`}
        />
      </div>

      {/* 積みゲー度プログレスバー */}
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">積みゲー度</span>
          <span className="text-orange-400 font-bold">{backlogPercentage}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
            style={{ width: `${backlogPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {subtext && <span className="text-sm text-gray-500">{subtext}</span>}
      </div>
    </div>
  );
}
