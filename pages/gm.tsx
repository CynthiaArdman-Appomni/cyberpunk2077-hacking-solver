import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Head from "next/head";
import { Container, Row, Col, Form } from "react-bootstrap";
import cz from "classnames";

import Layout from "../components/Layout";
import MainTitle from "../components/MainTitle";
import Button from "../components/Button";

import indexStyles from "../styles/Index.module.scss";
import styles from "../styles/PuzzleGenerator.module.scss";

const HEX_VALUES = ["1C", "55", "BD", "E9", "7A", "FF"];

type Pos = { r: number; c: number };

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

function shortestCommonSupersequence(seqs: string[][]): string[] {
  if (seqs.length === 0) return [];
  const permutations = (arr: string[][]): string[][][] => {
    if (arr.length <= 1) return [arr];
    const res: string[][][] = [];
    arr.forEach((item, idx) => {
      const rest = arr.slice(0, idx).concat(arr.slice(idx + 1));
      permutations(rest).forEach((perm) => res.push([item, ...perm]));
    });
    return res;
  };

  let best: string[] | null = null;
  permutations(seqs).forEach((perm) => {
    let current = perm[0];
    for (let i = 1; i < perm.length; i++) {
      current = scsTwo(current, perm[i]);
    }
    if (!best || current.length < best.length) {
      best = current;
    }
  });
  return best as string[];
}

function generatePathPositions(
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

function generatePuzzle(
  rows = 5,
  cols = 5,
  count = 3,
  startRow = 0,
  maxLen = 4
) {
  const daemons: string[][] = [];
  for (let i = 0; i < count; i++) {
    const length = Math.floor(Math.random() * Math.max(1, maxLen - 1)) + 2;
    daemons.push(generateDaemon(length));
  }

  const solutionSeq = shortestCommonSupersequence(daemons);
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

  return { grid, daemons, bufferSize };
}

const Separator = ({ className }: { className?: string }) => (
  <hr className={cz(indexStyles.separator, className)} />
);

const ReportIssue = () => (
  <p className={indexStyles["report-issue"]}>
    Having issues? Solver not working?{' '}
    <a
      href="https://github.com/cxcorp/cyberpunk2077-hacking-solver/issues"
      rel="noopener"
      target="_blank"
    >
      Report an issue
    </a>
    .
  </p>
);

export default function GMPage() {
  const startRow = 0;
  const [rows, setRows] = useState("5");
  const [cols, setCols] = useState("5");
  const [daemonCount, setDaemonCount] = useState("3");
  const [maxDaemonLen, setMaxDaemonLen] = useState("4");
  const [timeLimit, setTimeLimit] = useState("60");

  const [puzzle, setPuzzle] = useState(() =>
    generatePuzzle(
      parseInt(rows, 10),
      parseInt(cols, 10),
      parseInt(daemonCount, 10),
      startRow,
      parseInt(maxDaemonLen, 10)
    )
  );
  const [bufferSize, setBufferSize] = useState(() => puzzle.bufferSize);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>({ msg: "" });
  const [ended, setEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(parseInt(timeLimit, 10));
  const [solutionPath, setSolutionPath] = useState<Pos[] | null>(null);
  const [solutionSequence, setSolutionSequence] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const cellSize = Math.max(24, 60 - Math.max(0, parseInt(cols, 10) - 5) * 4);

  const parseNumber = (value: string): number | null => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  };

  const newPuzzle = useCallback(async () => {
    const r = parseNumber(rows);
    const c = parseNumber(cols);
    const dc = parseNumber(daemonCount);
    const ml = parseNumber(maxDaemonLen);
    const tl = parseNumber(timeLimit);

    if (r === null || c === null || dc === null || ml === null || tl === null) {
      return;
    }

    const p = generatePuzzle(r, c, dc, startRow, ml);

    const runSolver = (await import("../lib/bruter")).default;
    const hexToNum = (h: string) => parseInt(h, 16);
    const matrix = p.grid.map((row) => row.map(hexToNum));
    const seqs = p.daemons.map((d) => d.map(hexToNum));
    const solvable = !!runSolver(matrix, seqs, p.bufferSize, {});
    const pathString = p.path
      .map((pos) => `(${pos.r},${pos.c})`)
      .join(" -> ");

    if (!solvable) {
      setFeedback({
        msg:
          "Puzzle unsolvable with current settings—please adjust daemon lengths, grid dimensions, or buffer size.",
        type: "error",
      });
      return;
    }

    setPuzzle(p);
    setBufferSize(p.bufferSize);
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setSolutionPath(null);
    setSolutionSequence("");
    setTimeRemaining(tl);
    setDebugInfo(`Solution path: ${pathString}`);
  }, [rows, cols, daemonCount, startRow, maxDaemonLen, timeLimit]);

  const resetSelection = useCallback(() => {
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setSolutionPath(null);
    setSolutionSequence("");
    const tl = parseNumber(timeLimit);
    if (tl !== null) {
      setTimeRemaining(tl);
    }
  }, [timeLimit]);

  useEffect(() => {
    newPuzzle();
  }, [rows, cols, daemonCount, maxDaemonLen, timeLimit, newPuzzle]);

  useEffect(() => {
    if (ended) return;
    const id = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(id);
          setEnded(true);
          setFeedback({ msg: "TIME UP", type: "error" });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ended, puzzle]);

  const checkDaemons = useCallback(
    (sel: Pos[]) => {
      const seq = sel.map((p) => puzzle.grid[p.r][p.c]);
      const solvedSet = new Set(solved);

      const containsSubsequence = (arr: string[], subseq: string[]) => {
        let idx = 0;
        for (const val of arr) {
          if (val === subseq[idx]) {
            idx++;
            if (idx === subseq.length) return true;
          }
        }
        return false;
      };

      puzzle.daemons.forEach((daemon, idx) => {
        if (solvedSet.has(idx)) return;
        if (containsSubsequence(seq, daemon)) {
          solvedSet.add(idx);
          setFeedback({ msg: "DAEMON BREACHED!", type: "success" });
        }
      });
      setSolved(solvedSet);
      return solvedSet;
    },
    [puzzle, solved]
  );

  const updateLines = useCallback(() => {
    if (!gridRef.current) return;
    const containerRect = gridRef.current.getBoundingClientRect();
    const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < selection.length - 1; i++) {
      const from = cellRefs.current[selection[i].r]?.[selection[i].c];
      const to = cellRefs.current[selection[i + 1].r]?.[selection[i + 1].c];
      if (!from || !to) continue;
      const r1 = from.getBoundingClientRect();
      const r2 = to.getBoundingClientRect();
      newLines.push({
        x1: r1.left - containerRect.left + r1.width / 2,
        y1: r1.top - containerRect.top + r1.height / 2,
        x2: r2.left - containerRect.left + r2.width / 2,
        y2: r2.top - containerRect.top + r2.height / 2,
      });
    }
    setLines(newLines);
  }, [selection]);

  const showSolutionPath = useCallback(async () => {
    const runSolver = (await import("../lib/bruter")).default;
    const hexToNum = (h: string) => parseInt(h, 16);
    const matrix = puzzle.grid.map((row) => row.map(hexToNum));
    const seqs = puzzle.daemons.map((d) => d.map(hexToNum));
    const result = runSolver(matrix, seqs, puzzle.bufferSize, {});
    if (!result || result.match.includes.length < puzzle.daemons.length) {
      setFeedback({
        msg: "Puzzle settings created an unsolvable combination. Please adjust settings.",
        type: "error",
      });
      setSolutionPath(null);
      setSolutionSequence("");
      return;
    }
    const path = result.solution.map(({ y, x }) => ({ r: y, c: x }));
    setSolutionPath(path);
    setSolutionSequence(path.map((p) => puzzle.grid[p.r][p.c]).join(" "));
    setFeedback({ msg: "" });
  }, [puzzle]);

  useEffect(() => {
    updateLines();
  }, [updateLines, puzzle]);

  useEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (ended || selection.length >= bufferSize) return;

      const newSel = selection.slice();
      if (newSel.length === 0) {
        if (r !== startRow) {
          setFeedback({ msg: "First selection must be from the highlighted row.", type: "error" });
          return;
        }
      } else {
        const last = newSel[newSel.length - 1];
        const expectColumn = newSel.length % 2 === 1;
        if (expectColumn && c !== last.c) {
          setFeedback({ msg: "Select a cell in the same column.", type: "error" });
          return;
        }
        if (!expectColumn && r !== last.r) {
          setFeedback({ msg: "Select a cell in the same row.", type: "error" });
          return;
        }
      }
      newSel.push({ r, c });
      setSelection(newSel);
      setFeedback({ msg: "" });
      const newSolved = checkDaemons(newSel);
      if (newSolved.size === puzzle.daemons.length) {
        setEnded(true);
        setFeedback({ msg: "Puzzle solved!", type: "success" });
      } else if (newSel.length >= bufferSize) {
        setEnded(true);
        const solvedCount = newSolved.size;
        const maxComplexity = solvedCount
          ? Math.max(
              ...Array.from(newSolved).map((idx) => puzzle.daemons[idx].length)
            )
          : 0;
        setFeedback({
          msg: `Breached ${solvedCount}/${puzzle.daemons.length} daemons. Complexity ${maxComplexity}.`,
          type: "error",
        });
      }
    },
    [ended, selection, startRow, checkDaemons, puzzle.daemons.length, solved.size]
  );

  const sequence = selection.map((p) => puzzle.grid[p.r][p.c]).join(" ");
  const gridStyle: React.CSSProperties = {
    "--cols": puzzle.grid[0].length.toString(),
    "--cell-size": `${cellSize}px`,
  };

  return (
    <Layout>
      <Head>
        <title>GM Puzzle Generator</title>
        <meta property="og:title" content="GM Puzzle Generator" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Container as="main" className={indexStyles.main}>
        <Row className="align-items-center">
          <Col>
            <MainTitle className={indexStyles.title} />
            <h2 className={indexStyles.description}>Customize and practice the Breach Protocol puzzle.</h2>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={indexStyles["description-separator"]}></div>
          </Col>
        </Row>
        <Row className="mb-4">
          <Col lg={8}>
            <Form className="mb-3">
              <Form.Group className="mb-2" controlId="rows">
                <Form.Label>Rows</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={rows}
                  onChange={(e) => setRows(e.currentTarget.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2" controlId="cols">
                <Form.Label>Columns</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={cols}
                  onChange={(e) => setCols(e.currentTarget.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2" controlId="daemonCount">
                <Form.Label>Number of Daemons</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={daemonCount}
                  onChange={(e) => setDaemonCount(e.currentTarget.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2" controlId="maxLen">
                <Form.Label>Max Daemon Length</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={maxDaemonLen}
                  onChange={(e) => setMaxDaemonLen(e.currentTarget.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2" controlId="timer">
                <Form.Label>Timer (seconds)</Form.Label>
                <Form.Control
                  type="number"
                  min="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.currentTarget.value)}
                />
              </Form.Group>
              <Button className="mt-2" onClick={newPuzzle}>Generate Puzzle</Button>
            </Form>
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <p className={styles.description}>TIME REMAINING: {timeRemaining}s</p>
            <div className={styles["grid-box"]} ref={gridRef}>
              <div className={styles["grid-box__header"]}>
                <h3 className={styles["grid-box__header_text"]}>ENTER CODE MATRIX</h3>
              </div>
              <div className={styles["grid-box__inside"]}>
                <div className={styles.grid} style={gridStyle}>
                  <svg className={styles["path-lines"]} viewBox="0 0 100 100" preserveAspectRatio="none">
                    {lines.map((line, idx) => (
                      <line key={idx} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
                    ))}
                  </svg>
                  {puzzle.grid.map((row, r) =>
                    row.map((val, c) => {
                      if (!cellRefs.current[r]) cellRefs.current[r] = [];
                      const stepIdx = solutionPath ? solutionPath.findIndex((p) => p.r === r && p.c === c) : -1;
                      return (
                        <div
                          ref={(el) => (cellRefs.current[r][c] = el)}
                          key={`${r}-${c}`}
                          className={cz(styles.cell, {
                            [styles.selected]: selection.some((p) => p.r === r && p.c === c),
                            [styles.active]:
                              !ended &&
                              ((selection.length === 0 && r === startRow) ||
                                (selection.length > 0 &&
                                  ((selection.length % 2 === 1 && c === selection[selection.length - 1].c) ||
                                    (selection.length % 2 === 0 && r === selection[selection.length - 1].r)))),
                            [styles.dim]:
                              !selection.some((p) => p.r === r && p.c === c) &&
                              !(selection.length === 0 && r === startRow),
                            [styles.solution]: stepIdx >= 0,
                          })}
                          data-step={stepIdx >= 0 ? stepIdx + 1 : undefined}
                          onClick={() => handleCellClick(r, c)}
                        >
                          {val}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Col>
          <Col xs={12} lg={4} className="d-flex justify-content-center">
            <div className={styles["daemon-box"]}>
              <div className={styles["daemon-box__header"]}>
                <h3 className={styles["daemon-box__header_text"]}>DAEMONS</h3>
              </div>
              <div className={styles["daemon-box__inside"]}>
                <ol className={styles.daemons}>
                  {puzzle.daemons.map((d, idx) => (
                    <li key={idx} className={solved.has(idx) ? "solved" : undefined}>
                      {d.join(" ")}
                    </li>
                  ))}
                </ol>
                <p className={styles.sequence}>{sequence}</p>
                {solutionSequence && (
                  <p className={styles["solution-sequence"]}>{solutionSequence}</p>
                )}
                {feedback.msg && (
                  <p className={`${styles.feedback} ${feedback.type ? styles[feedback.type] : ""}`}>{feedback.msg}</p>
                )}
                {debugInfo && (
                  <p className={styles.debug}>{debugInfo}</p>
                )}
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={styles.buttons}>
              <Button onClick={resetSelection}>Reset Puzzle</Button>
              <Button onClick={showSolutionPath}>Show Solution Path</Button>
            </div>
          </Col>
        </Row>
        <Separator className="mt-5" />
        <Row>
          <Col>
            <ReportIssue />
          </Col>
        </Row>
        <Row className="mt-5">
          <Col lg={8}>
            <p>
              THIS APP IS NOT AFFILIATED WITH CD PROJEKT RED OR CYBERPUNK 2077. TRADEMARK "CYBERPUNK 2077" IS OWNED BY CD PROJEKT <span>S.A.</span>
            </p>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}

