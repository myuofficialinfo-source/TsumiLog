import { NextRequest, NextResponse } from 'next/server';
import sql, { initDatabase, upsertUser, getUserRank } from '@/lib/db';

// デバッグ用：DBの状態を確認
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId') || '76561199703129255';

    // DB初期化
    await initDatabase();

    // ユーザー数を取得
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;

    // 全ユーザーを取得
    const users = await sql`SELECT steam_id, persona_name, created_at FROM users ORDER BY created_at DESC LIMIT 10`;

    // 特定ユーザーを検索
    const targetUser = await sql`SELECT * FROM users WHERE steam_id = ${steamId}`;

    // ユーザーがいなければ登録
    let upsertResult = null;
    if (targetUser.length === 0) {
      upsertResult = await upsertUser(steamId, 'TestUser', undefined);
    }

    // ランク取得
    const rank = await getUserRank(steamId);

    return NextResponse.json({
      userCount: userCount[0]?.count,
      users,
      targetUser: targetUser[0] || null,
      upsertResult,
      rank,
      steamIdChecked: steamId,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: String(error), stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
