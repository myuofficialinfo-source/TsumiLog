import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = searchParams.get('result') || 'win'; // win, lose, draw
  const wins = searchParams.get('wins') || '0';
  const rank = searchParams.get('rank') || '-';
  const score = searchParams.get('score') || '0';
  const lang = searchParams.get('lang') || 'ja';

  const isJa = lang === 'ja';

  // 結果に応じた表示
  const resultText = result === 'win'
    ? (isJa ? '勝利！' : 'Victory!')
    : result === 'lose'
    ? (isJa ? '敗北...' : 'Defeat...')
    : (isJa ? '引き分け' : 'Draw');

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FDF6E3',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://tsumi-navi.vercel.app/icons/icom.png"
            alt=""
            width={56}
            height={56}
            style={{ marginRight: 16 }}
          />
          <span style={{ fontSize: 40, fontWeight: 900, color: '#3D3D3D' }}>
            {isJa ? 'ツミナビ 積みゲーバトル' : 'TsumiNavi Backlog Battle'}
          </span>
        </div>

        {/* 結果 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: result === 'win'
                ? 'linear-gradient(135deg, #2A9D8F, #45B7D1)'
                : result === 'lose'
                ? 'linear-gradient(135deg, #E63946, #FF6B6B)'
                : 'linear-gradient(135deg, #F4A261, #FFEAA7)',
              borderRadius: 20,
              border: '5px solid #3D3D3D',
              padding: '30px 80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>
              {resultText}
            </span>
          </div>
        </div>

        {/* 戦績 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 30,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              border: '4px solid #3D3D3D',
              padding: '20px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 56, fontWeight: 900, color: '#2A9D8F' }}>{wins}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#666' }}>{isJa ? '勝利' : 'Wins'}</span>
          </div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              border: '4px solid #3D3D3D',
              padding: '20px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 56, fontWeight: 900, color: '#F4A261' }}>#{rank}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#666' }}>{isJa ? '順位' : 'Rank'}</span>
          </div>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              border: '4px solid #3D3D3D',
              padding: '20px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 56, fontWeight: 900, color: '#9B5DE5' }}>{score}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#666' }}>{isJa ? 'スコア' : 'Score'}</span>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 'auto',
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, color: '#999' }}>
            tsumi-navi.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
