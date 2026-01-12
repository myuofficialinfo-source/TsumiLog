import { NextRequest, NextResponse } from 'next/server';
import {
  recordGraduation,
  updateGraduationCompletion,
  upsertUser,
  getUserScore,
  getUserRank,
  initDatabase,
  initBacklogSnapshotTable,
  hasBacklogSnapshot,
  saveBacklogSnapshot,
  filterSublimationCandidates,
  getGraduations,
  migrateGraduationsTable,
} from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initBacklogSnapshotTable();
    await migrateGraduationsTable();
    dbInitialized = true;
  }
}

// 昇華ゲームを同期
// 初回アクセス時：積みゲー（30分未満かつトロコンしていない）をスナップショットとして保存
// 以降のアクセス時：スナップショット内のゲームで30分以上になったものを昇華として記録
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const {
      steamId,
      personaName,
      avatarUrl,
      allGames, // 全ゲームリスト [{appid, name, playtime, isBacklog}]
    } = body;

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新/登録
    await upsertUser(steamId, personaName, avatarUrl);

    // スナップショットが存在するか確認
    const hasSnapshot = await hasBacklogSnapshot(steamId);

    let snapshotSaved = 0;
    let newSublimations = 0;
    let isFirstAccess = false;

    if (!hasSnapshot && allGames && Array.isArray(allGames)) {
      // 初回アクセス：積みゲー（isBacklog=true：30分未満かつトロコンしていない）をスナップショットとして保存
      isFirstAccess = true;
      const backlogGames = allGames
        .filter((g: { isBacklog?: boolean; playtime: number }) => g.isBacklog === true)
        .map((g: { appid: number; name: string; playtime: number }) => ({
          appid: g.appid,
          name: g.name,
          playtime: g.playtime,
        }));

      snapshotSaved = await saveBacklogSnapshot(steamId, backlogGames);
      console.log(`[${steamId}] First access: saved ${snapshotSaved} backlog games to snapshot`);
    } else if (hasSnapshot && allGames && Array.isArray(allGames)) {
      // 既存ユーザー：
      // 1. スナップショット内のゲームで30分以上になったものを昇華
      // 2. 新規購入ゲームをスナップショットに追加（30分以上なら昇華も）
      // 3. 既存昇華ゲームのトロコン状態を更新
      const gamesWithPlaytime = allGames.map((g: { appid: number; name: string; playtime: number; isBacklog?: boolean; isCompleted?: boolean }) => ({
        appid: g.appid,
        name: g.name,
        playtime: g.playtime,
        isBacklog: g.isBacklog ?? (g.playtime < 30), // isBacklogがない場合はplaytimeで判定
        isCompleted: g.isCompleted || false,
      }));

      const { sublimationCandidates, newGamesToSnapshot, completionUpdates } = await filterSublimationCandidates(steamId, gamesWithPlaytime);

      // 新規ゲームをスナップショットに追加
      if (newGamesToSnapshot.length > 0) {
        await saveBacklogSnapshot(steamId, newGamesToSnapshot);
        console.log(`[${steamId}] Added ${newGamesToSnapshot.length} new games to snapshot`);
      }

      // 昇華を記録（トロコン状態も保存）
      for (const game of sublimationCandidates) {
        const recorded = await recordGraduation(steamId, game.appid, game.name, {
          isCompleted: game.isCompleted,
        });
        if (recorded) {
          newSublimations++;
        }
      }

      // 既存昇華ゲームのトロコン状態を更新
      for (const update of completionUpdates) {
        await updateGraduationCompletion(steamId, update.appid, update.isCompleted);
      }

      if (newSublimations > 0) {
        console.log(`[${steamId}] Recorded ${newSublimations} new sublimations`);
      }
      if (completionUpdates.length > 0) {
        console.log(`[${steamId}] Updated ${completionUpdates.length} trophy completions`);
      }
    }

    // 更新後のスコアを取得
    const userScore = await getUserScore(steamId);
    const userRank = await getUserRank(steamId);

    return NextResponse.json({
      success: true,
      isFirstAccess,
      snapshotSaved,
      newSublimations,
      userStats: {
        ...userScore,
        rank: userRank,
      },
    });
  } catch (error) {
    console.error('Sublimation sync API error:', error);
    return NextResponse.json(
      { error: 'Failed to sync sublimations' },
      { status: 500 }
    );
  }
}

// 昇華済みゲームリストを取得
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

    // 昇華済みゲームリストを取得
    const graduations = await getGraduations(steamId);

    // ユーザースコアも取得
    const userScore = await getUserScore(steamId);
    const userRank = await getUserRank(steamId);

    return NextResponse.json({
      success: true,
      graduations,
      userStats: {
        ...userScore,
        rank: userRank,
      },
    });
  } catch (error) {
    console.error('Sublimation GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to get sublimations' },
      { status: 500 }
    );
  }
}
