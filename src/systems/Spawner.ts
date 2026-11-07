import Phaser from 'phaser';
import { SPAWN_POINTS } from '../data/balance';
import { CITY } from '../data/city';
import type { SpawnPoint } from './SpawnPoints';

/** Below the objectives and the player, above the city's tile layers. */
const DEPTH = -5;

interface Pending {
  point: SpawnPoint;
  type: string;
  startedAt: number;
  spawnAt: number;
}

/**
 * Runs the spawn points: picks an active one when a spawn is due, flashes it, then lets the enemy out.
 * Runs on game time, so the flash slows down with the rest of the world while a hack prompt is typed.
 */
export class Spawner {
  private pending: Pending[] = [];
  private flashes: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private points: SpawnPoint[],
    private spawn: (x: number, y: number, type: string) => void,
  ) {
    // Placeholder art: a dark door with a faint outline, so players learn where enemies come from.
    const t = CITY.tileSize;
    const doors = scene.add.graphics().setDepth(DEPTH);
    for (const p of points) {
      const w = p.kind === 'factory' ? t * 1.5 : t * 0.6;
      const h = p.kind === 'factory' ? t * 0.8 : t * 0.7;
      const color = p.kind === 'factory' ? SPAWN_POINTS.factoryFlashColor : SPAWN_POINTS.exitFlashColor;
      doors.fillStyle(0x05060a, 0.9).fillRect(p.door.x - w / 2, p.door.y + t / 2 - h, w, h);
      doors.lineStyle(2, color, 0.45).strokeRect(p.door.x - w / 2, p.door.y + t / 2 - h, w, h);
    }
    this.flashes = scene.add.graphics().setDepth(DEPTH + 1);
  }

  /** Enemies waiting behind a flashing door. They count towards the enemy cap. */
  get waiting() {
    return this.pending.length;
  }

  /**
   * A spawn is due: pick one of the active spawn points (factories weigh more) and start its flash.
   * With fewer active points than `fullRateAt`, some requests are skipped, so sparse areas are quieter.
   */
  request(now: number, playerX: number, playerY: number, type: string) {
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
    const flash = point.kind === 'factory' ? s.factoryFlashMs : s.exitFlashMs;
    this.pending.push({ point, type, startedAt: now, spawnAt: now + flash });
  }

  update(now: number) {
    const s = SPAWN_POINTS;
    const t = CITY.tileSize;
    this.flashes.clear();
    this.pending = this.pending.filter((q) => {
      if (now >= q.spawnAt) {
        this.spawn(q.point.x, q.point.y, q.type);
        return false;
      }
      // Pulses faster as the moment comes closer.
      const progress = (now - q.startedAt) / (q.spawnAt - q.startedAt);
      const alpha = 0.3 + 0.6 * Math.abs(Math.sin(progress * progress * Math.PI * 4));
      const factory = q.point.kind === 'factory';
      const w = factory ? t * 3 : t;
      this.flashes.fillStyle(factory ? s.factoryFlashColor : s.exitFlashColor, alpha);
      this.flashes.fillRect(q.point.door.x - w / 2, q.point.door.y - t / 2, w, t);
      return true;
    });
  }
}
