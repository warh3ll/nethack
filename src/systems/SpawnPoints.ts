import { CITY } from '../data/city';
import { CELL, type City, type Point } from './City';
import { distance, tileCentre } from './CitySpots';

/** A place where swarm enemies come out. */
export interface SpawnPoint extends Point {
  kind: 'factory' | 'exit';
  /** The tile in the building front that flashes (the door or hatch). Enemies step out onto the sidewalk below it, at (x, y). */
  door: Point;
}

/**
 * Picks the spawn points of one run: the door of every factory, and small exits set into the street level of
 * ordinary building fronts. Exits keep apart from each other and clear of the objectives and caches in `avoid`.
 */
export function pickSpawnPoints(city: City, avoid: Point[]): SpawnPoint[] {
  const points: SpawnPoint[] = [];
  const out = (x: number, y: number, kind: SpawnPoint['kind']) => points.push({ kind, ...tileCentre(x, y + 1), door: tileCentre(x, y) });

  for (const b of city.blocks) {
    if (!b.factory) continue;
    const r = b.buildings[0];
    out(r.x + Math.floor(r.w / 2), r.y + r.h - 1, 'factory');
  }

  // Every street-level tile of an ordinary front that faces a sidewalk (not an alley), corners left out.
  const candidates: [number, number][] = [];
  for (const b of city.blocks) {
    if (b.factory) continue;
    for (const r of b.buildings) {
      const y = r.y + r.h - 1;
      if (city.cells[(y + 1) * city.size + r.x] !== CELL.sidewalk) continue;
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) candidates.push([x, y]);
    }
  }
  const exits: Point[] = [];
  for (const [x, y] of city.shuffled(candidates)) {
    if (exits.length >= CITY.exits) break;
    const spot = tileCentre(x, y + 1);
    if (avoid.some((p) => distance(p, spot) < CITY.exitClearance)) continue;
    if (exits.some((p) => distance(p, spot) < CITY.exitSpacing)) continue;
    exits.push(spot);
    out(x, y, 'exit');
  }
  return points;
}
