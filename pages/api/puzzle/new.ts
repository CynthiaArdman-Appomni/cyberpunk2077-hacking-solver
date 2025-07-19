import type { NextApiRequest, NextApiResponse } from 'next';
import { createPuzzle, Difficulty } from '../../../services/puzzleStore';
import { log, logError } from '../../../services/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    logError(`Invalid method ${req.method} on /api/puzzle/new`);
    res.status(405).end();
    return;
  }
  const { difficulty, timeLimit, startOnFirstClick } = req.body || {};
  const tl = parseInt(timeLimit);
  if (!difficulty || Number.isNaN(tl)) {
    logError(
      `Invalid parameters: difficulty="${difficulty}" timeLimit="${timeLimit}"`
    );
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }
  try {
    const { id, puzzle } = await createPuzzle({
      difficulty: difficulty as Difficulty,
      timeLimit: tl,
      startOnFirstClick: startOnFirstClick !== false,
    });
    log(`API /puzzle/new created puzzle ${id}`);
    res.status(200).json({ id, puzzle });
  } catch (e) {
    logError('Failed to create puzzle', e);
    res.status(500).json({ error: 'Failed to create puzzle' });
  }
}
