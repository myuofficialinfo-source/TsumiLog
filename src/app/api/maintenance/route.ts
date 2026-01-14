import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET(request: NextRequest) {
  const steamId = request.nextUrl.searchParams.get('steamId');

  // Edge Configから取得（即時反映）
  let isMaintenanceMode = false;
  let maintenanceMessage = 'メンテナンス中です。しばらくお待ちください。';
  let whitelist: string[] = [];

  try {
    const edgeMaintenance = await get('maintenanceMode');
    const edgeMessage = await get('maintenanceMessage');
    const edgeWhitelist = await get('maintenanceWhitelist');

    if (typeof edgeMaintenance === 'boolean') {
      isMaintenanceMode = edgeMaintenance;
    }
    if (typeof edgeMessage === 'string' && edgeMessage) {
      maintenanceMessage = edgeMessage;
    }
    if (Array.isArray(edgeWhitelist)) {
      whitelist = edgeWhitelist.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Edge Config未設定時は環境変数にフォールバック
    isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    if (process.env.MAINTENANCE_MESSAGE) {
      maintenanceMessage = process.env.MAINTENANCE_MESSAGE;
    }
  }

  // ホワイトリストに含まれていればメンテナンスをバイパス
  const isWhitelisted = steamId ? whitelist.includes(steamId) : false;

  return NextResponse.json({
    maintenance: isMaintenanceMode && !isWhitelisted,
    message: maintenanceMessage,
    whitelisted: isWhitelisted,
  });
}
