import Phaser from 'phaser';
import { MAP } from '../data/balance';
import { BUILDING_TILES, CITY, GROUND_TILES } from '../data/city';
import { CELL, type City, type Rect } from '../systems/City';
import { lit } from '../systems/Lighting';

/** Below everything that stands in the city. */
const DEPTH = -10;

const EMPTY = -1;

/** Picks from a 3x3 set of pieces by where a tile sits in its rectangle: 0, 1 or 2 per axis (start, middle, end). */
const piece = (set: number[], column: number, row: number) => set[row * 3 + column];
const place = (at: number, length: number) => (at === 0 ? 0 : at === length - 1 ? 2 : 1);

/** Draws the city as two tile layers: the ground, and the buildings on top of it. The art sheets are in public/assets/city/. */
export function createCityView(scene: Phaser.Scene, city: City) {
  const { artTileSize: art, tileSize } = CITY;
  const half = MAP.size / 2;
  const map = scene.make.tilemap({ width: city.size, height: city.size, tileWidth: art, tileHeight: art });
  const layer = (name: string, tileset: Phaser.Tilemaps.Tileset, tiles: number[][]) => {
    const l = map.createBlankLayer(name, tileset, -half, -half, city.size, city.size, art, art)!;
    l.putTilesAt(tiles, 0, 0).setScale(tileSize / art).setDepth(DEPTH);
    lit(l);
    return l;
  };
  layer('ground', map.addTilesetImage('city-ground')!, groundTiles(city));
  layer('buildings', map.addTilesetImage('city-building')!, buildingTiles(city));
}

function groundTiles(city: City): number[][] {
  const tiles = Array.from({ length: city.size }, (_, y) =>
    Array.from({ length: city.size }, (_, x) => {
      const cell = city.cells[y * city.size + x];
      if (cell === CELL.alley) return GROUND_TILES.alley;
      return cell === CELL.plaza ? GROUND_TILES.plaza : GROUND_TILES.road;
    }),
  );
  markRoads(city, tiles);
  // Every block has a kerb, plazas included. A wider sidewalk only needs the extra rows filled in.
  for (const b of city.blocks) {
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const edge = x < CITY.sidewalk || y < CITY.sidewalk || x >= b.w - CITY.sidewalk || y >= b.h - CITY.sidewalk;
        if (edge) tiles[b.y + y][b.x + x] = piece(GROUND_TILES.sidewalk, place(x, b.w), place(y, b.h));
      }
    }
  }
  return tiles;
}

/**
 * Lane dashes down the middle of every road, and a crosswalk across it where it meets a junction.
 * A road tile belongs to a horizontal road when the road is narrow across it (up and down) and long along it.
 * Where both directions run long, two roads cross: the junction itself stays plain.
 */
function markRoads(city: City, tiles: number[][]) {
  const n = city.size;
  const road = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && city.cells[y * n + x] === CELL.road;
  // Length of the road run through every tile, and where in that run the tile sits, per direction.
  const runH = new Int16Array(n * n);
  const atH = new Int16Array(n * n);
  const runV = new Int16Array(n * n);
  const atV = new Int16Array(n * n);
  const measure = (index: (along: number, across: number) => number, run: Int16Array, at: Int16Array) => {
    for (let across = 0; across < n; across++) {
      let start = 0;
      for (let along = 0; along <= n; along++) {
        const i = along < n ? index(along, across) : -1;
        if (i >= 0 && city.cells[i] === CELL.road) continue;
        for (let k = start; k < along; k++) {
          run[index(k, across)] = along - start;
          at[index(k, across)] = k - start;
        }
        start = along + 1;
      }
    }
  };
  measure((x, y) => y * n + x, runH, atH);
  measure((y, x) => y * n + x, runV, atV);
  const widest = Math.max(CITY.avenueWidth, CITY.streetWidth);
  const horizontal = (x: number, y: number) => road(x, y) && runV[y * n + x] <= widest && runH[y * n + x] > widest;
  const vertical = (x: number, y: number) => road(x, y) && runH[y * n + x] <= widest && runV[y * n + x] > widest;
  const junction = (x: number, y: number) => road(x, y) && runH[y * n + x] > widest && runV[y * n + x] > widest;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (horizontal(x, y)) {
        if (junction(x - 1, y) || junction(x + 1, y)) tiles[y][x] = GROUND_TILES.crosswalkV;
        else if (atV[i] === Math.floor(runV[i] / 2)) tiles[y][x] = GROUND_TILES.laneH;
      } else if (vertical(x, y)) {
        if (junction(x, y - 1) || junction(x, y + 1)) tiles[y][x] = GROUND_TILES.crosswalkH;
        else if (atH[i] === Math.floor(runH[i] / 2)) tiles[y][x] = GROUND_TILES.laneV;
      }
    }
  }
}

function buildingTiles(city: City): number[][] {
  const tiles = Array.from({ length: city.size }, () => Array<number>(city.size).fill(EMPTY));
  for (const b of city.blocks) for (const building of b.buildings) drawBuilding(tiles, building, city.random);
  return tiles;
}

/** Roof on top, then the south front: its top row, window rows, and the street level at the bottom. */
function drawBuilding(tiles: number[][], r: Rect, random: () => number) {
  const roofRows = r.h - CITY.frontRows;
  const pick = (list: number[]) => list[Math.floor(random() * list.length)];
  // A roof holds at most one antenna and one skylight; vents and AC units can repeat.
  let antenna = false;
  let skylight = false;
  const roofDetail = () => {
    const options = [...BUILDING_TILES.roofDetails];
    if (!antenna) options.push(BUILDING_TILES.roofAntenna);
    if (!skylight) options.push(BUILDING_TILES.roofSkylight);
    const tile = pick(options);
    if (tile === BUILDING_TILES.roofAntenna) antenna = true;
    if (tile === BUILDING_TILES.roofSkylight) skylight = true;
    return tile;
  };
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const column = place(x, r.w);
      let tile: number;
      if (y < roofRows) {
        const row = place(y, roofRows);
        const centre = column === 1 && row === 1;
        tile = centre && random() < CITY.roofDetailChance ? roofDetail() : piece(BUILDING_TILES.roof, column, row);
      } else {
        const row = place(y - roofRows, CITY.frontRows);
        const street = column === 1 && row === 2;
        tile = street && random() < CITY.frontVariantChance ? pick(BUILDING_TILES.frontVariants) : piece(BUILDING_TILES.front, column, row);
      }
      tiles[r.y + y][r.x + x] = tile;
    }
  }
}
