export const HEX_VALUES = ["1C", "55", "BD", "E9", "7A", "FF"];

export type Pos = { r: number; c: number };

function randomHex() {
  return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

function generateDaemon(length: number): string[] {
  const seq: string[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(randomHex());
  }
  return seq;
}

function scsTwo(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = m; i >= 0; i--) {
    for (let j = n; j >= 0; j--) {
      if (i === m && j === n) {
        dp[i][j] = 0;
      } else if (i === m) {
        dp[i][j] = n - j;
      } else if (j === n) {
        dp[i][j] = m - i;
      } else if (a[i] === b[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i === m) {
      result.push(b[j++]);
    } else if (j === n) {
      result.push(a[i++]);
    } else if (a[i] === b[j]) {
      result.push(a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] <= dp[i][j + 1]) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  return result;
}

function mergeWithOverlap(a: string[], b: string[]) {
  let bestOverlap = 0;
  let merged: string[] = a.concat(b);
  const max = Math.min(a.length, b.length);
  for (let i = 1; i <= max; i++) {
    if (a.slice(-i).join() === b.slice(0, i).join()) {
      if (i > bestOverlap) {
        bestOverlap = i;
        merged = a.concat(b.slice(i));
      }
    }
    if (b.slice(-i).join() === a.slice(0, i).join()) {
      if (i > bestOverlap) {
        bestOverlap = i;
        merged = b.concat(a.slice(i));
      }
    }
  }
  return merged;
}

export function combineDaemons(daemons: string[][]) {
  if (daemons.length === 0) return [] as string[];
  let seqs = daemons.map((d) => d.slice());
  while (seqs.length > 1) {
    let bestI = 0;
    let bestJ = 1;
    let best = mergeWithOverlap(seqs[0], seqs[1]);
    let bestLen = best.length;
    for (let i = 0; i < seqs.length; i++) {
      for (let j = i + 1; j < seqs.length; j++) {
        const merged = mergeWithOverlap(seqs[i], seqs[j]);
        if (merged.length < bestLen) {
          bestLen = merged.length;
          best = merged;
          bestI = i;
          bestJ = j;
        }
      }
    }
    const remain = seqs.filter((_, idx) => idx !== bestI && idx !== bestJ);
    seqs = [best, ...remain];
  }
  return seqs[0];
}

export function generatePathPositions(
  length: number,
  rows: number,
  cols: number,
  startRow: number
): Pos[] {
  const path: Pos[] = [];
  let r = startRow;
  let c = Math.floor(Math.random() * cols);
  const used = new Set<string>();
  path.push({ r, c });
  used.add(`${r},${c}`);
  for (let i = 1; i < length; i++) {
    if (i % 2 === 1) {
      let newR = Math.floor(Math.random() * rows);
      if (rows > 1) {
        while (newR === r) newR = Math.floor(Math.random() * rows);
      }
      r = newR;
    } else {
      let newC = Math.floor(Math.random() * cols);
      if (cols > 1) {
        while (newC === c) newC = Math.floor(Math.random() * cols);
      }
      c = newC;
    }
    let attempts = 0;
    while (used.has(`${r},${c}`) && attempts < rows * cols) {
      if (i % 2 === 1) {
        r = Math.floor(Math.random() * rows);
      } else {
        c = Math.floor(Math.random() * cols);
      }
      attempts++;
    }
    path.push({ r, c });
    used.add(`${r},${c}`);
  }
  return path;
}

export interface Puzzle {
  grid: string[][];
  daemons: string[][];
  bufferSize: number;
  path: Pos[];
  solutionSeq: string[];
}

export function generatePuzzle(
  rows = 5,
  cols = 5,
  count = 3,
  startRow = 0,
  maxLen = 4
): Puzzle {
  const daemons: string[][] = [];
  for (let i = 0; i < count; i++) {
    const length = Math.floor(Math.random() * Math.max(1, maxLen - 1)) + 2;
    daemons.push(generateDaemon(length));
  }

  const solutionSeq = combineDaemons(daemons);
  const bufferSize = solutionSeq.length;

  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(randomHex());
    }
    grid.push(row);
  }

  const path = generatePathPositions(bufferSize, rows, cols, startRow);
  for (let i = 0; i < path.length; i++) {
    const { r, c } = path[i];
    grid[r][c] = solutionSeq[i];
  }

  return { grid, daemons, bufferSize, path, solutionSeq };
}
