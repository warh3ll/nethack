import { MAP } from '../data/balance';
import { CITY } from '../data/city';
import { CELL, type City, type Point } from './City';

const UNREACHED = 0x7fffffff;
/** Step costs: straight 10, diagonal 14 (about 10 * sqrt 2), so distances stay whole numbers. */
const STRAIGHT = 10;
const DIAGONAL = 14;
const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/**
 * Walking distance from one tile to every other tile, through the streets. Pure data, no Phaser.
 * Enemies read it to find the next tile on the shortest way to the target.
 */
export class FlowField {
  readonly dist: Int32Array;
  /** The tile the distances are measured from, or -1 before the first build. */
  target = -1;

  private readonly nav: Navigation;

  constructor(nav: Navigation) {
    this.nav = nav;
    this.dist = new Int32Array(nav.size * nav.size);
  }

  /** Dijkstra from the target tile over every walkable tile. About a millisecond for the whole map. */
  build(target: number) {
    const { size, blocked } = this.nav;
    const dist = this.dist;
    dist.fill(UNREACHED);
    this.target = target;
    dist[target] = 0;
    const heap = new MinHeap();
    heap.push(0, target);
    while (heap.length > 0) {
      const [d, i] = heap.pop();
      if (d > dist[i]) continue;
      const x = i % size;
      const y = (i - x) / size;
      for (let n = 0; n < 8; n++) {
        const [dx, dy] = NEIGHBOURS[n];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const j = ny * size + nx;
        if (blocked[j]) continue;
        // No cutting a building's corner on a diagonal step: both straight neighbours have to be open.
        if (n >= 4 && (blocked[y * size + nx] || blocked[ny * size + x])) continue;
        const nd = d + (n < 4 ? STRAIGHT : DIAGONAL);
        if (nd < dist[j]) {
          dist[j] = nd;
          heap.push(nd, j);
        }
      }
    }
  }

  /** The neighbouring tile that is one step closer to the target, or -1 if there is none (unreachable, or already there). */
  next(tile: number): number {
    const { size, blocked } = this.nav;
    const x = tile % size;
    const y = (tile - x) / size;
    let best = -1;
    let bestDist = this.dist[tile];
    for (let n = 0; n < 8; n++) {
      const [dx, dy] = NEIGHBOURS[n];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (n >= 4 && (blocked[y * size + nx] || blocked[ny * size + x])) continue;
      const j = ny * size + nx;
      if (this.dist[j] < bestDist) {
        best = j;
        bestDist = this.dist[j];
      }
    }
    return best;
  }

  reaches(tile: number) {
    return this.dist[tile] !== UNREACHED;
  }
}

/**
 * The city as seen by walking enemies: which tiles are blocked, one shared flow field towards the player,
 * and cached ones towards fixed points (a guard's post). Also answers "is there a clear line between these two points".
 */
export class Navigation {
  readonly size: number;
  /** 1 for a building tile. */
  readonly blocked: Uint8Array;
  private readonly half = MAP.size / 2;
  private readonly player: FlowField;
  private readonly decoy: FlowField;
  private readonly fixed = new Map<number, FlowField>();

  constructor(city: City) {
    this.size = city.size;
    this.blocked = city.cells.map((c) => (c === CELL.building ? 1 : 0));
    this.player = new FlowField(this);
    this.decoy = new FlowField(this);
  }

  /** The tile under a world position, clamped to the map. */
  tileAt(x: number, y: number) {
    const tx = Math.min(this.size - 1, Math.max(0, Math.floor((x + this.half) / CITY.tileSize)));
    const ty = Math.min(this.size - 1, Math.max(0, Math.floor((y + this.half) / CITY.tileSize)));
    return ty * this.size + tx;
  }

  /** True if the point is inside a building. Shots die there. */
  solidAt(x: number, y: number) {
    return this.blocked[this.tileAt(x, y)] === 1;
  }

  centreOf(tile: number): Point {
    const x = tile % this.size;
    const y = (tile - x) / this.size;
    return { x: (x + 0.5) * CITY.tileSize - this.half, y: (y + 0.5) * CITY.tileSize - this.half };
  }

  /** Rebuilds the player's flow field when the player has moved onto another tile. */
  trackPlayer(x: number, y: number) {
    const tile = this.tileAt(x, y);
    if (tile !== this.player.target) this.player.build(tile);
  }

  get toPlayer() {
    return this.player;
  }

  /** Rebuilds the decoy's flow field (Rootkit taunt) when the decoy has moved onto another tile. */
  trackDecoy(x: number, y: number) {
    const tile = this.tileAt(x, y);
    if (tile !== this.decoy.target) this.decoy.build(tile);
  }

  get toDecoy() {
    return this.decoy;
  }

  /** A flow field towards a fixed point, built the first time it is asked for. */
  towards(p: Point): FlowField {
    const tile = this.tileAt(p.x, p.y);
    let field = this.fixed.get(tile);
    if (!field) {
      field = new FlowField(this);
      field.build(tile);
      this.fixed.set(tile, field);
    }
    return field;
  }

  /**
   * Where to walk from (x, y) to follow `field`: the farthest of the next `lookahead` tiles along the route that
   * can be reached in a straight line. Null if the route is unknown (off the field, or standing on the target tile).
   */
  waypoint(field: FlowField, x: number, y: number, radius: number, lookahead: number): Point | null {
    let tile = this.tileAt(x, y);
    if (!field.reaches(tile)) return null;
    let best: Point | null = null;
    for (let i = 0; i < lookahead; i++) {
      const next = field.next(tile);
      if (next < 0) break;
      const c = this.centreOf(next);
      // The first step is always taken; later ones only if the body fits along the straight line.
      if (best && !this.clearLine(x, y, c.x, c.y, radius)) break;
      best = c;
      tile = next;
    }
    return best;
  }

  /**
   * Pushes a circular body out of any building it overlaps, and takes away the part of its velocity that goes
   * into the wall, so it slides along instead of sticking. Run after every physics step.
   * (Arcade's own circle-vs-rectangle collision pushes along the line between the centres, which drags
   * anything sliding along a long building back towards the building's middle.)
   */
  pushOut(body: { center: Point; halfWidth: number; position: Point; velocity: Point; updateCenter(): void }) {
    const t = CITY.tileSize;
    const r = body.halfWidth;
    let cx = body.center.x;
    let cy = body.center.y;
    const x0 = Math.floor((cx - r + this.half) / t);
    const x1 = Math.floor((cx + r + this.half) / t);
    const y0 = Math.floor((cy - r + this.half) / t);
    const y1 = Math.floor((cy + r + this.half) / t);
    let moved = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size || !this.blocked[ty * this.size + tx]) continue;
        const left = tx * t - this.half;
        const top = ty * t - this.half;
        // Closest point of the tile to the centre.
        const px = Math.min(Math.max(cx, left), left + t);
        const py = Math.min(Math.max(cy, top), top + t);
        let nx = cx - px;
        let ny = cy - py;
        let d = Math.hypot(nx, ny);
        if (d >= r) continue;
        let depth = r - d;
        if (d === 0) {
          // Centre inside the tile (shoved in by the crowd): out through the nearest side.
          const sides = [cx - left, left + t - cx, cy - top, top + t - cy];
          const i = sides.indexOf(Math.min(...sides));
          [nx, ny] = [[-1, 0], [1, 0], [0, -1], [0, 1]][i];
          d = 1;
          depth = sides[i] + r;
        }
        nx /= d;
        ny /= d;
        cx += nx * depth;
        cy += ny * depth;
        const into = body.velocity.x * nx + body.velocity.y * ny;
        if (into < 0) {
          body.velocity.x -= into * nx;
          body.velocity.y -= into * ny;
        }
        moved = true;
      }
    }
    if (!moved) return;
    body.position.x += cx - body.center.x;
    body.position.y += cy - body.center.y;
    body.updateCenter();
  }

  /** True if a body of `radius` can move in a straight line from a to b without touching a building. */
  clearLine(ax: number, ay: number, bx: number, by: number, radius = 0): boolean {
    if (!this.rayClear(ax, ay, bx, by)) return false;
    if (radius <= 0) return true;
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) return true;
    // Two more rays along the edges of the body, a pixel inside so a body flush against a wall still counts as clear.
    const edge = radius - 1;
    const ox = (-(by - ay) / len) * edge;
    const oy = ((bx - ax) / len) * edge;
    return this.rayClear(ax + ox, ay + oy, bx + ox, by + oy) && this.rayClear(ax - ox, ay - oy, bx - ox, by - oy);
  }

  /** Steps through every tile the line crosses (Amanatides-Woo) and stops at the first building. */
  private rayClear(ax: number, ay: number, bx: number, by: number): boolean {
    const t = CITY.tileSize;
    const ux = (ax + this.half) / t;
    const uy = (ay + this.half) / t;
    const vx = (bx + this.half) / t;
    const vy = (by + this.half) / t;
    let x = Math.floor(ux);
    let y = Math.floor(uy);
    const ex = Math.floor(vx);
    const ey = Math.floor(vy);
    const dx = vx - ux;
    const dy = vy - uy;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const deltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const deltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let maxX = dx > 0 ? (x + 1 - ux) * deltaX : dx < 0 ? (ux - x) * deltaX : Infinity;
    let maxY = dy > 0 ? (y + 1 - uy) * deltaY : dy < 0 ? (uy - y) * deltaY : Infinity;
    for (let steps = Math.abs(ex - x) + Math.abs(ey - y) + 1; steps > 0; steps--) {
      if (x < 0 || y < 0 || x >= this.size || y >= this.size || this.blocked[y * this.size + x]) return false;
      if (x === ex && y === ey) return true;
      if (maxX < maxY) {
        maxX += deltaX;
        x += stepX;
      } else {
        maxY += deltaY;
        y += stepY;
      }
    }
    return true;
  }
}

/** Binary min-heap of (distance, tile) pairs, kept in two flat arrays. */
class MinHeap {
  private keys: number[] = [];
  private values: number[] = [];

  get length() {
    return this.keys.length;
  }

  push(key: number, value: number) {
    const { keys, values } = this;
    let i = keys.length;
    keys.push(key);
    values.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= key) break;
      keys[i] = keys[parent];
      values[i] = values[parent];
      i = parent;
    }
    keys[i] = key;
    values[i] = value;
  }

  pop(): [number, number] {
    const { keys, values } = this;
    const top: [number, number] = [keys[0], values[0]];
    const lastKey = keys.pop()!;
    const lastValue = values.pop()!;
    const n = keys.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let child = 2 * i + 1;
        if (child >= n) break;
        if (child + 1 < n && keys[child + 1] < keys[child]) child++;
        if (keys[child] >= lastKey) break;
        keys[i] = keys[child];
        values[i] = values[child];
        i = child;
      }
      keys[i] = lastKey;
      values[i] = lastValue;
    }
    return top;
  }
}
