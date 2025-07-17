// List of allowed hexadecimal values in the puzzle.
const HEX_VALUES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];
// Limit on how many selections the player can make
const MAX_STEPS = 8;

// Returns a random element from HEX_VALUES.
function randomHex() {
    return HEX_VALUES[Math.floor(Math.random() * HEX_VALUES.length)];
}

// Generate a rows x cols matrix filled with random hex values.
function generateGrid(rows = 5, cols = 5) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push(randomHex());
        }
        grid.push(row);
    }
    return grid;
}

// Convert path coordinates to the actual hex values from the grid.
function pathToSequence(grid, path) {
    return path.map(p => grid[p.r][p.c]);
}

// Generate a random path of a given length consisting of adjacent cells.
function generatePath(grid, length) {
    const rows = grid.length;
    const cols = grid[0].length;
    // Pick a random starting cell.
    let r = Math.floor(Math.random() * rows);
    let c = Math.floor(Math.random() * cols);
    const path = [{ r, c }];

    while (path.length < length) {
        const options = [];
        if (r > 0) options.push({ r: r - 1, c });
        if (r < rows - 1) options.push({ r: r + 1, c });
        if (c > 0) options.push({ r, c: c - 1 });
        if (c < cols - 1) options.push({ r, c: c + 1 });
        const next = options[Math.floor(Math.random() * options.length)];
        r = next.r;
        c = next.c;
        path.push(next);
    }
    return path;
}

// Create a specified number of daemon sequences from the grid.
function generateDaemons(grid, count = 3) {
    const daemons = [];
    for (let i = 0; i < count; i++) {
        const length = Math.random() < 0.5 ? 3 : 4;
        const path = generatePath(grid, length);
        daemons.push(pathToSequence(grid, path));
    }
    return daemons;
}

let currentGrid = [];
let daemonSequences = [];
let selection = [];
let solvedDaemons = new Set();
let startRow = 0;
let puzzleEnded = false;

function displayGrid(grid) {
    const container = document.getElementById('grid');
    container.innerHTML = '';
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
    currentGrid = generateGrid();
    daemonSequences = generateDaemons(currentGrid);
    startRow = Math.floor(Math.random() * currentGrid.length);
    selection = [];
    solvedDaemons.clear();
    puzzleEnded = false;
    displayGrid(currentGrid);
    displayDaemons(daemonSequences);
    updateSequence();
    updateFeedback('');
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
        updateFeedback('Puzzle failed. Try again.', 'error');
    }
}

function onCellClick(e) {
    if (puzzleEnded || selection.length >= MAX_STEPS) {
        return;
    }
    const cell = e.currentTarget;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);

    if (selection.length === 0) {
        if (r !== startRow) {
            updateFeedback('First selection must be from the highlighted row.', 'error');
            return;
        }
    } else {
        const last = selection[selection.length - 1];
        const expectColumn = selection.length % 2 === 1;
        if (expectColumn && c !== last.c) {
            updateFeedback('Select a cell in the same column.', 'error');
            return;
        }
        if (!expectColumn && r !== last.r) {
            updateFeedback('Select a cell in the same row.', 'error');
            return;
        }
    }

    selection.push({ r, c });
    cell.classList.add('selected');
    updateSequence();
    updateFeedback('');
    checkDaemons();
    if (solvedDaemons.size === daemonSequences.length) {
        endPuzzle(true);
    } else if (selection.length >= MAX_STEPS) {
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
}

function sequencesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function checkDaemons() {
    const seq = selection.map(p => currentGrid[p.r][p.c]);
    daemonSequences.forEach((daemon, idx) => {
        if (solvedDaemons.has(idx)) return;
        if (seq.length >= daemon.length) {
            const recent = seq.slice(seq.length - daemon.length);
            if (sequencesEqual(recent, daemon)) {
                solvedDaemons.add(idx);
                const li = document.querySelector(`#daemons li[data-index="${idx}"]`);
                if (li) li.classList.add('solved');
                updateFeedback('Daemon breached!', 'success');
            }
        }
    });
}

document.getElementById('newPuzzleBtn').addEventListener('click', newPuzzle);
document.getElementById('resetPuzzleBtn').addEventListener('click', resetSelection);

// Generate initial puzzle
newPuzzle();
