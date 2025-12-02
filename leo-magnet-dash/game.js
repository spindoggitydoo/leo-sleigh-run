const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const hudEl = document.querySelector(".hud");
const footerEl = document.querySelector(".footer");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const overlayEl = document.getElementById("overlay");
const startButton = document.getElementById("startButton");

let lastTimestamp = 0;

let score = 0;
let bestScore = Number(localStorage.getItem("leoMagnetBestScore") || 0);
bestScoreEl.textContent = bestScore;

let distance = 0;
let gameRunning = false;
let gameOver = false;

const elfImg = new Image();
let elfImgLoaded = false;
(function setupElfAsset() {
  const sources = [
    "assets/leo-elf.png",
    "assets/leo-elf.svg",
    "assets/elf.png",
    "assets/elf.svg",
  ];
  let index = 0;
  elfImg.onload = function () {
    elfImgLoaded = true;
  };
  elfImg.onerror = function () {
    index += 1;
    if (index < sources.length) {
      elfImg.src = sources[index];
    }
  };
  elfImg.src = sources[index];
})();

const treeImg = new Image();
let treeImgLoaded = false;
(function setupTreeAsset() {
  const sources = [
    "assets/tree.png",
    "assets/tree.svg",
    "assets/christmas_tree.png",
    "assets/christmas_tree.svg",
  ];
  let index = 0;
  treeImg.onload = function () {
    treeImgLoaded = true;
  };
  treeImg.onerror = function () {
    index += 1;
    if (index < sources.length) {
      treeImg.src = sources[index];
    }
  };
  treeImg.src = sources[index];
})();

const snowballImg = new Image();
let snowballImgLoaded = false;
(function setupSnowballAsset() {
  const sources = ["assets/snowball.png", "assets/snowball.svg"]; 
  let index = 0;
  snowballImg.onload = function () {
    snowballImgLoaded = true;
  };
  snowballImg.onerror = function () {
    index += 1;
    if (index < sources.length) {
      snowballImg.src = sources[index];
    }
  };
  snowballImg.src = sources[index];
})();

const magnetImg = new Image();
let magnetImgLoaded = false;
(function setupMagnetAsset() {
  const sources = ["assets/magnet.png", "assets/magnet.svg"]; 
  let index = 0;
  magnetImg.onload = function () {
    magnetImgLoaded = true;
  };
  magnetImg.onerror = function () {
    index += 1;
    if (index < sources.length) {
      magnetImg.src = sources[index];
    }
  };
  magnetImg.src = sources[index];
})();

const bgImg = new Image();
let bgImgLoaded = false;
(function setupBackgroundAsset() {
  const sources = [
    "assets/background.png",
    "assets/background.jpg",
    "assets/background.jpeg",
    "assets/background.svg",
  ];
  let index = 0;
  bgImg.onload = function () {
    bgImgLoaded = true;
  };
  bgImg.onerror = function () {
    index += 1;
    if (index < sources.length) {
      bgImg.src = sources[index];
    }
  };
  bgImg.src = sources[index];
})();

const groundY = GAME_HEIGHT - 70;

const player = {
  x: GAME_WIDTH * 0.25,
  y: groundY,
  width: 70,
  height: 80,
  vy: 0,
  gravity: 1500,
  jumpVelocity: -620,
  isOnGround: true,
  isDucking: false,
};

let scrollSpeed = 260;
let targetSpeed = 260;
let speedIncreasePerSecond = 18;

let obstacles = [];
let spawnTimer = 0;
let spawnInterval = 1200;

let magnets = [];
let magnetTimer = 0;
let magnetInterval = 1500;

function resizeCanvas() {
  const hudHeight = hudEl ? hudEl.offsetHeight : 0;
  const footerHeight = footerEl ? footerEl.offsetHeight : 0;
  const verticalPadding = 32;
  const availableHeight = Math.max(
    100,
    window.innerHeight - hudHeight - footerHeight - verticalPadding
  );
  const ratio = Math.min(
    window.innerWidth / GAME_WIDTH,
    availableHeight / GAME_HEIGHT
  );
  const displayWidth = GAME_WIDTH * ratio;
  const displayHeight = GAME_HEIGHT * ratio;
  canvas.style.width = displayWidth + "px";
  canvas.style.height = displayHeight + "px";
  const dpr = window.devicePixelRatio || 1;
  canvas.width = GAME_WIDTH * dpr;
  canvas.height = GAME_HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

setupPointerControls();
setupKeyboardControls();

function resetGame() {
  score = 0;
  distance = 0;
  scrollSpeed = 260;
  targetSpeed = 260;
  spawnInterval = 1200;
  obstacles = [];
  spawnTimer = 0;
  magnets = [];
  magnetTimer = 0;
  magnetInterval = 1500;
  gameOver = false;
  gameRunning = true;
  lastTimestamp = 0;
  player.x = GAME_WIDTH * 0.25;
  player.y = groundY;
  player.vy = 0;
  player.isOnGround = true;
  player.isDucking = false;
  scoreEl.textContent = score;
  overlayEl.classList.add("hidden");
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", function () {
  resetGame();
});

let pointerDownInBottomHalf = false;

function setupPointerControls() {
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (!gameRunning && !gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y > rect.height / 2) {
      pointerDownInBottomHalf = true;
      player.isDucking = true;
    } else {
      attemptJump();
    }
  });

  canvas.addEventListener("pointerup", function (e) {
    e.preventDefault();
    if (pointerDownInBottomHalf) {
      player.isDucking = false;
      pointerDownInBottomHalf = false;
    }
  });

  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

function setupKeyboardControls() {
  window.addEventListener("keydown", function (e) {
    if (!gameRunning) return;
    if (e.code === "Space" || e.key === "ArrowUp") {
      attemptJump();
    } else if (e.key === "ArrowDown") {
      player.isDucking = true;
    }
  });

  window.addEventListener("keyup", function (e) {
    if (!gameRunning) return;
    if (e.key === "ArrowDown") {
      player.isDucking = false;
    }
  });
}

function attemptJump() {
  if (!player.isOnGround) return;
  player.vy = player.jumpVelocity;
  player.isOnGround = false;
  player.isDucking = false;
}

function spawnObstacle() {
  const type = Math.random() < 0.55 ? "tree" : "snowball";
  const baseX = GAME_WIDTH + 40;
  if (type === "tree") {
    const width = 52;
    const height = 78 + Math.random() * 13;
    obstacles.push({
      type,
      x: baseX,
      y: groundY,
      width,
      height,
    });
  } else {
    const size = 30 + Math.random() * 8;
    const y = groundY - 64;
    obstacles.push({
      type,
      x: baseX,
      y,
      width: size,
      height: size,
    });
  }
}

function spawnMagnet() {
  const width = 28;
  const height = 24;
  const x = GAME_WIDTH + 40;
  const laneHigh = Math.random() < 0.5;
  const y = laneHigh ? groundY - 70 : groundY - 30;
  magnets.push({
    x,
    y,
    width,
    height,
  });
}

function getMagnetBounds(m) {
  return {
    left: m.x - m.width / 2,
    right: m.x + m.width / 2,
    top: m.y - m.height / 2,
    bottom: m.y + m.height / 2,
  };
}

function getPlayerBounds() {
  const baseWidth = player.width;
  const baseHeight = player.height;
  if (player.isDucking && player.isOnGround) {
    const duckHeight = baseHeight * 0.45;
    return {
      left: player.x - baseWidth / 2,
      right: player.x + baseWidth / 2,
      top: player.y - duckHeight,
      bottom: player.y,
    };
  }
  return {
    left: player.x - baseWidth / 2,
    right: player.x + baseWidth / 2,
    top: player.y - baseHeight,
    bottom: player.y,
  };
}

function getObstacleBounds(o) {
  if (o.type === "tree") {
    const hitWidth = o.width * 0.55;
    const left = o.x - hitWidth / 2;
    const right = o.x + hitWidth / 2;
    const trunkHeight = o.height * 0.55;
    const bottom = o.y;
    const top = bottom - trunkHeight;
    return { left, right, top, bottom };
  }

  const r = (o.width * 0.55) / 2;
  const cx = o.x;
  const cy = o.y - o.height * 0.6;
  return {
    left: cx - r,
    right: cx + r,
    top: cy - r,
    bottom: cy + r,
  };
}

function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function update(dt) {
  if (!gameRunning) return;

  targetSpeed += speedIncreasePerSecond * dt;
  scrollSpeed += (targetSpeed - scrollSpeed) * 0.1;

  distance += scrollSpeed * dt;

  spawnTimer += dt * 1000;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnObstacle();
    if (spawnInterval > 650) {
      spawnInterval -= 12;
    }
  }

  magnetTimer += dt * 1000;
  if (magnetTimer >= magnetInterval) {
    magnetTimer = 0;
    spawnMagnet();
    if (magnetInterval > 900) {
      magnetInterval -= 10;
    }
  }

  player.vy += player.gravity * dt;
  player.y += player.vy * dt;
  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.isOnGround = true;
  }

  obstacles.forEach((o) => {
    o.x -= scrollSpeed * dt;
  });

  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].x + obstacles[i].width < -40) {
      obstacles.splice(i, 1);
    }
  }

  const playerBounds = getPlayerBounds();
  for (let i = 0; i < obstacles.length; i++) {
    const oBounds = getObstacleBounds(obstacles[i]);
    if (rectsOverlap(playerBounds, oBounds)) {
      endGame();
      break;
    }
  }

  magnets.forEach((m) => {
    m.x -= scrollSpeed * dt;
  });

  for (let i = magnets.length - 1; i >= 0; i--) {
    const m = magnets[i];
    if (m.x + m.width / 2 < -40) {
      magnets.splice(i, 1);
      continue;
    }
    const mBounds = getMagnetBounds(m);
    const playerBoundsNow = getPlayerBounds();
    if (rectsOverlap(playerBoundsNow, mBounds)) {
      magnets.splice(i, 1);
      score += 1;
      scoreEl.textContent = score;
    }
  }
}

function drawBackground() {
  if (bgImgLoaded) {
    ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    ctx.fillStyle = "#b22222";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 60; i++) {
    const offset = (Date.now() / 55) % 20;
    const y = (i * 11 + offset) % GAME_HEIGHT;
    const x = (i * 31) % GAME_WIDTH;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = "#fdfdfd";
  ctx.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT - groundY);
}

function drawElf() {
  const spriteWidth = player.width;
  const spriteHeight =
    player.isDucking && player.isOnGround ? player.height * 0.7 : player.height;
  const x = player.x - spriteWidth / 2;
  const baselineFactor = 12 / 16;
  const y = player.y - spriteHeight * baselineFactor;
  if (!elfImgLoaded) return;
  ctx.drawImage(elfImg, x, y, spriteWidth, spriteHeight);
}

function drawObstacles() {
  obstacles.forEach((o) => {
    if (o.type === "tree") {
      const baseWidth = o.width;
      const h = o.height;
      const baseY = o.y;
      const baseX = o.x;
      ctx.save();
      ctx.translate(baseX, baseY);
      if (treeImgLoaded) {
        const baselineFactor = 14 / 16;
        const x = -baseWidth / 2;
        const yTop = -h * baselineFactor;
        ctx.drawImage(treeImg, x, yTop, baseWidth, h);
      } else {
        const tierHeight = Math.floor(h / 3);
        ctx.fillStyle = "#0f8b3b";
        ctx.fillRect(-Math.floor((baseWidth * 0.6) / 2), -tierHeight, Math.floor(baseWidth * 0.6), tierHeight);
        ctx.fillRect(-Math.floor((baseWidth * 0.8) / 2), -tierHeight * 2, Math.floor(baseWidth * 0.8), tierHeight);
        ctx.fillRect(-Math.floor(baseWidth / 2), -tierHeight * 3, baseWidth, tierHeight);
        ctx.fillStyle = "#7b3f00";
        ctx.fillRect(-4, 0, 8, 10);
        ctx.fillStyle = "#ffd700";
        const s = 4;
        ctx.fillRect(-s, -tierHeight * 3 - s, s, s);
        ctx.fillRect(0, -tierHeight * 3 - s, s, s);
        ctx.fillRect(-s, -tierHeight * 3, s, s);
        ctx.fillRect(0, -tierHeight * 3, s, s);
      }
      ctx.restore();
    } else {
      const r = o.width / 2;
      if (snowballImgLoaded) {
        const size = o.width;
        const baselineFactor = 12 / 16;
        const x = o.x - size / 2;
        const y = o.y - size * baselineFactor;
        ctx.drawImage(snowballImg, x, y, size, size);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(o.x, o.y - r, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c5e4ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(o.x, o.y - r, r - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#e3f3ff";
        ctx.beginPath();
        ctx.arc(o.x - r * 0.3, o.y - r * 1.05, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function drawMagnets() {
  magnets.forEach((m) => {
    const w = m.width;
    const h = m.height;
    const x = m.x - w / 2;
    const y = m.y - h / 2;
    if (magnetImgLoaded) {
      ctx.drawImage(magnetImg, x, y, w, h);
    } else {
      ctx.save();
      ctx.translate(m.x, m.y);
      const r = Math.min(w, h) / 2;
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function endGame() {
  if (!gameRunning) return;
  gameRunning = false;
  gameOver = true;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("leoMagnetBestScore", String(bestScore));
    bestScoreEl.textContent = bestScore;
  }
  const heading = overlayEl.querySelector("h1");
  const para = overlayEl.querySelector("p");
  heading.textContent = "Nice run!";
  para.textContent =
    "Leo collected " +
    score +
    " magnets before tripping. Tap to help him collect more and charge the sleigh.";
  startButton.textContent = "Run again";
  overlayEl.classList.remove("hidden");
}

function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  drawBackground();
  update(dt);
  drawObstacles();
  drawMagnets();
  drawElf();

  if (gameRunning) requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
