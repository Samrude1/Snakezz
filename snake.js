const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = 20; // 400px / 20px
const GAME_SPEED = 100; // ms per move (logic update rate)

// Game State
let snake = [];
let food = { x: 10, y: 10 };
let velocity = { x: 0, y: 0 };
let score = 0;
let highscore = localStorage.getItem("highscore") || 0;
let lastTime = 0;
let accumulator = 0;
let particles = [];
let gameState = "MENU"; // MENU, PLAYING, GAMEOVER
let gameMode = "PLAYER"; // PLAYER, BOT

// DOM Elements
const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
const finalScoreEl = document.getElementById("final-score-val");
const menuScreen = document.getElementById("menu-screen");
const gameoverScreen = document.getElementById("gameover-screen");

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Initialization ---
function init() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Button Listeners
  document.getElementById("btn-play").addEventListener("click", () => startGame("PLAYER"));
  document.getElementById("btn-bot").addEventListener("click", () => startGame("BOT"));
  document.getElementById("btn-restart").addEventListener("click", () => startGame("PLAYER"));
  document.getElementById("btn-menu").addEventListener("click", showMenu);

  // Input Listeners
  document.addEventListener("keydown", handleKeydown);
  setupTouchControls();

  // Start Loop
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  // Keep internal resolution fixed, CSS handles scaling
  canvas.width = 400;
  canvas.height = 400;
}

function showMenu() {
  gameState = "MENU";
  menuScreen.classList.remove("hidden");
  gameoverScreen.classList.add("hidden");
  resetGame();
}

function startGame(mode) {
  if (audioCtx.state === "suspended") audioCtx.resume();

  gameMode = mode;
  gameState = "PLAYING";
  menuScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  resetGame();

  if (mode === "PLAYER") {
    velocity = { x: 1, y: 0 }; // Start moving right
  }
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  velocity = { x: 1, y: 0 };
  score = 0;
  updateScore(0);
  spawnFood();
  particles = [];
}

// --- Game Loop ---
function gameLoop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (gameState === "PLAYING") {
    accumulator += deltaTime;
    while (accumulator > GAME_SPEED) {
      update();
      accumulator -= GAME_SPEED;
    }
  }

  render(deltaTime); // Pass delta for smooth animations if needed
  requestAnimationFrame(gameLoop);
}

// --- Update Logic ---
function update() {
  if (gameMode === "BOT") {
    botLogic();
  }

  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

  // Wall Collision
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    gameOver();
    return;
  }

  // Self Collision
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      gameOver();
      return;
    }
  }

  snake.unshift(head);

  // Food Collision
  if (head.x === food.x && head.y === food.y) {
    score++;
    updateScore(score);
    playSound("eat");
    createParticles(head.x * GRID_SIZE + GRID_SIZE / 2, head.y * GRID_SIZE + GRID_SIZE / 2, "#00ff88");
    spawnFood();
  } else {
    snake.pop();
  }
}

function gameOver() {
  gameState = "GAMEOVER";
  playSound("gameover");
  finalScoreEl.textContent = score;
  gameoverScreen.classList.remove("hidden");

  if (score > highscore) {
    highscore = score;
    localStorage.setItem("highscore", highscore);
    highscoreEl.textContent = highscore;
  }
}

function spawnFood() {
  let valid = false;
  while (!valid) {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);

    valid = true;
    for (let part of snake) {
      if (part.x === food.x && part.y === food.y) {
        valid = false;
        break;
      }
    }
  }
}

function updateScore(val) {
  scoreEl.textContent = val;
}

// --- Rendering ---
function render() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Grid
  drawGrid();

  // Draw Food
  drawFood();

  // Draw Snake
  drawSnake();

  // Draw Particles
  updateAndDrawParticles();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    const x = part.x * GRID_SIZE;
    const y = part.y * GRID_SIZE;

    ctx.fillStyle = index === 0 ? "#ffffff" : "#00ff88";

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ff88";

    // Rounded rect for body
    roundRect(ctx, x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4);
    ctx.fill();

    ctx.shadowBlur = 0; // Reset
  });
}

function drawFood() {
  const x = food.x * GRID_SIZE + GRID_SIZE / 2;
  const y = food.y * GRID_SIZE + GRID_SIZE / 2;

  ctx.fillStyle = "#ff0055";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff0055";

  ctx.beginPath();
  ctx.arc(x, y, GRID_SIZE / 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- Particles ---
function createParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
      color: color
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// --- Input Handling ---
function handleKeydown(e) {
  if (gameState !== "PLAYING" || gameMode === "BOT") return;

  switch (e.key) {
    case "ArrowUp": case "w": case "W":
      if (velocity.y === 0) velocity = { x: 0, y: -1 };
      break;
    case "ArrowDown": case "s": case "S":
      if (velocity.y === 0) velocity = { x: 0, y: 1 };
      break;
    case "ArrowLeft": case "a": case "A":
      if (velocity.x === 0) velocity = { x: -1, y: 0 };
      break;
    case "ArrowRight": case "d": case "D":
      if (velocity.x === 0) velocity = { x: 1, y: 0 };
      break;
  }
}

// Touch / Swipe Controls
function setupTouchControls() {
  let touchStartX = 0;
  let touchStartY = 0;
  const gameContainer = document.getElementById("game-container");

  gameContainer.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: false });

  gameContainer.addEventListener("touchmove", (e) => {
    e.preventDefault(); // Prevent scrolling
  }, { passive: false });

  gameContainer.addEventListener("touchend", (e) => {
    if (gameState !== "PLAYING" || gameMode === "BOT") return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (Math.abs(dx) > 30) { // Threshold
        if (dx > 0 && velocity.x === 0) velocity = { x: 1, y: 0 };
        else if (dx < 0 && velocity.x === 0) velocity = { x: -1, y: 0 };
      }
    } else {
      // Vertical
      if (Math.abs(dy) > 30) {
        if (dy > 0 && velocity.y === 0) velocity = { x: 0, y: 1 };
        else if (dy < 0 && velocity.y === 0) velocity = { x: 0, y: -1 };
      }
    }
  });
}

// --- Audio ---
function playSound(type) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === "eat") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "gameover") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

// --- Bot Logic (Simple BFS/Greedy) ---
function botLogic() {
  // Simple greedy approach for demo purposes
  // A full BFS/Hamiltonian cycle is better but more complex
  const head = snake[0];

  // Try to move towards food
  let moves = [
    { x: 0, y: -1 }, // UP
    { x: 0, y: 1 },  // DOWN
    { x: -1, y: 0 }, // LEFT
    { x: 1, y: 0 }   // RIGHT
  ];

  // Filter out invalid moves (walls, self)
  moves = moves.filter(m => {
    const nx = head.x + m.x;
    const ny = head.y + m.y;

    // Wall check
    if (nx < 0 || nx >= TILE_COUNT || ny < 0 || ny >= TILE_COUNT) return false;

    // Body check
    for (let part of snake) {
      if (part.x === nx && part.y === ny) return false;
    }

    // Don't reverse
    if (m.x === -velocity.x && m.y === -velocity.y) return false;

    return true;
  });

  if (moves.length === 0) return; // No moves, will die

  // Pick move that gets closer to food
  let bestMove = moves[0];
  let minDist = 9999;

  for (let m of moves) {
    const nx = head.x + m.x;
    const ny = head.y + m.y;
    const dist = Math.abs(nx - food.x) + Math.abs(ny - food.y);

    if (dist < minDist) {
      minDist = dist;
      bestMove = m;
    }
  }

  velocity = bestMove;
}

// Start
init();
highscoreEl.textContent = highscore;
