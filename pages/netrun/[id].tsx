import React, { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { Container, Row, Col } from "react-bootstrap";
import cz from "classnames";

import Layout from "../../components/Layout";
import MainTitle from "../../components/MainTitle";
import Button from "../../components/Button";

import indexStyles from "../../styles/Index.module.scss";
import styles from "../../styles/PuzzleGenerator.module.scss";
import { Pos } from "../../lib/puzzleGenerator";
import { StoredPuzzle, getPuzzle } from "../../services/puzzleStore";
import { getOrCreateTimer, setTimerStart } from "../../services/timerStore";
import { log } from "../../services/logger";

function generateSuccessLog(daemonCount: number): string[] {
  const lines = [
    "//INITIATE_BREACH_SEQUENCE",
    "//NEURAL_INTERFACE_ESTABLISHED",
    "//PINGING_TARGET_NODE...................SUCCESS",
    "//FIREWALL_HANDSHAKE_INITIATED..........ACCEPTED",
    "//AUTHENTICATING_ACCESS_PROTOCOLS.......COMPLETE",
    "",
    "//ACCESS_LEVEL: ROOT GRANTED",
    "//EXTRACTING_DAEMON_SIGNATURES..........DONE",
    "//PACKET_ANALYSIS: 0 ERRORS DETECTED",
    "",
    "//INJECTING_PAYLOAD",
  ];
  for (let i = 1; i <= daemonCount; i++) {
    lines.push(`//UPLOADING_DAEMON_[${i}]..................SUCCESS`);
  }
  lines.push(
    "//PAYLOAD_INTEGRITY_CHECK...............VERIFIED",
    "",
    "//FINALIZING_CONNECTION.................SECURE",
    "//SCRUBBING_ACCESS_LOGS.................COMPLETE",
    "//DISCONNECTING..........................NOW",
    "",
    "//UPLOAD COMPLETE – ALL DAEMONS INSTALLED",
    "",
    `[${daemonCount}/${daemonCount}] DAEMONS UPLOADED SUCCESSFULLY`,
    "BREACH PROTOCOL SUCCESSFUL – ACCESS GRANTED"
  );
  return lines;
}

function generateFailureLog(solvedDaemons: number, totalDaemons: number): string[] {
  const failedDaemons = totalDaemons - solvedDaemons;
  const lines = [
    "//INITIATE_BREACH_SEQUENCE",
    "//NEURAL_INTERFACE_ESTABLISHED",
    "//PINGING_TARGET_NODE...................SUCCESS",
    "//FIREWALL_HANDSHAKE_INITIATED..........ACCEPTED",
    "//AUTHENTICATING_ACCESS_PROTOCOLS.......COMPLETE",
    "",
    "//ACCESS_LEVEL: LIMITED",
    "//EXTRACTING_DAEMON_SIGNATURES..........DONE WITH ERRORS",
    "//PACKET_ANALYSIS: CHECKSUM ERROR DETECTED",
    "",
    "//INJECTING_PAYLOAD",
  ];
  for (let i = 1; i <= solvedDaemons; i++) {
    lines.push(`//UPLOADING_DAEMON_[${i}]..................SUCCESS`);
  }
  for (let i = solvedDaemons + 1; i <= totalDaemons; i++) {
    lines.push(`//UPLOADING_DAEMON_[${i}]..................FAILED`);
  }
  lines.push(
    "//RETRYING_PACKET_TRANSMISSION..........TIMEOUT",
    "//FIREWALL_COUNTERMEASURES_DETECTED.....ACTIVATED",
    "",
    "//SECURITY_ALERT: TRACE INITIATED",
    "//PAYLOAD_CORRUPTION_DETECTED...........ABORTING",
    "//LOG_ERASURE_ATTEMPT...................PARTIAL",
    "//INITIATING_EMERGENCY_DISCONNECT.......NOW",
    "",
    "//CONNECTION TERMINATED – INCOMPLETE UPLOAD",
    "",
    `[${solvedDaemons}/${totalDaemons}] DAEMONS UPLOADED SUCCESSFULLY`,
    `[${failedDaemons}] DAEMONS FAILED TO UPLOAD`,
    "",
    "BREACH PROTOCOL FAILED"
  );
  return lines;
}

const Separator = ({ className }: { className?: string }) => (
  <hr className={cz(indexStyles.separator, className)} />
);

interface NetrunProps {
  initialPuzzle: StoredPuzzle | null;
  hasError?: boolean;
}

export default function PlayPuzzlePage({ initialPuzzle, hasError }: NetrunProps) {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      log(`Opened /netrun/${id}`);
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => setDive(false), 800);
    return () => clearTimeout(t);
  }, []);

  const [puzzle, setPuzzle] = useState<StoredPuzzle | null>(initialPuzzle);
  const [timeLimit, setTimeLimit] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  const [selection, setSelection] = useState<Pos[]>([]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; type?: "error" | "success" }>(
    hasError ? { msg: "Failed to load puzzle.", type: "error" } : { msg: "" }
  );
  const [ended, setEnded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [breachFlash, setBreachFlash] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [daemonWords, setDaemonWords] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dive, setDive] = useState(true);

  const breachAudio = useRef<HTMLAudioElement | null>(null);
  const successAudio = useRef<HTMLAudioElement | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    if (!id || initialPuzzle || hasError) return;
    log(`Fetching puzzle ${id} from API`);
    fetch(`/api/puzzle/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('notfound');
        if (!res.ok) throw new Error('dberr');
        const data = await res.json();
        setPuzzle(data);
        setTimeLimit(data.timeLimit);
        setBufferSize(data.bufferSize);
        log(`Puzzle ${id} fetched successfully`);
      })
      .catch((err) => {
        if (err.message === 'notfound') {
          setFeedback({ msg: 'Puzzle not found or has expired.', type: 'error' });
        } else if (err.message === 'dberr') {
          console.error('Database error:', err);
          setFeedback({ msg: 'Failed to load puzzle due to database error.', type: 'error' });
        } else {
          console.error('Puzzle load failed:', err);
          setFeedback({ msg: 'Failed to load puzzle.', type: 'error' });
        }
        log(`Puzzle ${id} fetch failed: ${err}`);
      });
  }, [id, initialPuzzle, hasError]);

  useEffect(() => {
    if (initialPuzzle) {
      setTimeLimit(initialPuzzle.timeLimit);
      setBufferSize(initialPuzzle.bufferSize);
    }
  }, [initialPuzzle]);

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
          // Avoid unnecessary state updates that can cause render loops
          setTimeRemaining(remaining);
          if (puzzle.startTime !== timer.start_time) {
            setPuzzle({ ...puzzle, startTime: timer.start_time });
          }
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
        setShowOverlay(true);
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
      const newlySolved: number[] = [];
      let solvedAny = false;
      puzzle.daemons.forEach((daemon, idx) => {
        if (solvedSet.has(idx)) return;
        if (containsContiguous(seq, daemon)) {
          solvedSet.add(idx);
          newlySolved.push(idx);
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
        newlySolved.forEach((i) => {
          fetch(`/api/puzzle/${id as string}?daemon=${i}`)
            .then((res) => res.json())
            .then((data) => {
              setDaemonWords((w) => {
                const arr = [...w];
                arr[i] = data.secretWord;
                return arr;
              });
            })
            .catch(() => {});
        });
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

  useEffect(() => {
    if (ended && puzzle && solved.size === puzzle.daemons.length) {
      let timer: NodeJS.Timeout;
      (async () => {
        try {
          const res = await fetch(`/api/puzzle/${id}?secret=1`);
          if (res.ok) {
            const data = await res.json();
            setSecretWord(data.secretWord);
            const lines = [
              ...generateSuccessLog(puzzle.daemons.length),
              `SECRET WORD: ${data.secretWord}`,
            ];
            setLogLines([]);
            let idx = 0;
            timer = setInterval(() => {
              setLogLines((l) => {
                if (idx >= lines.length) {
                  clearInterval(timer);
                  return l;
                }
                const line = lines[idx];
                idx += 1;
                return [...l, line];
              });
            }, 150);
          }
        } catch (e) {
          console.error('Failed to fetch secret word', e);
        }
      })();
      return () => clearInterval(timer);
    }
  }, [ended, solved, id]);

  useEffect(() => {
    if (ended && puzzle && solved.size !== puzzle.daemons.length) {
      const failureLines = generateFailureLog(
        solved.size,
        puzzle.daemons.length
      );
      const wordLines = daemonWords
        .map((w, i) => (solved.has(i) && w ? `DAEMON ${i + 1} WORD: ${w}` : null))
        .filter(Boolean) as string[];
      const lines = [...failureLines, ...wordLines];
      setLogLines([]);
      let idx = 0;
      const id = setInterval(() => {
        setLogLines((l) => {
          if (idx >= lines.length) {
            clearInterval(id);
            return l;
          }
          const line = lines[idx];
          idx += 1;
          return [...l, line];
        });
      }, 150);
      return () => clearInterval(id);
    }
  }, [ended, solved, puzzle, daemonWords]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (ended || selection.length >= bufferSize || !puzzle) return;

      if (selection.some((p) => p.r === r && p.c === c)) {
        setFeedback({ msg: "Cell already selected.", type: "error" });
        return;
      }

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
        setShowOverlay(true);
        setFeedback({ msg: "Puzzle solved!", type: "success" });
        successAudio.current?.play();
        if (puzzle) {
          setPuzzle({ ...puzzle, startTime: null });
        }
      } else if (newSel.length >= bufferSize) {
        setEnded(true);
        setShowOverlay(true);
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

  const resetPuzzle = useCallback(() => {
    setSelection([]);
    setSolved(new Set());
    setFeedback({ msg: "" });
    setEnded(false);
    setShowOverlay(false);
    if (puzzle) {
      if (puzzle.startTime) {
        const start = new Date(puzzle.startTime).getTime();
        const remaining = Math.max(
          0,
          puzzle.timeLimit - Math.floor((Date.now() - start) / 1000)
        );
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(puzzle.timeLimit);
      }
    }
  }, [puzzle]);

  const closeOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  if (!puzzle) {
    return (
      <Layout>
        <Head>
          <title>Puzzle</title>
          <link
            href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <Container
          as="main"
          className={cz(indexStyles.main, dive && styles['net-dive'])}
        >
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

  const sequence = selection.map((p) => puzzle.grid[p.r][p.c]).join(" ");
  const failed = ended && solved.size !== (puzzle?.daemons.length || 0);

  return (
    <Layout>
      <Head>
        <title>Breach Protocol Puzzle</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Container
        as="main"
        className={cz(
          indexStyles.main,
          dive && styles['net-dive'],
          failed && indexStyles.failed
        )}
      >
        <audio ref={breachAudio} src="/beep.mp3" />
        <audio ref={successAudio} src="/success.mp3" />
        {breachFlash && (
          <div className={`${styles['breach-notify']} ${styles.show}`}>DAEMON BREACHED</div>
        )}
        <Row className="align-items-center">
          <Col>
            <MainTitle className={indexStyles.title} />
            <h2 className={indexStyles.description}>Practice the Breach Protocol puzzle.</h2>
          </Col>
        </Row>
        <Row>
          <Col lg={8}>
            <div className={indexStyles["description-separator"]}></div>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col xs={6} lg={4}>
            <div
              className={cz(
                styles["timer-box"],
                timeRemaining <= 10 && styles["pulse-glow"]
              )}
            >
              BREACH TIME REMAINING: {timeRemaining}s
            </div>
          </Col>
          <Col xs={6} lg={{ span: 4, offset: 4 }} className="text-lg-right">
            <div className={styles["buffer-box"]}>
              <span className={styles["buffer-label"]}>BUFFER:</span>
              {Array.from({ length: bufferSize }).map((_, idx) => (
                <span key={idx} className={styles["buffer-slot"]}>
                  {selection[idx]
                    ? puzzle.grid[selection[idx].r][selection[idx].c]
                    : ""}
                </span>
              ))}
            </div>
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <p className={styles.description}>
              INITIATE BREACH PROTOCOL - TIME TO FLATLINE THESE DAEMONS, CHOOM.
            </p>
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={8}>
            <div
              className={cz(styles["grid-box"], {
                [styles.pulse]: breachFlash,
                [styles["fade-out"]]: ended && solved.size === (puzzle?.daemons.length || 0),
                [styles.failure]: failed,
              })}
            >
              <div className={styles["grid-box__header"]}>
                <h3 className={styles["grid-box__header_text"]}>ENTER CODE MATRIX</h3>
              </div>
              <div className={styles["grid-box__inside"]}>
                <div className={styles.grid}>
                  {puzzle.grid.map((row, r) =>
                    row.map((val, c) => {
                      const isSelected = selection.some((p) => p.r === r && p.c === c);
                      const selectable = (() => {
                        if (ended) return false;
                        if (isSelected) return false;
                        if (selection.length === 0) {
                          return r === 0;
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
                        <div key={`${r}-${c}`} className={classes.join(" ")} onClick={() => handleCellClick(r, c)}>
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
                [styles["fade-out"]]: ended && solved.size === (puzzle?.daemons.length || 0),
                [styles.failure]: failed,
              })}
            >
              <div className={styles["daemon-box__header"]}>
                <h3 className={styles["daemon-box__header_text"]}>DAEMONS</h3>
              </div>
              <div className={styles["daemon-box__inside"]}>
                <ol className={styles.daemons}>
                  {puzzle.daemons.map((d, idx) => (
                    <li key={idx} className={solved.has(idx) ? "solved" : undefined}>
                      {d.join(" ")} {solved.has(idx) && daemonWords[idx] ? `- ${daemonWords[idx]}` : ''}
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
              <Button onClick={resetPuzzle}>Reset Puzzle</Button>
            </div>
          </Col>
        </Row>
        <Separator className="mt-5" />
        {showOverlay && ended && solved.size === (puzzle?.daemons.length || 0) && (
          <div className={styles["terminal-overlay"]}>
            <pre className={styles["terminal-log"]}>{logLines.join("\n")}</pre>
            {logLines.length ===
              (secretWord
                ? generateSuccessLog(puzzle.daemons.length).length + 1
                : generateSuccessLog(puzzle.daemons.length).length) && (
              <button className={styles["exit-button"]} onClick={closeOverlay}>
                EXIT INTERFACE
              </button>
            )}
          </div>
        )}
        {showOverlay && failed && puzzle && (
          <div className={`${styles["terminal-overlay"]} ${styles.failure}`}>
            <pre className={styles["terminal-log"]}>{logLines.join("\n")}</pre>
            {logLines.length ===
              (generateFailureLog(solved.size, puzzle.daemons.length).length +
                daemonWords.filter((w, i) => solved.has(i) && w).length) && (
              <button
                className={`${styles["exit-button"]} ${styles.failure}`}
                onClick={closeOverlay}
              >
                EXIT INTERFACE
              </button>
            )}
          </div>
        )}
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<NetrunProps> = async ({ params }) => {
  const { log: serverLog, logError } = await import('../../services/logger');
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) {
    logError('Missing puzzle id in getServerSideProps');
    return { props: { initialPuzzle: null, hasError: true } };
  }
  try {
    serverLog(`getServerSideProps fetching puzzle ${id}`);
    const puzzle = await getPuzzle(id);
    if (!puzzle) {
      logError(`Puzzle ${id} not found in getServerSideProps`);
      return { props: { initialPuzzle: null, hasError: true } };
    }
    const { grid, daemons, bufferSize, timeLimit, startTime } = puzzle;
    serverLog(`getServerSideProps sending puzzle ${id}`);
    return {
      props: {
        initialPuzzle: {
          grid,
          daemons,
          bufferSize,
          timeLimit,
          startTime,
          path: [],
          solutionSeq: [],
          difficulty: 'Unknown',
          solutionCount: 0,
          secretWord: '',
          daemonWords: daemons.map(() => ''),
        },
        hasError: false,
      },
    };
  } catch (e) {
    logError('Error fetching puzzle in getServerSideProps', e);
    return { props: { initialPuzzle: null, hasError: true } };
  }
};
