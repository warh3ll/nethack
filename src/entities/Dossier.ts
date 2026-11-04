import Phaser from 'phaser';
import { ENCRYPTION_KEY } from '../data/objectives';

const FONT = 'monospace';
const GOLD = 0xffd23e;

/**
 * A pick-up item with a pulsing ring: the dossier in the Grab encryption key objective (a folder),
 * or the company secrets in the Steal secrets objective (`texture`/`label`/`radius` override the defaults).
 */
export class Dossier {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Arc;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    texture = 'dossier',
    private label = 'KEY ACQUIRED',
    radius: number = ENCRYPTION_KEY.pickupRadius,
  ) {
    this.ring = scene.add.circle(x, y, radius).setStrokeStyle(2, GOLD, 0.7).setDepth(1);
    this.sprite = scene.add.image(x, y, texture).setDepth(4);
    scene.tweens.add({ targets: this.ring, scale: 1.4, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });
  }

  /** Floating label ("KEY ACQUIRED") and then the item is gone. */
  playCollected() {
    const label = this.scene.add
      .text(this.x, this.y - 30, this.label, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
    this.destroy();
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.ring);
    this.sprite.destroy();
    this.ring.destroy();
  }
}
