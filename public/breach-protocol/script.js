// List of allowed hexadecimal values in the puzzle.
const HEX_VALUES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];

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

// Render the grid into the DOM.
function displayGrid(grid) {
    const container = document.getElementById('grid');
    container.innerHTML = '';
    grid.forEach(row => {
        row.forEach(value => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = value;
            container.appendChild(cell);
        });
    });
}

// Render daemon sequences into the DOM.
function displayDaemons(daemons) {
    const list = document.getElementById('daemons');
    list.innerHTML = '';
    daemons.forEach(seq => {
        const item = document.createElement('li');
        item.textContent = seq.join(' ');
        list.appendChild(item);
    });
}

// Generate a new puzzle and display it.
function newPuzzle() {
    const grid = generateGrid();
    const daemons = generateDaemons(grid);
    displayGrid(grid);
    displayDaemons(daemons);
}

document.getElementById('newPuzzleBtn').addEventListener('click', newPuzzle);
// Generate a puzzle on initial load.
newPuzzle();
