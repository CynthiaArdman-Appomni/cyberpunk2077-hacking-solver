import React, {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import Head from "next/head";
import { Container, Row, Col } from "react-bootstrap";
import cz from "classnames";

import Layout from "../components/Layout";
import MainTitle from "../components/MainTitle";
import Button from "../components/Button";

import indexStyles from "../styles/Index.module.scss";
import styles from "../styles/PuzzleGenerator.module.scss";

const HEX_VALUES = ["1C", "55", "BD", "E9", "7A", "FF"];
const BUFFER_SIZE = 6;

type Pos = { r: number; c: number };

function containsSubsequence(sequence: string[], target: string[]) {
  let idx = 0;
  for (const val of sequence) {
    if (val === target[idx]) {
      idx++;
      if (idx === target.length) {
        return true;
      }
    }
  }
  return false;
}

function randomHex() {
  return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

function generatePuzzle(
  rows = 6,
  cols = 6,
  daemonCount = 3
): { grid: string[][]; daemons: string[][] } {
  // generate daemon sequences first
  const daemons: string[][] = [];
  for (let i = 0; i < daemonCount; i++) {
    const length = Math.floor(Math.random() * 3) + 3; // 3-5
    const seq: string[] = [];
    for (let j = 0; j < length; j++) {
      seq.push(randomHex());
    }
    daemons.push(seq);
  }

  // create grid filled with random hex values
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(randomHex());
    }
    grid.push(row);
  }

  // place daemon sequences into the grid horizontally or vertically
  daemons.forEach((daemon) => {
    const horizontal = Math.random() < 0.5;
    if (horizontal) {
      const r = Math.floor(Math.random() * rows);
      const cStart = Math.floor(Math.random() * (cols - daemon.length + 1));
      for (let i = 0; i < daemon.length; i++) {
        grid[r][cStart + i] = daemon[i];
      }
    } else {
      const c = Math.floor(Math.random() * cols);
      const rStart = Math.floor(Math.random() * (rows - daemon.length + 1));
      for (let i = 0; i < daemon.length; i++) {
        grid[rStart + i][c] = daemon[i];
      }
    }
  });

  return { grid, daemons };
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

export default function PuzzlePage() {
  const [{ grid, daemons }, setPuzzle] = useState(() => generatePuzzle());
  const [startRow, setStartRow] = useState(0);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>({ msg: "" });
  const [ended, setEnded] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const newPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setStartRow(0);
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
  }, []);

  const resetSelection = useCallback(() => {
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
  }, []);

  const checkDaemons = useCallback(
    (sel: Pos[]) => {
      const seq = sel.map((p) => grid[p.r][p.c]);
      const solvedSet = new Set(solved);
      let breached = false;
      daemons.forEach((daemon, idx) => {
        if (solvedSet.has(idx)) return;
        if (containsSubsequence(seq, daemon)) {
          solvedSet.add(idx);
          breached = true;
        }
      });
      if (breached) {
        setFeedback({ msg: "DAEMON BREACHED!", type: "success" });
      }
      setSolved(solvedSet);
      return solvedSet;
    },
    [grid, daemons, solved]
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

  useLayoutEffect(() => {
    updateLines();
  }, [updateLines, grid]);

  useLayoutEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (ended || selection.length >= BUFFER_SIZE) return;

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
      if (newSolved.size === daemons.length) {
        setEnded(true);
        setFeedback({ msg: "Puzzle solved!", type: "success" });
      } else if (newSel.length >= BUFFER_SIZE) {
        setEnded(true);
        setFeedback({ msg: "Puzzle failed. Try again.", type: "error" });
      }
    },
    [ended, selection, startRow, checkDaemons, daemons.length, solved.size]
  );

  const sequence = selection.map((p) => grid[p.r][p.c]).join(" ");

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
      <Container as="main" className={indexStyles.main}>
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
        <Row>
          <Col xs={12} lg={8}>
            <p className={styles.description}>
              INITIATE BREACH PROTOCOL - TIME TO FLATLINE THESE DAEMONS, CHOOM.
            </p>
            <div className={styles["grid-box"]}>
              <div className={styles["grid-box__header"]}>
                <h3 className={styles["grid-box__header_text"]}>ENTER CODE MATRIX</h3>
              </div>
              <div className={styles["grid-box__inside"]}>
                <div className={styles.grid}>
                  {grid.map((row, r) =>
                    row.map((val, c) => {
                      const isSelected = selection.some(
                        (p) => p.r === r && p.c === c
                      );
                      const selectable = (() => {
                        if (ended) return false;
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
            <div className={styles["daemon-box"]}>
              <div className={styles["daemon-box__header"]}>
                <h3 className={styles["daemon-box__header_text"]}>DAEMONS</h3>
              </div>
              <div className={styles["daemon-box__inside"]}>
                <ol className={styles.daemons}>
                  {daemons.map((d, idx) => (
                    <li
                      key={idx}
                      className={solved.has(idx) ? "solved" : undefined}
                    >
                      {d.join(" ")}
                    </li>
                  ))}
                </ol>
                <p className={styles.sequence}>{sequence}</p>
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
    </Layout>
  );
}
