import { neon } from '@netlify/neon';

const connectionString = process.env.NEON_TEST_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

(connectionString ? test : test.skip)('neon read/write round trip', async () => {
  const sql = connectionString ? neon(connectionString) : neon();
  try {
    await sql`CREATE TABLE IF NOT EXISTS neon_test_table (id INT PRIMARY KEY, msg TEXT)`;
    await sql`INSERT INTO neon_test_table (id, msg) VALUES (1, 'hello') ON CONFLICT (id) DO UPDATE SET msg = EXCLUDED.msg`;
    const rows = await sql`SELECT msg FROM neon_test_table WHERE id = 1`;
    expect(rows[0].msg).toEqual('hello');
  } finally {
    await sql`DELETE FROM neon_test_table WHERE id = 1`;
  }
});
