/**
 * バトル実行API
 *
 * チート対策のため、バトルロジックは全てサーバーで実行される。
 * フロントエンドからはデッキ番号のみを受け取り、
 * サーバーでカードデータを取得してバトルを実行する。
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initDatabase,
  initDefenseDeckTable,
  getActiveDeck,
  getUserScore,
  recordBattle,
  recordPvpBattle,
  upsertUser,
  getDefenseDeck,
  getRandomOpponentDeck,
  DefenseDeckCard,
} from '@/lib/db';
import { executeBattle, ServerBattleCard } from '@/lib/battleEngine';
import { generateEnemyDeck, Rarity } from '@/types/cardBattle';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    await initDefenseDeckTable();
    dbInitialized = true;
  }
}

// DefenseDeckCardをServerBattleCard形式に変換
function convertDefenseDeckCardToServerCard(card: DefenseDeckCard): ServerBattleCard {
  return {
    appid: card.appid,
    name: card.name,
    attack: card.attack,
    hp: card.hp,
    maxHp: card.maxHp || card.hp,
    rarity: card.rarity as Rarity,
    skills: card.skills as any[],
    genres: card.genres || [],
    playtimeMinutes: card.playtimeMinutes,
    developer: card.developer,
    publisher: card.publisher,
  };
}

// PvE用のAIデッキを生成（ServerBattleCard形式）
function generatePveOpponentDeck(playerScore: number): {
  frontLine: (ServerBattleCard | null)[];
  backLine: (ServerBattleCard | null)[];
  enemyName: string;
} {
  const { deck, enemyName } = generateEnemyDeck(playerScore);

  const convertCard = (card: any): ServerBattleCard | null => {
    if (!card) return null;
    return {
      appid: card.appid,
      name: card.name,
      attack: card.attack,
      hp: card.hp,
      maxHp: card.hp,
      rarity: card.rarity,
      skills: card.skills || [],
      genres: card.genres || [],
      playtimeMinutes: card.playtimeMinutes || 0,
      developer: card.developer,
      publisher: card.publisher,
    };
  };

  return {
    frontLine: deck.frontLine.map(convertCard),
    backLine: deck.backLine.map(convertCard),
    enemyName,
  };
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const {
      steamId,
      opponentSteamId,  // PvP時の相手SteamID（省略時はPvE）
      personaName,
      avatarUrl,
      // フロントから送られるデッキデータ（防衛デッキが設定されている場合はそちらを使う）
      playerDeckData,
    } = body;

    // 必須パラメータチェック
    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新
    await upsertUser(steamId, personaName, avatarUrl);

    // プレイヤーデッキの取得
    let playerFrontLine: (ServerBattleCard | null)[] = [null, null, null, null, null];
    let playerBackLine: (ServerBattleCard | null)[] = [null, null, null, null, null];

    // まずプレイヤーの防衛デッキ（フルデータ保存済み）を確認
    const playerDefenseDeck = await getDefenseDeck(steamId);

    if (playerDefenseDeck && playerDefenseDeck.frontLine.length > 0) {
      // 防衛デッキがある場合はそれを使用（サーバーに保存されたデータ）
      playerDefenseDeck.frontLine.forEach((card, index) => {
        if (card && index < 5) {
          playerFrontLine[index] = convertDefenseDeckCardToServerCard(card);
        }
      });
      playerDefenseDeck.backLine.forEach((card, index) => {
        if (card && index < 5) {
          playerBackLine[index] = convertDefenseDeckCardToServerCard(card);
        }
      });
    } else if (playerDeckData) {
      // 防衛デッキがない場合、フロントから送られたデータを使用
      // ※これは暫定対応。将来的にはデッキ保存時にフルデータを保存する
      console.warn('Using client-provided deck data - defense deck not set');

      if (playerDeckData.frontLine) {
        playerDeckData.frontLine.forEach((card: any, index: number) => {
          if (card && index < 5) {
            playerFrontLine[index] = {
              appid: card.appid,
              name: card.name,
              attack: card.attack,
              hp: card.hp,
              maxHp: card.maxHp || card.hp,
              rarity: card.rarity as Rarity,
              skills: card.skills || [],
              genres: card.genres || [],
              playtimeMinutes: card.playtimeMinutes || 0,
              developer: card.developer,
              publisher: card.publisher,
            };
          }
        });
      }
      if (playerDeckData.backLine) {
        playerDeckData.backLine.forEach((card: any, index: number) => {
          if (card && index < 5) {
            playerBackLine[index] = {
              appid: card.appid,
              name: card.name,
              attack: card.attack,
              hp: card.hp,
              maxHp: card.maxHp || card.hp,
              rarity: card.rarity as Rarity,
              skills: card.skills || [],
              genres: card.genres || [],
              playtimeMinutes: card.playtimeMinutes || 0,
              developer: card.developer,
              publisher: card.publisher,
            };
          }
        });
      }
    } else {
      return NextResponse.json(
        { error: 'No deck available. Please set a defense deck first.' },
        { status: 400 }
      );
    }

    // デッキにカードがあるか確認
    const hasPlayerCards = playerFrontLine.some(c => c !== null) || playerBackLine.some(c => c !== null);
    if (!hasPlayerCards) {
      return NextResponse.json(
        { error: 'Deck is empty' },
        { status: 400 }
      );
    }

    // 相手デッキの取得（PvP or PvE）
    let opponentFrontLine: (ServerBattleCard | null)[] = [null, null, null, null, null];
    let opponentBackLine: (ServerBattleCard | null)[] = [null, null, null, null, null];
    let opponentName = 'AI';
    let isPvp = false;
    let actualOpponentSteamId: string | null = null;

    if (opponentSteamId) {
      // 指定された相手のデッキを取得
      isPvp = true;
      actualOpponentSteamId = opponentSteamId;
      const opponentDefenseDeck = await getDefenseDeck(opponentSteamId);

      if (opponentDefenseDeck && opponentDefenseDeck.frontLine.length > 0) {
        opponentDefenseDeck.frontLine.forEach((card, index) => {
          if (card && index < 5) {
            opponentFrontLine[index] = convertDefenseDeckCardToServerCard(card);
          }
        });
        opponentDefenseDeck.backLine.forEach((card, index) => {
          if (card && index < 5) {
            opponentBackLine[index] = convertDefenseDeckCardToServerCard(card);
          }
        });
        opponentName = 'Player';
      } else {
        // 相手の防衛デッキがない場合はPvEにフォールバック
        isPvp = false;
        actualOpponentSteamId = null;
      }
    } else {
      // ランダムマッチング：他プレイヤーの防衛デッキを取得
      const randomOpponent = await getRandomOpponentDeck(steamId);

      if (randomOpponent) {
        isPvp = true;
        actualOpponentSteamId = randomOpponent.steamId;
        opponentName = randomOpponent.personaName || 'Player';

        randomOpponent.frontLine.forEach((card, index) => {
          if (card && index < 5) {
            opponentFrontLine[index] = convertDefenseDeckCardToServerCard(card);
          }
        });
        randomOpponent.backLine.forEach((card, index) => {
          if (card && index < 5) {
            opponentBackLine[index] = convertDefenseDeckCardToServerCard(card);
          }
        });
      }
    }

    // PvP相手が見つからない場合はPvE
    if (!isPvp) {
      const playerScoreData = await getUserScore(steamId);
      const pveOpponent = generatePveOpponentDeck(playerScoreData.score);
      opponentFrontLine = pveOpponent.frontLine;
      opponentBackLine = pveOpponent.backLine;
      opponentName = pveOpponent.enemyName;
    }

    // バトル実行（サーバーサイドで完全に計算）
    const battleResult = executeBattle(
      { frontLine: playerFrontLine, backLine: playerBackLine },
      { frontLine: opponentFrontLine, backLine: opponentBackLine }
    );

    // バトル結果をDBに記録
    const result = battleResult.winner === 'player' ? 'win'
      : battleResult.winner === 'opponent' ? 'lose'
      : 'draw';

    if (isPvp && actualOpponentSteamId) {
      await recordPvpBattle(steamId, result, actualOpponentSteamId);
    } else {
      await recordBattle(steamId, result);
    }

    // レスポンス
    return NextResponse.json({
      success: true,
      battleResult: {
        winner: battleResult.winner,
        playerFinalHp: battleResult.playerFinalHp,
        opponentFinalHp: battleResult.opponentFinalHp,
        totalDamageDealt: battleResult.totalDamageDealt,
        totalDamageReceived: battleResult.totalDamageReceived,
        battleDurationMs: battleResult.battleDurationMs,
        logs: battleResult.logs,
        seed: battleResult.seed,
      },
      opponentName,
      isPvp,
      opponentSteamId: actualOpponentSteamId,
      // プレイヤーとオポーネントのデッキ情報も返す（フロントのアニメーション用）
      playerDeck: {
        frontLine: playerFrontLine,
        backLine: playerBackLine,
      },
      opponentDeck: {
        frontLine: opponentFrontLine,
        backLine: opponentBackLine,
      },
    });
  } catch (error) {
    console.error('Battle execute API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute battle' },
      { status: 500 }
    );
  }
}
