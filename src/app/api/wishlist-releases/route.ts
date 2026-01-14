import { NextRequest, NextResponse } from 'next/server';
import { getUserWishlist, initWishlistTable, initDatabase, syncUserWishlist } from '@/lib/db';
import { getGameDetails, getWishlist } from '@/lib/steam';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initWishlistTable();
    dbInitialized = true;
  }
}

interface WishlistRelease {
  appid: number;
  name: string;
  releaseDate: string | null;
  comingSoon: boolean;
  headerImage: string;
}

// ウィッシュリストゲームの発売日を取得
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

    // DBからウィッシュリストを取得
    let wishlist = await getUserWishlist(steamId);

    // DBにウィッシュリストがない場合、Steam APIから取得して同期
    if (wishlist.length === 0) {
      try {
        const steamWishlist = await getWishlist(steamId);
        if (steamWishlist.length > 0) {
          await syncUserWishlist(
            steamId,
            steamWishlist.map(g => ({ appid: g.appid, name: g.name }))
          );
          // 同期後に再取得
          wishlist = await getUserWishlist(steamId);
        }
      } catch (error) {
        console.error('Failed to sync wishlist from Steam:', error);
      }
    }

    if (wishlist.length === 0) {
      return NextResponse.json({
        success: true,
        releases: [],
      });
    }

    // 各ゲームの発売日を取得（最大20本に制限）
    const releases: WishlistRelease[] = [];
    const targetGames = wishlist.slice(0, 20);

    for (const game of targetGames) {
      try {
        const details = await getGameDetails(game.appid, 'ja');
        if (details) {
          releases.push({
            appid: game.appid,
            name: details.name || game.gameName,
            releaseDate: details.release_date?.date || null,
            comingSoon: details.release_date?.coming_soon || false,
            headerImage: details.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
          });
        }
      } catch {
        // エラーは無視して続行
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      releases,
    });
  } catch (error) {
    console.error('Wishlist releases API error:', error);
    return NextResponse.json(
      { error: 'Failed to get wishlist releases' },
      { status: 500 }
    );
  }
}
