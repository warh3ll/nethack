import Phaser from 'phaser';
import { DENSITY, HORDES, SPAWN_POINTS, SPAWNING } from '../data/balance';
import { CITY } from '../data/city';
import type { Enemy } from '../entities/Enemy';
import type { SpawnPoint } from './SpawnPoints';

/** Below the objectives and the player, above the city's tile layers and the factories. */
const DEPTH = -5;

interface Pending {
  point: SpawnPoint;
  /** One enemy type per enemy coming out: a single one from a small exit, a small group from a factory. */
  types: string[];
  startedAt: number;
  spawnAt: number;
  /** Set when the enemy comes out already hunting the player, whatever the distance. */
  hunt?: boolean;
}

/**
 * Runs the spawn points: picks an active one when a spawn is due, flashes it, then lets the enemies out.
 * Runs on game time, so the flash slows down with the rest of the world while a hack prompt is typed.
 * Factories draw their own building and door (see Factories); this draws the small exits.
 */
export class Spawner {
  private pending: Pending[] = [];
  private flashes: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private points: SpawnPoint[],
    private spawn: (x: number, y: number, type: string) => Enemy | null | undefined,
  ) {
    // Placeholder art: a dark hatch with a faint outline, so players learn where enemies come from.
    const t = CITY.tileSize;
    const doors = scene.add.graphics().setDepth(DEPTH);
    for (const p of points) {
      if (p.kind !== 'exit') continue;
      const w = t * 0.6;
      const h = t * 0.7;
      doors.fillStyle(0x05060a, 0.9).fillRect(p.door.x - w / 2, p.door.y + t / 2 - h, w, h);
      doors.lineStyle(2, SPAWN_POINTS.exitFlashColor, 0.45).strokeRect(p.door.x - w / 2, p.door.y + t / 2 - h, w, h);
    }
    this.flashes = scene.add.graphics().setDepth(DEPTH + 1);
  }

  /** Enemies waiting behind a flashing door. They count towards the enemy cap. */
  get waiting() {
    return this.pending.reduce((n, q) => n + q.types.length, 0);
  }

  /** A destroyed factory: it never spawns again, and whatever was about to come out of it doesn't. */
  remove(point: SpawnPoint) {
    this.points = this.points.filter((p) => p !== point);
    this.pending = this.pending.filter((q) => q.point !== point);
  }

  /** The spawn point closest to a spot, or null if none is left. */
  nearest(x: number, y: number): SpawnPoint | null {
    let best: SpawnPoint | null = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  /** Sends a group out of `point` (flash first, as always) that hunts the player from the moment it appears. */
  summonHunters(now: number, point: SpawnPoint, types: string[]) {
    const flash = point.kind === 'factory' ? SPAWN_POINTS.factoryFlashMs : SPAWN_POINTS.exitFlashMs;
    this.pending.push({ point, types, startedAt: now, spawnAt: now + flash, hunt: true });
  }

  /**
   * A horde (HORDES): every spawn point within `HORDES.range` of the player flashes for `flashMs`, then they let
   * `count` enemies out between them, split as evenly as possible. Topped up with the nearest points beyond
   * `range.min` when too few are in range. Returns how many spawn points take part.
   */
  horde(now: number, playerX: number, playerY: number, count: number, rollType: () => string, flashMs: number): number {
    const h = HORDES;
    const byDist = this.points
      .map((p) => ({ p, d: Math.hypot(p.x - playerX, p.y - playerY) }))
      .filter((o) => o.d >= h.range.min)
      .sort((a, b) => a.d - b.d);
    let chosen = byDist.filter((o) => o.d <= h.range.max);
    if (chosen.length < h.minPoints) chosen = byDist.slice(0, h.minPoints);
    if (chosen.length === 0 || count <= 0) return 0;
    const groups: string[][] = chosen.map(() => []);
    for (let i = 0; i < count; i++) groups[i % chosen.length].push(rollType());
    chosen.forEach((o, i) => {
      if (groups[i].length) this.pending.push({ point: o.p, types: groups[i], startedAt: now, spawnAt: now + flashMs });
    });
    return chosen.length;
  }

  /**
   * A spawn is due: pick one of the active spawn points (factories weigh more) and start its flash.
   * With fewer active points than `fullRateAt`, some requests are skipped, so sparse areas are quieter.
   * `rollType` is asked once per enemy, so every member of a factory's group rolls its own type.
   * `exitGroup` is how many a small exit lets out right now (grows with the run clock, see SPAWNING.exitGroup).
   */
  request(now: number, playerX: number, playerY: number, rollType: () => string, exitGroup: { min: number; max: number }) {
    const s = SPAWN_POINTS;
    const active: SpawnPoint[] = [];
    let weight = 0;
    for (const p of this.points) {
      const range = p.kind === 'factory' ? s.factoryRange : s.exitRange;
      const d = Math.hypot(p.x - playerX, p.y - playerY);
      if (d < range.min || d > range.max || this.pending.some((q) => q.point === p)) continue;
      active.push(p);
      weight += p.kind === 'factory' ? s.factoryWeight : 1;
    }
    if (weight === 0 || Math.random() >= weight / s.fullRateAt) return;
    let roll = Math.random() * weight;
    const point = active.find((p) => (roll -= p.kind === 'factory' ? s.factoryWeight : 1) < 0) ?? active[active.length - 1];
    const factory = point.kind === 'factory';
    const group = factory ? s.factoryGroup : exitGroup;
    const count = Phaser.Math.Between(group.min, group.max);
    const types = Array.from({ length: count }, rollType);
    this.pending.push({ point, types, startedAt: now, spawnAt: now + (factory ? s.factoryFlashMs : s.exitFlashMs) });
  }

  /**
   * Target density (DENSITY): `nearby` swarm enemies are around the player and `target` are wanted. Opens up to
   * `DENSITY.maxOpensPerCheck` active spawn points until the shortfall is queued, favouring points in the direction
   * of `heading` (a unit vector, or null when standing still). The target shrinks in quiet zones like the normal rate.
   */
  topUp(
    now: number,
    playerX: number,
    playerY: number,
    heading: { x: number; y: number } | null,
    target: number,
    nearby: number,
    rollType: () => string,
    exitGroup: { min: number; max: number },
  ) {
    const s = SPAWN_POINTS;
    const options: { p: SpawnPoint; w: number }[] = [];
    let base = 0;
    for (const p of this.points) {
      const range = p.kind === 'factory' ? s.factoryRange : s.exitRange;
      const dx = p.x - playerX;
      const dy = p.y - playerY;
      const d = Math.hypot(dx, dy);
      if (d < range.min || d > range.max || this.pending.some((q) => q.point === p)) continue;
      const kindWeight = p.kind === 'factory' ? s.factoryWeight : 1;
      base += kindWeight;
      const ahead = heading ? Math.max(0, (dx * heading.x + dy * heading.y) / d) : 0;
      options.push({ p, w: kindWeight * (1 + DENSITY.aheadBias * ahead) });
    }
    let missing = Math.round(target * Math.min(1, base / s.fullRateAt)) - nearby;
    for (let opens = 0; missing > 0 && opens < DENSITY.maxOpensPerCheck && options.length > 0; opens++) {
      const total = options.reduce((sum, o) => sum + o.w, 0);
      let roll = Math.random() * total;
      const i = Math.max(0, options.findIndex((o) => (roll -= o.w) < 0));
      const point = options.splice(i, 1)[0].p;
      const factory = point.kind === 'factory';
      const group = factory ? s.factoryGroup : exitGroup;
      const types = Array.from({ length: Phaser.Math.Between(group.min, group.max) }, rollType);
      this.pending.push({ point, types, startedAt: now, spawnAt: now + (factory ? s.factoryFlashMs : s.exitFlashMs) });
      missing -= types.length;
    }
  }

  update(now: number) {
    const s = SPAWN_POINTS;
    const t = CITY.tileSize;
    this.flashes.clear();
    this.pending = this.pending.filter((q) => {
      const factory = q.point.kind === 'factory';
      if (now >= q.spawnAt) {
        // A group steps out side by side across the door (narrower at a small exit), then the swarm shoves itself apart.
        q.types.forEach((type, i) => {
          const spread = q.types.length > 1 ? (i / (q.types.length - 1) - 0.5) * t * (factory ? 2 : 1) : 0;
          const enemy = this.spawn(q.point.x + spread, q.point.y, type);
          if (q.hunt) enemy?.provoke();
        });
        return false;
      }
      // Pulses faster as the moment comes closer.
      const progress = (now - q.startedAt) / (q.spawnAt - q.startedAt);
      const alpha = 0.3 + 0.6 * Math.abs(Math.sin(progress * progress * Math.PI * (factory ? 8 : 4)));
      const w = factory ? t * 3 : t;
      this.flashes.fillStyle(factory ? s.factoryFlashColor : s.exitFlashColor, alpha);
      this.flashes.fillRect(q.point.door.x - w / 2, q.point.door.y - t / 2, w, t);
      return true;
    });
  }
}

/** Swarm spawns per second at this run time (SPAWNING.spawnRate, straight line between points, last value holds). */
export function spawnsPerSecond(seconds: number): number {
  const pts = SPAWNING.spawnRate;
  if (seconds <= pts[0].atSec) return pts[0].perSec;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (seconds <= b.atSec) return a.perSec + ((b.perSec - a.perSec) * (seconds - a.atSec)) / (b.atSec - a.atSec);
  }
  return pts[pts.length - 1].perSec;
}

/** How many enemies a small exit lets out at this run time (SPAWNING.exitGroup, last row whose time has passed). */
export function exitGroupAt(seconds: number): { min: number; max: number } {
  let row = SPAWNING.exitGroup[0];
  for (const r of SPAWNING.exitGroup) if (seconds >= r.atSec) row = r;
  return row;
}

/** Target number of swarm enemies around the player at this run time (DENSITY.target, straight line between points). */
export function densityTargetAt(seconds: number): number {
  const pts = DENSITY.target;
  if (seconds <= pts[0].atSec) return pts[0].count;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (seconds <= b.atSec) return a.count + ((b.count - a.count) * (seconds - a.atSec)) / (b.atSec - a.atSec);
  }
  return pts[pts.length - 1].count;
}
