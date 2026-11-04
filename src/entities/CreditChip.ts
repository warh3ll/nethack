import Phaser from 'phaser';
import { CREDITS } from '../data/balance';

/** Pooled credit chip dropped by a dead enemy. Never destroyed: drop() reuses it, collect() returns it to the pool. */
export class CreditChip extends Phaser.GameObjects.Image {
  value = 0;
  private magnetized = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'credit-chip');
    scene.add.existing(this);
    this.setDepth(2);
  }

  drop(x: number, y: number, value: number) {
    this.value = value;
    this.magnetized = false;
    this.setPosition(x, y).setActive(true).setVisible(true);
  }

  /**
   * Pulls toward the player once inside the magnet radius (it stays locked on after that, so a
   * fast-moving player can't outrun a chip that's already flying). Returns the value if collected.
   */
  update(playerX: number, playerY: number, dtSeconds: number): number {
    const d = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (d <= CREDITS.collectRadius) {
      this.collect();
      return this.value;
    }
    if (d <= CREDITS.magnetRadius) this.magnetized = true;
    if (this.magnetized) {
      const step = Math.min(d, CREDITS.magnetSpeed * dtSeconds);
      this.x += ((playerX - this.x) / d) * step;
      this.y += ((playerY - this.y) / d) * step;
    }
    return 0;
  }

  collect() {
    this.setActive(false).setVisible(false);
  }
}
