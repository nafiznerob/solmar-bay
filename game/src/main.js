// Boot and the one loop: Solmar Bay starts on its title screen, plays on a
// fixed clock, and pauses, saves and ends through the menus. The game object
// is one plain object every module reads and writes; this file owns it, the
// camera, the save slot and the ?shot= scenes.
//
// ?seed=N fixes the city. ?shot=start|street|chase|mission stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { CFG } from './config.js';
import { Seeded } from './random.js';
import { buildCity, randomSidewalkPoint } from './world.js';
import { createControls } from './input.js';
import { createSound } from './audio.js';
import { createPlayer, damagePlayer, updatePlayer } from './player.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';
import { currentTarget, startMission, updateDialogue, updateMission } from './missions.js';
import { createHud } from './hud.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hudRoot = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const overScreen = document.getElementById('over-screen');
const overTitle = document.getElementById('over-title');
const overStats = document.getElementById('over-stats');
const loadBtn = document.getElementById('load-btn');

const controls = createControls(canvas);
const sound = createSound();
const renderer = createRenderer(canvas);
const hud = createHud();

const SPAWN = { x: 1050, y: 750 };

function makeGame() {
  const game = {
    seed, rng: new Seeded(seed), city: null,
    player: null, cars: [], peds: [], pickups: [], bullets: [], parts: [],
    wanted: 0, heat: 0, unseenT: 0, decayT: 0, spawnT: 0,
    mission: { idx: 0, step: 0, active: false, done: [false, false, false, false, false], complete: false, nextT: 0 },
    dialogue: { queue: [], text: '', t: 0 },
    banner: { text: '', t: 0 },
    clockMin: CFG.clockStartMin, time: 0, shakeT: 0, shotsFiredT: 0,
    camera: { x: SPAWN.x, y: SPAWN.y, zoom: CFG.camZoom },
    state: 'start', overReason: 'wasted',
    stats: { carsStolen: 0, missionsDone: 0 },
    repoCar: null,
  };
  game.addHeat = (amount) => {
    const before = game.wanted;
    game.heat = Math.min(5.5, game.heat + amount);
    game.wanted = Math.min(CFG.maxWanted, Math.floor(game.heat + 0.001));
    if (game.wanted > before) game.flash(`Wanted level: ${game.wanted} star${game.wanted > 1 ? 's' : ''}`);
  };
  game.flash = (text) => { game.banner = { text, t: 2.6 }; };
  game.shake = (amount) => { game.shakeT = Math.max(game.shakeT, amount); };
  game.damagePlayer = (amount) => damagePlayer(game, amount);
  game.currentTarget = () => currentTarget(game);
  game.randomSidewalk = () => randomSidewalkPoint(game.rng);
  game.save = () => saveGame(game);
  return game;
}

function resetGame(game) {
  game.rng = new Seeded(game.seed);
  game.city = buildCity(game.rng);
  game.player = createPlayer(SPAWN);
  game.cars = [];
  game.peds = [];
  game.pickups = [];
  spawnTraffic(game);
  game.bullets = [];
  game.parts = [];
  game.wanted = 0;
  game.heat = 0;
  game.unseenT = 0;
  game.decayT = 0;
  game.spawnT = 0;
  game.mission = { idx: 0, step: 0, active: false, done: [false, false, false, false, false], complete: false, nextT: 0 };
  game.dialogue = { queue: [], text: '', t: 0 };
  game.banner = { text: '', t: 0 };
  game.clockMin = CFG.clockStartMin;
  game.time = 0;
  game.shakeT = 0;
  game.shotsFiredT = 0;
  game.camera = { x: SPAWN.x, y: SPAWN.y, zoom: CFG.camZoom };
  game.stats = { carsStolen: 0, missionsDone: 0 };
  game.repoCar = null;
}

function saveGame(game) {
  try {
    const p = game.player;
    window.localStorage.setItem(CFG.saveKey, JSON.stringify({
      money: p.money, health: p.health, ammo: p.ammo,
      missionIdx: game.mission.idx, missionDone: game.mission.done,
      px: p.x, py: p.y, wanted: game.wanted, clockMin: game.clockMin,
    }));
    return true;
  } catch {
    return false;
  }
}

function loadGame(game) {
  let data = null;
  try {
    data = JSON.parse(window.localStorage.getItem(CFG.saveKey) ?? 'null');
  } catch {
    data = null;
  }
  if (!data) return false;
  resetGame(game);
  const p = game.player;
  p.money = data.money ?? CFG.startMoney;
  p.health = data.health ?? CFG.playerHealth;
  p.ammo = data.ammo ?? CFG.startAmmo;
  p.x = data.px ?? SPAWN.x;
  p.y = data.py ?? SPAWN.y;
  game.heat = data.wanted ?? 0;
  game.wanted = Math.min(CFG.maxWanted, Math.floor(game.heat + 0.001));
  game.clockMin = data.clockMin ?? CFG.clockStartMin;
  game.mission.done = data.missionDone ?? [false, false, false, false, false];
  const idx = data.missionIdx ?? 0;
  if (idx < 5 && !game.mission.done[idx]) startMission(game, idx);
  return true;
}

function hasSave() {
  try {
    return window.localStorage.getItem(CFG.saveKey) !== null;
  } catch {
    return false;
  }
}

const game = makeGame();
resetGame(game);
game.reset = () => resetGame(game);
// A handle for play-testing and debugging from the browser console.
window.__solmar = game;

function showScreen(name) {
  startScreen.classList.toggle('hidden', name !== 'start');
  pauseScreen.classList.toggle('hidden', name !== 'paused');
  overScreen.classList.toggle('hidden', name !== 'over');
  hudRoot.classList.toggle('hidden', name === 'start');
}

function announce(message) {
  status.textContent = message;
}

function startNewGame() {
  resetGame(game);
  overShown = false;
  game.state = 'playing';
  showScreen('playing');
  startMission(game, 0);
  announce('Playing. Mission one: Getaway Wheels.');
  sound.unlock();
}

function startLoadedGame() {
  if (!loadGame(game)) return;
  overShown = false;
  game.state = 'playing';
  showScreen('playing');
  announce('Save loaded. Welcome back to Solmar Bay.');
  sound.unlock();
}

let overShown = false;

function endGame() {
  if (overShown) return;
  overShown = true;
  game.state = 'over';
  overTitle.textContent = game.overReason === 'busted' ? 'BUSTED' : 'WASTED';
  overStats.textContent = `You held $${game.player.money.toLocaleString('en-US')} and finished ${game.stats.missionsDone} of 5 missions.`;
  showScreen('over');
  announce(`${overTitle.textContent}. ${overStats.textContent}`);
}

function updateCamera(game, dt) {
  const cam = game.camera;
  const tx = Math.max(CFG.viewW / 2 / cam.zoom, Math.min(CFG.worldW - CFG.viewW / 2 / cam.zoom, game.player.x));
  const ty = Math.max(CFG.viewH / 2 / cam.zoom, Math.min(CFG.worldH - CFG.viewH / 2 / cam.zoom, game.player.y));
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * 5);
}

function updateParts(game, dt) {
  for (const part of game.parts) {
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.life -= dt;
  }
  game.parts = game.parts.filter((p) => p.life > 0);
}

function stepGame(dt) {
  game.time += dt;
  game.clockMin = (game.clockMin + dt * CFG.clockMinPerSec) % (24 * 60);
  game.shakeT = Math.max(0, game.shakeT - dt * 18);
  game.shotsFiredT = Math.max(0, game.shotsFiredT - dt);
  updatePlayer(game, dt, controls, sound);
  updateTraffic(game, dt);
  updatePolice(game, dt);
  updateMission(game, dt, sound);
  updateDialogue(game, dt);
  updateParts(game, dt);
  updateCamera(game, dt);
  sound.update(dt, game.player.driving ? Math.abs(game.player.driving.speed) / CFG.carMaxSpeed : 0, !!game.player.driving, game.wanted);
  if (game.state === 'over') endGame();
}

function runShot(name) {
  const screen = stageShot(name, game);
  showScreen(screen);
  for (let i = 0; i < 24; i += 1) {
    if (screen === 'playing') stepGame(1 / 60);
    else updateTraffic(game, 1 / 60);
  }
  updateCamera(game, 1);
  let painted = 0;
  function paint() {
    renderer.draw(game);
    hud.update(game, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  showScreen('start');
  loadBtn.disabled = !hasSave();
  loadBtn.textContent = hasSave() ? 'Continue saved game' : 'No saved game yet';
  announce('Solmar Bay. Press Enter or click Start to play.');

  document.getElementById('start-btn').addEventListener('click', () => { sound.click(); startNewGame(); });
  loadBtn.addEventListener('click', () => { sound.click(); startLoadedGame(); });
  document.getElementById('resume-btn').addEventListener('click', () => {
    sound.click();
    game.state = 'playing';
    showScreen('playing');
    announce('Playing.');
  });
  document.getElementById('save-btn').addEventListener('click', () => {
    if (saveGame(game)) game.flash('Game saved');
    else game.flash('Could not save in this browser');
  });
  document.getElementById('pause-load-btn').addEventListener('click', () => { sound.click(); startLoadedGame(); });
  document.getElementById('restart-btn').addEventListener('click', () => { sound.click(); startNewGame(); });
  document.getElementById('mute-btn').addEventListener('click', (event) => {
    const muted = sound.toggleMute();
    event.currentTarget.textContent = muted ? 'Unmute (N)' : 'Mute (N)';
  });
  document.getElementById('again-btn').addEventListener('click', () => { sound.click(); startNewGame(); });
  document.getElementById('log-close-btn').addEventListener('click', () => hud.showLog(game, false));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') {
      game.state = 'paused';
      showScreen('paused');
      announce('Paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (controls.pressed('Enter') && game.state === 'start') { startNewGame(); }
    if (controls.pressed('KeyP') || controls.pressed('Escape')) {
      if (game.state === 'playing') {
        game.state = 'paused';
        showScreen('paused');
        announce('Paused.');
      } else if (game.state === 'paused') {
        game.state = 'playing';
        showScreen('playing');
        announce('Playing.');
      }
    }
    if (controls.pressed('KeyM') && (game.state === 'playing' || game.state === 'paused')) {
      hud.showLog(game, !hud.isLogOpen());
    }
    if (controls.pressed('KeyN')) sound.toggleMute();
    if (game.state === 'playing') stepGame(dt);
    else if (game.state === 'over') endGame();
    else if (game.state === 'start') {
      updateTraffic(game, dt);
      updateCamera(game, dt);
    }
    if (game.state !== 'start') hud.update(game, dt);
    renderer.draw(game);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
