import type { NextApiRequest, NextApiResponse } from 'next';
import { getPuzzle, getPuzzleSecret } from '../../../services/puzzleStore';
import { log, logError } from '../../../services/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    logError(`Invalid id parameter on /api/puzzle - value: ${String(id)}`);
    res.status(400).end();
    return;
  }
  try {
    if (req.query.secret === '1') {
      const secret = getPuzzleSecret(id);
      if (!secret) {
        logError(`Secret for puzzle ${id} not found`);
        res.status(404).json({ error: 'Puzzle not found' });
        return;
      }
      log(`API /puzzle/${id}?secret=1 returned secret`);
      res.status(200).json({ secretWord: secret });
      return;
    }

    const puzzle = await getPuzzle(id);
    if (!puzzle) {
      logError(`Puzzle ${id} not found`);
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
