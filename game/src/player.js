// Milo Reyes: on foot, behind the wheel, and in a fight. Walking, punching
// and shooting live here, and so does the car he is driving — its arcade
// physics, its damage and smoke, and the moment it gives up on him.

import { CFG } from './config.js';
import { resolveBuildings } from './world.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, angle: -Math.PI / 2,
    health: CFG.playerHealth, money: CFG.startMoney, ammo: CFG.startAmmo,
    driving: null, punchT: 0, shootT: 0, hurtT: 0, healT: 0,
    moving: false,
  };
}

function addSmoke(game, x, y) {
  game.parts.push({
    x, y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 30,
    life: 0.9, max: 0.9, color: '#555', size: 7,
  });
}

function addSparks(game, x, y) {
  for (let i = 0; i < 6; i += 1) {
    game.parts.push({
      x, y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260,
      life: 0.35, max: 0.35, color: '#ffd166', size: 3,
    });
  }
}

export function damagePlayer(game, amount) {
  const p = game.player;
  if (p.hurtT > 0 || p.health <= 0) return;
  p.health = Math.max(0, p.health - amount);
  p.hurtT = 0.6;
  p.healT = 0;
  if (p.health <= 0) {
    const nearPolice = game.cars.some((c) => c.kind === 'police' && Math.hypot(c.x - p.x, c.y - p.y) < 220);
    game.overReason = nearPolice ? 'busted' : 'wasted';
    game.state = 'over';
  }
}

function nearestCar(game, maxD) {
  let best = null;
  let bestD = maxD;
  for (const car of game.cars) {
    if (car.kind === 'police') continue;
    const d = Math.hypot(car.x - game.player.x, car.y - game.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function tryEnterCar(game, sound) {
  const car = nearestCar(game, CFG.stealRadius);
  if (!car) return;
  const p = game.player;
  p.driving = car;
  car.speed = 0;
  if (car.kind !== 'mission') {
    game.addHeat(1, 'car stolen');
    game.stats.carsStolen += 1;
    game.flash('Car stolen — the cops noticed');
  } else {
    game.flash('Repo car secured — take it to the lot');
  }
  sound.click();
}

function exitCar(game) {
  const p = game.player;
  const car = p.driving;
  if (!car) return;
  p.driving = null;
  car.kind = 'parked';
  car.speed = 0;
  const side = resolveBuildings(game.city, car.x + Math.cos(car.angle + Math.PI / 2) * 34, car.y + Math.sin(car.angle + Math.PI / 2) * 34, CFG.playerRadius);
  p.x = side.x;
  p.y = side.y;
  p.angle = car.angle;
}

function shoot(game, controls, sound) {
  const p = game.player;
  if (p.ammo <= 0 || p.shootT > 0) return;
  p.shootT = CFG.shootCooldown;
  p.ammo -= 1;
  const cam = game.camera;
  const wx = cam.x + (controls.mouse.x - CFG.viewW / 2) / cam.zoom;
  const wy = cam.y + (controls.mouse.y - CFG.viewH / 2) / cam.zoom;
  const ox = p.driving ? p.driving.x : p.x;
  const oy = p.driving ? p.driving.y : p.y;
  const angle = Math.atan2(wy - oy, wx - ox);
  p.angle = angle;
  game.bullets.push({
    x: ox + Math.cos(angle) * 22, y: oy + Math.sin(angle) * 22,
    vx: Math.cos(angle) * CFG.bulletSpeed, vy: Math.sin(angle) * CFG.bulletSpeed,
    life: CFG.pistolRange / CFG.bulletSpeed,
  });
  game.parts.push({
    x: ox + Math.cos(angle) * 30, y: oy + Math.sin(angle) * 30,
    vx: 0, vy: 0, life: 0.08, max: 0.08, color: '#ffe066', size: 9,
  });
  game.addHeat(0.34, 'shots fired');
  game.shotsFiredT = 1.5;
  sound.shot();
}

function punch(game, sound) {
  const p = game.player;
  if (p.punchT > 0) return;
  p.punchT = CFG.punchCooldown;
  let best = null;
  let bestD = CFG.punchRange;
  for (const ped of game.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  if (best) {
    best.state = 'down';
    best.t = 3;
    game.addHeat(1, 'pedestrian punched');
    game.flash('That was assault — the cops noticed');
    sound.punch();
  }
}

function updateBullets(game, dt) {
  for (const b of game.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    // A building stops a bullet.
    const hit = game.city.buildings.some((r) => b.x >= r.x && b.x <= r.x + r.w && b.y >= r.y && b.y <= r.y + r.h);
    if (hit) { b.life = 0; addSparks(game, b.x, b.y); continue; }
    for (const ped of game.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
        ped.state = 'down';
        ped.t = 4;
        b.life = 0;
        game.addHeat(1, 'pedestrian shot');
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const car of game.cars) {
      if (car === game.player.driving) continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
        car.health -= CFG.pistolDamage;
        b.life = 0;
        addSparks(game, b.x, b.y);
        break;
      }
    }
  }
  game.bullets = game.bullets.filter((b) => b.life > 0);
}

function driveCar(game, dt, controls, sound) {
  const p = game.player;
  const car = p.driving;
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  if (controls.accelerate()) car.speed += CFG.carAccel * dt;
  if (controls.brake()) {
    car.speed -= (car.speed > 0 ? CFG.carBrake : CFG.carReverse) * dt;
  }
  // Rolling drag, and the handbrake lets the back step out.
  car.speed -= car.speed * (controls.handbrake() ? 1.6 : 0.55) * dt;
  car.speed = Math.max(-CFG.carMaxReverse, Math.min(CFG.carMaxSpeed, car.speed));
  const steer = controls.steer();
  const grip = controls.handbrake() ? 1.7 : 1;
  if (Math.abs(car.speed) > 12) {
    car.angle += steer * CFG.carTurn * grip * (car.speed / CFG.carMaxSpeed) * dt * (car.speed >= 0 ? 1 : -1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveBuildings(game.city, nx, ny, 24);
  if (fixed.x !== nx || fixed.y !== ny) {
    if (Math.abs(car.speed) > 140) {
      car.health -= 8;
      sound.crash();
      addSparks(game, fixed.x, fixed.y);
    }
    car.speed *= -0.25;
  }
  car.x = Math.max(20, Math.min(CFG.worldW - 20, fixed.x));
  car.y = Math.max(20, Math.min(CFG.worldH - 20, fixed.y));
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Bumping traffic and pedestrians.
  for (const other of game.cars) {
    if (other === car || other.kind === 'police') continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const ux = (other.x - car.x) / d;
      const uy = (other.y - car.y) / d;
      other.x += ux * push;
      other.y += uy * push;
      other.health = Math.max(0, other.health - 4);
      car.health = Math.max(0, car.health - 2);
      if (Math.abs(car.speed) > 200) sound.crash();
    }
  }
  for (const ped of game.peds) {
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30 && Math.abs(car.speed) > 60) {
      ped.state = 'down';
      ped.t = 5;
      game.addHeat(1, 'pedestrian hit by car');
      game.flash('You hit a pedestrian — the cops noticed');
      sound.crash();
    }
  }
  if (car.health < 45 && Math.random() < dt * 8) addSmoke(game, car.x, car.y - 6);
  if (car.health <= 0) {
    for (let i = 0; i < 18; i += 1) {
      game.parts.push({
        x: car.x, y: car.y, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320,
        life: 0.7, max: 0.7, color: i % 2 ? '#ff6b35' : '#ffd166', size: 6,
      });
    }
    game.cars = game.cars.filter((c) => c !== car);
    p.driving = null;
    p.x = car.x + 40;
    p.y = car.y;
    damagePlayer(game, 15);
    sound.crash();
  }
  void forward;
}

function walkPlayer(game, dt, controls) {
  const p = game.player;
  const mx = controls.moveX();
  const my = controls.moveY();
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    const nx = p.x + (mx / len) * CFG.walkSpeed * dt;
    const ny = p.y + (my / len) * CFG.walkSpeed * dt;
    const fixed = resolveBuildings(game.city, nx, ny, CFG.playerRadius);
    p.x = Math.max(16, Math.min(CFG.worldW - 16, fixed.x));
    p.y = Math.max(16, Math.min(CFG.worldH - 16, fixed.y));
    p.angle = Math.atan2(my, mx);
  }
  // Pickups: walk over one to take it.
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 36) {
      pk.taken = true;
      pk.respawnT = 20;
      if (pk.kind === 'cash') { p.money += 75; game.flash('+$75 found on the sidewalk'); }
      else if (pk.kind === 'health') { p.health = Math.min(CFG.playerHealth, p.health + 30); game.flash('Health +30'); }
      else { p.ammo += 12; game.flash('Ammo +12'); }
    }
  }
}

/** One frame of Milo: drive, walk, fight, and the slow mend when the heat is off. */
export function updatePlayer(game, dt, controls, sound) {
  const p = game.player;
  if (p.health <= 0) return;
  p.punchT = Math.max(0, p.punchT - dt);
  p.shootT = Math.max(0, p.shootT - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (p.driving) {
    driveCar(game, dt, controls, sound);
    if (controls.pressed('KeyE')) exitCar(game);
    if (controls.takeClick()) shoot(game, controls, sound);
  } else {
    walkPlayer(game, dt, controls);
    if (controls.pressed('KeyE')) tryEnterCar(game, sound);
    if (controls.pressed('KeyF')) punch(game, sound);
    if (controls.takeClick()) shoot(game, controls, sound);
  }
  for (const pk of game.pickups) {
    if (pk.taken) {
      pk.respawnT -= dt;
      if (pk.respawnT <= 0) {
        pk.taken = false;
        const spot = game.randomSidewalk();
        pk.x = spot.x;
        pk.y = spot.y;
      }
    }
  }
  updateBullets(game, dt);
  // Slow mend, only once the police have lost you.
  if (game.wanted === 0 && p.health > 0 && p.health < CFG.playerHealth) {
    p.healT += dt;
    if (p.healT > 8) p.health = Math.min(CFG.playerHealth, p.health + 3 * dt);
  }
}
