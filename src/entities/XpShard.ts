import Phaser from 'phaser';
import { XP_PICKUPS } from '../data/balance';

/** Pooled XP pickup dropped by enemies. Flies to the player once inside the magnet radius. */
export class XpShard extends Phaser.Physics.Arcade.Image {
  value = 0;
  private magnetized = false;

  drop(x: number, y: number, value: number) {
    this.setTexture('xp-shard');
    this.enableBody(true, x, y, true, true);
    this.setVelocity(0, 0);
    this.value = value;
    this.magnetized = false;
  }

  /** Moves toward the player when in range. Returns true when collected (the shard is then back in the pool). */
  follow(px: number, py: number, magnetRadius: number): boolean {
    const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    if (d <= XP_PICKUPS.collectRadius) {
      this.disableBody(true, true);
      return true;
    }
    if (d <= magnetRadius) this.magnetized = true;
    if (this.magnetized) this.scene.physics.moveTo(this, px, py, XP_PICKUPS.flySpeed);
    return false;
  }
}
