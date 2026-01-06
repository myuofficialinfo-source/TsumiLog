import { NextRequest, NextResponse } from 'next/server';
import { RelyingParty } from 'openid';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

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
      relyingParty.verifyAssertion(fullUrl, (error, result) => {
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

        // Steam IDをクエリパラメータとして返す
        // 本番環境ではセッションやCookieを使うべき
        resolve(NextResponse.redirect(`${baseUrl}?steamId=${steamId}&authenticated=true`));
      });
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
