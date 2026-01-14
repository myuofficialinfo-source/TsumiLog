import { NextRequest, NextResponse } from 'next/server';
import {
  initDatabase,
  initUserGamesTable,
  initWishlistTable,
  syncUserGames,
  syncUserWishlist,
  getUserGames,
  getUserGameStats,
  getUserGamesLastSynced,
  getUserWishlist,
  getUserWishlistCount,
  upsertUser,
} from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initUserGamesTable();
    await initWishlistTable();
    dbInitialized = true;
  }
}

// ユーザーのゲーム情報を同期（POST）
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const {
      steamId,
      personaName,
      avatarUrl,
      games, // [{appid, name, playtime, isBacklog, isCompleted}]
      wishlist, // [{appid, name}] - optional
    } = body;

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    if (!games || !Array.isArray(games)) {
      return NextResponse.json(
        { error: 'games array is required' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新/登録
    await upsertUser(steamId, personaName, avatarUrl);

    // ゲーム情報を同期
    const syncedCount = await syncUserGames(
      steamId,
      games.map((g: { appid: number; name: string; playtime: number; isBacklog?: boolean; isCompleted?: boolean }) => ({
        appid: g.appid,
        name: g.name,
        playtime: g.playtime,
        isBacklog: g.isBacklog ?? (g.playtime < 30),
        isCompleted: g.isCompleted ?? false,
      }))
    );

    // ウィッシュリストを同期（存在する場合）
    let wishlistSyncedCount = 0;
    if (wishlist && Array.isArray(wishlist)) {
      wishlistSyncedCount = await syncUserWishlist(
        steamId,
        wishlist.map((g: { appid: number; name: string }) => ({
          appid: g.appid,
          name: g.name,
        }))
      );
    }

    // 統計情報を取得
    const stats = await getUserGameStats(steamId);
    const wishlistCount = await getUserWishlistCount(steamId);

    return NextResponse.json({
      success: true,
      syncedCount,
      wishlistSyncedCount,
      stats: {
        ...stats,
        wishlistCount,
      },
    });
  } catch (error) {
    console.error('User games sync API error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user games' },
      { status: 500 }
    );
  }
}

// ユーザーのゲーム情報を取得（GET）
export async function GET(request: NextRequest) {
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

    // ゲーム情報を取得
    const games = await getUserGames(steamId);

    // ウィッシュリストを取得
    const wishlist = await getUserWishlist(steamId);

    // 統計情報を取得
    const stats = await getUserGameStats(steamId);
    const wishlistCount = await getUserWishlistCount(steamId);

    // 最終同期日時を取得
    const lastSynced = await getUserGamesLastSynced(steamId);

    return NextResponse.json({
      success: true,
      games,
      wishlist,
      stats: {
        ...stats,
        wishlistCount,
      },
      lastSynced,
    });
  } catch (error) {
    console.error('User games GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to get user games' },
      { status: 500 }
    );
  }
}
