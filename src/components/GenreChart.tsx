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
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
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
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">ジャンル分析</h3>
        <p className="text-gray-400">ゲーム詳細を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          ジャンル分析
        </h3>
        <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setChartType('pie')}
            className={`p-2 transition-colors ${
              chartType === 'pie' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <PieChartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 transition-colors ${
              chartType === 'bar' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={genreStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) =>
                  `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: '#6B7280' }}
              >
                {genreStats.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
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
              <XAxis type="number" stroke="#6B7280" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#6B7280"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="count" name="ゲーム数" fill="#3B82F6" radius={4} />
              <Bar dataKey="backlog" name="積みゲー" fill="#F59E0B" radius={4} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* トップジャンル一覧 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-2">
        {genreStats.slice(0, 5).map((genre, index) => (
          <div
            key={genre.name}
            className="p-3 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div
              className="w-3 h-3 rounded-full mb-2"
              style={{ backgroundColor: COLORS[index] }}
            />
            <p className="text-sm font-medium text-white truncate">{genre.name}</p>
            <p className="text-xs text-gray-400">{genre.count}本</p>
          </div>
        ))}
      </div>
    </div>
  );
}
