import type { NextApiRequest, NextApiResponse } from 'next';
import { createPuzzle, Difficulty } from '../../../services/puzzleStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const { difficulty, timeLimit } = req.body || {};
  const tl = parseInt(timeLimit);
  if (!difficulty || Number.isNaN(tl)) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }
  try {
    const { id, puzzle } = await createPuzzle({
      difficulty: difficulty as Difficulty,
      timeLimit: tl,
    });
    res.status(200).json({ id, puzzle });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create puzzle' });
  }
}
