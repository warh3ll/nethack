import Phaser from 'phaser';
import { GUNS } from '../data/guns';
import type { Bullet } from './Bullet';

/** A gun the player aims with the mouse and fires with the left button (hold to keep firing). */
export class PrimaryGun {
  private nextFireAt = 0;

  constructor(
    readonly gunId: string,
    private owner: Phaser.GameObjects.Components.Transform,
    private bullets: Phaser.Physics.Arcade.Group,
    private camera: Phaser.Cameras.Scene2D.Camera,
    private pointer: Phaser.Input.Pointer,
  ) {}

  get stats() {
    return GUNS[this.gunId];
  }

  update(time: number) {
    if (!this.pointer.leftButtonDown() || time < this.nextFireAt) return;
    const s = this.stats;
    this.nextFireAt = time + s.cooldownMs;

    const aim = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    const base = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, aim.x, aim.y);
    const spread = Phaser.Math.DegToRad(s.spreadDeg);
    for (let i = 0; i < s.projectiles; i++) {
      const offset = (i - (s.projectiles - 1) / 2) * spread;
      const b = this.bullets.get() as Bullet | null;
      if (!b) return; // pool exhausted
      b.fire(this.owner.x, this.owner.y, base + offset, s.projectileSpeed, s.damage, s.pierce, s.range, `bullet-${this.gunId}`);
    }
  }
}
