// The HUD: health, money, wanted stars, the clock, speed, the mission
// objective and the live minimap — DOM text for the numbers, one small
// canvas for the map. The mission log is an overlay the player opens with M.

import { CFG, PALETTE } from './config.js';
import { MISSIONS, missionStatus } from './missions.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const refs = {
    healthFill: el('health-fill'),
    healthNum: el('health-num'),
    money: el('money'),
    stars: el('stars'),
    clock: el('clock'),
    speed: el('speed'),
    objTitle: el('objective-title'),
    objText: el('objective-text'),
    objDist: el('objective-dist'),
    subtitle: el('subtitle'),
    banner: el('banner'),
    hint: el('hint'),
    log: el('log'),
    logList: el('log-list'),
    minimap: el('minimap'),
  };
  const mapCtx = refs.minimap.getContext('2d');

  function drawMinimap(game) {
    const W = refs.minimap.width;
    const H = refs.minimap.height;
    const s = Math.min(W / CFG.worldW, H / CFG.worldH);
    const ox = (W - CFG.worldW * s) / 2;
    const oy = (H - CFG.worldH * s) / 2;
    const px = (x) => ox + x * s;
    const py = (y) => oy + y * s;
    mapCtx.fillStyle = PALETTE.grass;
    mapCtx.fillRect(0, 0, W, H);
    mapCtx.fillStyle = PALETTE.water;
    mapCtx.fillRect(px(game.city.waterEast), 0, W, H);
    mapCtx.fillRect(0, py(game.city.waterSouth), W, H - py(game.city.waterSouth));
    mapCtx.fillStyle = PALETTE.sand;
    mapCtx.fillRect(0, py(game.city.sandSouth), W, py(game.city.waterSouth) - py(game.city.sandSouth));
    mapCtx.strokeStyle = PALETTE.road;
    mapCtx.lineWidth = Math.max(2, CFG.roadW * s);
    for (const vx of game.city.lines.verticals) {
      mapCtx.beginPath();
      mapCtx.moveTo(px(vx), 0);
      mapCtx.lineTo(px(vx), H);
      mapCtx.stroke();
    }
    for (const hy of game.city.lines.horizontals) {
      mapCtx.beginPath();
      mapCtx.moveTo(0, py(hy));
      mapCtx.lineTo(W, py(hy));
      mapCtx.stroke();
    }
    mapCtx.fillStyle = '#5b5b66';
    for (const b of game.city.buildings) {
      mapCtx.fillRect(px(b.x), py(b.y), Math.max(1, b.w * s), Math.max(1, b.h * s));
    }
    const target = game.currentTarget();
    if (target) {
      const blink = Math.floor(game.time * 3) % 2 === 0;
      mapCtx.fillStyle = blink ? '#ffd60a' : '#ff9f1c';
      const tx = px(target.x);
      const ty = py(target.y);
      mapCtx.beginPath();
      mapCtx.moveTo(tx, ty - 7);
      mapCtx.lineTo(tx + 6, ty);
      mapCtx.lineTo(tx, ty + 7);
      mapCtx.lineTo(tx - 6, ty);
      mapCtx.closePath();
      mapCtx.fill();
    }
    for (const car of game.cars) {
      if (car.kind === 'police') {
        mapCtx.fillStyle = Math.floor(game.time * 4) % 2 === 0 ? '#3a86ff' : '#ff2e63';
        mapCtx.beginPath();
        mapCtx.arc(px(car.x), py(car.y), 4, 0, Math.PI * 2);
        mapCtx.fill();
      } else {
        mapCtx.fillStyle = '#f8f9fa';
        mapCtx.fillRect(px(car.x) - 2, py(car.y) - 2, 4, 4);
      }
    }
    const p = game.player;
    mapCtx.fillStyle = PALETTE.player;
    mapCtx.beginPath();
    mapCtx.arc(px(p.x), py(p.y), 4.5, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = '#fff';
    mapCtx.lineWidth = 1.5;
    mapCtx.strokeRect(px(game.camera.x - CFG.viewW / 2 / game.camera.zoom), py(game.camera.y - CFG.viewH / 2 / game.camera.zoom), CFG.viewW / game.camera.zoom * s, CFG.viewH / game.camera.zoom * s);
  }

  function renderLog(game) {
    refs.logList.innerHTML = '';
    MISSIONS.forEach((def, i) => {
      const row = document.createElement('div');
      row.className = 'log-row';
      const state = game.mission.done[i] ? 'Done' : (game.mission.active && game.mission.idx === i ? 'Active' : 'Locked');
      row.innerHTML = `<b>${def.title}</b><span>${state} — $${def.reward}</span>`;
      refs.logList.appendChild(row);
    });
  }

  return {
    update(game, dt) {
      const p = game.player;
      refs.healthFill.style.width = `${Math.max(0, p.health)}%`;
      refs.healthFill.style.background = p.health > 50 ? '#06d6a0' : p.health > 25 ? '#ffd60a' : '#ef476f';
      refs.healthNum.textContent = `${Math.ceil(p.health)}`;
      refs.money.textContent = `$${p.money.toLocaleString('en-US')}`;
      refs.stars.textContent = '★'.repeat(game.wanted) + '☆'.repeat(CFG.maxWanted - game.wanted);
      refs.stars.classList.toggle('hot', game.wanted > 0);
      const hh = String(Math.floor(game.clockMin / 60) % 24).padStart(2, '0');
      const mm = String(Math.floor(game.clockMin) % 60).padStart(2, '0');
      refs.clock.textContent = `${hh}:${mm}`;
      refs.speed.textContent = p.driving ? `${Math.round(Math.abs(p.driving.speed) * 0.22)} mph` : '';
      const st = missionStatus(game);
      refs.objTitle.textContent = st.title;
      refs.objText.textContent = st.objective;
      refs.objDist.textContent = st.dist > 0 ? `${st.dist}m` : '';
      refs.subtitle.textContent = game.dialogue.text;
      if (game.banner.t > 0) {
        game.banner.t -= dt;
        refs.banner.textContent = game.banner.text;
        refs.banner.style.opacity = Math.min(1, game.banner.t).toFixed(2);
      } else {
        refs.banner.style.opacity = '0';
      }
      let hint = '';
      if (!p.driving && p.health > 0) {
        let near = null;
        let nearD = CFG.stealRadius;
        for (const car of game.cars) {
          if (car.kind === 'police') continue;
          const d = Math.hypot(car.x - p.x, car.y - p.y);
          if (d < nearD) { nearD = d; near = car; }
        }
        if (near) hint = near.kind === 'mission' ? 'Press E to take the repo car' : 'Press E to steal this car';
        else if (p.ammo > 0) hint = 'Click to shoot — F to punch';
      } else if (p.driving) {
        hint = 'E to get out — Space is the handbrake';
      }
      refs.hint.textContent = hint;
      drawMinimap(game);
    },
    showLog(game, show) {
      if (show) renderLog(game);
      refs.log.classList.toggle('hidden', !show);
    },
    isLogOpen() {
      return !refs.log.classList.contains('hidden');
    },
  };
}
