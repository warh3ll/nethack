import { MAP } from '../data/balance';
import { CITY } from '../data/city';

/** What a tile of the city is. */
export const CELL = { road: 0, sidewalk: 1, alley: 2, plaza: 3, building: 4 } as const;

/** A rectangle in tiles. Tile (0, 0) is the top left corner of the map. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Block extends Rect {
  plaza: boolean;
  /** Empty for a plaza; two for a block cut by an alley. */
  buildings: Rect[];
}

export interface City {
  seed: number;
  /** Tiles along one side of the map. */
  size: number;
  /** One CELL per tile, row by row. */
  cells: Uint8Array;
  blocks: Block[];
  /** Same random stream as the layout, so the look of a map is part of its seed too. */
  random: () => number;
}

/** A seed for a new run: `?seed=123` in the URL replays a map, otherwise a random one. */
export function pickSeed(): number {
  const fromUrl = Number.parseInt(new URLSearchParams(window.location.search).get('seed') ?? '', 10);
  return Number.isNaN(fromUrl) ? Math.floor(Math.random() * 2 ** 31) : fromUrl;
}

/** mulberry32: small seeded generator, so a seed always gives the same map. */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const centreX = (r: Rect) => r.x + r.w / 2;
const centreY = (r: Rect) => r.y + r.h / 2;

/**
 * Builds a city. The trick that keeps it coherent: every cut runs wall to wall of the rectangle it
 * splits, so a street always ends on another street and the road network is connected by construction.
 * Pure data, no Phaser: drawing it is up to CityView.
 */
export function generateCity(seed: number): City {
  const random = seededRandom(seed);
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const shuffled = <T>(list: T[]) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const size = MAP.size / CITY.tileSize;
  const blocks = splitIntoBlocks(size, between, random);

  // The block nearest the start is always a plaza, then more are reserved, spread over the map.
  const start = nearestBlock(blocks, size / 2, size / 2);
  start.plaza = true;
  const plazas = [start];
  const order = shuffled(blocks);
  for (const b of order) {
    if (plazas.length > CITY.plazas) break;
    if (b.plaza || Math.min(b.w, b.h) < CITY.plazaMinSize) continue;
    if (plazas.some((p) => Math.hypot(centreX(p) - centreX(b), centreY(p) - centreY(b)) < CITY.plazaSpacing)) continue;
    b.plaza = true;
    plazas.push(b);
  }

  for (const b of blocks) {
    if (b.plaza) continue;
    const s = CITY.sidewalk;
    b.buildings = [{ x: b.x + s, y: b.y + s, w: b.w - s * 2, h: b.h - s * 2 }];
  }

  const alleys: Rect[] = [];
  const wanted = between(CITY.alleys.min, CITY.alleys.max);
  for (const b of order) {
    if (alleys.length >= wanted) break;
    if (b.plaza || Math.max(b.buildings[0].w, b.buildings[0].h) < CITY.alleyMinBuilding) continue;
    alleys.push(cutAlley(b, between));
  }

  const cells = new Uint8Array(size * size).fill(CELL.road);
  const fill = (r: Rect, cell: number) => {
    for (let y = r.y; y < r.y + r.h; y++) cells.fill(cell, y * size + r.x, y * size + r.x + r.w);
  };
  for (const b of blocks) {
    fill(b, b.plaza ? CELL.plaza : CELL.sidewalk);
    for (const building of b.buildings) fill(building, CELL.building);
  }
  for (const a of alleys) fill(a, CELL.alley);

  return { seed, size, cells, blocks, random };
}

/** Avenues cut the map into large rectangles, and side streets cut those down to block size. */
function splitIntoBlocks(size: number, between: (min: number, max: number) => number, random: () => number): Block[] {
  const { avenueWidth: avenue, streetWidth: street, avenueSpacing, minBlock, maxBlock } = CITY;

  // The spans between avenues along one axis. The map's outer margin is an avenue too: a ring road along the wall.
  const spans = () => {
    const out: [number, number][] = [];
    let at = avenue;
    for (;;) {
      const width = between(avenueSpacing.min, avenueSpacing.max);
      if (at + width + avenue + avenueSpacing.min + avenue > size) {
        out.push([at, size - avenue - at]);
        return out;
      }
      out.push([at, width]);
      at += width + avenue;
    }
  };

  const blocks: Block[] = [];
  const split = (x: number, y: number, w: number, h: number) => {
    const vertical = w === h ? random() < 0.5 : w > h;
    const span = vertical ? w : h;
    if (Math.max(w, h) <= maxBlock || span < minBlock * 2 + street) {
      blocks.push({ x, y, w, h, plaza: false, buildings: [] });
      return;
    }
    const at = between(minBlock, span - minBlock - street);
    if (vertical) {
      split(x, y, at, h);
      split(x + at + street, y, w - at - street, h);
    } else {
      split(x, y, w, at);
      split(x, y + at + street, w, h - at - street);
    }
  };
  const columns = spans();
  const rows = spans();
  for (const [x, w] of columns) for (const [y, h] of rows) split(x, y, w, h);
  return blocks;
}

function nearestBlock(blocks: Block[], x: number, y: number) {
  const distance = (b: Block) => Math.hypot(centreX(b) - x, centreY(b) - y);
  return blocks.reduce((best, b) => (distance(b) < distance(best) ? b : best));
}

/** Splits a block's building in two along its longest side. Returns the alley between the halves. */
function cutAlley(block: Block, between: (min: number, max: number) => number): Rect {
  const { alleyWidth: gap, alleyMinPiece: piece } = CITY;
  const r = block.buildings[0];
  if (r.w >= r.h) {
    const at = between(piece, r.w - piece - gap);
    block.buildings = [
      { x: r.x, y: r.y, w: at, h: r.h },
      { x: r.x + at + gap, y: r.y, w: r.w - at - gap, h: r.h },
    ];
    return { x: r.x + at, y: r.y, w: gap, h: r.h };
  }
  const at = between(piece, r.h - piece - gap);
  block.buildings = [
    { x: r.x, y: r.y, w: r.w, h: at },
    { x: r.x, y: r.y + at + gap, w: r.w, h: r.h - at - gap },
  ];
  return { x: r.x, y: r.y + at, w: r.w, h: gap };
}
