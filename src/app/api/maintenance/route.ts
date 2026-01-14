import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET() {
  // Edge Configから取得（即時反映）
  let isMaintenanceMode = false;
  let maintenanceMessage = 'メンテナンス中です。しばらくお待ちください。';

  try {
    const edgeMaintenance = await get('maintenanceMode');
    const edgeMessage = await get('maintenanceMessage');

    if (typeof edgeMaintenance === 'boolean') {
      isMaintenanceMode = edgeMaintenance;
    }
    if (typeof edgeMessage === 'string' && edgeMessage) {
      maintenanceMessage = edgeMessage;
    }
  } catch {
    // Edge Config未設定時は環境変数にフォールバック
    isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    if (process.env.MAINTENANCE_MESSAGE) {
      maintenanceMessage = process.env.MAINTENANCE_MESSAGE;
    }
  }

  return NextResponse.json({
    maintenance: isMaintenanceMode,
    message: maintenanceMessage,
  });
}
