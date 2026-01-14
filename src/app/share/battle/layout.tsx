import { Metadata } from 'next';

// 静的生成を無効化し、動的レンダリングを強制
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams || {};
  const result = (params.result as string) || 'win';
  const wins = (params.wins as string) || '0';
  const rank = (params.rank as string) || '-';
  const score = (params.score as string) || '0';
  const lang = (params.lang as string) || 'ja';

  const isJa = lang === 'ja';
  const title = isJa ? 'ツミナビ 積みゲーバトル結果' : 'TsumiNavi Backlog Battle Result';
  const description = isJa
    ? '積みゲーで殴り合おう！積みゲーを消化すればするほど強くなる！'
    : 'Battle with your backlog! The more you play, the stronger you get!';

  const ogImageUrl = `https://tsumi-navi.vercel.app/api/og/battle?result=${result}&wins=${wins}&rank=${rank}&score=${score}&lang=${lang}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ShareBattleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
