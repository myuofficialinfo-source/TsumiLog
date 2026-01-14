import { NextRequest, NextResponse } from 'next/server';
import { deleteUserData, initDatabase } from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

// ユーザーデータを削除
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    const success = await deleteUserData(steamId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete user data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('User DELETE API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
