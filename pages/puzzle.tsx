import React, { useState, useCallback } from "react";
import Head from "next/head";
import { Container, Row, Col } from "react-bootstrap";
import Layout from "../components/Layout";
import MainTitle from "../components/MainTitle";
import Button from "../components/Button";
import styles from "../styles/PuzzleGenerator.module.scss";

const HEX_VALUES = ["1C", "55", "BD", "E9", "7A", "FF"];
const MAX_STEPS = 8;

type Pos = { r: number; c: number };

function randomHex() {
  return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

function generateGrid(rows = 5, cols = 5): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(randomHex());
    }
    grid.push(row);
  }
  return grid;
}

function pathToSequence(grid: string[][], path: Pos[]): string[] {
  return path.map((p) => grid[p.r][p.c]);
}

function generatePath(grid: string[][], length: number): Pos[] {
  const rows = grid.length;
  const cols = grid[0].length;
  let r = Math.floor(Math.random() * rows);
  let c = Math.floor(Math.random() * cols);
  const path: Pos[] = [{ r, c }];
  while (path.length < length) {
    const opts: Pos[] = [];
    if (r > 0) opts.push({ r: r - 1, c });
    if (r < rows - 1) opts.push({ r: r + 1, c });
    if (c > 0) opts.push({ r, c: c - 1 });
    if (c < cols - 1) opts.push({ r, c: c + 1 });
    const next = opts[Math.floor(Math.random() * opts.length)];
    r = next.r;
    c = next.c;
    path.push(next);
  }
  return path;
}

function generateDaemons(grid: string[][], count = 3): string[][] {
  const daemons: string[][] = [];
  for (let i = 0; i < count; i++) {
    const length = Math.random() < 0.5 ? 3 : 4;
    const path = generatePath(grid, length);
    daemons.push(pathToSequence(grid, path));
  }
  return daemons;
}

export default function PuzzlePage() {
  const [grid, setGrid] = useState(() => generateGrid());
  const [daemons, setDaemons] = useState(() => generateDaemons(grid));
  const [startRow, setStartRow] = useState(() => Math.floor(Math.random() * grid.length));
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{msg: string; type?: "error" | "success"}>({msg: ""});
  const [ended, setEnded] = useState(false);

  const newPuzzle = useCallback(() => {
    const g = generateGrid();
    setGrid(g);
    setDaemons(generateDaemons(g));
    setStartRow(Math.floor(Math.random() * g.length));
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
      daemons.forEach((daemon, idx) => {
        if (solvedSet.has(idx)) return;
        if (seq.length >= daemon.length) {
          const recent = seq.slice(seq.length - daemon.length);
          if (recent.join(" ") === daemon.join(" ")) {
            solvedSet.add(idx);
            setFeedback({ msg: "Daemon breached!", type: "success" });
          }
        }
      });
      setSolved(solvedSet);
    },
    [grid, daemons, solved]
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (ended || selection.length >= MAX_STEPS) return;

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
      checkDaemons(newSel);
      if (solved.size + 1 === daemons.length) {
        setEnded(true);
        setFeedback({ msg: "Puzzle solved!", type: "success" });
      } else if (newSel.length >= MAX_STEPS) {
        setEnded(true);
        setFeedback({ msg: "Puzzle failed. Try again.", type: "error" });
      }
    },
    [ended, selection, startRow, checkDaemons, daemons.length, solved.size]
  );

  const sequence = selection.map((p) => grid[p.r][p.c]).join(" ");

  return (
    <>
      <Head>
        <title>Breach Protocol Puzzle Generator</title>
      </Head>
      <Layout>
        <Container as="main" className={styles.main}>
          <Row>
            <Col>
              <MainTitle className={styles.title} />
              <p className={styles.description}>Select grid cells to match one of the daemons.</p>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className={styles.grid}>
              {grid.map((row, r) =>
                row.map((val, c) => {
                  const isSelected = selection.some((p) => p.r === r && p.c === c);
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
            </Col>
          </Row>
          <Row>
            <Col>
              <h2>Daemons</h2>
              <ol className={styles.daemons}>
              {daemons.map((d, idx) => (
                <li key={idx} className={solved.has(idx) ? "solved" : undefined}>
                  {d.join(" ")}
                </li>
              ))}
              </ol>
            </Col>
          </Row>
          <Row>
            <Col>
              <p className={styles.sequence}>{sequence}</p>
              {feedback.msg && (
                <p className={`${styles.feedback} ${feedback.type ? styles[feedback.type] : ""}`}>{feedback.msg}</p>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <div className={styles.buttons}>
                <Button onClick={resetSelection}>Reset Puzzle</Button>
                <Button onClick={newPuzzle}>Generate New Puzzle</Button>
              </div>
            </Col>
          </Row>
        </Container>
      </Layout>
    </>
  );
}
