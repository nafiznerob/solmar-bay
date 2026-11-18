// The screenshot scenes behind ?shot=start|street|chase|mission. Each one
// resets the game to a known state and then stages one exact moment — the
// start screen, Milo on foot in Downtown, a police chase at two stars, a
// courier run with its marker in view — so the same seed always gives the
// same frame, and the frame is the real game, not a mock-up.

import { startMission } from './missions.js';

function placeNear(game, list, spots) {
  for (let i = 0; i < Math.min(list.length, spots.length); i += 1) {
    list[i].x = spots[i].x;
    list[i].y = spots[i].y;
    if (spots[i].angle !== undefined) list[i].angle = spots[i].angle;
    if (spots[i].speed !== undefined) list[i].speed = spots[i].speed;
  }
}

function givePlayerCar(game, x, y, angle, speed) {
  const car = {
    id: 500, kind: 'traffic', x, y, angle, speed,
    cruise: speed, health: 100, color: '#e63946',
    axis: 'h', dir: 1, road: y, turnT: 0,
  };
  game.cars.push(car);
  game.player.driving = car;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  return car;
}

function addPolice(game, x, y, angle) {
  game.cars.push({
    id: 9000 + game.cars.length, kind: 'police', x, y, angle, speed: 400,
    cruise: 435, health: 100, color: '#1d3557',
    axis: 'h', dir: 1, road: y, ramT: 0, leaveT: 0,
  });
}

/**
 * Set the game to the named scene. Returns the screen the DOM should show
 * over it: 'start' for the title, 'playing' for the rest.
 */
export function stageShot(name, game) {
  game.reset();
  if (name === 'start') {
    game.state = 'start';
    return 'start';
  }
  game.state = 'playing';
  if (name === 'chase') {
    startMission(game, 0);
    givePlayerCar(game, 1050, 750, 0, 380);
    game.heat = 2;
    game.wanted = 2;
    addPolice(game, 880, 750, 0);
    addPolice(game, 920, 818, 0);
    placeNear(game, game.cars.filter((c) => c.kind === 'traffic'), [
      { x: 1350, y: 750, angle: Math.PI, speed: 120 },
      { x: 750, y: 450, angle: Math.PI / 2, speed: 100 },
    ]);
    return 'playing';
  }
  if (name === 'mission') {
    startMission(game, 1);
    givePlayerCar(game, 450, 1150, Math.PI / 2, 220);
    placeNear(game, game.peds, [
      { x: 420, y: 1200 }, { x: 480, y: 1250 }, { x: 430, y: 1300 },
    ]);
    return 'playing';
  }
  // 'street' and anything else: Milo on foot in Downtown, mission one open.
  startMission(game, 0);
  placeNear(game, game.cars.filter((c) => c.kind === 'traffic'), [
    { x: 1050, y: 560, angle: Math.PI / 2, speed: 110 },
    { x: 880, y: 750, angle: 0, speed: 95 },
    { x: 1200, y: 1050, angle: Math.PI, speed: 120 },
  ]);
  placeNear(game, game.peds, [
    { x: 1010, y: 700 }, { x: 1090, y: 790 }, { x: 990, y: 820 }, { x: 1130, y: 710 },
  ]);
  return 'playing';
}
