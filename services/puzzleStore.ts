import { randomBytes } from 'crypto';
import { generatePuzzle, combineDaemons, Puzzle } from '../lib/puzzleGenerator';
import { countSolutions as countSolutionsForMatrix } from '../lib/bruteCounter';
import { supabase } from './supabaseClient';

const puzzles = new Map<string, StoredPuzzle>();
const useSupabase = !!supabase;

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Impossible';

export interface StoredPuzzle extends Puzzle {
  timeLimit: number;
  startTime: string;
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
}): Promise<{ id: string; puzzle: StoredPuzzle }> {
  const { difficulty, timeLimit } = options;
  const puzzle = await generatePuzzleWithDifficulty(difficulty);
  const solutionCount = countSolutions(puzzle);
  const id = randomBytes(8).toString('hex');
  const stored: StoredPuzzle = {
    ...puzzle,
    timeLimit,
    startTime: new Date().toISOString(),
    difficulty,
    solutionCount,
  };
  if (useSupabase) {
    await supabase!.from('puzzles').insert([{ id, data: stored }]);
  } else {
    puzzles.set(id, stored);
  }
  return { id, puzzle: stored };
}

export async function getPuzzle(id: string): Promise<StoredPuzzle | null> {
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
