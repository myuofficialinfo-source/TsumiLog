import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ツミナビ - Steam積みゲー管理';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
        {/* 積み木ブロック */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#E63946',
              borderRadius: '12px',
              border: '4px solid #3D3D3D',
              transform: 'rotate(-3deg)',
            }}
          />
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: '#F4A261',
              borderRadius: '12px',
              border: '4px solid #3D3D3D',
              transform: 'rotate(2deg)',
            }}
          />
          <div
            style={{
              width: '70px',
              height: '70px',
              backgroundColor: '#2A9D8F',
              borderRadius: '12px',
              border: '4px solid #3D3D3D',
              transform: 'rotate(-5deg)',
            }}
          />
          <div
            style={{
              width: '90px',
              height: '90px',
              backgroundColor: '#457B9D',
              borderRadius: '12px',
              border: '4px solid #3D3D3D',
              transform: 'rotate(3deg)',
            }}
          />
          <div
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#9B5DE5',
              borderRadius: '12px',
              border: '4px solid #3D3D3D',
              transform: 'rotate(-2deg)',
            }}
          />
        </div>

        {/* タイトル */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #E63946, #F4A261, #2A9D8F, #457B9D)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: '16px',
          }}
        >
          ツミナビ
        </div>
        <div
          style={{
            fontSize: '32px',
            color: '#666',
            fontWeight: 600,
            marginBottom: '40px',
          }}
        >
          Tsumi-Navi
        </div>

        {/* サブタイトル */}
        <div
          style={{
            fontSize: '36px',
            color: '#3D3D3D',
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Steamの積みゲーを可視化 & AIがあなたのゲーマータイプを診断!
        </div>

        {/* 装飾ドット */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '50px',
          }}
        >
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#E63946' }} />
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F4A261' }} />
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#2A9D8F' }} />
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#457B9D' }} />
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#9B5DE5' }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
