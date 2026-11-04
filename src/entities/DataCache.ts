import Phaser from 'phaser';
import { CACHES } from '../data/balance';

const CYAN = 0x2ef2ff;

/** A data cache lying on the map: a crate with a pulsing ring. Placement lives in systems/Caches.ts. */
export class DataCache {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Arc;
  private prompt: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.ring = scene.add.circle(x, y, CACHES.ringRadius).setStrokeStyle(2, CYAN, 0.5).setDepth(1);
    this.sprite = scene.add.image(x, y, 'data-cache').setDepth(3);
    this.prompt = scene.add
      .text(x, y - 40, '[E] open', { fontFamily: 'monospace', fontSize: '16px', color: '#2ef2ff', stroke: '#05060a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(21)
      .setVisible(false);
    scene.tweens.add({ targets: this.ring, scale: 1.3, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1 });
  }

  isNear(px: number, py: number) {
    return Math.hypot(px - this.x, py - this.y) <= CACHES.openRadius;
  }

  /** Shows the "[E] open" prompt. Tapping it opens the cache too (touch has no E key). */
  showPrompt(visible: boolean, onTap: () => void) {
    if (this.prompt.visible === visible) return;
    this.prompt.setVisible(visible);
    if (visible) this.prompt.setInteractive({ useHandCursor: true }).once('pointerdown', onTap);
    else this.prompt.disableInteractive().off('pointerdown');
  }

  destroy() {
    this.prompt.destroy();
    this.scene.tweens.killTweensOf(this.ring);
    this.sprite.destroy();
    this.ring.destroy();
  }
}
