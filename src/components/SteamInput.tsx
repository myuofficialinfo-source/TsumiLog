'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SteamInputProps {
  onSubmit: (steamId: string) => void;
  isLoading: boolean;
}

export default function SteamInput({ onSubmit, isLoading }: SteamInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Steam IDまたはプロフィールURLを入力"
          className="w-full px-6 py-4 pr-14 text-lg bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-400 text-center">
        例: 76561198012345678 または steamcommunity.com/id/yourname
      </p>
    </form>
  );
}
