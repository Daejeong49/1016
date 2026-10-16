// Canvas 與 Context 參照
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 三條跑道中心 x 座標常數
// Lane 0 = 左跑道（80px），Lane 1 = 中跑道（240px），Lane 2 = 右跑道（400px）
const LANE_X = [80, 240, 400];

// GameState 物件初始結構
const state = {
  status: 'IDLE',       // 'IDLE' | 'PLAYING' | 'GAME_OVER'
  score: 0,
  speed: 4,             // px/frame，初始速度
  frame: 0,             // 累計幀數，用於物件生成時機判斷
  player: {
    lane: 1,            // 0=左, 1=中, 2=右；初始位於中間跑道
    x: 240,             // 對應 LANE_X[1]
    y: 525,             // canvas 高度 700 的 3/4 處
    width: 40,
    height: 60
  },
  obstacles: [],        // 活躍中的障礙物物件陣列
  coins: []             // 活躍中的金幣物件陣列
};

// 動畫迴圈 ID，供 cancelAnimationFrame 停止迴圈使用
let animId;

// 初始化遊戲狀態，重設所有欄位至起始值
function initGame() {
  state.score = 0;
  state.speed = 4;
  state.frame = 0;

  state.player.lane = 1;
  state.player.x = LANE_X[1]; // 240

  state.obstacles = [];
  state.coins = [];

  state.status = 'IDLE';
}

// 開始遊戲：隱藏開始/結束畫面，顯示 HUD，啟動動畫迴圈
function startGame() {
  // 隱藏開始畫面與遊戲結束畫面
  document.getElementById('screen-start').style.display = 'none';
  document.getElementById('screen-gameover').style.display = 'none';

  // 顯示 HUD
  document.getElementById('hud').style.display = 'flex';

  // 更新遊戲狀態
  state.status = 'PLAYING';

  // 啟動動畫迴圈
  animId = requestAnimationFrame(gameLoop);
}

// 結束遊戲：停止動畫迴圈，切換至 GAME_OVER 狀態，顯示最終分數
function endGame() {
  // 取消動畫迴圈
  cancelAnimationFrame(animId);

  // 更新遊戲狀態
  state.status = 'GAME_OVER';

  // 隱藏 HUD，顯示遊戲結束覆蓋層
  document.getElementById('hud').style.display = 'none';
  document.getElementById('screen-gameover').style.display = 'flex';

  // 將最終分數寫入 #final-score 元素
  document.getElementById('final-score').textContent = `最終分數：${state.score}`;
}

// 回傳指定跑道的中心 x 座標（lane: 0=左, 1=中, 2=右）
function getLaneX(lane) {
  return LANE_X[lane];
}

// 繪製當前遊戲畫面（跑道 + 玩家；障礙物與金幣留給 Task 5.6）
function draw() {
  // 1. 清除整個 canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. 深色背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. 繪製三條跑道
  const laneWidth = canvas.width / 3; // 約 160px（canvas 480px）
  const laneColors = ['#16213e', '#0f3460', '#16213e']; // 左/中/右交替深色

  for (let i = 0; i < 3; i++) {
    // 半透明色塊區分跑道
    ctx.fillStyle = laneColors[i];
    ctx.fillRect(i * laneWidth, 0, laneWidth, canvas.height);

    // 白色分隔線（跑道之間）
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }
  }

  // 4. 渲染障礙物（紅色矩形）
  for (const obs of state.obstacles) {
    ctx.fillStyle = 'red';
    ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
    // 文字標記提高辨識度
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', obs.x, obs.y);
  }

  // 5. 渲染金幣（黃色圓形），略過已收集的金幣
  for (const coin of state.coins) {
    if (coin.collected) continue;
    ctx.fillStyle = 'gold';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();
    // 邊框提高辨識度
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 6. 繪製玩家角色
  const p = state.player;
  const px = getLaneX(p.lane) - p.width / 2;  // 以跑道中心為水平中心
  const py = p.y - p.height / 2;               // 以角色中心為垂直基準

  // 身體（藍色矩形）
  ctx.fillStyle = '#4c6ef5';
  ctx.fillRect(px, py, p.width, p.height);

  // 簡單臉部裝飾：白色圓形眼睛
  const eyeRadius = 4;
  const eyeY = py + p.height * 0.25; // 眼睛位於上方 1/4 處
  ctx.fillStyle = '#ffffff';

  // 左眼
  ctx.beginPath();
  ctx.arc(px + p.width * 0.3, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // 右眼
  ctx.beginPath();
  ctx.arc(px + p.width * 0.7, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
}

// 佔位函式：Task 5 實作前先留空，避免 runtime 錯誤
function spawnObstacles() {
  // 僅在 frame > 0 且 frame % 90 === 0 時生成
  if (state.frame === 0 || state.frame % 90 !== 0) return;

  // 從 [0, 1, 2] 中隨機移除 1～2 個 index（保留空跑道）
  const lanes = [0, 1, 2];
  // 隨機決定保留幾條空跑道（1 或 2 條）
  const emptyCount = Math.random() < 0.5 ? 1 : 2;
  // 隨機選出要保留為空的跑道 index
  for (let i = 0; i < emptyCount; i++) {
    const removeIdx = Math.floor(Math.random() * lanes.length);
    lanes.splice(removeIdx, 1);
  }
  // 剩餘跑道各生成一個障礙物
  for (const lane of lanes) {
    state.obstacles.push({
      lane,
      x: getLaneX(lane),
      y: -50,
      width: 40,
      height: 50
    });
  }
}
function spawnCoins() {
  // 僅在 frame > 0 且 frame % 60 === 0 時生成
  if (state.frame === 0 || state.frame % 60 !== 0) return;

  // 隨機選擇一條跑道（0、1 或 2）
  const lane = Math.floor(Math.random() * 3);

  state.coins.push({
    lane,
    x: getLaneX(lane),
    y: -20,
    radius: 12,
    collected: false
  });
}
function checkCollisions() {
  const p = state.player;

  // 障礙物碰撞判定
  for (const obs of state.obstacles) {
    if (
      p.lane === obs.lane &&
      Math.abs(p.y - obs.y) < (p.height + obs.height) / 2
    ) {
      endGame();
      return; // 立即停止後續檢查
    }
  }

  // 金幣收集判定
  for (const coin of state.coins) {
    if (
      p.lane === coin.lane &&
      Math.abs(p.y - coin.y) < (p.height / 2 + coin.radius) &&
      coin.collected === false
    ) {
      coin.collected = true;
      state.score += 1;
      document.getElementById('score-value').textContent = state.score;
    }
  }
}

// 每幀更新遊戲狀態：累計幀數、速度遞增、呼叫物件生成與碰撞判定
function update() {
  // 每幀累加 frame 計數
  state.frame += 1;

  // 每 300 幀將速度增加 0.5，但不超過上限 12
  if (state.frame % 300 === 0) {
    state.speed = Math.min(state.speed + 0.5, 12);
  }

  // 呼叫物件生成（Task 5 完成後將替換為完整實作）
  spawnObstacles();
  spawnCoins();

  // 障礙物移動：每幀依 state.speed 向下移動（AC-1.3）
  state.obstacles.forEach(obs => obs.y += state.speed);
  // 障礙物清除：過濾掉已離開畫面底端的障礙物（AC-4.1）
  state.obstacles = state.obstacles.filter(obs => obs.y <= canvas.height);

  // 金幣移動：每幀依 state.speed 向下移動（AC-1.3）
  state.coins.forEach(coin => coin.y += state.speed);
  // 金幣清除：過濾掉已離開畫面底端的金幣（AC-4.1）
  state.coins = state.coins.filter(coin => coin.y <= canvas.height);

  checkCollisions();
}

// 遊戲核心驅動函式，由 requestAnimationFrame 每幀呼叫
function gameLoop(timestamp) {
  // 若遊戲不在 PLAYING 狀態，停止迴圈
  if (state.status !== 'PLAYING') return;

  // 更新遊戲狀態
  update();

  // 繪製當前畫面
  draw();

  // 請求下一幀
  animId = requestAnimationFrame(gameLoop);
}

// 處理鍵盤輸入，控制玩家左右換道
function handleInput(e) {
  // 非遊戲進行中則不處理
  if (state.status !== 'PLAYING') return;

  if (e.key === 'ArrowLeft') {
    // 向左移動一條跑道，最小為 0（左跑道）
    state.player.lane = Math.max(0, state.player.lane - 1);
  } else if (e.key === 'ArrowRight') {
    // 向右移動一條跑道，最大為 2（右跑道）
    state.player.lane = Math.min(2, state.player.lane + 1);
  }
}

document.addEventListener('keydown', handleInput);

// 按鈕事件綁定
document.getElementById('btn-start').addEventListener('click', function () {
  initGame();
  startGame();
});

document.getElementById('btn-restart').addEventListener('click', function () {
  initGame();
  startGame();
});
