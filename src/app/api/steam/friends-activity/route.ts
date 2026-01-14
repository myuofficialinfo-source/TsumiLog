import { NextRequest, NextResponse } from 'next/server';
import { getFriendsRecentActivity, getPlayerSummaries } from '@/lib/steam';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // フレンドの最近のプレイ履歴を取得
    const friendsActivity = await getFriendsRecentActivity(steamId, 15);

    // 現在プレイ中のフレンドも取得
    const allFriends = await getPlayerSummaries(
      friendsActivity.map(f => f.friend.steamid)
    );

    // プレイ中のフレンドを抽出
    const playingFriends = allFriends.filter(f => f.gameextrainfo);

    return NextResponse.json({
      success: true,
      friendsActivity,
      playingFriends,
    });
  } catch (error) {
    console.error('Friends activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to get friends activity' },
      { status: 500 }
    );
  }
}
