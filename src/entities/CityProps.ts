import Phaser from 'phaser';
import { MAP } from '../data/balance';
import { CITY, PROP_TILES } from '../data/city';
import { CELL, type City, type Point } from '../systems/City';
import { distance, tileCentre } from '../systems/CitySpots';

/** Above the ground, the buildings and the factories; below the spawn doors and everything standing in the street. */
const DEPTH = -8;

/**
 * Street furniture: lamps at regular steps along every block's sidewalk, and the odd bin, bench or hydrant.
 * Only for looks, so nothing collides with them. They keep clear of everything in `avoid` (objectives, caches,
 * spawn points...) so those stay easy to read. Drawn as one more tile layer, from public/assets/city/props.png.
 * Uses the city's random stream after everything else on the map has been placed, so a seed replays the props too.
 */
export function createCityProps(scene: Phaser.Scene, city: City, avoid: Point[]) {
  const n = city.size;
  const tiles = Array.from({ length: n }, () => Array<number>(n).fill(-1));
  const pick = (list: number[]) => list[Math.floor(city.random() * list.length)];
  const clear = (x: number, y: number) => {
    const spot = tileCentre(x, y);
    return avoid.every((p) => distance(p, spot) >= CITY.propClearance);
  };
  // A factory's front sidewalk holds its core and door: no props there.
  const factoryFront = (x: number, y: number) => city.blocks.some((b) => b.factory && y === b.y + b.h - 1 && x >= b.x && x < b.x + b.w);

  for (const b of city.blocks) {
    // Walk the sidewalk ring (a plaza's kerb too), corners left out, and put a lamp every `lampSpacing` tiles.
    const ring: [number, number][] = [];
    for (let x = b.x + 1; x < b.x + b.w - 1; x++) ring.push([x, b.y], [x, b.y + b.h - 1]);
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) ring.push([b.x, y], [b.x + b.w - 1, y]);
    for (const [x, y] of ring) {
      const along = y === b.y || y === b.y + b.h - 1 ? x - b.x : y - b.y;
      if (along % CITY.lampSpacing !== Math.floor(CITY.lampSpacing / 2)) continue;
      const cell = city.cells[y * n + x];
      if ((cell === CELL.sidewalk || cell === CELL.plaza) && !factoryFront(x, y) && clear(x, y)) tiles[y][x] = PROP_TILES.lamp;
    }
  }

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const cell = city.cells[y * n + x];
      if ((cell !== CELL.sidewalk && cell !== CELL.plaza) || tiles[y][x] !== -1) continue;
      if (city.random() >= CITY.propChance || factoryFront(x, y) || !clear(x, y)) continue;
      tiles[y][x] = pick(cell === CELL.plaza ? PROP_TILES.plaza : PROP_TILES.sidewalk);
    }
  }

  const art = CITY.artTileSize;
  const map = scene.make.tilemap({ width: n, height: n, tileWidth: art, tileHeight: art });
  const layer = map.createBlankLayer('props', map.addTilesetImage('city-props')!, -MAP.size / 2, -MAP.size / 2, n, n, art, art)!;
  layer.putTilesAt(tiles, 0, 0).setScale(CITY.tileSize / art).setDepth(DEPTH);
}
