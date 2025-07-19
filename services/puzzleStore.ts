import { randomBytes } from 'crypto';
import { generatePuzzle, combineDaemons, Puzzle } from '../lib/puzzleGenerator';
import { countSolutions as countSolutionsForMatrix } from '../lib/bruteCounter';
import { log } from './logger';

const puzzles = new Map<string, StoredPuzzle>();

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Impossible' | 'Unknown';

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
  logError(
    `Failed to generate puzzle with difficulty ${diff} after 50 attempts, using random puzzle`
  );
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
  puzzles.set(id, stored);
  log(`Created puzzle ${id} (${difficulty})`);
  return { id, puzzle: stored };
}

export async function getPuzzle(id: string): Promise<StoredPuzzle | null> {
  const puzzle = puzzles.get(id) || null;
  if (puzzle) {
    log(`Loaded puzzle ${id} from memory`);
  } else {
    logError(`Puzzle ${id} not found in memory`);
  }
  return puzzle;
}

