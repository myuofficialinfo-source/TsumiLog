import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function test() {
  try {
    // テーブル存在確認
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables.map(t => t.table_name));

    // game_usageテーブルの構造確認
    const columns = await sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'game_usage'
    `;
    console.log('game_usage columns:', columns);

    // game_usageテーブルの内容確認
    const usage = await sql`SELECT * FROM game_usage LIMIT 10`;
    console.log('Game Usage:', JSON.stringify(usage, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
