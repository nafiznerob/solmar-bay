// The city alive around Milo: traffic cars that keep to their lanes and
// turn at intersections, and pedestrians who walk the sidewalks and run
// when a car comes at them too fast or a shot goes off.

import { CFG, CAR_COLORS, PED_COLORS } from './config.js';
import { randomRoadPoint, randomSidewalkPoint, roadLines } from './world.js';

let carId = 1;

function laneOffset(axis, dir) {
  // Right-hand traffic: the lane sits on the right of the direction of travel.
  if (axis === 'h') return dir > 0 ? 15 : -15;
  return dir > 0 ? -15 : 15;
}

export function makeTrafficCar(rng, point) {
  const { verticals, horizontals } = roadLines();
  const onVertical = Math.abs(point.x - verticals[0]) < 1 || verticals.some((v) => Math.abs(point.x - v) < 1);
  const axis = onVertical ? 'v' : 'h';
  const dir = rng.chance(0.5) ? 1 : -1;
  const road = axis === 'v' ? point.x : point.y;
  return {
    id: carId += 1, kind: 'traffic',
    x: axis === 'v' ? road + laneOffset(axis, dir) : point.x,
    y: axis === 'h' ? road + laneOffset(axis, dir) : point.y,
    angle: axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
    speed: rng.range(CFG.trafficSpeedMin, CFG.trafficSpeedMax),
    cruise: 0, health: CFG.carHealth,
    color: rng.pick(CAR_COLORS), axis, dir, road,
  };
}

export function spawnTraffic(game) {
  const rng = game.rng;
  game.cars = [];
  for (let i = 0; i < CFG.trafficCars; i += 1) {
    const car = makeTrafficCar(rng, randomRoadPoint(rng));
    car.cruise = car.speed;
    game.cars.push(car);
  }
  game.peds = [];
  for (let i = 0; i < CFG.pedestrians; i += 1) {
    const spot = randomSidewalkPoint(rng);
    const target = randomSidewalkPoint(rng);
    game.peds.push({
      x: spot.x, y: spot.y, tx: target.x, ty: target.y,
      speed: rng.range(38, 62), color: rng.pick(PED_COLORS),
      state: 'walk', t: 0,
    });
  }
  game.pickups = [];
  const kinds = ['cash', 'health', 'ammo'];
  for (let i = 0; i < CFG.pickups; i += 1) {
    const spot = randomSidewalkPoint(rng);
    game.pickups.push({ x: spot.x, y: spot.y, kind: kinds[i % kinds.length], taken: false, respawnT: 0 });
  }
}

function turnAtIntersection(game, car) {
  if (car.turnT > 0) return;
  const { verticals, horizontals } = roadLines();
  const rng = game.rng;
  if (car.axis === 'h') {
    for (const vx of verticals) {
      if (Math.abs(car.x - vx) < 18 && Math.abs(car.y - car.road) < 20 && rng.chance(0.35)) {
        car.axis = 'v';
        car.dir = rng.chance(0.5) ? 1 : -1;
        car.road = vx;
        car.x = vx + laneOffset('v', car.dir);
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.turnT = 1.4;
        return;
      }
    }
  } else {
    for (const hy of horizontals) {
      if (Math.abs(car.y - hy) < 18 && Math.abs(car.x - car.road) < 20 && rng.chance(0.35)) {
        car.axis = 'h';
        car.dir = rng.chance(0.5) ? 1 : -1;
        car.road = hy;
        car.y = hy + laneOffset('h', car.dir);
        car.angle = car.dir > 0 ? 0 : Math.PI;
        car.turnT = 1.4;
        return;
      }
    }
  }
}

function carAhead(game, car) {
  let nearest = null;
  let nearestD = 70;
  for (const other of game.cars) {
    if (other === car || other.axis !== car.axis || other.road !== car.road || other.dir !== car.dir) continue;
    const along = car.axis === 'h' ? (other.x - car.x) * car.dir : (other.y - car.y) * car.dir;
    if (along > 0 && along < nearestD) { nearestD = along; nearest = other; }
  }
  return nearest;
}

function updateTrafficCar(game, car, dt) {
  car.turnT = Math.max(0, (car.turnT || 0) - dt);
  const ahead = carAhead(game, car);
  const target = ahead ? Math.max(0, ahead.speed - 20) : car.cruise;
  car.speed += Math.max(-220 * dt, Math.min(160 * dt, target - car.speed));
  if (car.axis === 'h') car.x += car.dir * car.speed * dt;
  else car.y += car.dir * car.speed * dt;
  // Wrap around the map edges so the streets never run dry.
  if (car.x < -60) car.x = CFG.worldW + 40;
  if (car.x > CFG.worldW + 60) car.x = -40;
  if (car.y < -60) car.y = CFG.worldH + 40;
  if (car.y > CFG.worldH + 60) car.y = -40;
  turnAtIntersection(game, car);
}

function updatePed(game, ped, dt) {
  if (ped.state === 'down') {
    ped.t -= dt;
    if (ped.t <= 0) { ped.state = 'flee'; ped.t = 2.5; }
    return;
  }
  const player = game.player;
  const pd = Math.hypot(ped.x - player.x, ped.y - player.y);
  const playerCar = player.driving;
  const threat = (playerCar && pd < 110 && Math.abs(playerCar.speed) > 120) || (game.shotsFiredT > 0 && pd < 320);
  if (threat && ped.state !== 'flee') { ped.state = 'flee'; ped.t = 2.5; }
  if (ped.state === 'flee') {
    ped.t -= dt;
    const away = Math.atan2(ped.y - player.y, ped.x - player.x);
    ped.x += Math.cos(away) * 150 * dt;
    ped.y += Math.sin(away) * 150 * dt;
    if (ped.t <= 0) ped.state = 'walk';
  } else {
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      const next = randomSidewalkPoint(game.rng);
      ped.tx = next.x;
      ped.ty = next.y;
    } else {
      ped.x += (dx / d) * ped.speed * dt;
      ped.y += (dy / d) * ped.speed * dt;
    }
  }
  ped.x = Math.max(16, Math.min(CFG.worldW - 16, ped.x));
  ped.y = Math.max(16, Math.min(CFG.worldH - 16, ped.y));
}

/** One frame of the city's own movement. The car Milo is driving answers to
 *  him, not to the traffic rules, so it is left out of this update. */
export function updateTraffic(game, dt) {
  for (const car of game.cars) {
    if (car.kind === 'traffic' && car !== game.player.driving) updateTrafficCar(game, car, dt);
  }
  game.cars = game.cars.filter((c) => c.health > 0 || c.kind === 'police' || c === game.player.driving || c.kind === 'mission');
  for (const ped of game.peds) updatePed(game, ped, dt);
}
