import { log } from './logger';

export interface PuzzleTimer {
  puzzle_id: string;
  start_time: string | null;
  duration: number;
}

const timers = new Map<string, PuzzleTimer>();

export async function getOrCreateTimer(
  puzzleId: string,
  duration: number,
  startTime: string | null
): Promise<PuzzleTimer | null> {
  let timer = timers.get(puzzleId);
  if (!timer) {
    timer = { puzzle_id: puzzleId, start_time: startTime, duration };
    timers.set(puzzleId, timer);
    log(`Created timer for puzzle ${puzzleId}`);
  }
  return timer;
}

export async function setTimerStart(
  puzzleId: string,
  startTime: string
): Promise<void> {
  const timer = timers.get(puzzleId);
  if (timer) {
    timer.start_time = startTime;
    log(`Timer for puzzle ${puzzleId} started at ${startTime}`);
  } else {
    timers.set(puzzleId, { puzzle_id: puzzleId, start_time: startTime, duration: 0 });
    log(`Timer for puzzle ${puzzleId} created with start ${startTime}`);
  }
}
