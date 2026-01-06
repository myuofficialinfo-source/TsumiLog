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

  // プレイ時間を日と時間に変換（数値と単位を分けて返す）
  const formatPlaytimeParts = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      if (remainingHours > 0) {
        return [
          { value: days, unit: '日' },
          { value: remainingHours, unit: '時間' },
        ];
      }
      return [{ value: days, unit: '日' }];
    }
    return [{ value: hours, unit: '時間' }];
  };

  const playtimeParts = formatPlaytimeParts(parseInt(playtime));

  // キャッチコピーを適切な位置で改行
  const formatCatchphrase = (text: string) => {
    if (text.length <= 15) return [text];

    // 句読点や助詞で改行位置を探す
    const breakPoints = ['、', '。', '！', '？', 'の', 'な', 'て', 'で', 'に', 'を', 'が', 'は'];
    let bestBreak = Math.floor(text.length / 2);

    for (let i = Math.floor(text.length / 3); i < Math.floor(text.length * 2 / 3); i++) {
      if (breakPoints.includes(text[i])) {
        bestBreak = i + 1;
        break;
      }
    }

    return [text.slice(0, bestBreak), text.slice(bestBreak)];
  };

  const catchphraseLines = formatCatchphrase(catchphrase);

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

    const cx = 140;
    const cy = 140;
    const outerR = 130;
    const innerR = 75;
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
          padding: '35px 50px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: 12 }}>
            <div style={{ width: 28, height: 28, backgroundColor: '#E63946', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
            <div style={{ width: 36, height: 36, backgroundColor: '#F4A261', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
            <div style={{ width: 22, height: 22, backgroundColor: '#2A9D8F', borderRadius: 6, border: '3px solid #3D3D3D' }} />
          </div>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#3D3D3D' }}>ツミナビ診断結果</span>
        </div>

        {/* キャッチコピー */}
        <div
          style={{
            background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
            borderRadius: 16,
            border: '4px solid #3D3D3D',
            padding: '16px 40px',
            marginBottom: 25,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'white', fontSize: 18, marginBottom: 6 }}>あなたのゲーマータイプ</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {catchphraseLines.length === 1 ? (
              <span style={{ color: 'white', fontSize: 38, fontWeight: 900, textAlign: 'center' }}>「{catchphraseLines[0]}」</span>
            ) : (
              <>
                <span style={{ color: 'white', fontSize: 36, fontWeight: 900, textAlign: 'center' }}>「{catchphraseLines[0]}</span>
                <span style={{ color: 'white', fontSize: 36, fontWeight: 900, textAlign: 'center' }}>{catchphraseLines[1]}」</span>
              </>
            )}
          </div>
        </div>

        {/* コンテンツエリア */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* 左側：円グラフ */}
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 40 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#666', marginBottom: 10 }}>ジャンル分布</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="400" height="400" viewBox="0 0 320 320">
                {createPieSlices()}
              </svg>
              {/* 凡例 */}
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: -30 }}>
                {genres.map((genre, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: genre.color, borderRadius: 4, marginRight: 10 }} />
                    <span style={{ fontSize: 18, color: '#3D3D3D', fontWeight: 900 }}>{genre.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：統計 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'white', borderRadius: 12, border: '3px solid #3D3D3D', padding: '4px 20px' }}>
              <span style={{ fontSize: 100, fontWeight: 900, color: '#457B9D', lineHeight: 1 }}>{totalGames}</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#3D3D3D', paddingBottom: 8 }}>所持ゲーム</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'white', borderRadius: 12, border: '3px solid #3D3D3D', padding: '4px 20px' }}>
              <span style={{ fontSize: 100, fontWeight: 900, color: '#E63946', lineHeight: 1 }}>{backlogCount}</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#3D3D3D', paddingBottom: 8 }}>積みゲー</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, border: '3px solid #3D3D3D', padding: '4px 20px' }}>
              <span style={{ display: 'flex', alignItems: 'flex-end', color: '#2A9D8F' }}>
                {playtimeParts.map((part, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 60, fontWeight: 900, lineHeight: 1 }}>{part.value}</span>
                    <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, paddingBottom: 4 }}>{part.unit}</span>
                  </span>
                ))}
              </span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#3D3D3D', paddingBottom: 8 }}>総プレイ時間</span>
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
