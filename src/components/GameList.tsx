'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SortAsc, SortDesc, Package, PlayCircle } from 'lucide-react';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  playtimeHours: number;
  isBacklog: boolean;
  headerImage: string;
}

interface GameListProps {
  games: Game[];
}

type SortKey = 'name' | 'playtime' | 'backlog';
type FilterType = 'all' | 'backlog' | 'played';

export default function GameList({ games }: GameListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('backlog');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSorted = games
    .filter((game) => {
      if (filter === 'backlog') return game.isBacklog;
      if (filter === 'played') return !game.isBacklog;
      return true;
    })
    .filter((game) =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'playtime') {
        comparison = a.playtime_forever - b.playtime_forever;
      } else if (sortKey === 'backlog') {
        comparison = (a.isBacklog ? 0 : 1) - (b.isBacklog ? 0 : 1);
      }
      return sortAsc ? comparison : -comparison;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="pop-card p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-xl font-black text-[#3D3D3D] flex items-center gap-2">
          <Package className="w-6 h-6" style={{ color: 'var(--pop-yellow)' }} />
          ゲームライブラリ
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* 検索 */}
          <input
            type="text"
            placeholder="ゲームを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border-2 border-[#3D3D3D] rounded-lg text-[#3D3D3D] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pop-blue)]"
            style={{ backgroundColor: 'var(--background-secondary)' }}
          />

          {/* フィルター */}
          <div className="flex rounded-lg overflow-hidden border-2 border-[#3D3D3D]">
            {(['all', 'backlog', 'played'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: filter === f
                    ? f === 'backlog' ? 'var(--pop-red)' : f === 'played' ? 'var(--pop-green)' : 'var(--pop-blue)'
                    : 'var(--card-bg)'
                }}
              >
                {f === 'all' ? '全て' : f === 'backlog' ? '積みゲー' : 'プレイ済み'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ソートボタン */}
      <div className="flex gap-2 mb-4">
        <SortButton
          active={sortKey === 'backlog'}
          asc={sortAsc}
          onClick={() => toggleSort('backlog')}
          color="var(--pop-red)"
        >
          積みゲー順
        </SortButton>
        <SortButton
          active={sortKey === 'playtime'}
          asc={sortAsc}
          onClick={() => toggleSort('playtime')}
          color="var(--pop-green)"
        >
          プレイ時間
        </SortButton>
        <SortButton
          active={sortKey === 'name'}
          asc={sortAsc}
          onClick={() => toggleSort('name')}
          color="var(--pop-blue)"
        >
          名前順
        </SortButton>
      </div>

      {/* 結果カウント */}
      <p className="text-sm text-gray-600 font-medium mb-4">
        {filteredAndSorted.length}件表示 / 全{games.length}件
      </p>

      {/* ゲームリスト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-2">
        {filteredAndSorted.map((game) => (
          <GameCard key={game.appid} game={game} />
        ))}
      </div>
    </div>
  );
}

function SortButton({
  children,
  active,
  asc,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 border-[#3D3D3D] ${
        active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
      style={{ backgroundColor: active ? color : 'var(--card-bg)' }}
    >
      {children}
      {active && (asc ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
    </button>
  );
}

function GameCard({ game }: { game: Game }) {
  const [imageError, setImageError] = useState(false);

  return (
    <a
      href={`https://store.steampowered.com/app/${game.appid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl hover:scale-[1.02] transition-all border-2 border-[#3D3D3D]"
      style={{ backgroundColor: 'var(--background-secondary)' }}
    >
      <div className="relative w-24 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--card-bg)' }}>
        {!imageError ? (
          <Image
            src={game.headerImage}
            alt={game.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[#3D3D3D] text-sm font-bold truncate group-hover:text-[var(--pop-blue)] transition-colors">
          {game.name}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {game.isBacklog ? (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--pop-red)' }}>
              <Package className="w-3 h-3" />
              積みゲー
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--pop-green)' }}>
              <PlayCircle className="w-3 h-3" />
              {game.playtimeHours}h
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function Gamepad2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <path d="M15 13h.01" />
      <path d="M18 11h.01" />
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}
