import { neon } from '@netlify/neon';

const connectionString = process.env.NETLIFY_DATABASE_URL;

export const sql = connectionString ? neon(connectionString) : null;

let initialized = false;
export async function ensurePuzzleTable() {
  if (!sql || initialized) return;
  await sql`\
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  grid JSONB NOT NULL,
  daemons JSONB NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER DEFAULT 60,
  secret_word TEXT,
  daemon_words JSONB
);`;
  await sql`ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS secret_word TEXT;`;
  await sql`ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS daemon_words JSONB;`;
  initialized = true;
}

