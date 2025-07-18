import { randomBytes } from 'crypto';
import { generatePuzzle, combineDaemons, Puzzle } from '../lib/puzzleGenerator';
import { countSolutions as countSolutionsForMatrix } from '../lib/bruteCounter';
import { supabase } from './supabaseClient';
import { sql, ensurePuzzleTable } from './neonClient';

const puzzles = new Map<string, StoredPuzzle>();
const useSupabase = !!supabase;
const useNeon = !!sql;

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Impossible';

export interface StoredPuzzle extends Puzzle {
  timeLimit: number;
  startTime: string | null;
  difficulty: Difficulty;
  solutionCount: number;
}

function countSolutions(puzzle: Puzzle): number {
  const hexToNum = (h: string) => parseInt(h, 16);
  const matrix = puzzle.grid.map((row) => row.map(hexToNum));
  const pattern = combineDaemons(puzzle.daemons).map(hexToNum);
  return countSolutionsForMatrix(pattern, matrix);
}

async function generatePuzzleWithDifficulty(diff: Difficulty): Promise<Puzzle> {
  // try up to 50 times to find a puzzle matching difficulty
  for (let i = 0; i < 50; i++) {
    const puzzle = generatePuzzle();
    const solutions = countSolutions(puzzle);
    if (
      (diff === 'Easy' && solutions > 5) ||
      (diff === 'Medium' && solutions >= 2 && solutions <= 5) ||
      (diff === 'Hard' && solutions === 1) ||
      (diff === 'Impossible' && solutions === 0)
    ) {
      return puzzle;
    }
  }
  // fallback random puzzle
  return generatePuzzle();
}

export async function createPuzzle(options: {
  difficulty: Difficulty;
  timeLimit: number;
  startOnFirstClick?: boolean;
}): Promise<{ id: string; puzzle: StoredPuzzle }> {
  const { difficulty, timeLimit, startOnFirstClick } = options;
  const puzzle = await generatePuzzleWithDifficulty(difficulty);
  const solutionCount = countSolutions(puzzle);
  const id = randomBytes(8).toString('hex');
  const stored: StoredPuzzle = {
    ...puzzle,
    timeLimit,
    startTime: startOnFirstClick ? null : new Date().toISOString(),
    difficulty,
    solutionCount,
  };
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      await sql!
        `INSERT INTO puzzles (id, grid, daemons, start_time, duration)
        VALUES (${id}, ${stored.grid}, ${stored.daemons}, ${stored.startTime}, ${timeLimit})`;
    } catch (e) {
      console.error('Database error:', e);
    }
  } else if (useSupabase) {
    await supabase!.from('puzzles').insert([{ id, data: stored }]);
  } else {
    puzzles.set(id, stored);
  }
  return { id, puzzle: stored };
}

export async function getPuzzle(id: string): Promise<StoredPuzzle | null> {
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      const rows = await sql!`SELECT grid, daemons, start_time, duration FROM puzzles WHERE id = ${id}`;
      if (rows.length === 0) return null;
      const row = rows[0] as any;
      const grid = row.grid as string[][];
      const daemons = row.daemons as string[][];
      const timeLimit = row.duration as number;
      const startTime = row.start_time ? new Date(row.start_time).toISOString() : null;
      const bufferSize = combineDaemons(daemons).length;
      return { grid, daemons, bufferSize, timeLimit, startTime, difficulty: 'Unknown', solutionCount: 0 };
    } catch (e) {
      console.error('Database error:', e);
      throw e;
    }
  }
  if (useSupabase) {
    const { data, error } = await supabase!
      .from('puzzles')
      .select('data')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data.data as StoredPuzzle;
  }
  return puzzles.get(id) || null;
}

