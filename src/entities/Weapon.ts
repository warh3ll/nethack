import Phaser from 'phaser';
import { getWeaponStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import type { Bullet } from './Bullet';
import type { Enemy } from './Enemy';

/** A weapon skill that auto-fires at the nearest enemy. Stats come from data/skills.ts. */
export class Weapon {
  level = 1;
  private nextFireAt = 0;

  constructor(
    readonly skillId: string,
    private owner: Phaser.GameObjects.Components.Transform & { noteShot?(angle: number): void },
    private enemies: Phaser.Physics.Arcade.Group,
    private bullets: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
    /** True if a shot from the first point to the second would get there without hitting a building. */
    private canHit: (ax: number, ay: number, bx: number, by: number) => boolean,
  ) {}

  get stats() {
    return getWeaponStats(this.skillId, this.level);
  }

  update(time: number) {
    if (time < this.nextFireAt) return;
    const s = this.stats;
    const target = this.findTarget(s.range, s.minRange ?? 0, s.targeting ?? 'nearest');
    if (!target) return; // hold fire (and stay ready) until something is in range
    this.nextFireAt = time + s.cooldownMs;

    const base = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, target.x, target.y);
    this.owner.noteShot?.(base);
    const spread = Phaser.Math.DegToRad(s.spreadDeg);
    for (let i = 0; i < s.projectiles; i++) {
      const offset = (i - (s.projectiles - 1) / 2) * spread;
      const b = this.bullets.get() as Bullet | null;
      if (!b) return; // pool exhausted
      b.fire(this.owner.x, this.owner.y, base + offset, s.projectileSpeed, s.damage * this.playerStats.damageMult, s.pierce, s.range, `bullet-${this.skillId}`, this.skillId);
    }
  }

  /** The best target in range that a shot can reach: buildings stop bullets, so a gun only fires with a clear line. */
  private findTarget(range: number, minRange: number, mode: 'nearest' | 'highestHp'): Enemy | null {
    const { x, y } = this.owner;
    const inRange: { e: Enemy; d: number }[] = [];
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || e.hijacked) continue; // a Rootkit'd enemy is about to explode: don't waste shots on it
      const d =Phaser.Math.Distance.Squared(x, y, e.x, e.y);
      if (d <= range * range && d >= minRange * minRange) inRange.push({ e, d });
    }
    // Best first, so the (costlier) line check usually runs once or twice.
    inRange.sort(mode === 'highestHp' ? (a, b) => b.e.hp - a.e.hp || a.d - b.d : (a, b) => a.d - b.d);
    return inRange.find((c) => this.canHit(x, y, c.e.x, c.e.y))?.e ?? null;
  }
}
