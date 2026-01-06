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

    // ジャンルデータをパース
    const genreItems = genresParam.split(',').filter(Boolean).slice(0, 5);
    const genres: { name: string; percent: number; color: string }[] = [];
    const COLORS = ['#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#9B5DE5'];

    let total = 0;
    const rawGenres: { name: string; count: number }[] = [];

    for (const item of genreItems) {
      const parts = item.split(':');
      if (parts.length === 2) {
        const count = parseInt(parts[1]) || 0;
        rawGenres.push({ name: parts[0], count });
        total += count;
      }
    }

    for (let i = 0; i < rawGenres.length; i++) {
      const g = rawGenres[i];
      genres.push({
        name: g.name,
        percent: total > 0 ? Math.round((g.count / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
      });
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #FDF6E3 0%, #F5E6C8 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: 16 }}>
              <div style={{ width: 32, height: 32, backgroundColor: '#E63946', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
              <div style={{ width: 24, height: 24, backgroundColor: '#F4A261', borderRadius: 6, border: '3px solid #3D3D3D', marginRight: 4 }} />
              <div style={{ width: 20, height: 20, backgroundColor: '#2A9D8F', borderRadius: 6, border: '3px solid #3D3D3D' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#3D3D3D' }}>ツミログ診断結果</div>
          </div>

          <div style={{ display: 'flex', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: 40 }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #9B5DE5, #F15BB5)',
                  borderRadius: 16,
                  border: '4px solid #3D3D3D',
                  padding: 24,
                  marginBottom: 24,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>あなたのゲーマータイプ</div>
                <div style={{ color: 'white', fontSize: 36, fontWeight: 900 }}>「{catchphrase}」</div>
              </div>

              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <div style={{ fontSize: 14, color: '#666' }}>所持ゲーム</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#457B9D' }}>{totalGames}</div>
                  <div style={{ fontSize: 14, color: '#666' }}>本</div>
                </div>
                <div
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <div style={{ fontSize: 14, color: '#666' }}>積みゲー</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#E63946' }}>{backlogCount}</div>
                  <div style={{ fontSize: 14, color: '#666' }}>本</div>
                </div>
                <div
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '3px solid #3D3D3D',
                    padding: '16px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#666' }}>総プレイ時間</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#2A9D8F' }}>{playtime}</div>
                  <div style={{ fontSize: 14, color: '#666' }}>時間</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: 320 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3D3D3D', marginBottom: 16 }}>ジャンル分布</div>
              <div
                style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '3px solid #3D3D3D',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {genres.length > 0 ? (
                  <>
                    {genres[0] && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{genres[0].name}</span>
                          <span style={{ color: '#666' }}>{genres[0].percent}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 12, background: '#E5E5E5', borderRadius: 6 }}>
                          <div style={{ width: `${genres[0].percent}%`, background: genres[0].color, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                    {genres[1] && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{genres[1].name}</span>
                          <span style={{ color: '#666' }}>{genres[1].percent}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 12, background: '#E5E5E5', borderRadius: 6 }}>
                          <div style={{ width: `${genres[1].percent}%`, background: genres[1].color, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                    {genres[2] && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{genres[2].name}</span>
                          <span style={{ color: '#666' }}>{genres[2].percent}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 12, background: '#E5E5E5', borderRadius: 6 }}>
                          <div style={{ width: `${genres[2].percent}%`, background: genres[2].color, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                    {genres[3] && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{genres[3].name}</span>
                          <span style={{ color: '#666' }}>{genres[3].percent}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 12, background: '#E5E5E5', borderRadius: 6 }}>
                          <div style={{ width: `${genres[3].percent}%`, background: genres[3].color, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                    {genres[4] && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: '#3D3D3D', fontWeight: 600 }}>{genres[4].name}</span>
                          <span style={{ color: '#666' }}>{genres[4].percent}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 12, background: '#E5E5E5', borderRadius: 6 }}>
                          <div style={{ width: `${genres[4].percent}%`, background: genres[4].color, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#666', fontSize: 14 }}>データなし</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 16, color: '#666' }}>tsumi-log.vercel.app</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 });
  }
}
