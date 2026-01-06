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

    const cx = 80;
    const cy = 80;
    const r = 70;
    let startAngle = -90;

    return genres.map((genre, i) => {
      const percent = total > 0 ? genre.count / total : 0;
      const angle = percent * 360;
      const endAngle = startAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          fontFamily: 'sans-serif',
        }}
      >
        {/* メインカード */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 32,
            padding: '40px 50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            width: 1100,
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 25,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: 16 }}>
              <div style={{ width: 32, height: 32, backgroundColor: '#E63946', borderRadius: 6, marginRight: 5, transform: 'rotate(-5deg)' }} />
              <div style={{ width: 40, height: 40, backgroundColor: '#F4A261', borderRadius: 6, marginRight: 5, transform: 'rotate(3deg)' }} />
              <div style={{ width: 24, height: 24, backgroundColor: '#2A9D8F', borderRadius: 6, transform: 'rotate(-8deg)' }} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#3D3D3D' }}>ツミログ診断結果</span>
          </div>

          {/* コンテンツエリア */}
          <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            {/* 左側：キャッチコピーと統計 */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: 40 }}>
              {/* キャッチコピー */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
                  borderRadius: 20,
                  padding: '20px 40px',
                  marginBottom: 25,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 10px 30px rgba(155, 93, 229, 0.3)',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 6 }}>あなたのゲーマータイプ</span>
                <span style={{ color: 'white', fontSize: 36, fontWeight: 900 }}>「{catchphrase}」</span>
              </div>

              {/* 統計カード */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #E8F4FD, #D1E8FA)',
                    borderRadius: 14,
                    padding: '16px 28px',
                    marginRight: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 110,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#457B9D', fontWeight: 600 }}>所持ゲーム</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#457B9D' }}>{totalGames}</span>
                  <span style={{ fontSize: 12, color: '#457B9D' }}>本</span>
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #FDE8E8, #FAD1D1)',
                    borderRadius: 14,
                    padding: '16px 28px',
                    marginRight: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 110,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#E63946', fontWeight: 600 }}>積みゲー</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#E63946' }}>{backlogCount}</span>
                  <span style={{ fontSize: 12, color: '#E63946' }}>本</span>
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #E8F5F2, #D1EBE5)',
                    borderRadius: 14,
                    padding: '16px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 110,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#2A9D8F', fontWeight: 600 }}>総プレイ時間</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#2A9D8F' }}>{playtime}</span>
                  <span style={{ fontSize: 12, color: '#2A9D8F' }}>時間</span>
                </div>
              </div>
            </div>

            {/* 右側：円グラフとジャンル */}
            {genres.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 320 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#3D3D3D', marginBottom: 12 }}>ジャンル分布</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {/* 円グラフ */}
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {createPieSlices()}
                    <circle cx="80" cy="80" r="35" fill="white" />
                  </svg>

                  {/* 凡例 */}
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 16 }}>
                    {genres.map((genre, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ width: 12, height: 12, backgroundColor: genre.color, borderRadius: 3, marginRight: 8 }} />
                        <span style={{ fontSize: 12, color: '#3D3D3D' }}>{genre.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <span style={{ marginTop: 20, fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>tsumi-log.vercel.app</span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
