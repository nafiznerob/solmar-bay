// Drawing only: the game state in, pixels out. A camera follows Milo, the
// city is painted ground-up — grass and water, roads, buildings, cars,
// people — and the objective marker floats over the world with an arrow at
// the screen's edge when the marker is out of view.

import { CFG, PALETTE } from './config.js';

function inView(cam, x, y, margin) {
  const hw = CFG.viewW / 2 / cam.zoom + margin;
  const hh = CFG.viewH / 2 / cam.zoom + margin;
  return x > cam.x - hw && x < cam.x + hw && y > cam.y - hh && y < cam.y + hh;
}

function drawCarShape(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-24, -10, 48, 24);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-23, -11, 46, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#1b263b';
  ctx.beginPath();
  ctx.roundRect(-6, -9, 14, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(20, -8, 3, 5);
  ctx.fillRect(20, 3, 3, 5);
  if (car.kind === 'police') {
    const red = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = red ? '#ff2e63' : '#3a86ff';
    ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = red ? '#3a86ff' : '#ff2e63';
    ctx.fillRect(-4, 6, 8, 5);
  }
  ctx.restore();
}

function drawMarker(ctx, game) {
  const target = game.currentTarget();
  if (!target) return;
  const cam = game.camera;
  const pulse = 1 + Math.sin(game.time * 4) * 0.15;
  // The beam and diamond over the marker itself, when it is on screen.
  if (inView(cam, target.x, target.y, 0)) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(target.x - 6, target.y - 160, 12, 160);
    ctx.restore();
    ctx.save();
    ctx.translate(target.x, target.y - 46 * pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd60a';
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 2;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
  }
  // The arrow at the screen's edge, pointing the way when it is not.
  const sx = CFG.viewW / 2 + (target.x - cam.x) * cam.zoom;
  const sy = CFG.viewH / 2 + (target.y - cam.y) * cam.zoom;
  if (sx < 30 || sx > CFG.viewW - 30 || sy < 30 || sy > CFG.viewH - 30) {
    const cx = Math.max(40, Math.min(CFG.viewW - 40, sx));
    const cy = Math.max(40, Math.min(CFG.viewH - 40, sy));
    const angle = Math.atan2(target.y - game.player.y, target.x - game.player.x);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(Math.hypot(target.x - game.player.x, target.y - game.player.y))}m`, cx, cy + 30);
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = CFG.viewW;
  canvas.height = CFG.viewH;

  function draw(game) {
    const cam = game.camera;
    const shakeX = game.shakeT > 0 ? (Math.random() - 0.5) * game.shakeT : 0;
    const shakeY = game.shakeT > 0 ? (Math.random() - 0.5) * game.shakeT : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1a2b';
    ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, CFG.viewW / 2 - cam.x * cam.zoom + shakeX, CFG.viewH / 2 - cam.y * cam.zoom + shakeY);

    const city = game.city;
    // Ground, sand and water.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, CFG.worldW, CFG.worldH);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, city.sandSouth, CFG.worldW, city.waterSouth - city.sandSouth);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(city.waterEast, 0, CFG.worldW - city.waterEast, CFG.worldH);
    ctx.fillRect(0, city.waterSouth, CFG.worldW, CFG.worldH - city.waterSouth);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(city.waterEast + 40, 0, CFG.worldW - city.waterEast - 40, CFG.worldH);

    // Parks and their trees.
    for (const park of city.parks) {
      if (!inView(cam, park.x + park.w / 2, park.y + park.h / 2, 200)) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      for (const t of park.trees) {
        ctx.fillStyle = '#2d6a4f';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#40916c';
        ctx.beginPath();
        ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sidewalks, then the roads, then the dashes down their middles.
    const half = CFG.roadW / 2;
    ctx.fillStyle = PALETTE.sidewalk;
    for (const vx of city.lines.verticals) ctx.fillRect(vx - half - 8, 0, CFG.roadW + 16, CFG.worldH);
    for (const hy of city.lines.horizontals) ctx.fillRect(0, hy - half - 8, CFG.worldW, CFG.roadW + 16);
    ctx.fillStyle = PALETTE.road;
    for (const vx of city.lines.verticals) ctx.fillRect(vx - half, 0, CFG.roadW, CFG.worldH);
    for (const hy of city.lines.horizontals) ctx.fillRect(0, hy - half, CFG.worldW, CFG.roadW);
    ctx.fillStyle = PALETTE.roadLine;
    for (const vx of city.lines.verticals) {
      for (let y = 40; y < CFG.worldH; y += 80) ctx.fillRect(vx - 2, y, 4, 40);
    }
    for (const hy of city.lines.horizontals) {
      for (let x = 40; x < CFG.worldW; x += 80) ctx.fillRect(x, hy - 2, 40, 4);
    }

    // Marina piers over the water.
    ctx.fillStyle = '#8d6b4a';
    for (const pier of city.piers) ctx.fillRect(pier.x, pier.y, pier.w, pier.h);

    // Buildings: body, roof, and lit windows on the tall downtown ones.
    for (const b of city.buildings) {
      if (!inView(cam, b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255, 230, 130, 0.75)';
        const cols = Math.floor(b.w / 26);
        const rows = Math.floor(b.h / 26);
        for (let c = 0; c < cols; c += 1) {
          for (let r = 0; r < rows; r += 1) {
            if ((c * 7 + r * 3) % 3 === 0) ctx.fillRect(b.x + 10 + c * 26, b.y + 10 + r * 26, 10, 12);
          }
        }
      }
    }

    // District names, faint on the ground.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const label of city.labels) {
      if (inView(cam, label.x, label.y, 0)) ctx.fillText(label.text, label.x, label.y);
    }

    // Pickups.
    for (const pk of game.pickups) {
      if (pk.taken || !inView(cam, pk.x, pk.y, 0)) continue;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = pk.kind === 'cash' ? '#06d6a0' : pk.kind === 'health' ? '#f8f9fa' : '#ffd60a';
      ctx.fill();
      ctx.fillStyle = '#14213d';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 1);
      ctx.textBaseline = 'alphabetic';
    }

    // Cars, pedestrians, Milo.
    for (const car of game.cars) {
      if (inView(cam, car.x, car.y, 60)) drawCarShape(ctx, car, game.time);
    }
    for (const ped of game.peds) {
      if (!inView(cam, ped.x, ped.y, 0)) continue;
      ctx.fillStyle = ped.state === 'down' ? '#6c757d' : ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, ped.state === 'down' ? 7 : 9, 0, Math.PI * 2);
      ctx.fill();
      if (ped.state !== 'down') {
        ctx.fillStyle = '#f2d5b8';
        ctx.beginPath();
        ctx.arc(ped.x, ped.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const p = game.player;
    if (p.health > 0 && !(p.hurtT > 0 && Math.floor(p.hurtT * 12) % 2 === 0)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(0, 0, CFG.playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2d5b8';
      ctx.beginPath();
      ctx.arc(4, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14213d';
      ctx.fillRect(8, -2, 12, 4);
      ctx.restore();
    }

    // Bullets and particles.
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    for (const b of game.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    }
    for (const part of game.parts) {
      ctx.globalAlpha = Math.max(0, part.life / part.max);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * (part.life / part.max), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawMarker(ctx, game);
  }

  return { draw };
}
