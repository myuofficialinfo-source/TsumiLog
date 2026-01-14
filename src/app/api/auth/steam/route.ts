import { NextRequest, NextResponse } from 'next/server';
import { RelyingParty } from 'openid';
import { getUserProfile } from '@/lib/steam';
import { upsertUser, initDatabase } from '@/lib/db';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

// DB初期化フラグ
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const baseUrl = getBaseUrl(request);

  if (action === 'login') {
    // Steam OpenID認証を開始
    const relyingParty = new RelyingParty(
      `${baseUrl}/api/auth/steam?action=callback`,
      baseUrl,
      true,
      true,
      []
    );

    return new Promise<NextResponse>((resolve) => {
      relyingParty.authenticate(STEAM_OPENID_URL, false, (error, authUrl) => {
        if (error || !authUrl) {
          resolve(
            NextResponse.json(
              { error: 'Steam認証の開始に失敗しました' },
              { status: 500 }
            )
          );
        } else {
          resolve(NextResponse.redirect(authUrl));
        }
      });
    });
  }

  if (action === 'callback') {
    // Steam OpenIDコールバック処理
    const relyingParty = new RelyingParty(
      `${baseUrl}/api/auth/steam?action=callback`,
      baseUrl,
      true,
      true,
      []
    );

    // URLからOpenIDパラメータを取得
    const fullUrl = request.url;

    return new Promise<NextResponse>((resolve) => {
      relyingParty.verifyAssertion(fullUrl, async (error, result) => {
        if (error || !result || !result.authenticated) {
          resolve(NextResponse.redirect(`${baseUrl}?error=auth_failed`));
          return;
        }

        // Steam IDを抽出（claimedIdentifierから）
        const claimedId = result.claimedIdentifier;
        const steamIdMatch = claimedId?.match(/\/id\/(\d+)$/);
        const steamId = steamIdMatch ? steamIdMatch[1] : null;

        if (!steamId) {
          resolve(NextResponse.redirect(`${baseUrl}?error=invalid_steam_id`));
          return;
        }

        // ユーザーをDBに登録（ログイン時に自動登録）
        try {
          await ensureDbInitialized();

          // Steamプロフィールを取得
          const profile = await getUserProfile(steamId);

          // DBにユーザー登録（新規ユーザーは最下位からスタート）
          await upsertUser(
            steamId,
            profile?.personaName,
            profile?.avatarUrl
          );
        } catch (dbError) {
          console.error('Failed to register user:', dbError);
          // DB登録失敗しても認証は続行
        }

        // Steam IDをクエリパラメータとして返す
        // 本番環境ではセッションやCookieを使うべき
        resolve(NextResponse.redirect(`${baseUrl}?steamId=${steamId}&authenticated=true`));
      });
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
