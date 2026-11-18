// The city itself: a seeded grid of roads, four districts, buildings, parks
// and water, plus the geometry helpers the rest of the game asks about —
// what road is here, where the nearest road is, and whether a circle is
// inside a building. Nothing here draws or listens; it only describes.

import { CFG, DISTRICTS, PALETTE } from './config.js';

export function roadLines() {
  const verticals = [];
  const horizontals = [];
  for (let x = 150; x <= CFG.worldW - 150; x += CFG.roadGap) verticals.push(x);
  for (let y = 150; y <= CFG.worldH - 150; y += CFG.roadGap) horizontals.push(y);
  return { verticals, horizontals };
}

export function districtAt(x, y) {
  for (const key of Object.keys(DISTRICTS)) {
    const d = DISTRICTS[key];
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return key;
  }
  return 'suburbs';
}

export function isOnRoad(x, y) {
  const half = CFG.roadW / 2;
  const { verticals, horizontals } = roadLines();
  for (const vx of verticals) if (Math.abs(x - vx) <= half) return true;
  for (const hy of horizontals) if (Math.abs(y - hy) <= half) return true;
  return false;
}

/** The closest point on any road centre line to (x, y). */
export function nearestRoadPoint(x, y) {
  const { verticals, horizontals } = roadLines();
  let best = null;
  let bestD = Infinity;
  for (const vx of verticals) {
    const d = Math.abs(x - vx);
    if (d < bestD) { bestD = d; best = { x: vx, y }; }
  }
  for (const hy of horizontals) {
    const d = Math.abs(y - hy);
    if (d < bestD) { bestD = d; best = { x, y: hy }; }
  }
  return best;
}

function blockBounds(col, row, lines) {
  const x0 = col === 0 ? 0 : lines.verticals[col - 1] + CFG.roadW / 2;
  const x1 = col >= lines.verticals.length ? CFG.worldW : lines.verticals[col] - CFG.roadW / 2;
  const y0 = row === 0 ? 0 : lines.horizontals[row - 1] + CFG.roadW / 2;
  const y1 = row >= lines.horizontals.length ? CFG.worldH : lines.horizontals[row] - CFG.roadW / 2;
  return { x0, y0, x1, y1 };
}

/** Build Solmar Bay from the seed: roads, districts, buildings, parks, water. */
export function buildCity(rng) {
  const lines = roadLines();
  const buildings = [];
  const parks = [];
  const piers = [];
  const labels = [
    { x: 1200, y: 750, text: 'DOWNTOWN' },
    { x: 2250, y: 600, text: 'MARINA' },
    { x: 1200, y: 1700, text: 'SOLMAR BEACH' },
    { x: 400, y: 1050, text: 'PALM SUBURBS' },
  ];

  const cols = lines.verticals.length + 1;
  const rows = lines.horizontals.length + 1;
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const b = blockBounds(col, row, lines);
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      if (w < 60 || h < 60) continue;
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      const district = districtAt(cx, cy);
      // The south strip is beach and the east strip is the marina: no buildings there.
      if (cy > 1660 || cx > 2280) continue;
      if (rng.chance(0.14)) {
        const trees = [];
        const count = rng.int(3, 7);
        for (let t = 0; t < count; t += 1) {
          trees.push({ x: rng.range(b.x0 + 20, b.x1 - 20), y: rng.range(b.y0 + 20, b.y1 - 20), r: rng.range(9, 16) });
        }
        parks.push({ x: b.x0, y: b.y0, w, h, trees });
        continue;
      }
      if (district === 'downtown') {
        const bw = rng.range(w * 0.5, w * 0.8);
        const bh = rng.range(h * 0.5, h * 0.8);
        buildings.push({
          x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh,
          color: rng.pick(PALETTE.building), roof: rng.pick(PALETTE.downtownRoof),
          district, tall: true,
        });
      } else if (district === 'marina') {
        buildings.push({
          x: b.x0 + 14, y: b.y0 + 14, w: w - 28, h: h - 28,
          color: '#8d99ae', roof: '#5c5c6e', district, tall: false,
        });
      } else {
        // Suburbs: two or three small houses with coloured roofs.
        const houses = rng.int(2, 3);
        for (let n = 0; n < houses; n += 1) {
          const hw = rng.range(52, 84);
          const hh = rng.range(52, 84);
          const hx = rng.range(b.x0 + 12, b.x1 - 12 - hw);
          const hy = rng.range(b.y0 + 12, b.y1 - 12 - hh);
          buildings.push({
            x: hx, y: hy, w: hw, h: hh,
            color: rng.pick(PALETTE.building), roof: rng.pick(PALETTE.houseRoof),
            district, tall: false,
          });
        }
      }
    }
  }

  // Marina piers reach into the water on the east edge.
  for (const py of [300, 600, 900]) {
    piers.push({ x: 2282, y: py - 14, w: 86, h: 28 });
  }

  return { lines, buildings, parks, piers, labels, waterEast: 2300, waterSouth: 1740, sandSouth: 1682 };
}

/** Push a circle out of every building it overlaps; returns the corrected point. */
export function resolveBuildings(city, x, y, r) {
  let px = x;
  let py = y;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) {
      // Centre inside the rectangle: push out along the shortest side.
      const left = px - b.x;
      const right = b.x + b.w - px;
      const top = py - b.y;
      const bottom = b.y + b.h - py;
      const m = Math.min(left, right, top, bottom);
      if (m === left) px = b.x - r;
      else if (m === right) px = b.x + b.w + r;
      else if (m === top) py = b.y - r;
      else py = b.y + b.h + r;
    } else {
      const d = Math.sqrt(d2);
      px = cx + (dx / d) * r;
      py = cy + (dy / d) * r;
    }
  }
  return { x: px, y: py };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** A random point on a road, for spawning traffic and police. */
export function randomRoadPoint(rng) {
  const { verticals, horizontals } = roadLines();
  if (rng.chance(0.5)) {
    return { x: rng.pick(verticals), y: rng.range(80, CFG.worldH - 80) };
  }
  return { x: rng.range(80, CFG.worldW - 80), y: rng.pick(horizontals) };
}

/** A random point on a sidewalk, just off a road, for pedestrians and pickups. */
export function randomSidewalkPoint(rng) {
  const p = randomRoadPoint(rng);
  const off = CFG.roadW / 2 + 14;
  if (rng.chance(0.5)) p.x += rng.chance(0.5) ? off : -off;
  else p.y += rng.chance(0.5) ? off : -off;
  return { x: Math.max(20, Math.min(CFG.worldW - 20, p.x)), y: Math.max(20, Math.min(CFG.worldH - 20, p.y)) };
}
