import { NextRequest, NextResponse } from 'next/server';
import {
  initCalendarEventsTable,
  addCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/db';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initCalendarEventsTable();
    dbInitialized = true;
  }
}

// カレンダーイベントを取得
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

    const events = await getCalendarEvents(steamId);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar Events GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// カレンダーイベントを追加
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { steamId, event } = body as {
      steamId: string;
      event: {
        date: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        gameId: number;
        gameName: string;
        gameImage?: string;
        type: 'planned' | 'played' | 'release';
        note?: string;
        playtimeMinutes?: number;
      };
    };

    if (!steamId || !event) {
      return NextResponse.json(
        { error: 'steamId and event are required' },
        { status: 400 }
      );
    }

    if (!event.date || !event.gameId || !event.gameName || !event.type) {
      return NextResponse.json(
        { error: 'event must have date, gameId, gameName, and type' },
        { status: 400 }
      );
    }

    const newEvent = await addCalendarEvent(steamId, event);

    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Calendar Events POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to add calendar event' },
      { status: 500 }
    );
  }
}

// カレンダーイベントを更新
export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { steamId, eventId, updates } = body as {
      steamId: string;
      eventId: string;
      updates: {
        date?: string;
        endDate?: string | null;
        startTime?: string | null;
        endTime?: string | null;
        type?: 'planned' | 'played' | 'release';
        note?: string | null;
        playtimeMinutes?: number | null;
      };
    };

    if (!steamId || !eventId) {
      return NextResponse.json(
        { error: 'steamId and eventId are required' },
        { status: 400 }
      );
    }

    const updatedEvent = await updateCalendarEvent(steamId, eventId, updates);

    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Event not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Calendar Events PUT API error:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// カレンダーイベントを削除
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const eventId = searchParams.get('eventId');

    if (!steamId || !eventId) {
      return NextResponse.json(
        { error: 'steamId and eventId are required' },
        { status: 400 }
      );
    }

    const deleted = await deleteCalendarEvent(steamId, eventId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Event not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar Events DELETE API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
