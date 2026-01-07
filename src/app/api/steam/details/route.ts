import { NextRequest, NextResponse } from 'next/server';
import { getGameDetails } from '@/lib/steam';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const appIds = searchParams.get('appIds');
  const language = (searchParams.get('language') || 'ja') as 'ja' | 'en';

  if (!appIds) {
    return NextResponse.json(
      { error: 'appIdsが必要です' },
      { status: 400 }
    );
  }

  try {
    const ids = appIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    // Steam Store APIはレート制限があるので、少しずつ取得
    const details = [];
    for (const appId of ids.slice(0, 20)) { // 最大20件
      const detail = await getGameDetails(appId, language);
      if (detail) {
        details.push(detail);
      }
      // レート制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({ details });
  } catch (error) {
    console.error('Steam Store API error:', error);
    return NextResponse.json(
      { error: 'ゲーム詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}
