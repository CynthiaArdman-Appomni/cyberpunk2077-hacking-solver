import { neon } from '@netlify/neon';

export const sql = process.env.NETLIFY_DATABASE_URL ? neon() : null;

let initialized = false;
export async function ensurePuzzleTable() {
  if (!sql || initialized) return;
  await sql`\
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  grid JSONB NOT NULL,
  daemons JSONB NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER DEFAULT 60
);`;
  initialized = true;
}

