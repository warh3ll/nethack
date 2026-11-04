import Phaser from 'phaser';
import { CACHES } from '../data/balance';

const CYAN = 0x2ef2ff;

/** A data cache lying on the map: a crate with a pulsing ring. Placement lives in systems/Caches.ts. */
export class DataCache {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Arc;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.ring = scene.add.circle(x, y, CACHES.ringRadius).setStrokeStyle(2, CYAN, 0.5).setDepth(1);
    this.sprite = scene.add.image(x, y, 'data-cache').setDepth(3);
    scene.tweens.add({ targets: this.ring, scale: 1.3, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1 });
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.ring);
    this.sprite.destroy();
    this.ring.destroy();
  }
}
