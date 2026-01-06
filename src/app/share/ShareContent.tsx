'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function ShareContentInner() {
  const searchParams = useSearchParams();

  const catchphrase = searchParams.get('catchphrase') || 'ゲーマー';
  const totalGames = searchParams.get('totalGames') || '0';
  const backlogCount = searchParams.get('backlogCount') || '0';
  const playtime = searchParams.get('playtime') || '0';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="pop-card p-8 max-w-md w-full text-center">
        <div className="flex justify-center items-end gap-1 mb-6">
          <div className="w-8 h-8 rounded-lg border-3 border-[#3D3D3D] transform -rotate-3" style={{ backgroundColor: 'var(--pop-red)' }} />
          <div className="w-10 h-10 rounded-lg border-3 border-[#3D3D3D] transform rotate-2" style={{ backgroundColor: 'var(--pop-yellow)' }} />
          <div className="w-6 h-6 rounded-lg border-3 border-[#3D3D3D] transform -rotate-6" style={{ backgroundColor: 'var(--pop-green)' }} />
        </div>

        <h1 className="text-2xl font-black mb-2 gradient-text">ツミログ診断結果</h1>

        <div
          className="my-6 p-6 rounded-xl border-3 border-[#3D3D3D]"
          style={{ background: 'linear-gradient(135deg, var(--pop-purple), var(--pop-pink))' }}
        >
          <p className="text-white text-sm font-medium mb-2">ゲーマータイプ</p>
          <h2 className="text-2xl font-black text-white">「{catchphrase}」</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--background-secondary)' }}>
            <p className="text-xs text-gray-500">所持ゲーム</p>
            <p className="text-xl font-black" style={{ color: 'var(--pop-blue)' }}>{totalGames}</p>
            <p className="text-xs text-gray-500">本</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--background-secondary)' }}>
            <p className="text-xs text-gray-500">積みゲー</p>
            <p className="text-xl font-black" style={{ color: 'var(--pop-red)' }}>{backlogCount}</p>
            <p className="text-xs text-gray-500">本</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-[#3D3D3D]" style={{ backgroundColor: 'var(--background-secondary)' }}>
            <p className="text-xs text-gray-500">プレイ時間</p>
            <p className="text-xl font-black" style={{ color: 'var(--pop-green)' }}>{playtime}</p>
            <p className="text-xs text-gray-500">時間</p>
          </div>
        </div>

        <Link
          href="/"
          className="pop-button inline-block px-6 py-3 text-white font-bold"
        >
          あなたも診断してみる
        </Link>
      </div>
    </div>
  );
}

export default function ShareContent() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ShareContentInner />
    </Suspense>
  );
}
