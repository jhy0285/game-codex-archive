const WORLD = Object.freeze({ width: 1600, height: 900, floor: 760 });
const STEP = 1 / 60;
const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d", { alpha: false });

const ui = {
  intro: document.querySelector("#intro"),
  completion: document.querySelector("#completion"),
  hud: document.querySelector("#hud"),
  start: document.querySelector("#start-btn"),
  replay: document.querySelector("#replay-btn"),
  routeLabel: document.querySelector("#route-state-label"),
  routeDot: document.querySelector(".route-state-dot"),
  signalCount: document.querySelector("#signal-count"),
  signalPips: [...document.querySelectorAll("#signal-pips i")],
  lifePips: [...document.querySelectorAll("#life-pips i")],
  actIndex: document.querySelector("#act-index"),
  actName: document.querySelector("#act-name"),
  actObjective: document.querySelector("#act-objective"),
  progressLabel: document.querySelector("#progress-label"),
  toast: document.querySelector("#toast"),
};

const background = new Image();
background.decoding = "async";
background.src = "/assets/lost-archive-bg.webp";
const actThreeBackground = new Image();
actThreeBackground.decoding = "async";
actThreeBackground.src = "/assets/index-throne-bg.webp";
const actTwoBackground = new Image();
actTwoBackground.decoding = "async";
actTwoBackground.src = "/assets/silent-stacks-bg.webp";
const bossImage = new Image();
bossImage.decoding = "async";
bossImage.src = "/assets/blind-archivist.webp";
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const PLATFORM_LAYOUTS = Object.freeze({
  1: [
    { x: -80, y: WORLD.floor, w: 1760, h: 150, kind: "floor" },
    { x: 330, y: 642, w: 185, h: 24, kind: "ledge" },
    { x: 655, y: 565, w: 212, h: 24, kind: "ledge" },
    { x: 1000, y: 636, w: 210, h: 24, kind: "ledge" },
  ],
  2: [
    { x: -80, y: WORLD.floor, w: 1760, h: 150, kind: "floor" },
    { x: 270, y: 625, w: 260, h: 25, kind: "shelf" },
    { x: 690, y: 535, w: 250, h: 25, kind: "shelf" },
    { x: 1120, y: 620, w: 255, h: 25, kind: "shelf" },
  ],
  3: [
    { x: -80, y: WORLD.floor, w: 1760, h: 150, kind: "floor" },
    { x: 70, y: 710, w: 175, h: 18, kind: "step" },
    { x: 1370, y: 710, w: 175, h: 18, kind: "step" },
  ],
});

function activePlatforms() {
  return PLATFORM_LAYOUTS[state.act] ?? PLATFORM_LAYOUTS[1];
}

const initialShards = [
  { x: 423, y: 574, glyph: "4" },
  { x: 760, y: 497, glyph: "0" },
  { x: 1104, y: 568, glyph: "4" },
];

const SIGNAL_TOTAL = initialShards.length;
const PORTAL = Object.freeze({ x: 1450, y: 670, radius: 82 });
const ACTS = Object.freeze({
  1: { name: "THE LOST APPROACH", objective: "Recover the three severed signal glyphs." },
  2: { name: "THE REDACTED CHOIR", objective: "Silence every archive warden, then cross the gate." },
  3: { name: "THE LAST INDEX", objective: "Defeat the Blind Archivist." },
});
const PLAYER_ATTACK = Object.freeze({ cooldown: 0.26, duration: 0.2, speed: 590, life: 0.48, radius: 12 });
const BOSS_PATTERNS = Object.freeze([
  { id: "index_ring", telegraph: 0.82, release: 0.2, recover: 0.68 },
  { id: "redaction_quill", telegraph: 0.68, release: 0.18, recover: 0.58 },
  { id: "memory_sweep", telegraph: 0.92, release: 1.15, recover: 0.72 },
]);

const dust = Array.from({ length: 92 }, (_, index) => ({
  x: (index * 173.17) % WORLD.width,
  y: 55 + ((index * 79.31) % 680),
  r: 0.7 + ((index * 0.47) % 1.8),
  speed: 2 + ((index * 1.9) % 8),
  phase: index * 0.93,
  warm: index % 13 === 0,
}));

const keys = new Set();
const pressed = new Set();
const pointer = { x: 0, y: 0 };
const particles = [];
let viewport = { width: 0, height: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
let rafId = 0;
let lastFrame = performance.now();
let toastTimer = 0;
let audio = null;

const state = {
  mode: "title",
  previousMode: "play",
  act: 1,
  checkpointAct: 1,
  actTime: 0,
  actBannerTime: 0,
  transition: null,
  time: 0,
  runTime: 0,
  deaths: 0,
  screenShake: 0,
  portalPulse: 0,
  manualUntil: 0,
  player: null,
  shards: [],
  hazards: [],
  enemies: [],
  projectiles: [],
  boss: null,
  encounterCleared: false,
  enemiesDefeated: 0,
  wave: 0,
  waveTotal: 3,
  waveDelay: 0,
  testMode: false,
};

function createPlayer() {
  return {
    x: 142,
    y: 676,
    previousY: 676,
    w: 42,
    h: 72,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    hp: 3,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    attackTime: 0,
    attackCooldown: 0,
    attackId: 0,
    animationState: "idle",
    animationFrame: 0,
    animationTime: 0,
    trail: [],
  };
}

function createActTwoWave(wave) {
  if (wave === 1) return [
    { id: "husk-west", type: "husk", x: 660, y: 694, baseX: 660, w: 58, h: 54, hp: 3, maxHp: 3, state: "patrol", timer: 0, cooldown: 0.45, facing: -1, vx: 0, hitFlash: 0, dead: false },
  ];
  if (wave === 2) return [
    { id: "redactor", type: "redactor", x: 880, y: 625, baseX: 880, baseY: 625, w: 62, h: 62, hp: 3, maxHp: 3, state: "patrol", timer: 0, cooldown: 0.6, facing: -1, vx: 0, hitFlash: 0, dead: false },
  ];
  return [
    { id: "husk-east", type: "husk", x: 1085, y: 694, baseX: 1085, w: 58, h: 54, hp: 3, maxHp: 3, state: "patrol", timer: 0, cooldown: 0.65, facing: -1, vx: 0, hitFlash: 0, dead: false },
    { id: "redactor-final", type: "redactor", x: 1310, y: 610, baseX: 1310, baseY: 610, w: 62, h: 62, hp: 3, maxHp: 3, state: "patrol", timer: 0, cooldown: 1, facing: -1, vx: 0, hitFlash: 0, dead: false },
  ];
}

function createArchivist() {
  return {
    x: 1252,
    y: 612,
    r: 88,
    hp: 12,
    maxHp: 12,
    patternIndex: 0,
    patternHistory: [],
    pattern: null,
    stage: "idle",
    timer: 0.72,
    angle: Math.PI,
    targetAngle: Math.PI,
    hitFlash: 0,
    dead: false,
    deathTimer: 0,
  };
}

function hazardsForAct(act) {
  if (act === 1) {
    return [
      { x: 584, y: 710, baseX: 584, baseY: 710, r: 25, phase: 0.2, axis: "x" },
      { x: 918, y: 525, baseX: 918, baseY: 525, r: 22, phase: 2.7, axis: "y" },
      { x: 1278, y: 706, baseX: 1278, baseY: 706, r: 27, phase: 4.1, axis: "x" },
    ];
  }
  if (act === 2) {
    return [
      { x: 702, y: 710, baseX: 702, baseY: 710, r: 20, phase: 1.4, axis: "x" },
      { x: 1080, y: 705, baseX: 1080, baseY: 705, r: 22, phase: 3.6, axis: "x" },
    ];
  }
  return [];
}

function loadAct(act) {
  state.act = act;
  state.checkpointAct = act;
  state.actTime = 0;
  state.actBannerTime = 2.5;
  state.transition = null;
  state.player = createPlayer();
  state.hazards = hazardsForAct(act);
  state.wave = act === 2 ? 1 : 0;
  state.waveTotal = 3;
  state.waveDelay = 0;
  state.enemies = act === 2 ? createActTwoWave(1) : [];
  state.projectiles = [];
  state.boss = act === 3 ? createArchivist() : null;
  state.encounterCleared = false;
  state.enemiesDefeated = 0;
  state.player.y = 676;
  state.player.onGround = false;
  particles.length = 0;
  keys.clear();
  pressed.clear();
  updateHud();
}

function resetWorld({ keepMode = true } = {}) {
  state.time = 0;
  state.runTime = 0;
  state.screenShake = 0;
  state.portalPulse = 0;
  state.act = 1;
  state.checkpointAct = 1;
  state.actTime = 0;
  state.actBannerTime = 0;
  state.transition = null;
  state.player = createPlayer();
  state.shards = initialShards.map((shard, index) => ({ ...shard, index, collected: false }));
  state.hazards = hazardsForAct(1);
  state.enemies = [];
  state.projectiles = [];
  state.boss = null;
  state.encounterCleared = false;
  state.enemiesDefeated = 0;
  particles.length = 0;
  keys.clear();
  pressed.clear();
  if (!keepMode) state.mode = "title";
  updateHud();
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  viewport = {
    width,
    height,
    dpr,
    scale: Math.min(width / WORLD.width, height / WORLD.height),
    ox: 0,
    oy: 0,
  };
  viewport.ox = (width - WORLD.width * viewport.scale) / 2;
  viewport.oy = (height - WORLD.height * viewport.scale) / 2;
}

function startGame() {
  ensureAudio();
  state.testMode = false;
  resetWorld();
  state.mode = "play";
  document.body.classList.add("is-playing");
  ui.intro.classList.add("is-leaving");
  ui.completion.hidden = true;
  ui.hud.hidden = false;
  ui.routeLabel.textContent = "TRACING SIGNAL";
  ui.routeDot.style.background = "#8fe6ec";
  playTone(280, 0.16, "sine", 0.08);
  window.setTimeout(() => {
    ui.intro.hidden = true;
    ui.intro.classList.remove("is-leaving");
  }, 760);
  showToast("ARCHIVE LINK ESTABLISHED · COLLECT 3 SIGNALS");
}

function finishGame() {
  if (state.mode !== "play") return;
  state.mode = "win";
  ui.hud.hidden = true;
  ui.completion.hidden = false;
  ui.routeLabel.textContent = "ROUTE RESTORED";
  ui.routeDot.style.background = "#d9ffff";
  document.body.classList.remove("is-playing");
  burst(1452, 664, 80, "signal");
  playChord([220, 330, 440, 660]);
}

function replay() {
  ui.completion.hidden = true;
  ui.intro.hidden = false;
  ui.intro.classList.remove("is-leaving");
  ui.routeLabel.textContent = "ROUTE LOST";
  ui.routeDot.style.background = "#ff8f78";
  document.body.classList.remove("is-playing");
  state.mode = "title";
  state.testMode = false;
  resetWorld();
}

function restartRun() {
  if (state.mode === "title") {
    startGame();
    return;
  }
  if (state.mode === "win") {
    replay();
    return;
  }
  resetWorld();
  state.testMode = false;
  state.mode = "play";
  ui.routeLabel.textContent = "TRACING SIGNAL";
  showToast("ROUTE TRACE RESTARTED");
  playTone(190, 0.12, "triangle", 0.06);
}

function togglePause() {
  if (state.mode === "play") {
    state.previousMode = state.mode;
    state.mode = "paused";
    ui.routeLabel.textContent = "TRACE SUSPENDED";
    showToast("TRACE SUSPENDED · ESC TO RESUME");
    if (audio?.context.state === "running") audio.context.suspend();
  } else if (state.mode === "paused") {
    state.mode = state.previousMode;
    ui.routeLabel.textContent = "TRACING SIGNAL";
    audio?.context.resume();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

function ensureAudio() {
  if (audio) {
    audio.context.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.45;
  master.connect(context.destination);

  const droneGain = context.createGain();
  droneGain.gain.value = 0.018;
  droneGain.connect(master);
  const droneA = context.createOscillator();
  const droneB = context.createOscillator();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  droneA.type = "sine";
  droneA.frequency.value = 54;
  droneB.type = "triangle";
  droneB.frequency.value = 81;
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  lfoGain.connect(droneB.frequency);
  droneA.connect(droneGain);
  droneB.connect(droneGain);
  droneA.start();
  droneB.start();
  lfo.start();
  audio = { context, master, droneGain };
}

function playTone(frequency, duration = 0.12, type = "sine", volume = 0.055, delay = 0) {
  if (!audio || audio.context.state !== "running") return;
  const { context, master } = audio;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.72), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playChord(notes) {
  notes.forEach((note, index) => playTone(note, 0.8, "sine", 0.05, index * 0.1));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toast.classList.remove("is-visible");
  void ui.toast.offsetWidth;
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("is-visible"), 2300);
}

function updateHud() {
  const collected = state.shards.filter((shard) => shard.collected).length;
  const hp = state.player?.hp ?? 3;
  const progress = state.act === 1
    ? collected
    : state.act === 2
      ? state.enemiesDefeated
      : state.boss ? state.boss.maxHp - state.boss.hp : SIGNAL_TOTAL;
  const total = state.act === 1
    ? SIGNAL_TOTAL
    : state.act === 2
      ? 4
      : state.boss?.maxHp ?? SIGNAL_TOTAL;
  ui.signalCount.textContent = `${progress} / ${total}`;
  ui.hud?.classList.toggle("is-boss", state.act === 3);
  if (ui.actIndex) ui.actIndex.textContent = `ACT ${state.act} / 3`;
  if (ui.actName) ui.actName.textContent = ACTS[state.act].name;
  if (ui.actObjective) ui.actObjective.textContent = ACTS[state.act].objective;
  if (ui.progressLabel) ui.progressLabel.textContent = state.act === 1 ? "SIGNAL" : state.act === 2 ? "WARDENS" : "ARCHIVIST";
  ui.signalPips.forEach((pip, index) => pip.classList.toggle("is-on", index < Math.ceil((progress / Math.max(1, total)) * ui.signalPips.length)));
  ui.lifePips.forEach((pip, index) => pip.classList.toggle("is-on", index < hp));
  document.querySelector("#signal-pips")?.setAttribute("aria-label", `${state.act === 1 ? "신호" : state.act === 2 ? "수호자" : "기록관"} ${progress}/${total}`);
  document.querySelector("#life-pips")?.setAttribute("aria-label", `내구도 ${hp}/3`);
}

function isDown(...codes) {
  return codes.some((code) => keys.has(code));
}

function consume(code) {
  if (!pressed.has(code)) return false;
  pressed.delete(code);
  return true;
}

function update(dt) {
  state.time += dt;
  state.portalPulse += dt;
  updateParticles(dt);
  if (state.mode !== "play") return;

  state.runTime += dt;
  state.actTime += dt;
  state.actBannerTime = Math.max(0, state.actBannerTime - dt);
  if (updateTransition(dt)) return;
  const player = state.player;
  player.previousY = player.y;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.attackTime = Math.max(0, player.attackTime - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.animationTime += dt;
  player.coyote = player.onGround ? 0.1 : Math.max(0, player.coyote - dt);

  if (consume("jump")) player.jumpBuffer = 0.12;
  if (consume("dash") && player.dashCooldown <= 0) beginDash();
  if (consume("attack") && player.attackCooldown <= 0) beginPlayerAttack();

  const move = (isDown("ArrowRight", "KeyD", "virtual-right") ? 1 : 0)
    - (isDown("ArrowLeft", "KeyA", "virtual-left") ? 1 : 0);
  if (move) player.facing = move;

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.facing * 760;
    player.vy *= 0.82;
    if (Math.floor(state.time * 60) % 2 === 0) {
      player.trail.push({ x: player.x, y: player.y, life: 0.28 });
    }
  } else {
    const targetVx = move * 330;
    const response = player.onGround ? 18 : 9;
    player.vx += (targetVx - player.vx) * Math.min(1, response * dt);
    player.vy = Math.min(980, player.vy + 1880 * dt);
  }

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = -690;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    burst(player.x + player.w / 2, player.y + player.h, 12, "dust");
    playTone(360, 0.1, "triangle", 0.035);
  }

  player.x += player.vx * dt;
  player.x = Math.max(14, Math.min(WORLD.width - player.w - 14, player.x));
  player.y += player.vy * dt;
  resolvePlatforms(player);

  if (player.y > WORLD.height + 90) damagePlayer(true);
  updateHazards();
  if (state.act === 1) collectShards();
  if (state.act === 2) updateEnemies(dt);
  if (state.act === 3) updateBoss(dt);
  updateProjectiles(dt);
  resolvePlayerAttackHits();
  checkHazards();
  checkPortal();
  updatePlayerAnimation();

  player.trail.forEach((trail) => { trail.life -= dt; });
  player.trail = player.trail.filter((trail) => trail.life > 0);
  state.screenShake = Math.max(0, state.screenShake - 30 * dt);
}

function simulateFrames(frameCount, held = [], nextPressed = []) {
  state.testMode = true;
  keys.clear();
  for (const code of held) keys.add(code);
  for (const action of nextPressed) pressed.add(action);
  for (let index = 0; index < Math.max(1, frameCount); index += 1) update(STEP);
  keys.clear();
  render();
  return JSON.parse(window.render_game_to_text());
}

function beginPlayerAttack() {
  const player = state.player;
  if (!player) return;
  player.attackTime = PLAYER_ATTACK.duration;
  player.attackCooldown = PLAYER_ATTACK.cooldown;
  player.attackId += 1;
  const x = player.x + player.w / 2 + player.facing * 34;
  const y = player.y + player.h * 0.46;
  state.projectiles.push({
    id: `needle-${player.attackId}`,
    owner: "player",
    kind: "needle",
    x,
    y,
    vx: player.facing * PLAYER_ATTACK.speed,
    vy: 0,
    radius: PLAYER_ATTACK.radius,
    life: PLAYER_ATTACK.life,
    damage: 1,
    hit: false,
  });
  burst(x, y, 7, "signal");
  playTone(520, 0.08, "triangle", 0.032);
}

function updatePlayerAnimation() {
  const player = state.player;
  if (!player) return;
  if (player.dashTime > 0) player.animationState = "dash";
  else if (player.attackTime > 0) player.animationState = "attack";
  else if (!player.onGround) player.animationState = player.vy < 0 ? "jump" : "fall";
  else if (Math.abs(player.vx) > 28) player.animationState = "run";
  else player.animationState = "idle";
  const durations = { idle: 0.26, run: 0.1, jump: 0.16, fall: 0.16, dash: 0.06, attack: 0.055 };
  const frameCounts = { idle: 4, run: 6, jump: 3, fall: 2, dash: 3, attack: 4 };
  const duration = durations[player.animationState];
  player.animationFrame = Math.floor(player.animationTime / duration) % frameCounts[player.animationState];
}

function beginDash() {
  const player = state.player;
  player.dashTime = 0.15;
  player.dashCooldown = 0.65;
  state.screenShake = 4;
  burst(player.x + player.w / 2, player.y + player.h / 2, 18, "signal");
  playTone(125, 0.17, "sawtooth", 0.03);
}

function updateEnemies(dt) {
  const player = state.player;
  if (!player) return;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.timer = Math.max(0, enemy.timer - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    const playerCenter = player.x + player.w / 2;
    const distance = playerCenter - enemy.x;
    enemy.facing = distance >= 0 ? 1 : -1;
    if (enemy.type === "husk") updateHusk(enemy, distance, dt);
    else updateRedactor(enemy, distance, dt);
    if (enemy.state === "charge" || enemy.state === "patrol") {
      const py = player.y + player.h / 2;
      if (Math.abs(playerCenter - enemy.x) < enemy.w * 0.45 + 18 && Math.abs(py - (enemy.y + enemy.h / 2)) < 44) {
        damagePlayer(false);
      }
    }
  }
  const waveCleared = state.enemies.length > 0 && state.enemies.every((enemy) => enemy.dead);
  if (waveCleared && state.wave < state.waveTotal && state.waveDelay <= 0) state.waveDelay = 0.72;
  if (state.waveDelay > 0) {
    state.waveDelay -= dt;
    if (state.waveDelay <= 0) {
      state.wave += 1;
      state.enemies = createActTwoWave(state.wave);
      state.projectiles = state.projectiles.filter((projectile) => projectile.owner === "player");
      state.screenShake = 5;
      showToast(`WARDEN WAVE ${state.wave} / ${state.waveTotal}`);
    }
  }
  state.encounterCleared = waveCleared && state.wave === state.waveTotal && state.waveDelay <= 0;
  if (state.encounterCleared) updateHud();
}

function updateHusk(enemy, distance, dt) {
  if (enemy.state === "telegraph") {
    enemy.vx *= 0.72;
    if (enemy.timer <= 0) {
      enemy.state = "charge";
      enemy.timer = 0.38;
      enemy.vx = enemy.facing * 430;
      burst(enemy.x, enemy.y + 30, 12, "error");
      playTone(105, 0.13, "sawtooth", 0.035);
    }
  } else if (enemy.state === "charge") {
    enemy.x += enemy.vx * dt;
    if (enemy.timer <= 0 || enemy.x < 65 || enemy.x > WORLD.width - 65) {
      enemy.state = "recover";
      enemy.timer = 0.55;
      enemy.vx = 0;
    }
  } else if (enemy.state === "recover") {
    if (enemy.timer <= 0) {
      enemy.state = "patrol";
      enemy.cooldown = 0.82;
    }
  } else {
    enemy.x += Math.sin(state.time * 1.7 + enemy.baseX) * 15 * dt;
    if (Math.abs(distance) < 440 && enemy.cooldown <= 0) {
      enemy.state = "telegraph";
      enemy.timer = 0.48;
    }
  }
}

function updateRedactor(enemy, distance, dt) {
  enemy.y = enemy.baseY + Math.sin(state.time * 1.55 + enemy.baseX) * 18;
  if (enemy.state === "telegraph") {
    if (enemy.timer <= 0) {
      enemy.state = "release";
      enemy.timer = 0.16;
      const px = state.player.x + state.player.w / 2;
      const py = state.player.y + state.player.h / 2;
      const angle = Math.atan2(py - enemy.y, px - enemy.x);
      state.projectiles.push({ id: `ink-${state.time.toFixed(3)}`, owner: "enemy", kind: "ink", x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 280, vy: Math.sin(angle) * 280, radius: 15, life: 3.4, damage: 1, hit: false });
      burst(enemy.x, enemy.y, 10, "error");
      playTone(148, 0.16, "square", 0.028);
    }
  } else if (enemy.state === "release") {
    if (enemy.timer <= 0) {
      enemy.state = "recover";
      enemy.timer = 0.48;
    }
  } else if (enemy.state === "recover") {
    if (enemy.timer <= 0) {
      enemy.state = "patrol";
      enemy.cooldown = 1.15;
    }
  } else if (Math.abs(distance) < 760 && enemy.cooldown <= 0) {
    enemy.state = "telegraph";
    enemy.timer = 0.62;
  }
}

function beginBossPattern() {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  const pattern = BOSS_PATTERNS[boss.patternIndex % BOSS_PATTERNS.length];
  boss.patternIndex += 1;
  boss.pattern = pattern.id;
  boss.patternHistory.push(pattern.id);
  boss.stage = "telegraph";
  boss.timer = pattern.telegraph;
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y + state.player.h / 2;
  boss.targetAngle = Math.atan2(py - boss.y, px - boss.x);
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss) return;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);
  if (boss.dead) {
    boss.deathTimer -= dt;
    if (boss.deathTimer <= 0) finishGame();
    return;
  }
  boss.timer -= dt;
  if (boss.stage === "idle") {
    if (boss.timer <= 0) beginBossPattern();
    return;
  }
  const pattern = BOSS_PATTERNS.find((entry) => entry.id === boss.pattern);
  if (boss.stage === "telegraph" && boss.timer <= 0) {
    boss.stage = "release";
    boss.timer = pattern.release;
    releaseBossPattern(boss);
  } else if (boss.stage === "release") {
    if (boss.pattern === "memory_sweep") {
      boss.angle += dt * 1.85;
      if (pointToSegmentDistance(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, boss.x, boss.y, boss.x + Math.cos(boss.angle) * 1200, boss.y + Math.sin(boss.angle) * 1200) < 23) damagePlayer(false);
    }
    if (boss.timer <= 0) {
      boss.stage = "recover";
      boss.timer = pattern.recover;
    }
  } else if (boss.stage === "recover" && boss.timer <= 0) {
    boss.stage = "idle";
    boss.pattern = null;
    boss.timer = 0.38;
  }
}

function releaseBossPattern(boss) {
  state.screenShake = 8;
  burst(boss.x, boss.y, 28, "error");
  if (boss.pattern === "index_ring") {
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      state.projectiles.push({ id: `ring-${state.time}-${index}`, owner: "boss", kind: "index", x: boss.x, y: boss.y, vx: Math.cos(angle) * 245, vy: Math.sin(angle) * 245, radius: 13, life: 4.4, damage: 1, hit: false });
    }
  } else if (boss.pattern === "redaction_quill") {
    for (const offset of [-0.1, 0, 0.1]) {
      const angle = boss.targetAngle + offset;
      state.projectiles.push({ id: `quill-${state.time}-${offset}`, owner: "boss", kind: "quill", x: boss.x, y: boss.y, vx: Math.cos(angle) * 430, vy: Math.sin(angle) * 430, radius: 11, life: 3.2, damage: 1, hit: false });
    }
  } else {
    boss.angle = boss.targetAngle - 0.9;
  }
  playTone(boss.pattern === "memory_sweep" ? 72 : 118, 0.25, "sawtooth", 0.045);
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function updateProjectiles(dt) {
  const player = state.player;
  for (const projectile of state.projectiles) {
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.owner !== "player" && player && !projectile.hit) {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      if (Math.hypot(px - projectile.x, py - projectile.y) < projectile.radius + 19) {
        projectile.hit = true;
        damagePlayer(false);
      }
    }
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.hit && projectile.life > 0 && projectile.x > -80 && projectile.x < WORLD.width + 80 && projectile.y > -80 && projectile.y < WORLD.height + 80);
}

function resolvePlayerAttackHits() {
  for (const projectile of state.projectiles) {
    if (projectile.owner !== "player" || projectile.hit) continue;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(projectile.x - enemy.x, projectile.y - (enemy.y + enemy.h / 2)) < projectile.radius + enemy.w * 0.42) {
        projectile.hit = true;
        damageEnemy(enemy, projectile.damage);
        break;
      }
    }
    const boss = state.boss;
    if (!projectile.hit && boss && !boss.dead && Math.hypot(projectile.x - boss.x, projectile.y - boss.y) < projectile.radius + boss.r * 0.75) {
      projectile.hit = true;
      if (boss.stage !== "recover") {
        state.screenShake = 3;
        burst(projectile.x, projectile.y, 8, "error");
        playTone(780, 0.07, "square", 0.025);
        showToast("ARCHIVE SHELL SEALED · STRIKE DURING RECOVERY");
      } else {
        boss.hp = Math.max(0, boss.hp - projectile.damage);
        boss.hitFlash = 0.12;
        burst(projectile.x, projectile.y, 12, "signal");
        updateHud();
        if (boss.hp <= 0) {
          boss.dead = true;
          boss.stage = "death";
          boss.pattern = null;
          boss.deathTimer = 1.25;
          state.projectiles = state.projectiles.filter((item) => item.owner === "player");
          state.screenShake = 18;
          burst(boss.x, boss.y, 90, "signal");
          playChord([110, 165, 220, 330]);
        }
      }
    }
  }
}

function damageEnemy(enemy, damage) {
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hitFlash = 0.11;
  burst(enemy.x, enemy.y + enemy.h / 2, 14, "signal");
  if (enemy.hp <= 0) {
    enemy.dead = true;
    state.enemiesDefeated += 1;
    enemy.state = "death";
    enemy.vx = 0;
    state.screenShake = 6;
    playTone(210, 0.22, "triangle", 0.04);
  }
  updateHud();
}

function resolvePlatforms(player) {
  const previousBottom = player.previousY + player.h;
  const currentBottom = player.y + player.h;
  player.onGround = false;
  for (const platform of activePlatforms()) {
    const horizontal = player.x + player.w > platform.x + 5 && player.x < platform.x + platform.w - 5;
    const descending = player.vy >= 0;
    if (horizontal && descending && previousBottom <= platform.y + 7 && currentBottom >= platform.y) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }
}

function updateHazards() {
  for (const hazard of state.hazards) {
    const actPhase = state.time + state.act * 11.73;
    if (hazard.axis === "x") {
      hazard.x = hazard.baseX + Math.sin(actPhase * 0.95 + hazard.phase) * 58;
      hazard.y = hazard.baseY + Math.sin(actPhase * 2.1 + hazard.phase) * 6;
    } else {
      hazard.x = hazard.baseX + Math.sin(actPhase * 1.3 + hazard.phase) * 22;
      hazard.y = hazard.baseY + Math.sin(actPhase * 1.15 + hazard.phase) * 56;
    }
  }
}

function collectShards() {
  const player = state.player;
  let changed = false;
  for (const shard of state.shards) {
    if (shard.collected) continue;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    if (Math.hypot(cx - shard.x, cy - shard.y) < 48) {
      shard.collected = true;
      changed = true;
      state.screenShake = 7;
      burst(shard.x, shard.y, 36, "signal");
      const count = state.shards.filter((item) => item.collected).length;
      playTone(380 + count * 110, 0.42, "sine", 0.07);
      showToast(count === 3 ? "SIGNAL COMPLETE · PORTAL RESTORED" : `SIGNAL FRAGMENT ${count} / 3 RECOVERED`);
    }
  }
  if (changed) updateHud();
}

function checkHazards() {
  const player = state.player;
  if (player.invulnerable > 0 || player.dashTime > 0) return;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const hit = state.hazards.some((hazard) => Math.hypot(px - hazard.x, py - hazard.y) < hazard.r + 22);
  if (hit) damagePlayer(false);
}

function damagePlayer(fell) {
  const player = state.player;
  if (!fell && player.invulnerable > 0) return;
  player.hp -= 1;
  state.screenShake = 14;
  burst(player.x + player.w / 2, player.y + player.h / 2, 40, "error");
  playTone(82, 0.32, "sawtooth", 0.07);
  if (player.hp <= 0) {
    state.deaths += 1;
    showToast("SIGNAL BODY LOST · RECONSTRUCTING");
    const deaths = state.deaths;
    if (state.checkpointAct === 1) {
      const collected = state.shards.map((shard) => shard.collected);
      resetWorld();
      state.shards.forEach((shard, index) => { shard.collected = collected[index]; });
    } else {
      loadAct(state.checkpointAct);
    }
    state.deaths = deaths;
  } else {
    player.x = fell ? 142 : Math.max(48, player.x - player.facing * 70);
    player.y = 676;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 1.4;
    showToast(`INTEGRITY LOST · ${player.hp} REMAINING`);
  }
  updateHud();
}

function checkPortal() {
  const active = isPortalActive();
  if (!active) return;
  const player = state.player;
  const distance = Math.hypot(player.x + player.w / 2 - PORTAL.x, player.y + player.h / 2 - PORTAL.y);
  if (distance < PORTAL.radius) {
    if (state.act < 3) transitionToAct(state.act + 1);
  }
}

function isPortalActive() {
  if (state.act === 1) return state.shards.every((shard) => shard.collected);
  if (state.act === 2) return state.encounterCleared;
  return false;
}

function transitionToAct(nextAct) {
  if (state.transition) return;
  state.transition = { to: nextAct, timer: 0.48 };
  state.player.invulnerable = 1;
  burst(PORTAL.x, PORTAL.y, 60, "signal");
  playChord(nextAct === 3 ? [130, 195, 260] : [180, 270, 360]);
}

function updateTransition(dt) {
  if (!state.transition) return false;
  state.transition.timer -= dt;
  if (state.transition.timer <= 0) loadAct(state.transition.to);
  return true;
}

function burst(x, y, count, kind) {
  const colors = kind === "error"
    ? ["#ff8f78", "#ffd0c6", "#6a2330"]
    : kind === "dust"
      ? ["#a5b8ba", "#536f77", "#e9f3ee"]
      : ["#d9ffff", "#8fe6ec", "#5a9eae"];
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.sin(index * 9.73) * 0.3;
    const speed = 45 + ((index * 37.7) % 230);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === "dust" ? 20 : 0),
      life: 0.35 + ((index * 0.137) % 0.65),
      maxLife: 1,
      size: 1 + ((index * 1.71) % 4),
      color: colors[index % colors.length],
      kind,
    });
  }
}

function updateParticles(dt) {
  for (const particle of particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.08, dt);
    particle.vy += (particle.kind === "signal" ? -18 : 180) * dt;
  }
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    if (particles[index].life <= 0) particles.splice(index, 1);
  }
}

function render() {
  const { width, height, dpr, scale, ox, oy } = viewport;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#06111d";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  const shakeStrength = reducedMotion ? state.screenShake * 0.12 : state.screenShake;
  const shakeX = shakeStrength ? Math.sin(state.time * 97) * shakeStrength : 0;
  const shakeY = shakeStrength ? Math.cos(state.time * 83) * shakeStrength * 0.55 : 0;
  ctx.translate(shakeX, shakeY);
  drawWorld();
  ctx.restore();
}

function drawWorld() {
  const parallaxX = pointer.x * (reducedMotion ? 1.5 : 12);
  const parallaxY = pointer.y * (reducedMotion ? 1 : 7);
  const activeBackground = state.act === 3 && actThreeBackground.complete && actThreeBackground.naturalWidth
    ? actThreeBackground
    : state.act === 2 && actTwoBackground.complete && actTwoBackground.naturalWidth
      ? actTwoBackground
      : background;
  if (activeBackground.complete && activeBackground.naturalWidth) {
    ctx.drawImage(activeBackground, -26 - parallaxX, -22 - parallaxY, WORLD.width + 52, WORLD.height + 52);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "#163249");
    gradient.addColorStop(0.48, "#23435a");
    gradient.addColorStop(1, "#071522");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  drawColorGrade();
  drawDistantDust();
  drawFog();
  drawPlatforms();
  drawHazards();
  drawPortal();
  if (state.act === 1) drawShards();
  drawEnemies();
  drawBoss();
  drawProjectiles();
  drawPlayerTrails();
  drawPlayer();
  drawParticles();
  drawForeground();
  drawActBanner();
  drawTransitionVeil();
  if (state.mode === "paused") drawPauseVeil();
}

function drawColorGrade() {
  const top = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  top.addColorStop(0, "rgba(5, 20, 34, 0.02)");
  top.addColorStop(0.65, "rgba(2, 13, 23, 0.08)");
  top.addColorStop(1, "rgba(1, 8, 15, 0.46)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const vignette = ctx.createRadialGradient(820, 405, 120, 820, 405, 1010);
  vignette.addColorStop(0, "rgba(7, 21, 34, 0)");
  vignette.addColorStop(0.72, "rgba(2, 9, 17, 0.08)");
  vignette.addColorStop(1, "rgba(1, 6, 12, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawDistantDust() {
  ctx.save();
  for (const mote of dust) {
    const y = (mote.y - state.time * mote.speed + WORLD.height) % WORLD.height;
    const x = mote.x + Math.sin(state.time * 0.31 + mote.phase) * 7;
    ctx.globalAlpha = 0.18 + (Math.sin(state.time * 1.4 + mote.phase) + 1) * 0.13;
    ctx.fillStyle = mote.warm ? "#ff9b84" : "#bff7f6";
    ctx.beginPath();
    ctx.arc(x, y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFog() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let layer = 0; layer < 3; layer += 1) {
    const y = 400 + layer * 126;
    const drift = (state.time * (8 + layer * 3) + layer * 230) % 420;
    const gradient = ctx.createLinearGradient(0, y - 70, 0, y + 100);
    gradient.addColorStop(0, "rgba(115, 176, 190, 0)");
    gradient.addColorStop(0.5, `rgba(124, 184, 197, ${0.045 - layer * 0.008})`);
    gradient.addColorStop(1, "rgba(115, 176, 190, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-450 + drift, y);
    for (let x = -450; x <= WORLD.width + 450; x += 90) {
      ctx.quadraticCurveTo(x + drift + 45, y - 26 + Math.sin(x * 0.014 + state.time) * 18, x + drift + 90, y);
    }
    ctx.lineTo(WORLD.width + 450, y + 95);
    ctx.lineTo(-450, y + 95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatforms() {
  for (const platform of activePlatforms()) {
    if (platform.kind === "floor") continue;
    const glow = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h + 32);
    glow.addColorStop(0, "rgba(205, 246, 244, 0.48)");
    glow.addColorStop(0.12, "rgba(50, 91, 103, 0.88)");
    glow.addColorStop(1, "rgba(5, 19, 30, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(platform.x + 10, platform.y);
    ctx.lineTo(platform.x + platform.w - 8, platform.y);
    ctx.lineTo(platform.x + platform.w, platform.y + 9);
    ctx.lineTo(platform.x + platform.w - 26, platform.y + platform.h + 28);
    ctx.lineTo(platform.x + 22, platform.y + platform.h + 20);
    ctx.lineTo(platform.x, platform.y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(202, 246, 245, 0.48)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(platform.x + 10, platform.y + 1);
    ctx.lineTo(platform.x + platform.w - 8, platform.y + 1);
    ctx.stroke();

    ctx.strokeStyle = "rgba(116, 225, 228, 0.42)";
    ctx.beginPath();
    ctx.moveTo(platform.x + platform.w * 0.25, platform.y + 2);
    ctx.lineTo(platform.x + platform.w * 0.35, platform.y + 9);
    ctx.lineTo(platform.x + platform.w * 0.42, platform.y + 2);
    ctx.moveTo(platform.x + platform.w * 0.72, platform.y + 2);
    ctx.lineTo(platform.x + platform.w * 0.66, platform.y + 12);
    ctx.stroke();
  }
}

function drawShards() {
  for (const shard of state.shards) {
    if (shard.collected) continue;
    const bob = Math.sin(state.time * 2.1 + shard.index * 1.9) * 9;
    const rotation = state.time * 0.55 + shard.index;
    ctx.save();
    ctx.translate(shard.x, shard.y + bob);
    ctx.rotate(rotation);
    ctx.shadowColor = "rgba(143, 230, 236, 0.9)";
    ctx.shadowBlur = 25;
    ctx.strokeStyle = "#d9ffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0.25, 2.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 20, 3.0, 5.7);
    ctx.stroke();
    ctx.rotate(-rotation * 1.8);
    ctx.fillStyle = "rgba(217, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(217, 255, 255, 0.55)";
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SIG·${shard.glyph}`, shard.x, shard.y + bob + 43);
    ctx.restore();
  }
}

function drawHazards() {
  for (const hazard of state.hazards) {
    const pulse = 1 + Math.sin(state.time * 4 + hazard.phase) * 0.08;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(-state.time * 0.8 + hazard.phase);
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = "rgba(255, 111, 92, 0.85)";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = "rgba(255, 143, 120, 0.86)";
    ctx.lineWidth = 2;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      const radius = hazard.r * (0.55 + ring * 0.28);
      ctx.arc(0, 0, radius, ring * 0.8, ring * 0.8 + Math.PI * 1.28);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 197, 182, 0.88)";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#ff8f78";
    for (let index = 0; index < 4; index += 1) {
      const offset = ((index * 17 + state.time * 33) % 40) - 20;
      ctx.fillRect(hazard.x - hazard.r - 12 + offset, hazard.y - 15 + index * 10, 9 + index * 4, 2);
    }
    ctx.restore();
  }
}

function drawPortal() {
  if (state.act === 3) return;
  const active = isPortalActive();
  const x = PORTAL.x;
  const y = PORTAL.y;
  ctx.save();
  ctx.translate(x, y);
  if (state.act === 2) {
    const gatePulse = 1 + Math.sin(state.portalPulse * 2.2) * 0.035;
    ctx.scale(gatePulse, gatePulse);
    ctx.fillStyle = active ? "rgba(217,255,255,0.12)" : "rgba(4,14,24,0.48)";
    ctx.fillRect(-58, -106, 116, 212);
    ctx.strokeStyle = active ? "rgba(217,255,255,0.92)" : "rgba(125,159,167,0.34)";
    ctx.lineWidth = active ? 4 : 2;
    ctx.strokeRect(-58, -106, 116, 212);
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    for (let index = -2; index <= 2; index += 1) {
      ctx.moveTo(index * 22, -96);
      ctx.lineTo(index * 22, 96);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (active) {
      ctx.globalCompositeOperation = "screen";
      const veil = ctx.createLinearGradient(-48, 0, 48, 0);
      veil.addColorStop(0, "rgba(143,230,236,0)");
      veil.addColorStop(0.5, "rgba(217,255,255,0.42)");
      veil.addColorStop(1, "rgba(143,230,236,0)");
      ctx.fillStyle = veil;
      ctx.fillRect(-48, -94, 96, 188);
    }
    ctx.restore();
    return;
  }
  const breath = 1 + Math.sin(state.portalPulse * 2.4) * 0.035;
  ctx.scale(breath, breath);
  ctx.globalCompositeOperation = "screen";
  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 105);
  aura.addColorStop(0, active ? "rgba(217, 255, 255, 0.34)" : "rgba(80, 118, 127, 0.05)");
  aura.addColorStop(0.55, active ? "rgba(108, 222, 229, 0.16)" : "rgba(80, 118, 127, 0.03)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 108, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? "rgba(217, 255, 255, 0.95)" : "rgba(125, 159, 167, 0.32)";
  ctx.shadowColor = active ? "#8fe6ec" : "transparent";
  ctx.shadowBlur = active ? 27 : 0;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 13]);
  ctx.rotate(state.time * (active ? 0.42 : 0.08));
  ctx.beginPath();
  ctx.arc(0, 0, 79, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (active) {
    const inner = ctx.createRadialGradient(0, 0, 4, 0, 0, 57);
    inner.addColorStop(0, "rgba(230, 255, 255, 0.7)");
    inner.addColorStop(0.35, "rgba(91, 190, 204, 0.24)");
    inner.addColorStop(1, "rgba(5, 20, 33, 0.76)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const telegraph = enemy.state === "telegraph";
    const release = enemy.state === "charge" || enemy.state === "release";
    ctx.save();
    ctx.translate(enemy.x, enemy.y + enemy.h / 2);
    if (enemy.facing < 0) ctx.scale(-1, 1);
    const bob = Math.sin(state.time * 3 + enemy.baseX) * 2;
    ctx.translate(0, bob);
    ctx.globalAlpha = enemy.hitFlash > 0 ? 0.58 : 1;
    ctx.shadowColor = telegraph ? "#ff8f78" : "rgba(143,230,236,0.28)";
    ctx.shadowBlur = telegraph ? 24 : 10;
    if (enemy.type === "husk") {
      ctx.fillStyle = "#102333";
      ctx.beginPath();
      ctx.ellipse(0, 4, 31 + (release ? 8 : 0), 25 - (release ? 4 : 0), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = telegraph ? "#ffad98" : "#9dcfd1";
      ctx.lineWidth = telegraph ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(-25, 8);
      ctx.quadraticCurveTo(-42, 19, -48, 32);
      ctx.moveTo(25, 8);
      ctx.quadraticCurveTo(42, 19, 48, 32);
      ctx.moveTo(16, -15);
      ctx.quadraticCurveTo(34, -25, 42, -14);
      ctx.stroke();
      ctx.fillStyle = "#d9ffff";
      ctx.fillRect(13, -4, 6, 6);
    } else {
      ctx.rotate(Math.sin(state.time * 1.2) * 0.05);
      ctx.fillStyle = "rgba(9,26,37,0.92)";
      ctx.beginPath();
      ctx.moveTo(-30, -24);
      ctx.lineTo(26, -31);
      ctx.lineTo(36, 19);
      ctx.lineTo(0, 35);
      ctx.lineTo(-35, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = telegraph ? "#ff8f78" : "rgba(217,255,255,0.7)";
      ctx.lineWidth = telegraph ? 3 : 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, -1, telegraph ? 17 : 10, -0.8, 2.3);
      ctx.stroke();
    }
    ctx.restore();
    drawEnemyHealth(enemy);
  }
}

function drawEnemyHealth(enemy) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "rgba(3,12,20,0.72)";
  ctx.fillRect(enemy.x - 29, enemy.y - 18, 58, 3);
  ctx.fillStyle = enemy.state === "telegraph" ? "#ff8f78" : "#bff7f6";
  ctx.fillRect(enemy.x - 29, enemy.y - 18, 58 * (enemy.hp / enemy.maxHp), 3);
  ctx.restore();
}

function drawBoss() {
  const boss = state.boss;
  if (!boss) return;
  const phase = boss.hp <= 4 ? 3 : boss.hp <= 8 ? 2 : 1;
  const breath = Math.sin(state.time * 1.35);
  const telegraph = boss.stage === "telegraph";
  const release = boss.stage === "release";
  const recover = boss.stage === "recover";
  let poseX = 0;
  let poseY = breath * 2;
  let poseRotation = breath * 0.012;
  let poseScaleX = 1 + breath * 0.008;
  let poseScaleY = 1 - breath * 0.006;
  if (telegraph) {
    poseX = boss.pattern === "redaction_quill" ? 12 : 4;
    poseY -= 7;
    poseRotation += boss.pattern === "memory_sweep" ? 0.085 : -0.045;
    poseScaleX *= 0.93;
    poseScaleY *= 1.06;
  } else if (release) {
    poseX = boss.pattern === "index_ring" ? -4 : -22;
    poseY -= boss.pattern === "index_ring" ? 3 : 9;
    poseRotation += boss.pattern === "memory_sweep" ? -0.1 : -0.055;
    poseScaleX *= boss.pattern === "index_ring" ? 1.16 : 1.1;
    poseScaleY *= boss.pattern === "index_ring" ? 1.1 : 0.96;
  } else if (recover) {
    poseX = 8;
    poseY += 15;
    poseRotation += 0.055;
    poseScaleX *= 1.04;
    poseScaleY *= 0.9;
  }
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const deathFade = boss.dead ? Math.max(0, boss.deathTimer / 1.25) : 1;
  ctx.globalAlpha = deathFade * (boss.hitFlash > 0 ? 0.58 : 1);
  if (release && bossImage.complete && bossImage.naturalWidth) {
    ctx.save();
    ctx.globalAlpha *= 0.12;
    ctx.translate(24, 3);
    ctx.rotate(poseRotation * -0.65);
    ctx.drawImage(bossImage, -142, -146, 284, 284);
    ctx.restore();
  }
  ctx.translate(poseX, poseY);
  ctx.rotate(poseRotation);
  ctx.scale(poseScaleX, poseScaleY);
  ctx.shadowColor = telegraph || release ? "#ff8f78" : recover ? "#d9ffff" : "rgba(143,230,236,0.42)";
  ctx.shadowBlur = telegraph ? 38 : release ? 48 : recover ? 32 : 18;
  if (bossImage.complete && bossImage.naturalWidth) {
    ctx.drawImage(bossImage, -142, -146, 284, 284);
  } else {
    ctx.fillStyle = "rgba(8,24,34,0.96)";
    ctx.beginPath();
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      const radius = index % 2 === 0 ? 92 : 68;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = telegraph ? "#ffb09d" : "rgba(217,255,255,0.78)";
    ctx.lineWidth = charge ? 4 : 2;
    ctx.stroke();
  }
  if (phase >= 2) {
    ctx.strokeStyle = phase === 3 ? "rgba(255,143,120,0.88)" : "rgba(217,255,255,0.7)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -118);
    ctx.lineTo(-10, -106);
    ctx.lineTo(-2, -98);
    if (phase === 3) {
      ctx.moveTo(5, -113);
      ctx.lineTo(13, -103);
      ctx.lineTo(6, -91);
      ctx.moveTo(-2, -99);
      ctx.lineTo(-16, -91);
    }
    ctx.stroke();
  }
  if (recover && !boss.dead) {
    const corePulse = 1 + Math.sin(state.time * 12) * 0.08;
    ctx.save();
    ctx.translate(0, -51);
    ctx.scale(corePulse, corePulse);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(217,255,255,0.72)";
    ctx.shadowColor = "#8fe6ec";
    ctx.shadowBlur = 34;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(217,255,255,0.9)";
    ctx.lineWidth = 2;
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(0, 0, 29, angle - 0.36, angle + 0.36);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.strokeStyle = recover ? "rgba(217,255,255,0.88)" : "rgba(143,230,236,0.64)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 70 + (telegraph ? 11 : 0), state.time, state.time + Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();

  if (!boss.dead && state.mode === "play") {
    ctx.save();
    const barX = 505;
    const barY = 112;
    const barW = 590;
    ctx.fillStyle = "rgba(3,12,20,0.76)";
    ctx.fillRect(barX, barY, barW, 7);
    ctx.fillStyle = boss.hitFlash > 0 ? "#d9ffff" : "#ff8f78";
    ctx.fillRect(barX, barY, barW * (boss.hp / boss.maxHp), 7);
    ctx.fillStyle = "rgba(233,243,238,0.82)";
    ctx.font = "600 13px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.letterSpacing = "3px";
    ctx.fillText(`BLIND ARCHIVIST · ${boss.hp}/${boss.maxHp}`, 800, 98);
    ctx.restore();
  }

  drawBossTelegraph(boss);
}

function drawBossTelegraph(boss) {
  if (boss.stage !== "telegraph" && boss.stage !== "release") return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = boss.stage === "release" ? "rgba(255,143,120,0.94)" : "rgba(217,255,255,0.55)";
  ctx.lineWidth = boss.stage === "release" ? 7 : 2;
  if (boss.pattern === "index_ring") {
    const radius = boss.stage === "telegraph" ? 115 + Math.sin(state.time * 12) * 9 : 145;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      ctx.beginPath();
      ctx.moveTo(boss.x + Math.cos(angle) * 92, boss.y + Math.sin(angle) * 92);
      ctx.lineTo(boss.x + Math.cos(angle) * 154, boss.y + Math.sin(angle) * 154);
      ctx.stroke();
    }
  } else if (boss.pattern === "redaction_quill") {
    for (const offset of [-0.1, 0, 0.1]) {
      const angle = boss.targetAngle + offset;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(angle) * 1250, boss.y + Math.sin(angle) * 1250);
      ctx.stroke();
    }
  } else if (boss.pattern === "memory_sweep") {
    const angle = boss.stage === "release" ? boss.angle : boss.targetAngle - 0.9;
    if (boss.stage === "telegraph") {
      ctx.fillStyle = "rgba(255,143,120,0.08)";
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.arc(boss.x, boss.y, 1050, boss.targetAngle - 0.9, boss.targetAngle + 1.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + Math.cos(angle) * 1250, boss.y + Math.sin(angle) * 1250);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectiles() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const projectile of state.projectiles) {
    const playerOwned = projectile.owner === "player";
    ctx.fillStyle = playerOwned ? "#d9ffff" : projectile.kind === "ink" ? "#ff9f88" : "#ff8f78";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = playerOwned ? 14 : 20;
    ctx.beginPath();
    if (projectile.kind === "needle") ctx.ellipse(projectile.x, projectile.y, 18, 5, 0, 0, Math.PI * 2);
    else ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawActBanner() {
  if (state.mode !== "play" || state.actBannerTime <= 0) return;
  const alpha = Math.min(1, state.actBannerTime) * Math.min(1, (2.5 - state.actBannerTime) * 3);
  ctx.save();
  ctx.globalAlpha = alpha;
  const wash = ctx.createLinearGradient(74, 0, 620, 0);
  wash.addColorStop(0, "rgba(3,12,20,0.78)");
  wash.addColorStop(0.68, "rgba(3,12,20,0.38)");
  wash.addColorStop(1, "rgba(3,12,20,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(62, 154, 610, 118);
  ctx.strokeStyle = "rgba(217,255,255,0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 177);
  ctx.lineTo(218, 177);
  ctx.stroke();
  ctx.fillStyle = "rgba(217,255,255,0.76)";
  ctx.font = "500 11px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.letterSpacing = "4px";
  ctx.fillText(`ACT ${state.act} / III`, 80, 198);
  ctx.fillStyle = "#f1f4ec";
  ctx.font = "400 31px Georgia, serif";
  ctx.letterSpacing = "1px";
  ctx.fillText(ACTS[state.act].name, 80, 232);
  ctx.fillStyle = "rgba(233,243,238,0.62)";
  ctx.font = "400 11px ui-monospace, monospace";
  ctx.letterSpacing = "1.5px";
  ctx.fillText(ACTS[state.act].objective.toUpperCase(), 82, 256);
  ctx.restore();
}

function drawTransitionVeil() {
  if (!state.transition) return;
  const progress = 1 - state.transition.timer / 0.48;
  ctx.save();
  const veilAlpha = reducedMotion ? 0.16 : 0.46;
  ctx.fillStyle = `rgba(217,255,255,${Math.sin(Math.PI * progress) * veilAlpha})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
}

function drawPlayerTrails() {
  for (const trail of state.player.trail) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, trail.life / 0.28) * 0.32;
    ctx.translate(trail.x, trail.y);
    drawPlayerShape(state.player.facing, true);
    ctx.restore();
  }
}

function drawPlayer() {
  const player = state.player;
  if (!player) return;
  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0;
  if (blink) return;
  ctx.save();
  const stride = player.animationState === "run" ? Math.sin(player.animationTime * 22) : 0;
  const attackThrust = player.animationState === "attack" ? Math.sin(Math.PI * Math.min(1, player.attackTime / PLAYER_ATTACK.duration)) : 0;
  ctx.translate(player.x + player.facing * attackThrust * 8, player.y + Math.sin(state.time * 5) * (player.onGround ? 1.4 : 0) + Math.abs(stride) * -2);
  if (player.animationState === "dash") ctx.scale(1.28, 0.82);
  else if (player.animationState === "jump") ctx.scale(0.92, 1.08);
  else if (player.animationState === "fall") ctx.scale(1.06, 0.94);
  else if (player.animationState === "run") ctx.rotate(stride * 0.035);
  drawPlayerShape(player.facing, false);
  if (player.animationState === "attack") {
    ctx.strokeStyle = "rgba(217,255,255,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startX = player.facing > 0 ? 30 : 12;
    ctx.moveTo(startX, 34);
    ctx.lineTo(startX + player.facing * (42 + attackThrust * 16), 34);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerShape(facing, ghost) {
  const player = state.player;
  ctx.save();
  if (facing < 0) {
    ctx.translate(player.w, 0);
    ctx.scale(-1, 1);
  }

  ctx.shadowColor = ghost ? "transparent" : "rgba(143, 230, 236, 0.62)";
  ctx.shadowBlur = ghost ? 0 : 17;
  ctx.fillStyle = ghost ? "rgba(143,230,236,0.4)" : "#e6efea";
  ctx.beginPath();
  ctx.moveTo(10, 28);
  ctx.quadraticCurveTo(2, 44, 7, 67);
  ctx.lineTo(20, 60);
  ctx.lineTo(30, 69);
  ctx.quadraticCurveTo(40, 47, 31, 29);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ghost ? "rgba(143,230,236,0.34)" : "#101f2c";
  ctx.beginPath();
  ctx.ellipse(21, 23, 14, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ghost ? "rgba(143,230,236,0.4)" : "rgba(223, 245, 241, 0.92)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(15, 11);
  ctx.quadraticCurveTo(10, 0, 3, 3);
  ctx.moveTo(26, 11);
  ctx.quadraticCurveTo(31, 0, 38, 4);
  ctx.stroke();

  ctx.fillStyle = ghost ? "rgba(217,255,255,0.5)" : "#d9ffff";
  ctx.shadowColor = "#8fe6ec";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(16.5, 23, 2.2, 3.6, 0, 0, Math.PI * 2);
  ctx.ellipse(25.5, 23, 2.2, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!ghost && player.dashCooldown <= 0) {
    ctx.strokeStyle = "rgba(143, 230, 236, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(21, 34, 23 + Math.sin(state.time * 3) * 2, -0.8, 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.7));
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.kind === "signal" ? 11 : 2;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.restore();
}

function drawForeground() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 8, 14, 0.58)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(48, 125, 65, 233, 43, 382);
  ctx.bezierCurveTo(29, 475, 10, 590, 0, 687);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(WORLD.width, 0);
  ctx.bezierCurveTo(1550, 170, 1538, 310, 1568, 435);
  ctx.bezierCurveTo(1587, 530, 1594, 640, WORLD.width, 730);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(3, 11, 18, 0.66)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (let index = 0; index < 5; index += 1) {
    const x = 160 + index * 330;
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.bezierCurveTo(x - 25, 90, x + 55, 120, x + 8, 235 + index * 9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPauseVeil() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 8, 14, 0.48)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(233, 243, 238, 0.86)";
  ctx.font = "500 17px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.letterSpacing = "5px";
  ctx.fillText("TRACE SUSPENDED", WORLD.width / 2, WORLD.height / 2);
  ctx.restore();
}

function frame(now) {
  const delta = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!state.testMode && now > state.manualUntil) update(delta);
  render();
  rafId = requestAnimationFrame(frame);
}

function keyDown(event) {
  const { code } = event;
  const relevant = ["ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space", "ShiftLeft", "ShiftRight", "KeyC", "KeyX", "KeyJ", "KeyF", "KeyR", "Escape"];
  if (relevant.includes(code)) event.preventDefault();
  if (["ArrowUp", "KeyW", "Space"].includes(code) && !event.repeat) pressed.add("jump");
  if (["ShiftLeft", "ShiftRight", "KeyC"].includes(code) && !event.repeat) pressed.add("dash");
  if (["KeyX", "KeyJ"].includes(code) && !event.repeat) pressed.add("attack");
  if (code === "KeyF" && !event.repeat) toggleFullscreen();
  if (code === "KeyR" && !event.repeat) restartRun();
  if (code === "Escape" && !event.repeat) togglePause();
  keys.add(code);
}

function keyUp(event) {
  keys.delete(event.code);
}

function bindTouchControls() {
  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const key = `virtual-${control}`;
    const release = () => keys.delete(key);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      ensureAudio();
      button.setPointerCapture?.(event.pointerId);
      if (control === "jump" || control === "dash" || control === "attack") pressed.add(control);
      else keys.add(key);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });
}

window.render_game_to_text = () => {
  const player = state.player;
  const collected = state.shards.filter((shard) => shard.collected).length;
  const portalActive = isPortalActive();
  return JSON.stringify({
    coordinateSystem: "origin top-left; x right; y down; world 1600x900",
    mode: state.mode,
    act: {
      current: state.act,
      total: 3,
      name: ACTS[state.act].name,
      objective: ACTS[state.act].objective,
      checkpoint: state.checkpointAct,
      transitioningTo: state.transition?.to ?? null,
    },
    objective: state.act === 1 && collected < SIGNAL_TOTAL
      ? "collect all visible signal shards"
      : state.act < 3 && portalActive
        ? `enter portal at x=${PORTAL.x},y=${PORTAL.y}`
        : ACTS[state.act].objective,
    player: player ? {
      x: Math.round(player.x),
      y: Math.round(player.y),
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      hp: player.hp,
      onGround: player.onGround,
      dashReady: player.dashCooldown <= 0,
      attacking: player.attackTime > 0,
      attackReady: player.attackCooldown <= 0,
      attackCooldown: Number(player.attackCooldown.toFixed(2)),
      animationState: player.animationState,
      animationFrame: player.animationFrame,
      facing: player.facing,
    } : null,
    signals: {
      collected,
      total: state.shards.length,
      remaining: state.shards.filter((shard) => !shard.collected).map((shard) => ({ x: shard.x, y: shard.y, glyph: shard.glyph })),
    },
    portal: { x: PORTAL.x, y: PORTAL.y, active: portalActive, visible: state.act < 3 },
    hazards: state.hazards.map((hazard) => ({ x: Math.round(hazard.x), y: Math.round(hazard.y), r: hazard.r })),
    enemies: state.enemies.filter((enemy) => !enemy.dead).map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      state: enemy.state,
      timer: Number(enemy.timer.toFixed(2)),
    })),
    encounterCleared: state.encounterCleared,
    wave: state.act === 2 ? {
      current: state.wave,
      total: state.waveTotal,
      betweenWaves: state.waveDelay > 0,
      defeated: state.enemiesDefeated,
    } : null,
    projectiles: state.projectiles.slice(0, 30).map((projectile) => ({
      id: projectile.id,
      owner: projectile.owner,
      kind: projectile.kind,
      x: Math.round(projectile.x),
      y: Math.round(projectile.y),
      vx: Math.round(projectile.vx),
      vy: Math.round(projectile.vy),
    })),
    boss: state.boss ? {
      name: "BLIND ARCHIVIST",
      x: state.boss.x,
      y: state.boss.y,
      hp: state.boss.hp,
      maxHp: state.boss.maxHp,
      state: state.boss.stage,
      pattern: state.boss.pattern,
      patternIndex: state.boss.patternIndex,
      patternHistory: [...state.boss.patternHistory],
      timer: Number(state.boss.timer.toFixed(2)),
      dead: state.boss.dead,
      vulnerable: !state.boss.dead && state.boss.stage === "recover",
      phase: state.boss.hp <= 4 ? 3 : state.boss.hp <= 8 ? 2 : 1,
    } : null,
    runTime: Number(state.runTime.toFixed(2)),
    actTime: Number(state.actTime.toFixed(2)),
    deaths: state.deaths,
  });
};

window.advanceTime = (milliseconds) => {
  const steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
  state.manualUntil = performance.now() + 120;
  simulateFrames(steps);
};

window.__gameTest = {
  loadAct(act) {
    state.testMode = true;
    state.mode = "play";
    document.body.classList.add("is-playing");
    ui.intro.hidden = true;
    ui.completion.hidden = true;
    ui.hud.hidden = false;
    if (act === 1) resetWorld();
    else loadAct(Math.max(1, Math.min(3, Math.round(act))));
    state.mode = "play";
    render();
  },
  step({ frames = 1, held = [], pressed: nextPressed = [] } = {}) {
    return simulateFrames(frames, held, nextPressed);
  },
  setPlayer(patch = {}) {
    Object.assign(state.player, patch);
    render();
  },
  setEnemy(id, patch = {}) {
    const enemy = state.enemies.find((entry) => entry.id === id);
    if (enemy) Object.assign(enemy, patch);
    render();
  },
  setBoss(patch = {}) {
    if (state.boss) Object.assign(state.boss, patch);
    render();
  },
  damageEnemy(id, damage = 1) {
    const enemy = state.enemies.find((entry) => entry.id === id);
    if (enemy && !enemy.dead) damageEnemy(enemy, damage);
    const cleared = state.enemies.length > 0 && state.enemies.every((entry) => entry.dead);
    if (cleared && state.wave === state.waveTotal) state.encounterCleared = true;
    updateHud();
    render();
  },
  damageBoss(damage = 1) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    boss.hp = Math.max(0, boss.hp - damage);
    boss.hitFlash = 0.12;
    if (boss.hp <= 0) {
      boss.dead = true;
      boss.stage = "death";
      boss.pattern = null;
      boss.deathTimer = 1.25;
      state.projectiles = state.projectiles.filter((item) => item.owner === "player");
    }
    updateHud();
    render();
  },
  clearHostileProjectiles() {
    state.projectiles = state.projectiles.filter((projectile) => projectile.owner === "player");
    render();
  },
  completeActOne() {
    state.shards.forEach((shard) => { shard.collected = true; });
    updateHud();
    render();
  },
};

window.addEventListener("resize", resize);
window.addEventListener("keydown", keyDown, { passive: false });
window.addEventListener("keyup", keyUp);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / Math.max(1, window.innerWidth) - 0.5;
  pointer.y = event.clientY / Math.max(1, window.innerHeight) - 0.5;
});
canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "play") return;
  event.preventDefault();
  ensureAudio();
  pressed.add("attack");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "play") togglePause();
});
ui.start.addEventListener("click", startGame);
ui.replay.addEventListener("click", replay);
bindTouchControls();
resetWorld();
resize();
cancelAnimationFrame(rafId);
rafId = requestAnimationFrame(frame);
