import type { NextApiRequest, NextApiResponse } from 'next';
import { createPuzzle } from '../../../services/puzzleStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const { rows, cols, daemonCount, maxDaemonLen, timeLimit } = req.body || {};
  const r = parseInt(rows);
  const c = parseInt(cols);
  const dc = parseInt(daemonCount);
  const ml = parseInt(maxDaemonLen);
  const tl = parseInt(timeLimit);
  if ([r, c, dc, ml, tl].some((n) => Number.isNaN(n))) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }
  const { id, puzzle } = createPuzzle({
    rows: r,
    cols: c,
    daemonCount: dc,
    maxDaemonLen: ml,
    timeLimit: tl,
  });
  res.status(200).json({ id, puzzle });
}
