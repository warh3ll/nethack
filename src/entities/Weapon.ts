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
    private owner: Phaser.GameObjects.Components.Transform,
    private enemies: Phaser.Physics.Arcade.Group,
    private bullets: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
  ) {}

  get stats() {
    return getWeaponStats(this.skillId, this.level);
  }

  update(time: number) {
    if (time < this.nextFireAt) return;
    const s = this.stats;
    const target = this.findNearest(s.range);
    if (!target) return; // hold fire (and stay ready) until something is in range
    this.nextFireAt = time + s.cooldownMs;

    const base = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, target.x, target.y);
    const spread = Phaser.Math.DegToRad(s.spreadDeg);
    for (let i = 0; i < s.projectiles; i++) {
      const offset = (i - (s.projectiles - 1) / 2) * spread;
      const b = this.bullets.get() as Bullet | null;
      if (!b) return; // pool exhausted
      b.fire(this.owner.x, this.owner.y, base + offset, s.projectileSpeed, s.damage * this.playerStats.damageMult, s.pierce, s.range, `bullet-${this.skillId}`);
    }
  }

  private findNearest(range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range * range;
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Squared(this.owner.x, this.owner.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
}
