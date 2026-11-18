// The wanted level and the police who answer it. Crimes add heat; stars are
// the heat rounded down. While a police car can see Milo the heat holds;
// once he is out of sight long enough it cools, a star at a time, until the
// patrol gives up and drives away.

import { CFG, PALETTE } from './config.js';
import { randomRoadPoint } from './world.js';

function makePoliceCar(game, spot) {
  return {
    id: 9000 + Math.floor(game.rng.next() * 900),
    kind: 'police',
    x: spot.x, y: spot.y, angle: 0, speed: 0,
    cruise: CFG.policeSpeed, health: CFG.carHealth,
    color: PALETTE.police, axis: 'h', dir: 1, road: spot.y,
    ramT: 0, leaveT: 0,
  };
}

function chasePlayer(game, car, dt) {
  const p = game.player;
  const want = Math.atan2(p.y - car.y, p.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  car.angle += turn;
  car.speed = Math.min(CFG.policeSpeed, car.speed + 380 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(20, Math.min(CFG.worldW - 20, car.x));
  car.y = Math.max(20, Math.min(CFG.worldH - 20, car.y));
  car.ramT = Math.max(0, car.ramT - dt);
  const d = Math.hypot(p.x - car.x, p.y - car.y);
  if (d < 52 && car.ramT === 0) {
    car.ramT = CFG.policeRamCooldown;
    car.speed *= 0.4;
    if (p.driving) {
      p.driving.health = Math.max(0, p.driving.health - 6);
      p.x = car.x + Math.cos(car.angle) * 60;
      p.y = car.y + Math.sin(car.angle) * 60;
      p.driving.x = p.x;
      p.driving.y = p.y;
    } else {
      game.damagePlayer(CFG.policeRamDamage);
    }
    game.shake(6);
  }
}

/** One frame of the heat: decay when unseen, patrols spawning and chasing. */
export function updatePolice(game, dt) {
  const police = game.cars.filter((c) => c.kind === 'police');
  const seen = police.some((c) => Math.hypot(c.x - game.player.x, c.y - game.player.y) < 600);

  if (game.wanted > 0) {
    if (seen) {
      game.unseenT = 0;
      game.decayT = 0;
    } else {
      game.unseenT += dt;
      if (game.unseenT > CFG.wantedDecaySight) {
        game.decayT += dt;
        if (game.decayT >= CFG.wantedDecayStep) {
          game.decayT = 0;
          game.heat = Math.max(0, game.heat - 1);
          game.wanted = Math.min(CFG.maxWanted, Math.floor(game.heat + 0.001));
          if (game.wanted === 0) game.flash('You lost them — the heat is off');
        }
      }
    }
  }

  // Patrols arrive until their number matches the stars, and leave when it is zero.
  const want = Math.min(CFG.policeMax, game.wanted);
  game.spawnT = (game.spawnT || 0) - dt;
  if (police.length < want && game.spawnT <= 0) {
    game.spawnT = 1.4;
    let spot = randomRoadPoint(game.rng);
    let tries = 0;
    while (Math.hypot(spot.x - game.player.x, spot.y - game.player.y) < 520 && tries < 12) {
      spot = randomRoadPoint(game.rng);
      tries += 1;
    }
    game.cars.push(makePoliceCar(game, spot));
  }
  for (const car of game.cars) {
    if (car.kind !== 'police') continue;
    if (game.wanted === 0) {
      car.leaveT += dt;
      car.speed = Math.max(0, car.speed - 200 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
    } else {
      chasePlayer(game, car, dt);
    }
  }
  if (game.wanted === 0) {
    game.cars = game.cars.filter((c) => !(c.kind === 'police' && c.leaveT > 4));
  }
}
