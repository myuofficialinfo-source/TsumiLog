import { NextRequest, NextResponse } from 'next/server';
import sql, { initDatabase, upsertUser, getUserRank } from '@/lib/db';

// テーブルをリセット（POSTでアクセス）
export async function POST() {
  try {
    // 既存テーブルを削除
    await sql`DROP TABLE IF EXISTS game_usage`;
    await sql`DROP TABLE IF EXISTS battles`;
    await sql`DROP TABLE IF EXISTS graduations`;
    await sql`DROP TABLE IF EXISTS users`;

    // 新しいテーブルを作成
    await initDatabase();

    return NextResponse.json({ success: true, message: 'Tables reset successfully' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// デバッグ用：DBの状態を確認
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get('steamId') || '76561199703129255';

  // Step 1: DB接続確認
  let dbConnected = false;
  try {
    await sql`SELECT 1`;
    dbConnected = true;
  } catch (e) {
    return NextResponse.json({
      step: 'connection',
      error: String(e),
      dbUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
    });
  }

  // Step 1.5: テーブル構造を確認
  let tableColumns: unknown[] = [];
  try {
    tableColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
  } catch (e) {
    return NextResponse.json({
      step: 'getColumns',
      error: String(e),
      dbConnected,
    });
  }

  // Step 2: テーブル作成
  let tablesCreated = false;
  try {
    await initDatabase();
    tablesCreated = true;
  } catch (e) {
    return NextResponse.json({
      step: 'initDatabase',
      error: String(e),
      dbConnected,
    });
  }

  // Step 3: ユーザー数を取得
  let userCount = 0;
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    userCount = parseInt(result[0]?.count || '0', 10);
  } catch (e) {
    return NextResponse.json({
      step: 'userCount',
      error: String(e),
      dbConnected,
      tablesCreated,
    });
  }

  // Step 4: ユーザー登録
  let upsertResult = null;
  try {
    upsertResult = await upsertUser(steamId, 'TestUser', undefined);
  } catch (e) {
    return NextResponse.json({
      step: 'upsertUser',
      error: String(e),
      dbConnected,
      tableColumns,
      tablesCreated,
      userCount,
    });
  }

  // Step 5: ランク取得
  let rank = null;
  try {
    rank = await getUserRank(steamId);
  } catch (e) {
    return NextResponse.json({
      step: 'getUserRank',
      error: String(e),
      dbConnected,
      tablesCreated,
      userCount,
      upsertResult,
    });
  }

  // Step 6: 全ユーザー取得
  let users: unknown[] = [];
  try {
    users = await sql`SELECT steam_id, persona_name, created_at FROM users ORDER BY created_at DESC LIMIT 10`;
  } catch (e) {
    return NextResponse.json({
      step: 'getUsers',
      error: String(e),
      dbConnected,
      tablesCreated,
      userCount,
      upsertResult,
      rank,
    });
  }

  return NextResponse.json({
    success: true,
    dbConnected,
    tableColumns,
    tablesCreated,
    userCount,
    users,
    upsertResult,
    rank,
    steamIdChecked: steamId,
  });
}
