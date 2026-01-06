import { Metadata } from 'next';
import ShareContent from './ShareContent';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;

  const catchphrase = (params.catchphrase as string) || 'ゲーマー';
  const totalGames = (params.totalGames as string) || '0';
  const backlogCount = (params.backlogCount as string) || '0';
  const playtime = (params.playtime as string) || '0';
  const genres = (params.genres as string) || '';

  const ogParams = new URLSearchParams({
    catchphrase,
    totalGames,
    backlogCount,
    playtime,
    genres,
  });

  const ogImageUrl = `https://tsumi-log.vercel.app/api/og?${ogParams.toString()}`;

  return {
    title: `${catchphrase} | ツミナビ診断結果`,
    description: `所持ゲーム${totalGames}本、積みゲー${backlogCount}本のゲーマータイプ診断結果`,
    openGraph: {
      title: `${catchphrase} | ツミナビ診断結果`,
      description: `所持ゲーム${totalGames}本、積みゲー${backlogCount}本、総プレイ時間${playtime}時間`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${catchphrase} | ツミナビ診断結果`,
      description: `所持ゲーム${totalGames}本、積みゲー${backlogCount}本、総プレイ時間${playtime}時間`,
      images: [ogImageUrl],
    },
  };
}

export default function SharePage() {
  return <ShareContent />;
}
