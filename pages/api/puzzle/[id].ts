import type { NextApiRequest, NextApiResponse } from 'next';
import { getPuzzle } from '../../../services/puzzleStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).end();
    return;
  }
  const puzzle = await getPuzzle(id);
  if (!puzzle) {
    res.status(404).end();
    return;
  }
  const { grid, daemons, bufferSize, timeLimit, startTime, difficulty } = puzzle;
  res.status(200).json({ grid, daemons, bufferSize, timeLimit, startTime, difficulty });
}
