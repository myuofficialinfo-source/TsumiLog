'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ShareBattlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
