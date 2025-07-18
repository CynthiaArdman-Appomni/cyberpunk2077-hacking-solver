import type { NextApiRequest, NextApiResponse } from 'next';
import { getPuzzle } from '../../../services/puzzleStore';
import { log, logError } from '../../../services/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).end();
    return;
  }
  try {
    const puzzle = await getPuzzle(id);
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }
    const { grid, daemons, bufferSize, timeLimit, startTime, difficulty } = puzzle;
    log(`API /puzzle/${id} returned puzzle`);
    res.status(200).json({ grid, daemons, bufferSize, timeLimit, startTime, difficulty });
  } catch (e) {
    logError('Database error on get puzzle', e);
    res.status(500).json({ error: 'database' });
  }
}
