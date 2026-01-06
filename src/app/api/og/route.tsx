import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const catchphrase = searchParams.get('catchphrase') || 'ゲーマー';
  const totalGames = searchParams.get('totalGames') || '0';
  const backlogCount = searchParams.get('backlogCount') || '0';
  const playtime = searchParams.get('playtime') || '0';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FDF6E3 0%, #F5E6C8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 30,
          }}
        >
          <div style={{ width: 40, height: 40, backgroundColor: '#E63946', borderRadius: 8, marginRight: 8 }} />
          <div style={{ width: 32, height: 32, backgroundColor: '#F4A261', borderRadius: 8, marginRight: 8 }} />
          <div style={{ width: 24, height: 24, backgroundColor: '#2A9D8F', borderRadius: 8, marginRight: 16 }} />
          <span style={{ fontSize: 36, fontWeight: 900, color: '#3D3D3D' }}>ツミログ診断結果</span>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
            borderRadius: 20,
            padding: '30px 60px',
            marginBottom: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>あなたのゲーマータイプ</span>
          <span style={{ color: 'white', fontSize: 48, fontWeight: 900 }}>「{catchphrase}」</span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px 40px',
              marginRight: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '3px solid #3D3D3D',
            }}
          >
            <span style={{ fontSize: 16, color: '#666' }}>所持ゲーム</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#457B9D' }}>{totalGames}</span>
            <span style={{ fontSize: 16, color: '#666' }}>本</span>
          </div>
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px 40px',
              marginRight: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '3px solid #3D3D3D',
            }}
          >
            <span style={{ fontSize: 16, color: '#666' }}>積みゲー</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#E63946' }}>{backlogCount}</span>
            <span style={{ fontSize: 16, color: '#666' }}>本</span>
          </div>
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '3px solid #3D3D3D',
            }}
          >
            <span style={{ fontSize: 16, color: '#666' }}>総プレイ時間</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#2A9D8F' }}>{playtime}</span>
            <span style={{ fontSize: 16, color: '#666' }}>時間</span>
          </div>
        </div>

        <span style={{ marginTop: 30, fontSize: 20, color: '#666' }}>tsumi-log.vercel.app</span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
