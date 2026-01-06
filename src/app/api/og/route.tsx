import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const catchphrase = searchParams.get('catchphrase') || 'ゲーマー';
  const totalGames = searchParams.get('totalGames') || '0';
  const backlogCount = searchParams.get('backlogCount') || '0';
  const playtime = searchParams.get('playtime') || '0';
  const genresParam = searchParams.get('genres') || '';

  // ジャンルデータをパース
  const COLORS = ['#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#9B5DE5'];
  const genres: { name: string; count: number; color: string }[] = [];
  let total = 0;

  if (genresParam) {
    const items = genresParam.split(',').slice(0, 5);
    for (let i = 0; i < items.length; i++) {
      const parts = items[i].split(':');
      if (parts.length === 2) {
        const count = parseInt(parts[1]) || 0;
        genres.push({ name: parts[0], count, color: COLORS[i] });
        total += count;
      }
    }
  }

  // 円グラフ用のSVGパスを生成
  const createPieSlices = () => {
    if (genres.length === 0) return null;

    const cx = 90;
    const cy = 90;
    const outerR = 85;
    const innerR = 50;
    let startAngle = -90;

    return genres.map((genre, i) => {
      const percent = total > 0 ? genre.count / total : 0;
      const angle = percent * 360;
      const endAngle = startAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1Outer = cx + outerR * Math.cos(startRad);
      const y1Outer = cy + outerR * Math.sin(startRad);
      const x2Outer = cx + outerR * Math.cos(endRad);
      const y2Outer = cy + outerR * Math.sin(endRad);
      const x1Inner = cx + innerR * Math.cos(startRad);
      const y1Inner = cy + innerR * Math.sin(startRad);
      const x2Inner = cx + innerR * Math.cos(endRad);
      const y2Inner = cy + innerR * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`;

      startAngle = endAngle;

      return (
        <path key={i} d={path} fill={genre.color} />
      );
    });
  };

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FDF6E3',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 50px',
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
          <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: 12 }}>
            <div style={{ width: 28, height: 28, backgroundColor: '#E63946', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
            <div style={{ width: 36, height: 36, backgroundColor: '#F4A261', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
            <div style={{ width: 22, height: 22, backgroundColor: '#2A9D8F', borderRadius: 6, border: '3px solid #3D3D3D' }} />
          </div>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#3D3D3D' }}>ツミログ診断結果</span>
        </div>

        {/* キャッチコピー */}
        <div
          style={{
            background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
            borderRadius: 16,
            border: '4px solid #3D3D3D',
            padding: '20px 40px',
            marginBottom: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'white', fontSize: 16, marginBottom: 8 }}>あなたのゲーマータイプ</span>
          <span style={{ color: 'white', fontSize: 40, fontWeight: 900 }}>「{catchphrase}」</span>
        </div>

        {/* コンテンツエリア */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* 左側：円グラフ */}
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 50 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#666', marginBottom: 12 }}>ジャンル分布</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {createPieSlices()}
              </svg>
              {/* 凡例 */}
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                {genres.map((genre, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 14, height: 14, backgroundColor: genre.color, borderRadius: 3, marginRight: 10 }} />
                    <span style={{ fontSize: 16, color: '#3D3D3D', fontWeight: 600 }}>{genre.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：統計 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#3D3D3D', width: 180 }}>所持ゲーム</span>
              <span style={{ fontSize: 72, fontWeight: 900, color: '#457B9D' }}>{totalGames}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#3D3D3D', width: 180 }}>積みゲー</span>
              <span style={{ fontSize: 72, fontWeight: 900, color: '#E63946' }}>{backlogCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#3D3D3D', width: 180 }}>総プレイ時間</span>
              <span style={{ fontSize: 72, fontWeight: 900, color: '#2A9D8F' }}>{playtime}h</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
