import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const catchphrase = searchParams.get('catchphrase') || 'ゲーマー';
    const totalGames = searchParams.get('totalGames') || '0';
    const backlogCount = searchParams.get('backlogCount') || '0';
    const playtime = searchParams.get('playtime') || '0';
    const genresParam = searchParams.get('genres') || '';

    // ジャンルデータをパース (format: "ジャンル名:数,ジャンル名:数,...")
    const genres = genresParam.split(',').filter(Boolean).map(item => {
      const [name, count] = item.split(':');
      return { name: name || '', count: parseInt(count) || 0 };
    }).slice(0, 5);

    const total = genres.reduce((sum, g) => sum + g.count, 0);

    const COLORS = ['#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#9B5DE5'];

    // ジャンルバーを事前に生成
    const genreBars = genres.map((genre, index) => {
      const percent = total > 0 ? Math.round((genre.count / total) * 100) : 0;
      return { name: genre.name, percent, color: COLORS[index % COLORS.length] };
    });

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #FDF6E3 0%, #F5E6C8 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
          }}
        >
          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            {/* 積み木ロゴ */}
            <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: '16px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: '#E63946', borderRadius: '6px', border: '3px solid #3D3D3D', marginRight: '4px' }} />
              <div style={{ width: '24px', height: '24px', backgroundColor: '#F4A261', borderRadius: '6px', border: '3px solid #3D3D3D', marginRight: '4px' }} />
              <div style={{ width: '20px', height: '20px', backgroundColor: '#2A9D8F', borderRadius: '6px', border: '3px solid #3D3D3D' }} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#3D3D3D' }}>ツミログ診断結果</div>
          </div>

          <div style={{ display: 'flex', flex: 1 }}>
            {/* 左側：診断結果 */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '40px' }}>
              {/* キャッチコピー */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
                  borderRadius: '16px',
                  border: '4px solid #3D3D3D',
                  padding: '24px',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ color: 'white', fontSize: '18px', marginBottom: '8px' }}>あなたのゲーマータイプ</div>
                <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>「{catchphrase}」</div>
              </div>

              {/* 統計 */}
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginRight: '16px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#666' }}>所持ゲーム</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#457B9D' }}>{totalGames}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>本</div>
                </div>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginRight: '16px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#666' }}>積みゲー</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#E63946' }}>{backlogCount}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>本</div>
                </div>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#666' }}>総プレイ時間</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#2A9D8F' }}>{playtime}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>時間</div>
                </div>
              </div>
            </div>

            {/* 右側：ジャンル分布 */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '320px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#3D3D3D', marginBottom: '16px' }}>ジャンル分布</div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '3px solid #3D3D3D',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {genreBars.length > 0 ? (
                  genreBars.map((bar, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', marginBottom: index < genreBars.length - 1 ? '12px' : '0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                        <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{bar.name}</span>
                        <span style={{ color: '#666' }}>{bar.percent}%</span>
                      </div>
                      <div style={{ display: 'flex', height: '12px', background: '#E5E5E5', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${bar.percent}%`,
                            background: bar.color,
                            borderRadius: '6px',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#666', fontSize: '14px' }}>データなし</div>
                )}
              </div>
            </div>
          </div>

          {/* フッター */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>tsumi-log.vercel.app</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG Image generation error:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
