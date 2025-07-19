import React, { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import { Container, Row, Col, Form } from "react-bootstrap";
import cz from "classnames";

import Layout from "../components/Layout";
import MainTitle from "../components/MainTitle";
import Button from "../components/Button";

import indexStyles from "../styles/Index.module.scss";
import styles from "../styles/PuzzleGenerator.module.scss";
import { Pos } from "../lib/puzzleGenerator";
import { StoredPuzzle } from "../services/puzzleStore";
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
  const [difficulty, setDifficulty] = useState("Easy");
  const [timeLimit, setTimeLimit] = useState("60");
  const [startOnFirstClick, setStartOnFirstClick] = useState(false);

  const [puzzle, setPuzzle] = useState<StoredPuzzle | null>(null);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [bufferSize, setBufferSize] = useState(0);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>({ msg: "" });
  const [ended, setEnded] = useState(false);
  const [breachFlash, setBreachFlash] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(parseInt(timeLimit, 10));
  const [solutionPath, setSolutionPath] = useState<Pos[] | null>(null);
  const [solutionSequence, setSolutionSequence] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [solutionCount, setSolutionCount] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const cellSize = puzzle
    ? Math.max(24, 60 - Math.max(0, puzzle.grid[0].length - 5) * 4)
    : 24;

  const parseNumber = (value: string): number | null => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  };

  const newPuzzle = useCallback(async () => {
    const tl = parseNumber(timeLimit);
    if (tl === null) {
      return;
    }

    try {
      const res = await fetch("/api/puzzle/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          timeLimit: tl,
          startOnFirstClick,
        }),
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      const p: StoredPuzzle = data.puzzle;
      const id: string = data.id;
      const pathString = p.path.map((pos) => `(${pos.r},${pos.c})`).join(" -> ");

      setSolutionCount(p.solutionCount);

      setPuzzle(p);
      setPuzzleId(id);
      setBufferSize(p.bufferSize);
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setSolutionPath(null);
    setSolutionSequence("");
    const remaining = p.startTime
      ? Math.max(
          0,
          tl - Math.floor((Date.now() - new Date(p.startTime).getTime()) / 1000)
        )
      : tl;
    setTimeRemaining(remaining);
    setDebugInfo(`Solution path: ${pathString} | Solutions: ${p.solutionCount}`);
    } catch (e) {
      setFeedback({ msg: 'Failed to generate puzzle.', type: 'error' });
    }
  }, [difficulty, timeLimit, startOnFirstClick]);

  const resetSelection = useCallback(() => {
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setSolutionPath(null);
    setSolutionSequence("");
    if (puzzle) {
      const tl = parseNumber(timeLimit);
      if (tl !== null) {
        if (puzzle.startTime) {
          const start = new Date(puzzle.startTime).getTime();
          const remaining = Math.max(
            0,
            tl - Math.floor((Date.now() - start) / 1000)
          );
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(tl);
        }
      }
    }
  }, [timeLimit, puzzle]);

  useEffect(() => {
    newPuzzle();
  }, [difficulty, timeLimit, startOnFirstClick, newPuzzle]);

  useEffect(() => {
    if (ended || !puzzle || !puzzle.startTime) return;
    const id = setInterval(() => {
      const start = new Date(puzzle.startTime).getTime();
      const tl = parseNumber(timeLimit) || puzzle.timeLimit;
      const remaining = Math.max(
        0,
        tl - Math.floor((Date.now() - start) / 1000)
      );
      if (remaining <= 0) {
        setEnded(true);
        setFeedback({ msg: "TIME UP", type: "error" });
        clearInterval(id);
      }
      setTimeRemaining(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [ended, puzzle, timeLimit]);

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

      if (selection.some((p) => p.r === r && p.c === c)) {
        setFeedback({ msg: "Cell already selected.", type: "error" });
        return;
      }

      if (puzzle && !puzzle.startTime) {
        const start = new Date().toISOString();
        setPuzzle({ ...puzzle, startTime: start });
        const tl = parseNumber(timeLimit) || puzzle.timeLimit;
        setTimeRemaining(tl);
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
    [ended, selection, startRow, checkDaemons, puzzle?.daemons.length, solved.size]
  );

  if (!puzzle) {
    return (
      <Layout>
        <Head>
          <title>GM Puzzle Generator</title>
        </Head>
        <Container as="main" fluid className={indexStyles.main}>
          {feedback.msg ? (
            <p className={`${styles.feedback} ${feedback.type ? styles[feedback.type] : ''}`}>{feedback.msg}</p>
          ) : (
            <p className={styles.description}>Loading...</p>
          )}
        </Container>
      </Layout>
    );
  }

  const sequence = selection.map((p) => puzzle.grid[p.r][p.c]).join(" ");
  const gridStyle = {
    "--cols": puzzle.grid[0].length.toString(),
    "--cell-size": `${cellSize}px`,
  } as React.CSSProperties;

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
      <Container as="main" fluid className={indexStyles.main}>
        {breachFlash && (
          <div className={`${styles['breach-notify']} ${styles.show}`}>DAEMON BREACHED</div>
        )}
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
              <Form.Group className="mb-2" controlId="difficulty">
                <Form.Label>Difficulty</Form.Label>
                <Form.Select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.currentTarget.value)}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Impossible</option>
                </Form.Select>
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
              <Form.Group className="mb-2" controlId="startMode">
                <Form.Label>Start timer</Form.Label>
                <Form.Select
                  value={startOnFirstClick ? "firstClick" : "immediate"}
                  onChange={(e) =>
                    setStartOnFirstClick(e.currentTarget.value === "firstClick")
                  }
                >
                  <option value="immediate">Immediately</option>
                  <option value="firstClick">On first click</option>
                </Form.Select>
              </Form.Group>
              <Button className="mt-2" onClick={newPuzzle}>Generate Puzzle</Button>
            </Form>
            {puzzleId && (
              <Form.Group className="mb-2" controlId="share">
                <Form.Label>Share Link</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    readOnly
                    type="text"
                    value={`${window.location.origin}/netrun/${puzzleId}`}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    className="ms-2"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/netrun/${puzzleId}`
                      );
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </Form.Group>
            )}
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <p
              className={cz(styles.description, {
                [styles.warning]: timeRemaining <= 15 && timeRemaining > 5,
                [styles.critical]: timeRemaining <= 5,
              })}
            >
              TIME REMAINING: <span className={styles['timer-number']}>{timeRemaining}</span>s
            </p>
            {puzzle && (
              <>
                <p className={styles.description}>DIFFICULTY: {puzzle.difficulty}</p>
                {solutionCount !== null && (
                  <p className={styles.description}>SOLUTIONS: {solutionCount}</p>
                )}
              </>
            )}
            <div
              className={cz(styles["grid-box"], {
                [styles.pulse]: breachFlash,
                [styles.warning]: timeRemaining <= 15 && timeRemaining > 5,
                [styles.critical]: timeRemaining <= 5,
              })}
              ref={gridRef}
            >
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
                      const isSelected = selection.some((p) => p.r === r && p.c === c);
                      return (
                        <div
                          ref={(el) => (cellRefs.current[r][c] = el)}
                          key={`${r}-${c}`}
                          className={cz(styles.cell, {
                            [styles.selected]: isSelected,
                            [styles.active]:
                              !ended &&
                              !isSelected &&
                              ((selection.length === 0 && r === startRow) ||
                                (selection.length > 0 &&
                                  ((selection.length % 2 === 1 && c === selection[selection.length - 1].c) ||
                                    (selection.length % 2 === 0 && r === selection[selection.length - 1].r)))),
                            [styles.dim]:
                              !isSelected && !(selection.length === 0 && r === startRow),
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
            <div
              className={cz(styles["daemon-box"], {
                [styles.pulse]: breachFlash,
                [styles.warning]: timeRemaining <= 15 && timeRemaining > 5,
                [styles.critical]: timeRemaining <= 5,
              })}
            >
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

