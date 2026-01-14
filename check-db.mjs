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

    // user_decksテーブルの内容確認
    const decks = await sql`SELECT * FROM user_decks LIMIT 5`;
    console.log('Decks:', JSON.stringify(decks, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
