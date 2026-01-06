'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, PieChartIcon } from 'lucide-react';
import { useState } from 'react';

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  isBacklog: boolean;
}

interface GenreChartProps {
  games: Game[];
  gameDetails: Map<number, { genres: { description: string }[] }>;
}

const COLORS = [
  '#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#9B5DE5',
  '#F15BB5', '#00BBF9', '#84CC16', '#F97316', '#6366F1',
];

export default function GenreChart({ games, gameDetails }: GenreChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const genreStats = useMemo(() => {
    const stats = new Map<string, { count: number; playtime: number; backlog: number }>();

    games.forEach((game) => {
      const details = gameDetails.get(game.appid);
      if (!details?.genres) return;

      details.genres.forEach((genre) => {
        const current = stats.get(genre.description) || { count: 0, playtime: 0, backlog: 0 };
        stats.set(genre.description, {
          count: current.count + 1,
          playtime: current.playtime + game.playtime_forever,
          backlog: current.backlog + (game.isBacklog ? 1 : 0),
        });
      });
    });

    return Array.from(stats.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        playtime: Math.round(data.playtime / 60),
        backlog: data.backlog,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [games, gameDetails]);

  if (genreStats.length === 0) {
    return (
      <div className="pop-card p-6">
        <h3 className="text-xl font-black text-[#3D3D3D] mb-4">ジャンル分析</h3>
        <p className="text-gray-600">ゲーム詳細を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="pop-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-[#3D3D3D] flex items-center gap-2">
          <BarChart3 className="w-6 h-6" style={{ color: 'var(--pop-blue)' }} />
          ジャンル分析
        </h3>
        <div className="flex rounded-lg overflow-hidden border-2 border-[#3D3D3D]">
          <button
            onClick={() => setChartType('pie')}
            className={`p-2 transition-colors ${
              chartType === 'pie' ? 'text-white' : 'hover:bg-gray-100'
            }`}
            style={{ backgroundColor: chartType === 'pie' ? 'var(--pop-blue)' : 'var(--card-bg)' }}
          >
            <PieChartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 transition-colors ${
              chartType === 'bar' ? 'text-white' : 'hover:bg-gray-100'
            }`}
            style={{ backgroundColor: chartType === 'bar' ? 'var(--pop-blue)' : 'var(--card-bg)' }}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* チャート */}
        <div className="h-64 md:h-80 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={genreStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {genreStats.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#3D3D3D"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '2px solid #3D3D3D',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => [
                    `${value ?? 0}本`,
                    name === 'count' ? 'ゲーム数' : String(name),
                  ]}
                />
              </PieChart>
            ) : (
              <BarChart data={genreStats} layout="vertical">
                <XAxis type="number" stroke="#3D3D3D" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#3D3D3D"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '2px solid #3D3D3D',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="ゲーム数" fill="#457B9D" radius={4} />
                <Bar dataKey="backlog" name="積みゲー" fill="#E63946" radius={4} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ジャンル一覧（縦並び） */}
        <div className="flex flex-col gap-2 md:w-48">
          {genreStats.slice(0, 10).map((genre, index) => (
            <div
              key={genre.name}
              className="flex items-center gap-3 p-2 rounded-lg border-2 border-[#3D3D3D]"
              style={{ backgroundColor: 'var(--background-secondary)' }}
            >
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0 border border-[#3D3D3D]"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#3D3D3D]">{genre.name}</p>
              </div>
              <p className="text-sm font-medium text-gray-600 flex-shrink-0">{genre.count}本</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
