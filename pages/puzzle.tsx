import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Head from "next/head";
import { Container, Row, Col } from "react-bootstrap";
import cz from "classnames";

import Layout from "../components/Layout";
import MainTitle from "../components/MainTitle";
import Button from "../components/Button";

import indexStyles from "../styles/Index.module.scss";
import styles from "../styles/PuzzleGenerator.module.scss";

const terminalMessages = [
  "//ROOT",
  "//ACCESS_REQUEST",
  "//ACCESS_REQUEST_SUCCESS",
  "//COLLECTING_PACKET_1................COMPLETE",
  "//COLLECTING_PACKET_2................COMPLETE",
  "//COLLECTING_PACKET_3................COMPLETE",
  "//LOGIN",
  "//LOGIN_SUCCESS",
  "",
  "//UPLOAD_IN_PROGRESS",
  "//UPLOAD_COMPLETE!",
  "",
  "ALL DAEMONS UPLOADED",
];

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

function combineDaemons(daemons: string[][]) {
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

function generatePuzzle(rows = 5, cols = 5, count = 3, startRow = 0) {
  const daemons: string[][] = [];
  for (let i = 0; i < count; i++) {
    const length = Math.floor(Math.random() * 3) + 2; // 2-4
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

  return { grid, daemons, bufferSize, path };
}

const Separator = ({ className }: { className?: string }) => (
  <hr className={cz(indexStyles.separator, className)} />
);

const ReportIssue = () => (
  <p className={indexStyles["report-issue"]}>
    Having issues? Solver not working?{" "}
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

function TerminalLog({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= terminalMessages.length) return;
    const t = setTimeout(() => setIndex(index + 1), 400);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className={styles["terminal-log"]}>
      {terminalMessages.slice(0, index).join("\n")}
      {index >= terminalMessages.length && (
        <div className="mt-3">
          <Button onClick={onExit}>EXIT INTERFACE</Button>
        </div>
      )}
    </div>
  );
}

export default function PuzzlePage() {
  const startRow = 0;
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(5, 5, 3, startRow));
  const [bufferSize, setBufferSize] = useState(() => puzzle.bufferSize);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>({ msg: "" });
  const [ended, setEnded] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const initialTime = 60;
  const [time, setTime] = useState(initialTime);
  const [breachFlash, setBreachFlash] = useState(false);
  const [dive, setDive] = useState(true);
  const breachAudio = useRef<HTMLAudioElement | null>(null);
  const successAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDive(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ended) return;
    setTime(initialTime);
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setEnded(true);
          setFeedback({ msg: "Time's up", type: "error" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [puzzle, ended]);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const newPuzzle = useCallback(() => {
    let valid = false;
    let p: ReturnType<typeof generatePuzzle> | null = null;
    for (let attempt = 0; attempt < 10 && !valid; attempt++) {
      p = generatePuzzle(5, 5, 3, startRow);
      const seq = p.path.map((pos) => p.grid[pos.r][pos.c]);
      const containsContiguous = (arr: string[], subseq: string[]) => {
        for (let i = 0; i <= arr.length - subseq.length; i++) {
          let match = true;
          for (let j = 0; j < subseq.length; j++) {
            if (arr[i + j] !== subseq[j]) {
              match = false;
              break;
            }
          }
          if (match) return true;
        }
        return false;
      };
      if (p.daemons.every((d) => containsContiguous(seq, d))) {
        valid = true;
      }
    }
    if (!p || !valid) {
      setFeedback({ msg: "Puzzle unsolvable with current settings—please adjust daemon configurations.", type: "error" });
      return;
    }
    setPuzzle(p);
    setBufferSize(p.bufferSize);
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setShowTerminal(false);
  }, []);

  const resetSelection = useCallback(() => {
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setShowTerminal(false);
  }, []);

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

      const containsContiguous = (arr: string[], subseq: string[]) => {
        for (let i = 0; i <= arr.length - subseq.length; i++) {
          let match = true;
          for (let j = 0; j < subseq.length; j++) {
            if (arr[i + j] !== subseq[j]) {
              match = false;
              break;
            }
          }
          if (match) return true;
        }
        return false;
      };

      let interrupted = false;
      let solvedAny = false;
      puzzle.daemons.forEach((daemon, idx) => {
        if (solvedSet.has(idx)) return;
        if (containsContiguous(seq, daemon)) {
          solvedSet.add(idx);
          solvedAny = true;
        } else if (containsSubsequence(seq, daemon)) {
          interrupted = true;
        }
      });
      if (solvedAny) {
        setFeedback({ msg: "DAEMON BREACHED!", type: "success" });
        breachAudio.current?.play();
        setBreachFlash(true);
        setTimeout(() => setBreachFlash(false), 1500);
      } else if (interrupted) {
        setFeedback({ msg: "SEQUENCE INTERRUPTED", type: "error" });
      }
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

      if (selection.some((p) => p.r === r && p.c === c)) {
        setFeedback({ msg: "Cell already selected.", type: "error" });
        return;
      }

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
        successAudio.current?.play();
        setTimeout(() => setShowTerminal(true), 500);
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

  return (
    <Layout>
      <Head>
        <title>Breach Protocol Puzzle Generator</title>
        <meta property="og:title" content="Breach Protocol Puzzle Generator" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Container as="main" className={cz(indexStyles.main, dive && styles['net-dive'])}>
        <audio ref={breachAudio} src="/beep.mp3" />
        <audio ref={successAudio} src="/success.mp3" />
        {breachFlash && (
          <div className={`${styles['breach-notify']} ${styles.show}`} data-text="DAEMON BREACHED">DAEMON BREACHED</div>
        )}
        <Row className="align-items-center">
          <Col>
            <MainTitle className={indexStyles.title} />
            <h2 className={indexStyles.description}>
              Practice the Breach Protocol puzzle.
            </h2>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={indexStyles["description-separator"]}></div>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={6} className={"text-start"}>
            <strong>BREACH TIME REMAINING:</strong> {time}s
          </Col>
          <Col xs={6} className="text-end">
            <strong>BUFFER:</strong> {sequence}
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <p className={styles.description}>
              INITIATE BREACH PROTOCOL - TIME TO FLATLINE THESE DAEMONS, CHOOM.
            </p>
            <div className={cz(styles["grid-box"], { [styles.pulse]: breachFlash })}>
              <div className={styles["grid-box__header"]}>
                <h3 className={styles["grid-box__header_text"]}>ENTER CODE MATRIX</h3>
              </div>
              <div className={styles["grid-box__inside"]}>
                <div className={styles.grid}>
                  {puzzle.grid.map((row, r) =>
                    row.map((val, c) => {
                      const isSelected = selection.some(
                        (p) => p.r === r && p.c === c
                      );
                      const selectable = (() => {
                        if (ended) return false;
                        if (isSelected) return false;
                        if (selection.length === 0) {
                          return r === startRow;
                        }
                        const last = selection[selection.length - 1];
                        const expectColumn = selection.length % 2 === 1;
                        return expectColumn ? c === last.c : r === last.r;
                      })();
                      const classes = [styles.cell];
                      if (selectable) classes.push(styles.active);
                      else if (!isSelected) classes.push(styles.dim);
                      if (isSelected) classes.push(styles.selected);
                      return (
                        <div
                          key={`${r}-${c}`}
                          className={classes.join(" ")}
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
            <div className={cz(styles["daemon-box"], { [styles.pulse]: breachFlash })}>
              <div className={styles["daemon-box__header"]}>
                <h3 className={styles["daemon-box__header_text"]}>DAEMONS</h3>
              </div>
              <div className={styles["daemon-box__inside"]}>
                <ol className={styles.daemons}>
                  {puzzle.daemons.map((d, idx) => (
                    <li
                      key={idx}
                      className={solved.has(idx) ? "solved" : undefined}
                    >
                      {d.join(" ")}
                    </li>
                  ))}
                </ol>
                <p className={styles.sequence}>
                  <span className={styles['sequence-label']}>Completed Sequence:</span>
                  {sequence}
                </p>
                {feedback.msg && (
                  <p
                    className={`${styles.feedback} ${
                      feedback.type ? styles[feedback.type] : ""
                    }`}
                  >
                    {feedback.msg}
                  </p>
                )}
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={styles.buttons}>
              <Button onClick={resetSelection}>Reset Puzzle</Button>
              <Button onClick={newPuzzle}>Generate New Puzzle</Button>
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
              THIS APP IS NOT AFFILIATED WITH CD PROJEKT RED OR CYBERPUNK 2077.
              TRADEMARK "CYBERPUNK 2077" IS OWNED BY CD PROJEKT <span>S.A.</span>
            </p>
          </Col>
        </Row>
      </Container>
      {showTerminal && <TerminalLog onExit={newPuzzle} />}
    </Layout>
  );
}
