import { NextRequest, NextResponse } from 'next/server';
import {
  initDeckTable,
  saveDeck,
  getDeck,
  getAllDecks,
  setActiveDeck,
  getActiveDeck,
  SavedDeckCard,
} from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDeckTable();
    dbInitialized = true;
  }
}

// デッキを取得
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const deckNumber = searchParams.get('deckNumber');
    const activeOnly = searchParams.get('activeOnly');

    if (!steamId) {
      return NextResponse.json(
        { error: 'steamId is required' },
        { status: 400 }
      );
    }

    // アクティブデッキのみ取得
    if (activeOnly === 'true') {
      const activeDeck = await getActiveDeck(steamId);
      return NextResponse.json({ activeDeck });
    }

    // 特定のデッキを取得
    if (deckNumber) {
      const num = parseInt(deckNumber, 10);
      if (isNaN(num) || num < 1 || num > 5) {
        return NextResponse.json(
          { error: 'deckNumber must be between 1 and 5' },
          { status: 400 }
        );
      }
      const deck = await getDeck(steamId, num);
      return NextResponse.json({ deck });
    }

    // 全デッキを取得
    const decks = await getAllDecks(steamId);
    return NextResponse.json({ decks });
  } catch (error) {
    console.error('Deck GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deck' },
      { status: 500 }
    );
  }
}

// デッキを保存
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { steamId, deckNumber, frontLine, backLine } = body as {
      steamId: string;
      deckNumber: number;
      frontLine: SavedDeckCard[];
      backLine: SavedDeckCard[];
    };

    if (!steamId || !deckNumber) {
      return NextResponse.json(
        { error: 'steamId and deckNumber are required' },
        { status: 400 }
      );
    }

    if (deckNumber < 1 || deckNumber > 5) {
      return NextResponse.json(
        { error: 'deckNumber must be between 1 and 5' },
        { status: 400 }
      );
    }

    await saveDeck(steamId, deckNumber, frontLine || [], backLine || []);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deck POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to save deck' },
      { status: 500 }
    );
  }
}

// アクティブデッキを設定
export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { steamId, deckNumber } = body as {
      steamId: string;
      deckNumber: number;
    };

    if (!steamId || !deckNumber) {
      return NextResponse.json(
        { error: 'steamId and deckNumber are required' },
        { status: 400 }
      );
    }

    if (deckNumber < 1 || deckNumber > 5) {
      return NextResponse.json(
        { error: 'deckNumber must be between 1 and 5' },
        { status: 400 }
      );
    }

    await setActiveDeck(steamId, deckNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deck PUT API error:', error);
    return NextResponse.json(
      { error: 'Failed to set active deck' },
      { status: 500 }
    );
  }
}
