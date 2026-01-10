import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// デバッグ用：DBの状態を確認
export async function GET() {
  try {
    // ユーザー数を取得
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;

    // 全ユーザーを取得
    const users = await sql`SELECT steam_id, persona_name, created_at FROM users ORDER BY created_at DESC LIMIT 10`;

    return NextResponse.json({
      userCount: userCount[0]?.count,
      users,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
