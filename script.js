// Tetris Game Logic and Math Explanation

const COLS = 10;
const ROWS = 20;
let grid = createEmptyGrid();
let boardEl = document.getElementById('tetris-board');
let score = 0;
let lines = 0;
let gameOver = false;
let gameInterval = null;
let currentTab = 'game';

// Tetromino matrices
const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
};

// Bag randomizer (7-bag system)
let bag = [];
function getNextPieceType() {
    if (bag.length === 0) {
        bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        // Shuffle bag
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    }
    return bag.pop();
}

let currentPiece = null;
let nextPieceType = null;

// Start game on load
startNewGame();

function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes(tabId === 'math' ? 'mathematik' : 'spiel')) {
            btn.classList.add('active');
        }
    });

    if (tabId === 'game' && !gameOver) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function createEmptyGrid() {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function startNewGame() {
    pauseGame();
    grid = createEmptyGrid();
    score = 0;
    lines = 0;
    gameOver = false;
    bag = [];
    
    document.getElementById('tetris-score').innerText = score;
    document.getElementById('tetris-lines').innerText = lines;
    document.getElementById('game-over-overlay').classList.add('hidden');
    
    nextPieceType = getNextPieceType();
    spawnPiece();
    renderGrid();
    resumeGame();
}

function spawnPiece() {
    let type = nextPieceType;
    nextPieceType = getNextPieceType();
    renderPreview();
    
    currentPiece = {
        matrix: SHAPES[type].map(row => [...row]),
        row: type === 'I' ? -1 : 0,
        col: Math.floor((COLS - SHAPES[type][0].length) / 2),
        type: type
    };
    
    // Check initial collision (Game Over)
    if (checkCollision(currentPiece.matrix, currentPiece.row, currentPiece.col)) {
        gameOver = true;
        pauseGame();
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }
}

function checkCollision(matrix, cellRow, cellCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
                let gridRow = cellRow + r;
                let gridCol = cellCol + c;
                
                if (gridCol < 0 || gridCol >= COLS || gridRow >= ROWS) {
                    return true; // borders
                }
                if (gridRow >= 0 && grid[gridRow][gridCol] !== 0) {
                    return true; // collision with locked blocks
                }
            }
        }
    }
    return false;
}

function lockPiece() {
    const matrix = currentPiece.matrix;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
                let gridRow = currentPiece.row + r;
                let gridCol = currentPiece.col + c;
                if (gridRow >= 0) {
                    grid[gridRow][gridCol] = currentPiece.type;
                }
            }
        }
    }
    
    clearRows();
    spawnPiece();
    renderGrid();
}

function clearRows() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(val => val !== 0)) {
            // Remove row and insert empty row at the top
            grid.splice(r, 1);
            grid.unshift(Array(COLS).fill(0));
            cleared++;
            r++; // offset decrement to check same index again
        }
    }
    
    if (cleared > 0) {
        lines += cleared;
        let points = [0, 100, 300, 500, 800]; // Single, Double, Triple, Tetris
        score += points[cleared] || 1200;
        
        document.getElementById('tetris-score').innerText = score;
        document.getElementById('tetris-lines').innerText = lines;
    }
}

function renderGrid() {
    boardEl.innerHTML = '';
    
    // Create elements
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'tetris-cell';
            
            // Check locked piece
            if (grid[r][c] !== 0) {
                cell.classList.add(`filled-${grid[r][c]}`);
            }
            
            // Check current piece overlay
            if (currentPiece && !gameOver) {
                let pr = r - currentPiece.row;
                let pc = c - currentPiece.col;
                if (pr >= 0 && pr < currentPiece.matrix.length && pc >= 0 && pc < currentPiece.matrix[pr].length) {
                    if (currentPiece.matrix[pr][pc] !== 0) {
                        cell.classList.add(`filled-${currentPiece.type}`);
                    }
                }
            }
            
            boardEl.appendChild(cell);
        }
    }
}

function renderPreview() {
    const previewEl = document.getElementById('preview-box');
    previewEl.innerHTML = '';
    
    const shape = SHAPES[nextPieceType];
    const previewGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    
    // Center it in a 4x4 preview grid
    let offsetRow = nextPieceType === 'I' ? 0 : nextPieceType === 'O' ? 1 : 1;
    let offsetCol = nextPieceType === 'I' ? 0 : nextPieceType === 'O' ? 1 : 0.5;
    
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
                let pr = Math.floor(r + offsetRow);
                let pc = Math.floor(c + offsetCol);
                if (pr < 4 && pc < 4) {
                    previewGrid[pr][pc] = nextPieceType;
                }
            }
        }
    }
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const cell = document.createElement('div');
            cell.className = 'preview-cell';
            if (previewGrid[r][c] !== 0) {
                cell.classList.add(`filled-${previewGrid[r][c]}`);
            }
            previewEl.appendChild(cell);
        }
    }
}

// Controls
function rotatePiece() {
    const matrix = currentPiece.matrix;
    const n = matrix.length;
    let rotated = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            rotated[c][n - 1 - r] = matrix[r][c];
        }
    }
    
    // Wall kick attempt (simple col shifting if collision occurs)
    if (!checkCollision(rotated, currentPiece.row, currentPiece.col)) {
        currentPiece.matrix = rotated;
    } else if (!checkCollision(rotated, currentPiece.row, currentPiece.col - 1)) {
        currentPiece.col -= 1;
        currentPiece.matrix = rotated;
    } else if (!checkCollision(rotated, currentPiece.row, currentPiece.col + 1)) {
        currentPiece.col += 1;
        currentPiece.matrix = rotated;
    }
    renderGrid();
}

function moveLeft() {
    if (!checkCollision(currentPiece.matrix, currentPiece.row, currentPiece.col - 1)) {
        currentPiece.col--;
        renderGrid();
    }
}

function moveRight() {
    if (!checkCollision(currentPiece.matrix, currentPiece.row, currentPiece.col + 1)) {
        currentPiece.col++;
        renderGrid();
    }
}

function moveDown() {
    if (!checkCollision(currentPiece.matrix, currentPiece.row + 1, currentPiece.col)) {
        currentPiece.row++;
        renderGrid();
        return true;
    }
    lockPiece();
    return false;
}

function hardDrop() {
    while (!checkCollision(currentPiece.matrix, currentPiece.row + 1, currentPiece.col)) {
        currentPiece.row++;
    }
    lockPiece();
}

// Game Ticks
function resumeGame() {
    if (gameInterval) return;
    gameInterval = setInterval(() => {
        if (!gameOver) {
            moveDown();
        }
    }, 800);
}

function pauseGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

// Keyboard Listeners
document.addEventListener('keydown', e => {
    if (currentTab !== 'game' || gameOver) return;
    
    if (e.key === 'ArrowUp') {
        rotatePiece();
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        moveLeft();
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        moveRight();
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        moveDown();
        e.preventDefault();
    } else if (e.key === ' ') {
        hardDrop();
        e.preventDefault();
    }
});

// Touch controls handler
function handleTouchCtrl(action) {
    if (gameOver) return;
    if (action === 'left') moveLeft();
    else if (action === 'right') moveRight();
    else if (action === 'rotate') rotatePiece();
    else if (action === 'soft') moveDown();
    else if (action === 'hard') hardDrop();
}
