import Phaser from 'phaser';
import { MAP } from '../data/balance';
import { BUILDING_TILES, CITY, GROUND_TILES } from '../data/city';
import { CELL, type City, type Rect } from '../systems/City';

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

function buildingTiles(city: City): number[][] {
  const tiles = Array.from({ length: city.size }, () => Array<number>(city.size).fill(EMPTY));
  for (const b of city.blocks) for (const building of b.buildings) drawBuilding(tiles, building, city.random);
  return tiles;
}

/** Roof on top, then the south front: its top row, window rows, and the street level at the bottom. */
function drawBuilding(tiles: number[][], r: Rect, random: () => number) {
  const roofRows = r.h - CITY.frontRows;
  const pick = (list: number[]) => list[Math.floor(random() * list.length)];
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const column = place(x, r.w);
      let tile: number;
      if (y < roofRows) {
        const row = place(y, roofRows);
        const centre = column === 1 && row === 1;
        tile = centre && random() < CITY.roofDetailChance ? pick(BUILDING_TILES.roofDetails) : piece(BUILDING_TILES.roof, column, row);
      } else {
        const row = place(y - roofRows, CITY.frontRows);
        const street = column === 1 && row === 2;
        tile = street && random() < CITY.frontVariantChance ? pick(BUILDING_TILES.frontVariants) : piece(BUILDING_TILES.front, column, row);
      }
      tiles[r.y + y][r.x + x] = tile;
    }
  }
}
