import { randomBytes } from 'crypto';
import {
  generatePuzzle,
  combineDaemons,
  Puzzle,
  HEX_VALUES,
} from '../lib/puzzleGenerator';
import { countSolutions as countSolutionsForMatrix } from '../lib/bruteCounter';
import { sql, ensurePuzzleTable } from './neonClient';
import { log, logError } from './logger';

const puzzles = new Map<string, StoredPuzzle>();
const useNeon = !!process.env.NETLIFY_DATABASE_URL;

function randomHex() {
  return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

const CODE_WORDS = [
  'ALPHA',
  'BRAVO',
  'CHARLIE',
  'DELTA',
  'ECHO',
  'FOXTROT',
  'GHOST',
  'NOVA',
  'OMEGA',
  'PHANTOM',
  'VORTEX',
];

function randomCodeWord() {
  return CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Impossible' | 'Unknown';

export interface StoredPuzzle extends Puzzle {
  timeLimit: number;
  startTime: string | null;
  difficulty: Difficulty;
  solutionCount: number;
  secretWord: string;
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
    let puzzle = generatePuzzle();

    if (diff === 'Impossible') {
      // scramble the inserted solution so the puzzle has no valid solutions
      puzzle.path.forEach(({ r, c }, idx) => {
        let val = randomHex();
        if (val === puzzle.solutionSeq[idx]) {
          val = randomHex();
        }
        puzzle.grid[r][c] = val;
      });
      // assign a random buffer size between 1 and the original solution length - 1
      puzzle.bufferSize = Math.max(1, Math.floor(Math.random() * puzzle.solutionSeq.length));
    }

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
  let puzzle = generatePuzzle();
  if (diff === 'Impossible') {
    puzzle.path.forEach(({ r, c }, idx) => {
      let val = randomHex();
      if (val === puzzle.solutionSeq[idx]) {
        val = randomHex();
      }
      puzzle.grid[r][c] = val;
    });
    puzzle.bufferSize = Math.max(1, Math.floor(Math.random() * puzzle.solutionSeq.length));
  }
  return puzzle;
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
    secretWord: randomCodeWord(),
  };
  puzzles.set(id, stored);
  log(`Created puzzle ${id} (${difficulty})`);
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      await sql!
        `INSERT INTO puzzles (id, grid, daemons, start_time, duration, secret_word)
        VALUES (
          ${id},
          ${JSON.stringify(stored.grid)},
          ${JSON.stringify(stored.daemons)},
          ${stored.startTime},
          ${timeLimit},
          ${stored.secretWord}
        )`;
      log(`Stored puzzle ${id} in database`);
    } catch (e) {
      logError('Database error on createPuzzle', e);
    }
  }
  return { id, puzzle: stored };
}

export async function getPuzzle(id: string): Promise<StoredPuzzle | null> {
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      const rows = await sql!`SELECT grid, daemons, start_time, duration, secret_word FROM puzzles WHERE id = ${id}`;
      if (rows.length > 0) {
        const row = rows[0] as any;
        const grid = row.grid as string[][];
        const daemons = row.daemons as string[][];
        const timeLimit = row.duration as number;
        const startTime = row.start_time ? new Date(row.start_time).toISOString() : null;
        const secretWord = row.secret_word as string | null;
        const solutionSeq = combineDaemons(daemons);
        const bufferSize = solutionSeq.length;
        log(`Loaded puzzle ${id} from database`);
        const stored: StoredPuzzle = { grid, daemons, bufferSize, path: [], solutionSeq, timeLimit, startTime, difficulty: 'Unknown', solutionCount: 0, secretWord: secretWord || '' };
        puzzles.set(id, stored);
        return stored;
      }
    } catch (e) {
      logError('Database error on getPuzzle', e);
    }
  }
  const puzzle = puzzles.get(id) || null;
  if (puzzle) {
    log(`Loaded puzzle ${id} from memory`);
  } else {
    logError(`Puzzle ${id} not found in memory`);
  }
  return puzzle;
}

export async function getPuzzleSecret(id: string): Promise<string | null> {
  const puzzle = puzzles.get(id);
  if (puzzle) return puzzle.secretWord;
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      const rows = await sql!`SELECT secret_word FROM puzzles WHERE id = ${id}`;
      if (rows.length > 0) {
        const word = rows[0].secret_word as string | null;
        return word || null;
      }
    } catch (e) {
      logError('Database error on getPuzzleSecret', e);
    }
  }
  return null;
}

