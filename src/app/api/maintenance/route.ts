import { NextResponse } from 'next/server';

export async function GET() {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 'メンテナンス中です。しばらくお待ちください。';

  return NextResponse.json({
    maintenance: isMaintenanceMode,
    message: maintenanceMessage,
  });
}
