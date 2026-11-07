import { CITY } from '../data/city';
import { CONNECT_SERVERS } from '../data/objectives';
import { CELL, tileToWorld, type City, type Point, type Rect } from './City';

export const tileCentre = (x: number, y: number): Point => ({ x: tileToWorld(x + 0.5), y: tileToWorld(y + 0.5) });

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** The middle of every plaza except the one at the start. */
export function plazaSpots(city: City): Point[] {
  const plazas = city.blocks.filter((b) => b.plaza).map((b) => ({ x: tileToWorld(b.x + b.w / 2), y: tileToWorld(b.y + b.h / 2) }));
  return plazas.filter((p) => distance(p, city.start) > 0);
}

/** The middle of every tile of the given kinds. A factory's front sidewalk is left out: its core and door are there. */
export function tileSpots(city: City, cells: number[]): Point[] {
  const factoryFront = new Set<number>();
  for (const b of city.blocks) {
    if (!b.factory) continue;
    const y = b.y + b.h - 1;
    for (let x = b.x; x < b.x + b.w; x++) factoryFront.add(y * city.size + x);
  }
  const spots: Point[] = [];
  city.cells.forEach((cell, i) => {
    if (cells.includes(cell) && !factoryFront.has(i)) spots.push(tileCentre(i % city.size, Math.floor(i / city.size)));
  });
  return spots;
}

/** The sidewalk tiles along a building's south front. A front on an alley is left out: an alley is no place for a server. */
function frontRow(city: City, r: Rect): Point[] {
  const y = r.y + r.h;
  if (city.cells[y * city.size + r.x] !== CELL.sidewalk) return [];
  return Array.from({ length: r.w }, (_, i) => tileCentre(r.x + i, y));
}

/** Fronts of ordinary buildings. A factory's front is its own: its door is a spawn point, so no servers there. */
const frontRows = (city: City) =>
  city.blocks
    .filter((b) => !b.factory)
    .flatMap((b) => b.buildings)
    .map((r) => frontRow(city, r));

/** Every spot where a server stands against a building. */
export function serverSpots(city: City): Point[] {
  return frontRows(city).flat();
}

/** Every pair of spots for Connect servers: along one front, so a straight cable between them never crosses a building. */
export function serverPairs(city: City): (Point & { partner: Point })[] {
  const min = Math.ceil(CONNECT_SERVERS.gap.min / CITY.tileSize);
  const max = Math.floor(CONNECT_SERVERS.gap.max / CITY.tileSize);
  return frontRows(city).flatMap((row) =>
    row.flatMap((spot, i) => row.slice(i + min, i + max + 1).map((partner) => ({ ...spot, partner }))),
  );
}

/** A random spot at least `minGap` from everything in `avoid`. If none is that far off, the roomiest one. */
export function pickApart<T extends Point>(spots: T[], avoid: Point[], minGap: number, city: City): T {
  let best = spots[0];
  let bestGap = -1;
  for (const spot of city.shuffled(spots)) {
    const gap = Math.min(...avoid.map((p) => distance(spot, p)));
    if (gap >= minGap) return spot;
    if (gap > bestGap) {
      best = spot;
      bestGap = gap;
    }
  }
  return best;
}
