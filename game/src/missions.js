// The story: five jobs for Milo Reyes, from stealing his first getaway car
// to the Bay Bank job. Each mission is a list of steps — get in a car, drive
// to a marker, lose the cops — with dialogue from his fixer Rook and a
// payout at the end. The next job starts itself once the last one pays out.

import { CFG } from './config.js';

export const MISSIONS = [
  {
    id: 'getaway',
    title: '1. Getaway Wheels',
    reward: 500,
    intro: [
      'Rook: "Milo, the crew needs wheels for tonight. Any car will do."',
      'Rook: "Walk up to one and press E. Try not to get seen."',
    ],
    steps: [
      { type: 'enterCar', text: 'Steal a car — walk up to one and press E' },
      { type: 'driveTo', x: 2250, y: 450, r: 90, text: 'Drive the getaway car to the Marina garage' },
    ],
  },
  {
    id: 'courier',
    title: '2. Courier Run',
    reward: 800,
    intro: [
      'Rook: "Easy money, Milo. Three drops, no questions."',
      'Rook: "First stop is the Palm Suburbs. Keep the car in one piece."',
    ],
    steps: [
      { type: 'driveTo', x: 450, y: 1350, r: 90, text: 'Pick up the package in the Palm Suburbs' },
      { type: 'driveTo', x: 1950, y: 1050, r: 90, text: 'First drop — the Marina docks' },
      { type: 'driveTo', x: 750, y: 450, r: 90, text: 'Final drop — Downtown, by the bank' },
    ],
  },
  {
    id: 'laylow',
    title: '3. Lay Low',
    reward: 600,
    intro: [
      'Rook: "You got loud out there, Milo. Two stars and a patrol on you."',
      'Rook: "Break line of sight and stay gone till the heat dies."',
    ],
    steps: [
      { type: 'loseWanted', text: 'Lose the cops — get your wanted level to zero' },
    ],
    onStart(game) {
      game.heat = 2;
      game.wanted = 2;
    },
  },
  {
    id: 'repo',
    title: '4. Repo Man',
    reward: 1000,
    intro: [
      'Rook: "A gold coupe in the Suburbs. Owner stopped paying."',
      'Rook: "It is yours to take — the bank already signed for it."',
    ],
    steps: [
      { type: 'enterMarked', text: 'Take the gold coupe — that is the repo' },
      { type: 'driveTo', x: 1350, y: 750, r: 90, text: 'Bring the coupe to the Downtown lot' },
    ],
    onStart(game) {
      const repo = {
        id: 777, kind: 'mission', x: 470, y: 750, angle: 0, speed: 0,
        cruise: 0, health: CFG.carHealth, color: '#e9c46a',
        axis: 'h', dir: 1, road: 750, turnT: 0,
      };
      game.repoCar = repo;
      game.cars.push(repo);
    },
  },
  {
    id: 'bayjob',
    title: '5. The Bay Job',
    reward: 5000,
    intro: [
      'Rook: "This is the one, Milo. Bay Bank, Downtown, in and out."',
      'Rook: "Then run for the beach hideout. The whole city will be looking."',
    ],
    steps: [
      { type: 'goto', x: 1140, y: 450, r: 80, text: 'Get to Bay Bank, Downtown' },
      { type: 'escapeTo', x: 1200, y: 1650, r: 100, text: 'Escape to the beach hideout — do not get caught' },
    ],
    onStep(game, stepIndex) {
      if (stepIndex === 1) {
        game.heat = 3;
        game.wanted = 3;
        game.flash('The alarm is up — three stars!');
      }
    },
  },
];

/** Queue lines to be shown one at a time as subtitles. */
export function say(game, lines) {
  game.dialogue.queue.push(...lines);
}

export function startMission(game, index) {
  const def = MISSIONS[index];
  if (!def) return;
  game.mission.idx = index;
  game.mission.step = 0;
  game.mission.active = true;
  if (def.onStart) def.onStart(game);
  say(game, def.intro);
  game.flash(def.title);
}

function stepDone(game, step) {
  const p = game.player;
  if (step.type === 'enterCar') return p.driving !== null;
  if (step.type === 'enterMarked') return p.driving === game.repoCar;
  if (step.type === 'goto' || step.type === 'driveTo' || step.type === 'escapeTo') {
    if (step.type === 'driveTo' && !p.driving) return false;
    return Math.hypot(p.x - step.x, p.y - step.y) < step.r;
  }
  if (step.type === 'loseWanted') return game.wanted === 0;
  return false;
}

/** The marker the objective arrow and the minimap point at, or null. */
export function currentTarget(game) {
  const m = game.mission;
  if (!m.active) return null;
  const step = MISSIONS[m.idx].steps[m.step];
  if (!step) return null;
  if (step.type === 'enterMarked' && game.repoCar) return { x: game.repoCar.x, y: game.repoCar.y };
  if (step.x !== undefined) return { x: step.x, y: step.y };
  return null;
}

export function missionStatus(game) {
  const m = game.mission;
  if (m.complete) return { title: 'Story complete', objective: 'Solmar Bay is yours, Milo. Free roam.', dist: 0 };
  if (!m.active) return { title: 'Free roam', objective: 'Press M for the mission log.', dist: 0 };
  const def = MISSIONS[m.idx];
  const step = def.steps[m.step];
  const target = currentTarget(game);
  const dist = target ? Math.round(Math.hypot(game.player.x - target.x, game.player.y - target.y)) : 0;
  return { title: def.title, objective: step.text, dist };
}

/** Advance the story one frame: finish steps, pay out, chain the next job. */
export function updateMission(game, dt, sound) {
  const m = game.mission;
  if (m.nextT > 0) {
    m.nextT -= dt;
    if (m.nextT <= 0 && m.idx + 1 < MISSIONS.length) startMission(game, m.idx + 1);
    else if (m.nextT <= 0) { m.complete = true; m.active = false; }
  }
  if (!m.active) return;
  const def = MISSIONS[m.idx];
  const step = def.steps[m.step];
  if (!step) return;
  if (stepDone(game, step)) {
    m.step += 1;
    if (m.step >= def.steps.length) {
      game.player.money += def.reward;
      game.stats.missionsDone += 1;
      m.done[m.idx] = true;
      m.active = false;
      game.flash(`Mission complete — +$${def.reward}`);
      sound.mission();
      game.save();
      if (m.idx + 1 < MISSIONS.length) m.nextT = 3;
      else { m.complete = true; }
    } else {
      const next = def.steps[m.step];
      if (def.onStep) def.onStep(game, m.step);
      say(game, [`Objective: ${next.text}`]);
      sound.click();
    }
  }
}

/** Show the next subtitle line once the current one has had its time. */
export function updateDialogue(game, dt) {
  const d = game.dialogue;
  d.t -= dt;
  if (d.t <= 0) {
    d.text = d.queue.length ? d.queue.shift() : '';
    d.t = d.text ? 4 : 0;
  }
}
