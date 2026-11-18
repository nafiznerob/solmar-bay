// Solmar Bay — every tuning number and colour in one place, so the modules
// that move, chase and shoot can stay about behaviour, not magic numbers.

export const CFG = {
  // One open map, 2400 by 1800 units, with a road every 300 units.
  worldW: 2400,
  worldH: 1800,
  roadGap: 300,
  roadW: 64,
  seed: 1,

  // Milo on foot.
  walkSpeed: 200,
  playerRadius: 14,
  playerHealth: 100,
  punchRange: 56,
  punchDamage: 35,
  punchCooldown: 0.45,
  pistolDamage: 34,
  pistolRange: 620,
  bulletSpeed: 900,
  shootCooldown: 0.22,
  startAmmo: 24,
  startMoney: 150,

  // Driving.
  carAccel: 430,
  carBrake: 720,
  carReverse: 230,
  carMaxSpeed: 470,
  carMaxReverse: 170,
  carTurn: 2.7,
  carGrip: 6.5,
  carHealth: 100,
  carLength: 46,
  carWidth: 22,
  stealRadius: 74,

  // The city alive around the player.
  trafficCars: 14,
  pedestrians: 26,
  trafficSpeedMin: 85,
  trafficSpeedMax: 150,

  // Wanted level and the police who answer it.
  maxWanted: 5,
  policeMax: 4,
  policeSpeed: 435,
  policeRamDamage: 8,
  policeRamCooldown: 0.9,
  wantedDecaySight: 8,
  wantedDecayStep: 6,

  // The clock: one in-game minute every two real seconds, from 08:00.
  clockStartMin: 8 * 60,
  clockMinPerSec: 0.5,

  // Camera and the view it fills.
  viewW: 1280,
  viewH: 720,
  camZoom: 0.95,

  // Pickups scattered on the sidewalks.
  pickups: 10,

  // Save slot in this browser only.
  saveKey: 'solmar-bay.save.v1',
};

export const DISTRICTS = {
  downtown: { name: 'Downtown', x0: 700, y0: 400, x1: 1700, y1: 1100 },
  marina: { name: 'Marina', x0: 1950, y0: 100, x1: 2400, y1: 900 },
  beach: { name: 'Solmar Beach', x0: 100, y0: 1500, x1: 2400, y1: 1800 },
  suburbs: { name: 'Palm Suburbs', x0: 100, y0: 100, x1: 700, y1: 1500 },
};

export const PALETTE = {
  grass: '#79a95e',
  grassDark: '#679a52',
  sand: '#e8d29a',
  water: '#2e86ab',
  waterDeep: '#1f6a8c',
  road: '#3d3d46',
  roadLine: '#e8d44d',
  sidewalk: '#9a9aa2',
  park: '#5da24a',
  building: ['#b08968', '#8d99ae', '#c08552', '#7d8597', '#a98467', '#6c757d'],
  downtownRoof: ['#4a4e69', '#6d6875', '#3a3f5c', '#5c5c6e'],
  houseRoof: ['#c1666b', '#e07a5f', '#81b29a', '#f2cc8f'],
  player: '#e63946',
  police: '#1d3557',
};

export const CAR_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a',
  '#9b5de5', '#ef476f', '#06d6a0', '#f3722c', '#577590',
];

export const PED_COLORS = [
  '#f4a261', '#e76f51', '#2a9d8f', '#e9c46a', '#9b5de5',
  '#06d6a0', '#f3722c', '#577590', '#ef476f', '#8d99ae',
];
