import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
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
const filePath = path.join(process.cwd(), 'puzzles.json');

function loadFromFile() {
  if (useNeon) return;
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const obj = JSON.parse(raw) as Record<string, StoredPuzzle>;
      Object.entries(obj).forEach(([id, puzzle]) => puzzles.set(id, puzzle));
      log(`Loaded ${Object.keys(obj).length} puzzles from disk`);
    }
  } catch (e) {
    logError('Failed to read puzzles from disk', e);
  }
}

function saveToFile() {
  if (useNeon) return;
  try {
    const obj = Object.fromEntries(puzzles);
    fs.writeFileSync(filePath, JSON.stringify(obj));
  } catch (e) {
    logError('Failed to write puzzles to disk', e);
  }
}

loadFromFile();

function randomHex() {
  return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

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
  };
  puzzles.set(id, stored);
  saveToFile();
  log(`Created puzzle ${id} (${difficulty})`);
  if (useNeon) {
    await ensurePuzzleTable();
    try {
      await sql!
        `INSERT INTO puzzles (id, grid, daemons, start_time, duration)
        VALUES (
          ${id},
          ${JSON.stringify(stored.grid)},
          ${JSON.stringify(stored.daemons)},
          ${stored.startTime},
          ${timeLimit}
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
      const rows = await sql!`SELECT grid, daemons, start_time, duration FROM puzzles WHERE id = ${id}`;
      if (rows.length > 0) {
        const row = rows[0] as any;
        const grid = row.grid as string[][];
        const daemons = row.daemons as string[][];
        const timeLimit = row.duration as number;
        const startTime = row.start_time ? new Date(row.start_time).toISOString() : null;
        const solutionSeq = combineDaemons(daemons);
        const bufferSize = solutionSeq.length;
        log(`Loaded puzzle ${id} from database`);
        return { grid, daemons, bufferSize, path: [], solutionSeq, timeLimit, startTime, difficulty: 'Unknown', solutionCount: 0 };
      }
    } catch (e) {
      logError('Database error on getPuzzle', e);
    }
  }
  let puzzle = puzzles.get(id) || null;
  if (!puzzle) {
    loadFromFile();
    puzzle = puzzles.get(id) || null;
  }
  if (puzzle) {
    log(`Loaded puzzle ${id} from memory`);
  } else {
    logError(`Puzzle ${id} not found in memory`);
  }
  return puzzle;
}

