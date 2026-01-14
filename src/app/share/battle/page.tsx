'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

function ShareBattleContent() {
  const router = useRouter();

  useEffect(() => {
    // シェアページにアクセスしたら、バトルページにリダイレクト
    router.replace('/battle');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <p>Redirecting...</p>
    </div>
  );
}

export default function ShareBattlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <ShareBattleContent />
    </Suspense>
  );
}
