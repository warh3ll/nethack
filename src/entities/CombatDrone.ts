import Phaser from 'phaser';
import { getDroneStats } from '../data/skills';
import { lit } from '../systems/Lighting';
import type { PlayerStats } from '../systems/Progression';
import type { Bullet } from './Bullet';
import type { Enemy } from './Enemy';

/** Look and feel of the drone (cosmetic, not balance). */
const FX = {
  /** How high the disc floats above its shadow (px), and the size of its up-and-down bob. */
  hover: 14,
  bob: 2,
  /** Share of the way to its spot the drone covers each frame. */
  follow: 0.2,
  /** How often (ms) the drone picks a new spot to hover at. */
  rethinkMs: 100,
  shadowWidth: 30,
  shadowAlpha: 0.4,
  barWidth: 30,
  barHeight: 4,
  /** Distance below the drone (px) to the reload bar. */
  barOffset: 12,
  /** Most pellets fired in one frame when the frame rate is lower than the fire rate. */
  maxPerFrame: 3,
};

/**
 * Hovering turret skill. The drone floats within `leashRadius` of the player, drifting towards the nearest enemy,
 * and sprays the nearest enemy it has a clear line to. After `magazine` pellets it reloads for `reloadMs`
 * (a small bar shows the progress). Range, line of fire and pellets all start at the drone, not the player.
 * Stats come from data/skills.ts.
 */
export class CombatDrone {
  level = 1;
  /** The drone's spot on the ground; the disc is drawn `FX.hover` above it. */
  x: number;
  y: number;
  private offsetX = 0;
  private offsetY = 0;
  private rethinkAt = 0;
  private nextFireAt = 0;
  private ammo: number;
  private reloadingUntil = -1;
  private disc: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private bar: Phaser.GameObjects.Graphics;
  private barShown = false;

  constructor(
    readonly skillId: string,
    private owner: Phaser.GameObjects.Components.Transform,
    private enemies: Phaser.Physics.Arcade.Group,
    private bullets: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
    scene: Phaser.Scene,
    /** True if a shot from the first point to the second would get there without hitting a building. */
    private canHit: (ax: number, ay: number, bx: number, by: number) => boolean,
  ) {
    this.x = owner.x;
    this.y = owner.y;
    this.ammo = this.stats.magazine;
    this.shadow = scene.add
      .image(this.x, this.y, 'shadow-blob')
      .setDepth(-1)
      .setAlpha(FX.shadowAlpha)
      .setDisplaySize(FX.shadowWidth, FX.shadowWidth * 0.5);
    this.disc = lit(scene.add.image(this.x, this.y - FX.hover, 'combat-drone').setDepth(11));
    this.bar = scene.add.graphics().setDepth(12);
  }

  get stats() {
    return getDroneStats(this.skillId, this.level);
  }

  update(time: number) {
    const s = this.stats;
    const range = s.range * this.playerStats.weaponRangeMult;
    this.move(time, s.leashRadius, range);
    this.draw(time);

    if (this.reloadingUntil >= 0) {
      if (time < this.reloadingUntil) return this.drawBar((time - (this.reloadingUntil - s.reloadMs)) / s.reloadMs);
      this.reloadingUntil = -1;
      this.ammo = s.magazine;
      this.clearBar();
    }

    const target = this.nearest(this.x, this.y, range, true);
    if (!target) {
      this.nextFireAt = time; // hold fire (and stay ready) until something is in range
      return;
    }
    // At 100 ms between pellets a frame can be longer than the gap, so catch up a little rather than shoot slower than the data says.
    this.nextFireAt = Math.max(this.nextFireAt, time - s.cooldownMs * FX.maxPerFrame);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const damage = s.damage * this.playerStats.damageMult;
    let fired = 0;
    while (time >= this.nextFireAt && this.ammo > 0 && fired < FX.maxPerFrame) {
      const b = this.bullets.get() as Bullet | null;
      if (!b) break; // pool exhausted
      b.fire(this.x, this.y, angle, s.projectileSpeed, damage, 0, range, `bullet-${this.skillId}`, this.skillId);
      this.nextFireAt += s.cooldownMs;
      this.ammo--;
      fired++;
    }
    if (this.ammo <= 0) this.reloadingUntil = time + s.reloadMs;
  }

  /** Hovers at the player, pushed up to `leash` px towards the nearest enemy (less if a building is in the way). */
  private move(time: number, leash: number, range: number) {
    if (time >= this.rethinkAt) {
      this.rethinkAt = time + FX.rethinkMs;
      this.offsetX = 0;
      this.offsetY = 0;
      const near = this.nearest(this.owner.x, this.owner.y, range + leash, false);
      if (near) {
        const a = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, near.x, near.y);
        for (const f of [1, 0.5]) {
          const ox = Math.cos(a) * leash * f;
          const oy = Math.sin(a) * leash * f;
          if (this.canHit(this.owner.x, this.owner.y, this.owner.x + ox, this.owner.y + oy)) {
            this.offsetX = ox;
            this.offsetY = oy;
            break;
          }
        }
      }
    }
    this.x += (this.owner.x + this.offsetX - this.x) * FX.follow;
    this.y += (this.owner.y + this.offsetY - this.y) * FX.follow;
    // A quick player can outrun the smoothing: never let the drone stray past its leash.
    const dx = this.x - this.owner.x;
    const dy = this.y - this.owner.y;
    const d = Math.hypot(dx, dy);
    if (d > leash) {
      this.x = this.owner.x + (dx / d) * leash;
      this.y = this.owner.y + (dy / d) * leash;
    }
  }

  private draw(time: number) {
    this.shadow.setPosition(this.x, this.y);
    this.disc.setPosition(this.x, this.y - FX.hover + Math.sin(time / 220) * FX.bob);
  }

  private drawBar(progress: number) {
    const x = this.x - FX.barWidth / 2;
    const y = this.y + FX.barOffset;
    this.bar.clear().fillStyle(0x05060a, 0.8).fillRect(x - 1, y - 1, FX.barWidth + 2, FX.barHeight + 2);
    this.bar.fillStyle(0xb784a7).fillRect(x, y, FX.barWidth * Phaser.Math.Clamp(progress, 0, 1), FX.barHeight);
    this.barShown = true;
  }

  private clearBar() {
    if (!this.barShown) return;
    this.bar.clear();
    this.barShown = false;
  }

  /** Nearest live enemy within `range` of the point, optionally only one a shot can reach from there. */
  private nearest(x: number, y: number, range: number, needLine: boolean): Enemy | null {
    const inRange: { e: Enemy; d: number }[] = [];
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || e.hijacked) continue; // a Rootkit'd enemy is about to explode: don't waste shots on it
      const d = Phaser.Math.Distance.Squared(x, y, e.x, e.y);
      if (d <= range * range) inRange.push({ e, d });
    }
    inRange.sort((a, b) => a.d - b.d);
    if (!needLine) return inRange[0]?.e ?? null;
    return inRange.find((c) => this.canHit(x, y, c.e.x, c.e.y))?.e ?? null;
  }
}
