import Phaser from 'phaser';
import { PLAYER, SHADOWS } from '../data/balance';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/** Under the things that stand in the street (enemies are at 0), above the ground, props and spawn flashes. */
const DEPTH = -1;

/**
 * Blob shadows for the player and every active enemy, from a pool of images that is reused and never destroyed.
 * They sit still under the feet (see SHADOWS in balance.ts).
 */
export class Shadows {
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private enemies: Phaser.Physics.Arcade.Group,
  ) {}

  update() {
    if (!SHADOWS.enabled) return;
    let used = this.place(0, this.player.x, this.player.y, PLAYER.radius, PLAYER.radius + SHADOWS.playerFeet);
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (e.active) used = this.place(used, e.x, e.y, e.stats.radius, e.stats.radius * SHADOWS.feet);
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  /** Puts shadow number `index` under one thing and returns the next free index. */
  private place(index: number, x: number, y: number, radius: number, feet: number) {
    let shadow = this.pool[index];
    if (!shadow) shadow = this.pool[index] = this.scene.add.image(0, 0, 'shadow-blob').setDepth(DEPTH);
    const width = radius * SHADOWS.width;
    shadow.setVisible(true).setPosition(x, y + feet).setDisplaySize(width, width * SHADOWS.squash).setAlpha(SHADOWS.alpha);
    return index + 1;
  }
}
