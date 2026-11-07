import Phaser from 'phaser';
import { SPAWN_POINTS } from '../data/balance';
import { CITY } from '../data/city';
import type { SpawnPoint } from './SpawnPoints';

/** Below the objectives and the player, above the city's tile layers and the factories. */
const DEPTH = -5;

interface Pending {
  point: SpawnPoint;
  /** One enemy type per enemy coming out: a single one from a small exit, a small group from a factory. */
  types: string[];
  startedAt: number;
  spawnAt: number;
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
    private spawn: (x: number, y: number, type: string) => void,
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

  /**
   * A spawn is due: pick one of the active spawn points (factories weigh more) and start its flash.
   * With fewer active points than `fullRateAt`, some requests are skipped, so sparse areas are quieter.
   * `rollType` is asked once per enemy, so every member of a factory's group rolls its own type.
   */
  request(now: number, playerX: number, playerY: number, rollType: () => string) {
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
    const count = factory ? Phaser.Math.Between(s.factoryGroup.min, s.factoryGroup.max) : 1;
    const types = Array.from({ length: count }, rollType);
    this.pending.push({ point, types, startedAt: now, spawnAt: now + (factory ? s.factoryFlashMs : s.exitFlashMs) });
  }

  update(now: number) {
    const s = SPAWN_POINTS;
    const t = CITY.tileSize;
    this.flashes.clear();
    this.pending = this.pending.filter((q) => {
      const factory = q.point.kind === 'factory';
      if (now >= q.spawnAt) {
        // A group steps out side by side across the factory door, then the swarm shoves itself apart.
        q.types.forEach((type, i) => {
          const spread = q.types.length > 1 ? (i / (q.types.length - 1) - 0.5) * t * 2 : 0;
          this.spawn(q.point.x + spread, q.point.y, type);
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
