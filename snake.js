const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const box = 20;
const rows = canvas.height / box;
const cols = canvas.width / box;

let snake, direction, food, score;
let highscore = localStorage.getItem("highscore") || 0;
let state = "menu"; // 'menu' | 'playing' | 'gameover'
let mode = null; // 'player' | 'bot'
let inputQueue = []; // Buffer for key presses

// --- Audio Setup ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === "eat") {
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === "gameover") {
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  }
}

document.getElementById("highscore").textContent = highscore;
document.addEventListener("keydown", handleKeyPress);

// --- Bot Control (BFS Pathfinding + Survival) ---
function botControl() {
  const head = snake[0];

  // 1. Try to find shortest path to food
  const path = bfs(head, food);

  if (path.length > 0) {
    // Path found, take the first step
    const nextMove = path[0];
    direction = getDirection(head, nextMove);
  } else {
    // 2. No path to food (blocked), try to survive longer
    // Pick the move that leads to the most open space (Flood Fill)
    const safeMoves = getSafeMoves(head);

    if (safeMoves.length > 0) {
      let bestMove = safeMoves[0];
      let maxSpace = -1;

      for (const move of safeMoves) {
        const space = floodFill(move);
        if (space > maxSpace) {
          maxSpace = space;
          bestMove = move;
        }
      }
      direction = getDirection(head, bestMove);
    }
  }
}

// BFS to find shortest path from start to target
function bfs(start, target) {
  const queue = [[start]];
  const visited = new Set();
  visited.add(`${start.x},${start.y}`);

  // Create a set of snake body positions for fast lookup
  const snakeBody = new Set(snake.map(s => `${s.x},${s.y}`));

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current.x === target.x && current.y === target.y) {
      return path.slice(1); // Return path excluding start
    }

    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      // Allow moving to tail because it will move away
      const isTail = neighbor.x === snake[snake.length - 1].x && neighbor.y === snake[snake.length - 1].y;

      if (!visited.has(key) && (!snakeBody.has(key) || isTail)) {
        visited.add(key);
        queue.push([...path, neighbor]);
      }
    }
  }
  return []; // No path found
}

// Count reachable cells from a starting point
function floodFill(start) {
  const queue = [start];
  const visited = new Set();
  visited.add(`${start.x},${start.y}`);
  const snakeBody = new Set(snake.map(s => `${s.x},${s.y}`));
  let count = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    count++;

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key) && !snakeBody.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }
  return count;
}

function getNeighbors(pos) {
  const moves = [
    { x: pos.x - box, y: pos.y }, // Left
    { x: pos.x + box, y: pos.y }, // Right
    { x: pos.x, y: pos.y - box }, // Up
    { x: pos.x, y: pos.y + box }  // Down
  ];

  return moves.filter(m =>
    m.x >= 0 && m.x < canvas.width &&
    m.y >= 0 && m.y < canvas.height
  );
}

function getSafeMoves(head) {
  return getNeighbors(head).filter(pos => {
    // Check collision with snake body
    return !snake.some(s => s.x === pos.x && s.y === pos.y);
  });
}

function getDirection(from, to) {
  if (to.x < from.x) return "LEFT";
  if (to.x > from.x) return "RIGHT";
  if (to.y < from.y) return "UP";
  if (to.y > from.y) return "DOWN";
  return direction;
}

// --- Reset Game ---
function resetGame() {
  snake = [{ x: 9 * box, y: 9 * box }];
  direction = "RIGHT";
  inputQueue = []; // Clear buffer
  food = spawnFood();
  score = 0;
  document.getElementById("score").textContent = score;
}

// --- Food ---
function spawnFood() {
  return {
    x: Math.floor(Math.random() * cols) * box,
    y: Math.floor(Math.random() * rows) * box,
  };
}

// --- Key Handling ---
function handleKeyPress(e) {
  if (state === "menu") {
    if (e.key === "1") {
      if (audioCtx.state === "suspended") audioCtx.resume();
      mode = "player";
      state = "playing";
      resetGame();
    } else if (e.key === "2") {
      if (audioCtx.state === "suspended") audioCtx.resume();
      mode = "bot";
      state = "playing";
      resetGame();
    }
  } else if (state === "playing" && mode === "player") {
    const key = e.key.toLowerCase();
    let nextDir = null;

    if (key === "arrowleft" || key === "a") nextDir = "LEFT";
    else if (key === "arrowup" || key === "w") nextDir = "UP";
    else if (key === "arrowright" || key === "d") nextDir = "RIGHT";
    else if (key === "arrowdown" || key === "s") nextDir = "DOWN";

    if (nextDir) {
      const lastPlannedDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;

      if (nextDir === "LEFT" && lastPlannedDir !== "RIGHT") inputQueue.push(nextDir);
      else if (nextDir === "UP" && lastPlannedDir !== "DOWN") inputQueue.push(nextDir);
      else if (nextDir === "RIGHT" && lastPlannedDir !== "LEFT") inputQueue.push(nextDir);
      else if (nextDir === "DOWN" && lastPlannedDir !== "UP") inputQueue.push(nextDir);
    }
  } else if (state === "gameover") {
    if (e.key === " ") {
      state = "playing";
      resetGame();
    } else if (e.key.toLowerCase() === "q") {
      state = "menu";
    }
  }
}

// --- Menu ---
function drawMenu() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "20px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("SELECT MODE", canvas.width / 2, canvas.height / 2 - 40);
  ctx.fillText("1 = PLAYER (WASD)", canvas.width / 2, canvas.height / 2);
  ctx.fillText("2 = BOT", canvas.width / 2, canvas.height / 2 + 30);
}

// --- Game Over ---
function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "20px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
  ctx.fillText("SPACE = RESTART", canvas.width / 2, canvas.height / 2);
  ctx.fillText("Q = MENU", canvas.width / 2, canvas.height / 2 + 30);
}

// --- Game ---
function drawGame() {
  if (mode === "bot") {
    botControl();
  } else {
    // Process one move from the queue per frame
    if (inputQueue.length > 0) {
      direction = inputQueue.shift();
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Snake
  snake.forEach((segment, index) => {
    // Head is solid white, body is white with a black border (or just smaller)
    ctx.fillStyle = "#fff";
    ctx.fillRect(segment.x, segment.y, box, box);

    // Optional: Add a small border to distinguish segments
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(segment.x, segment.y, box, box);
  });

  // Food
  ctx.fillStyle = "#fff";
  // Draw food as a smaller square or circle to distinguish from snake
  ctx.fillRect(food.x + 4, food.y + 4, box - 8, box - 8);

  // Movement
  let head = { ...snake[0] };
  if (direction === "LEFT") head.x -= box;
  if (direction === "RIGHT") head.x += box;
  if (direction === "UP") head.y -= box;
  if (direction === "DOWN") head.y += box;

  // Game over check
  if (
    head.x < 0 ||
    head.x >= canvas.width ||
    head.y < 0 ||
    head.y >= canvas.height ||
    snake.some((seg) => seg.x === head.x && seg.y === head.y)
  ) {
    if (score > highscore) {
      localStorage.setItem("highscore", score);
      highscore = score;
      document.getElementById("highscore").textContent = highscore;
    }
    playSound("gameover");
    state = "gameover";
    return;
  }

  // Eating
  if (head.x === food.x && head.y === food.y) {
    score++;
    document.getElementById("score").textContent = score;
    playSound("eat");
    food = spawnFood();
  } else {
    snake.pop();
  }

  snake.unshift(head);
}

// --- Game Loop ---
function gameLoop() {
  if (state === "menu") drawMenu();
  else if (state === "playing") drawGame();
  else if (state === "gameover") drawGameOver();
}

setInterval(gameLoop, 80);
