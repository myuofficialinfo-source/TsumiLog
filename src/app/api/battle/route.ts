import { NextRequest, NextResponse } from 'next/server';
import {
  recordBattle,
  recordGraduation,
  upsertUser,
  getUserScore,
  getUserRank,
  initDatabase,
  initGameUsageTable,
  recordGameUsage,
  recordPvpBattle,
  initDefenseDeckTable,
  migrateBattlesTable,
} from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initGameUsageTable();
    await initDefenseDeckTable();
    await migrateBattlesTable();
    dbInitialized = true;
  }
}

// バトル結果を記録
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const {
      steamId,
      result,
      personaName,
      avatarUrl,
      graduatedGames, // 新しく卒業したゲームのリスト [{appid, name}]
      deckGames, // デッキで使用したゲームのリスト [{appid, name}]
      opponentSteamId, // PVP対戦時の相手のSteamID
    } = body;

    if (!steamId || !result) {
      return NextResponse.json(
        { error: 'steamId and result are required' },
        { status: 400 }
      );
    }

    if (!['win', 'lose', 'draw'].includes(result)) {
      return NextResponse.json(
        { error: 'result must be win, lose, or draw' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新/登録
    await upsertUser(steamId, personaName, avatarUrl);

    // バトル結果を記録（PVP対戦の場合は相手のSteamIDも記録）
    if (opponentSteamId) {
      await recordPvpBattle(steamId, result, opponentSteamId);
    } else {
      await recordBattle(steamId, result);
    }

    // 新しく卒業したゲームを記録
    const newGraduations: Array<{ appid: number; name: string }> = [];
    if (graduatedGames && Array.isArray(graduatedGames)) {
      for (const game of graduatedGames) {
        const recorded = await recordGraduation(steamId, game.appid, game.name);
        if (recorded) {
          newGraduations.push(game);
        }
      }
    }

    // デッキで使用したゲームを記録
    if (deckGames && Array.isArray(deckGames)) {
      await recordGameUsage(steamId, deckGames);
    }

    // 更新後のスコアを取得
    const userScore = await getUserScore(steamId);
    const userRank = await getUserRank(steamId);

    return NextResponse.json({
      success: true,
      battleRecorded: true,
      newGraduations,
      userStats: {
        ...userScore,
        rank: userRank,
      },
    });
  } catch (error) {
    console.error('Battle API error:', error);
    return NextResponse.json(
      { error: 'Failed to record battle' },
      { status: 500 }
    );
  }
}

// ユーザーのバトル統計を取得
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const personaName = searchParams.get('personaName');
    const avatarUrl = searchParams.get('avatarUrl');

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // ユーザーがDBにいなければ登録
    try {
      await upsertUser(steamId, personaName || undefined, avatarUrl || undefined);
    } catch (upsertError) {
      console.error('Failed to upsert user:', upsertError);
      // upsert失敗しても続行（既存ユーザーの場合も考慮）
    }

    const userScore = await getUserScore(steamId);
    const userRank = await getUserRank(steamId);

    console.log('User stats for', steamId, ':', { userScore, userRank });

    return NextResponse.json({
      steamId,
      ...userScore,
      rank: userRank,
    });
  } catch (error) {
    console.error('Battle stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch battle stats' },
      { status: 500 }
    );
  }
}
