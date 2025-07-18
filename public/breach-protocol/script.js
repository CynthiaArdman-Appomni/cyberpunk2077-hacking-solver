// List of allowed hexadecimal values in the puzzle.
const HEX_VALUES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];
// Limit on how many selections the player can make. This will be
// overwritten by the generated puzzle's buffer size.
let maxSteps = 8;

// Returns a random element from HEX_VALUES.
function randomHex() {
    return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

// Generate a single daemon sequence.
function generateDaemon(length) {
    const seq = [];
    for (let i = 0; i < length; i++) {
        seq.push(randomHex());
    }
    return seq;
}

// Shortest common supersequence of two sequences.
function scsTwo(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
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
    const result = [];
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

// Compute the shortest common supersequence of multiple sequences.
function shortestCommonSupersequence(seqs) {
    if (seqs.length === 0) return [];

    const permutations = (arr) => {
        if (arr.length <= 1) return [arr];
        const res = [];
        arr.forEach((item, idx) => {
            const rest = arr.slice(0, idx).concat(arr.slice(idx + 1));
            permutations(rest).forEach((perm) => res.push([item, ...perm]));
        });
        return res;
    };

    let best = null;
    permutations(seqs).forEach((perm) => {
        let current = perm[0];
        for (let i = 1; i < perm.length; i++) {
            current = scsTwo(current, perm[i]);
        }
        if (!best || current.length < best.length) {
            best = current;
        }
    });
    return best;
}

// Generate random alternating path positions.
function generatePathPositions(length, rows, cols, startRow) {
    const path = [];
    let r = startRow;
    let c = Math.floor(Math.random() * cols);
    const used = new Set();
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
            }
            else {
                c = Math.floor(Math.random() * cols);
            }
            attempts++;
        }
        path.push({ r, c });
        used.add(`${r},${c}`);
    }
    return path;
}

// Generate a puzzle grid and daemon sequences with a guaranteed solution.
function generatePuzzle(rows = 5, cols = 5, count = 3, startRow = 0) {
    const daemons = [];
    for (let i = 0; i < count; i++) {
        const length = Math.floor(Math.random() * 3) + 2; // 2-4
        daemons.push(generateDaemon(length));
    }

    const solutionSeq = shortestCommonSupersequence(daemons);
    const bufferSize = solutionSeq.length;

    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
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

let currentGrid = [];
let daemonSequences = [];
let selection = [];
let solvedDaemons = new Set();
let startRow = 0;
let puzzleEnded = false;

function updateHighlights() {
    const cells = document.querySelectorAll('#grid .cell');
    cells.forEach(c => c.classList.remove('active', 'dim'));
    if (puzzleEnded) return;

    if (selection.length === 0) {
        cells.forEach(c => {
            if (parseInt(c.dataset.row, 10) === startRow) {
                c.classList.add('active');
            } else {
                c.classList.add('dim');
            }
        });
        return;
    }

    const last = selection[selection.length - 1];
    const expectColumn = selection.length % 2 === 1;
    cells.forEach(c => {
        const r = parseInt(c.dataset.row, 10);
        const col = parseInt(c.dataset.col, 10);
        const selectable = expectColumn ? col === last.c : r === last.r;
        if (selectable) {
            c.classList.add('active');
        } else {
            c.classList.add('dim');
        }
    });
}

function updatePathLines() {
    const svg = document.getElementById('pathLines');
    if (!svg) return;
    svg.innerHTML = '';
    if (selection.length < 2) return;

    const getCenter = (pos) => {
        const cell = document.querySelector(`.cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
        const rect = cell.getBoundingClientRect();
        const parentRect = svg.getBoundingClientRect();
        return { x: rect.left - parentRect.left + rect.width/2, y: rect.top - parentRect.top + rect.height/2 };
    };

    for (let i = 0; i < selection.length - 1; i++) {
        const c1 = getCenter(selection[i]);
        const c2 = getCenter(selection[i+1]);
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', c1.x);
        line.setAttribute('y1', c1.y);
        line.setAttribute('x2', c2.x);
        line.setAttribute('y2', c2.y);
        svg.appendChild(line);
    }
}

function displayGrid(grid) {
    const container = document.getElementById('grid');
    const svg = document.getElementById('pathLines');
    container.innerHTML = '';
    if (svg) container.appendChild(svg);
    grid.forEach((row, r) => {
        row.forEach((value, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (r === startRow) cell.classList.add('start-row');
            cell.textContent = value;
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', onCellClick);
            container.appendChild(cell);
        });
    });
}

// Render daemon sequences into the DOM.
function displayDaemons(daemons) {
    const list = document.getElementById('daemons');
    list.innerHTML = '';
    daemons.forEach((seq, idx) => {
        const item = document.createElement('li');
        item.textContent = seq.join(' ');
        item.dataset.index = idx;
        list.appendChild(item);
    });
    daemonSequences = daemons;
}

// Generate a new puzzle and display it.
function newPuzzle() {
    const puzzle = generatePuzzle(5, 5, 3, startRow);
    currentGrid = puzzle.grid;
    daemonSequences = puzzle.daemons;
    maxSteps = puzzle.bufferSize;
    selection = [];
    solvedDaemons.clear();
    puzzleEnded = false;
    displayGrid(currentGrid);
    displayDaemons(daemonSequences);
    updateSequence();
    updateFeedback('');
    updateHighlights();
    updatePathLines();
}

function updateSequence() {
    const el = document.getElementById('sequence');
    const seq = selection.map(p => currentGrid[p.r][p.c]).join(' ');
    el.textContent = seq;
}

function updateFeedback(message, type = '') {
    const el = document.getElementById('feedback');
    el.textContent = message;
    el.className = 'feedback' + (type ? ' ' + type : '');
}

function endPuzzle(success) {
    puzzleEnded = true;
    if (success) {
        updateFeedback('Puzzle solved!', 'success');
    } else {
        const solvedCount = solvedDaemons.size;
        const maxComplexity = solvedCount
            ? Math.max(...Array.from(solvedDaemons).map(i => daemonSequences[i].length))
            : 0;
        updateFeedback(`Breached ${solvedCount}/${daemonSequences.length} daemons. Complexity ${maxComplexity}.`, 'error');
    }
}

function onCellClick(e) {
    if (puzzleEnded || selection.length >= maxSteps) {
        return;
    }
    const cell = e.currentTarget;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);

    if (selection.length === 0) {
        if (r !== startRow) {
            updateFeedback('First selection must be from the highlighted row.', 'error');
            cell.classList.add('invalid');
            setTimeout(() => cell.classList.remove('invalid'), 300);
            return;
        }
    } else {
        const last = selection[selection.length - 1];
        const expectColumn = selection.length % 2 === 1;
        if (expectColumn && c !== last.c) {
            updateFeedback('Select a cell in the same column.', 'error');
            cell.classList.add('invalid');
            setTimeout(() => cell.classList.remove('invalid'), 300);
            return;
        }
        if (!expectColumn && r !== last.r) {
            updateFeedback('Select a cell in the same row.', 'error');
            cell.classList.add('invalid');
            setTimeout(() => cell.classList.remove('invalid'), 300);
            return;
        }
    }

    selection.push({ r, c });
    cell.classList.add('selected');
    updateSequence();
    updateFeedback('');
    updateHighlights();
    updatePathLines();
    checkDaemons();
    if (solvedDaemons.size === daemonSequences.length) {
        endPuzzle(true);
    } else if (selection.length >= maxSteps) {
        endPuzzle(false);
    }
}

function resetSelection() {
    selection = [];
    solvedDaemons.clear();
    puzzleEnded = false;
    document.querySelectorAll('#grid .cell').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('#daemons li').forEach(li => li.classList.remove('solved'));
    updateSequence();
    updateFeedback('');
    updateHighlights();
    updatePathLines();
}

function sequencesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function containsSubsequence(arr, subseq) {
    let idx = 0;
    for (const val of arr) {
        if (val === subseq[idx]) {
            idx++;
            if (idx === subseq.length) return true;
        }
    }
    return false;
}

function containsContiguous(arr, subseq) {
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
}

function checkDaemons() {
    const seq = selection.map(p => currentGrid[p.r][p.c]);
    let interrupted = false;
    let solvedAny = false;
    daemonSequences.forEach((daemon, idx) => {
        if (solvedDaemons.has(idx)) return;
        if (containsContiguous(seq, daemon)) {
            solvedDaemons.add(idx);
            const li = document.querySelector(`#daemons li[data-index="${idx}"]`);
            if (li) li.classList.add('solved');
            solvedAny = true;
        } else if (containsSubsequence(seq, daemon)) {
            interrupted = true;
        }
    });
    if (solvedAny) {
        updateFeedback('Daemon breached!', 'success');
    } else if (interrupted) {
        updateFeedback('Sequence interrupted', 'error');
    }
}

document.getElementById('newPuzzleBtn').addEventListener('click', newPuzzle);
document.getElementById('resetPuzzleBtn').addEventListener('click', resetSelection);

// Generate initial puzzle
newPuzzle();
