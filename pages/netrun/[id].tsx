import React, { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Container, Row, Col } from "react-bootstrap";
import cz from "classnames";

import Layout from "../../components/Layout";
import MainTitle from "../../components/MainTitle";
import Button from "../../components/Button";

import indexStyles from "../../styles/Index.module.scss";
import styles from "../../styles/PuzzleGenerator.module.scss";
import { Pos, Puzzle } from "../../lib/puzzleGenerator";
import { StoredPuzzle } from "../../services/puzzleStore";
import { getOrCreateTimer, setTimerStart } from "../../services/timerStore";

export default function PlayPuzzlePage() {
  const router = useRouter();
  const { id } = router.query;

  const [puzzle, setPuzzle] = useState<StoredPuzzle | null>(null);
  const [timeLimit, setTimeLimit] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>({ msg: "" });
  const [ended, setEnded] = useState(false);
  const [breachFlash, setBreachFlash] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/puzzle/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('notfound');
        if (!res.ok) throw new Error('dberr');
        const data = await res.json();
        setPuzzle(data);
        setTimeLimit(data.timeLimit);
        setBufferSize(data.bufferSize);
      })
      .catch((err) => {
        if (err.message === 'notfound') {
          setFeedback({ msg: 'Puzzle not found.', type: 'error' });
        } else if (err.message === 'dberr') {
          console.error('Database error:', err);
          setFeedback({ msg: 'Failed to load puzzle due to database error.', type: 'error' });
        } else {
          console.error('Puzzle load failed:', err);
          setFeedback({ msg: 'Failed to load puzzle.', type: 'error' });
        }
      });
  }, [id]);

  useEffect(() => {
    if (!id || !puzzle) return;
    getOrCreateTimer(id as string, puzzle.timeLimit, puzzle.startTime || null)
      .then((timer) => {
        if (!timer) {
          setTimeRemaining(puzzle.timeLimit);
          return;
        }
        if (timer.start_time) {
          const start = new Date(timer.start_time).getTime();
          const remaining = Math.max(
            0,
            timer.duration - Math.floor((Date.now() - start) / 1000)
          );
          setPuzzle({ ...puzzle, startTime: timer.start_time });
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(timer.duration);
        }
      })
      .catch(() => setTimeRemaining(puzzle.timeLimit));
  }, [id, puzzle]);

  useEffect(() => {
    if (ended || !puzzle || !puzzle.startTime) return;
    const handle = setInterval(() => {
      const start = new Date(puzzle.startTime).getTime();
      const remaining = Math.max(
        0,
        puzzle.timeLimit - Math.floor((Date.now() - start) / 1000)
      );
      if (remaining <= 0) {
        setEnded(true);
        setFeedback({ msg: "TIME UP", type: "error" });
        clearInterval(handle);
      }
      setTimeRemaining(remaining);
    }, 1000);
    return () => clearInterval(handle);
  }, [ended, puzzle]);

  const checkDaemons = useCallback(
    (sel: Pos[]) => {
      if (!puzzle) return new Set<number>();
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
    if (!gridRef.current || !puzzle) return;
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
  }, [selection, puzzle]);

  useEffect(() => {
    updateLines();
  }, [updateLines, puzzle]);

  useEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (ended || selection.length >= bufferSize || !puzzle) return;

      if (!puzzle.startTime) {
        const start = new Date().toISOString();
        setPuzzle({ ...puzzle, startTime: start });
        setTimeRemaining(puzzle.timeLimit);
        setTimerStart(id as string, start).catch(() => {});
      }

      const startRow = 0;
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
      if (newSolved.size === (puzzle?.daemons.length || 0)) {
        setEnded(true);
        setFeedback({ msg: "Puzzle solved!", type: "success" });
      } else if (newSel.length >= bufferSize) {
        setEnded(true);
        const solvedCount = newSolved.size;
        const maxComplexity = solvedCount
          ? Math.max(...Array.from(newSolved).map((idx) => puzzle!.daemons[idx].length))
          : 0;
        setFeedback({
          msg: `Breached ${solvedCount}/${puzzle?.daemons.length} daemons. Complexity ${maxComplexity}.`,
          type: "error",
        });
      }
    },
    [ended, selection, bufferSize, puzzle, checkDaemons]
  );

  if (!puzzle) {
    return (
      <Layout>
        <Head>
          <title>Puzzle</title>
        </Head>
        <Container as="main" className={indexStyles.main}>
          {feedback.msg ? (
            <p
              className={`${styles.feedback} ${feedback.type ? styles[feedback.type] : ''}`}
            >
              {feedback.msg}
            </p>
          ) : (
            <p className={styles.description}>Loading...</p>
          )}
        </Container>
      </Layout>
    );
  }

  const cellSize = Math.max(24, 60 - Math.max(0, puzzle.grid[0].length - 5) * 4);
  const sequence = selection.map((p) => puzzle.grid[p.r][p.c]).join(" ");
  const gridStyle = {
    "--cols": puzzle.grid[0].length.toString(),
    "--cell-size": `${cellSize}px`,
  } as React.CSSProperties;

  return (
    <Layout>
      <Head>
        <title>Breach Protocol Puzzle</title>
      </Head>
      <Container as="main" className={indexStyles.main}>
        {breachFlash && (
          <div className={`${styles['breach-notify']} ${styles.show}`}>DAEMON BREACHED</div>
        )}
        <Row className="align-items-center">
          <Col>
            <MainTitle className={indexStyles.title} />
            <h2 className={indexStyles.description}>Solve the Breach Protocol puzzle.</h2>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={indexStyles["description-separator"]}></div>
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <p className={styles.description}>TIME REMAINING: {timeRemaining}s</p>
            <div className={cz(styles["grid-box"], { [styles.pulse]: breachFlash })} ref={gridRef}>
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
                      const stepIdx = selection.findIndex((p) => p.r === r && p.c === c);
                      return (
                        <div
                          ref={(el) => (cellRefs.current[r][c] = el)}
                          key={`${r}-${c}`}
                          className={cz(styles.cell, {
                            [styles.selected]: stepIdx >= 0,
                            [styles.active]:
                              !ended &&
                              ((selection.length === 0 && r === 0) ||
                                (selection.length > 0 &&
                                  ((selection.length % 2 === 1 && c === selection[selection.length - 1].c) ||
                                    (selection.length % 2 === 0 && r === selection[selection.length - 1].r)))),
                            [styles.dim]:
                              !selection.some((p) => p.r === r && p.c === c) &&
                              !(selection.length === 0 && r === 0),
                          })}
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
                    <li key={idx} className={solved.has(idx) ? "solved" : undefined}>
                      {d.join(" ")}
                    </li>
                  ))}
                </ol>
                <p className={styles.sequence}>
                  <span className={styles['sequence-label']}>Completed Sequence:</span>
                  {sequence}
                </p>
                {feedback.msg && (
                  <p className={`${styles.feedback} ${feedback.type ? styles[feedback.type] : ""}`}>{feedback.msg}</p>
                )}
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={styles.buttons}>
              <Button
                onClick={() => {
                  setSelection([]);
                  setSolved(new Set());
                  setFeedback({ msg: "" });
                  setEnded(false);
                  if (puzzle) {
                    if (puzzle.startTime) {
                      const start = new Date(puzzle.startTime).getTime();
                      const remaining = Math.max(
                        0,
                        puzzle.timeLimit -
                          Math.floor((Date.now() - start) / 1000)
                      );
                      setTimeRemaining(remaining);
                    } else {
                      setTimeRemaining(puzzle.timeLimit);
                    }
                  }
                }}
              >
                Reset Puzzle
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
