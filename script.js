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
loadHighscores();

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
        if (score > 0) {
            document.getElementById('final-score').innerText = score;
            document.getElementById('highscore-modal').classList.remove('hidden');
        } else {
            document.getElementById('game-over-overlay').classList.remove('hidden');
        }
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

// Highscore Functions
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let currentScoresList = [];

function loadHighscores() {
    try {
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.highscore_bridge) {
            window.webkit.messageHandlers.highscore_bridge.postMessage(JSON.stringify({ action: 'get_highscores' }));
            return;
        }
    } catch (e) {
        console.warn("highscore_bridge get_highscores error:", e);
    }
    
    // Fallback to localStorage
    let raw = localStorage.getItem('galadriel_tetris_scores');
    currentScoresList = raw ? JSON.parse(raw) : [];
    renderHighscoresUI(currentScoresList);
}

function renderHighscoresUI(scoresList) {
    scoresList.sort((a, b) => b.score - a.score);
    
    const tbody = document.getElementById('leaderboard-body');
    if (tbody) {
        tbody.innerHTML = '';
        
        const top10 = scoresList.slice(0, 10);
        if (top10.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">Noch keine Highscores eingetragen. Spieldurchgang beenden!</td></tr>`;
            return;
        }
        
        top10.forEach((item, index) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${item.lines}</td>
                <td style="color:var(--success);font-weight:700">${item.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.onHighscoresLoaded = function(scoresList) {
    currentScoresList = scoresList;
    renderHighscoresUI(scoresList);
};

function submitHighscore() {
    let name = document.getElementById('player-name').value.trim();
    if (!name) name = "Anonym";
    
    // Kioskweite Tages-Bestenliste: Score an den Launcher melden
    try {
        window.webkit?.messageHandlers?.scorebridge?.postMessage(JSON.stringify({
            name: name,
            score: score
        }));
    } catch (e) { /* außerhalb des Kiosks nicht verfügbar */ }

    // Save to SQLite via bridge
    try {
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.highscore_bridge) {
            window.webkit.messageHandlers.highscore_bridge.postMessage(JSON.stringify({
                action: 'save_score',
                name: name,
                score: score,
                lines: lines
            }));
            closeHighscoreModal(false);
            return;
        }
    } catch (e) {
        console.warn("highscore_bridge save_score error:", e);
    }
    
    // Fallback to localStorage
    let raw = localStorage.getItem('galadriel_tetris_scores');
    let scoresList = raw ? JSON.parse(raw) : [];
    
    scoresList.push({
        name: name,
        lines: lines,
        score: score,
        date: new Date().toISOString()
    });
    
    localStorage.setItem('galadriel_tetris_scores', JSON.stringify(scoresList));

    closeHighscoreModal(false);
    loadHighscores();
}

function closeHighscoreModal(isCancel) {
    document.getElementById('highscore-modal').classList.add('hidden');
    document.getElementById('player-name').value = '';
    if (isCancel) {
        loadHighscores();
    }
    startNewGame();
}

function pressKey(char) {
    const input = document.getElementById('player-name');
    if (!input) return;
    
    if (char === 'Backspace') {
        input.value = input.value.slice(0, -1);
    } else {
        if (input.value.length < input.maxLength) {
            input.value += char;
        }
    }
}

// Enable touch/mouse drag scrolling on non-game tabs
function initDragScroll() {
    let isDown = false;
    let startY;
    let scrollTop;
    const body = document.documentElement || document.body;

    const shouldScroll = (e) => {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'tab-game') {
            return false;
        }
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'button' || tag === 'textarea' || tag === 'select' || e.target.closest('button') || e.target.closest('input')) {
            return false;
        }
        return true;
    };

    window.addEventListener('mousedown', (e) => {
        if (!shouldScroll(e)) return;
        isDown = true;
        startY = e.pageY - body.offsetTop;
        scrollTop = window.scrollY || document.documentElement.scrollTop;
    });

    window.addEventListener('mouseleave', () => {
        isDown = false;
    });

    window.addEventListener('mouseup', () => {
        isDown = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const y = e.pageY - body.offsetTop;
        const walk = (y - startY) * 1.5;
        window.scrollTo(0, scrollTop - walk);
    });

    window.addEventListener('touchstart', (e) => {
        if (!shouldScroll(e)) return;
        isDown = true;
        startY = e.touches[0].pageY - body.offsetTop;
        scrollTop = window.scrollY || document.documentElement.scrollTop;
    });

    window.addEventListener('touchend', () => {
        isDown = false;
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const y = e.touches[0].pageY - body.offsetTop;
        const walk = (y - startY) * 1.5;
        window.scrollTo(0, scrollTop - walk);
    }, { passive: false });
}

initDragScroll();
