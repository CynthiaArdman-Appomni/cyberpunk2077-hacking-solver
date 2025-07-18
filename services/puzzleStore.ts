import { randomBytes } from 'crypto';
import { generatePuzzle, Puzzle } from '../lib/puzzleGenerator';

export interface StoredPuzzle extends Puzzle {
  timeLimit: number;
}

const puzzles = new Map<string, StoredPuzzle>();

export function createPuzzle(options: {
  rows: number;
  cols: number;
  daemonCount: number;
  maxDaemonLen: number;
  startRow?: number;
  timeLimit: number;
}): { id: string; puzzle: StoredPuzzle } {
  const { rows, cols, daemonCount, maxDaemonLen, startRow = 0, timeLimit } = options;
  const puzzle = generatePuzzle(rows, cols, daemonCount, startRow, maxDaemonLen);
  const stored: StoredPuzzle = { ...puzzle, timeLimit };
  const id = randomBytes(8).toString('hex');
  puzzles.set(id, stored);
  return { id, puzzle: stored };
}

export function getPuzzle(id: string): StoredPuzzle | undefined {
  return puzzles.get(id);
}
