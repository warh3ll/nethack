import Phaser from 'phaser';
import { PLAYER, SHADOWS } from '../data/balance';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/** Under the things that stand in the street (enemies are at 0), above the ground, props and spawn flashes. */
const DEPTH = -1;

/**
 * Blob shadows for the player and every active enemy, from a pool of images that is reused and never destroyed.
 * Each one slides away from the nearest light and darkens the closer that light is (see SHADOWS in balance.ts).
 */
export class Shadows {
  private pool: Phaser.GameObjects.Image[] = [];
  private near: Phaser.GameObjects.Light[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private enemies: Phaser.Physics.Arcade.Group,
  ) {}

  update() {
    if (!SHADOWS.enabled) return;
    const lights = this.scene.lights;
    const view = this.scene.cameras.main.worldView;
    // Only the lights that can reach the screen matter, so the per-sprite search below stays short.
    this.near.length = 0;
    if (lights.active) {
      for (const l of lights.lights) {
        if (l.visible && l.x + l.radius > view.x && l.x - l.radius < view.right && l.y + l.radius > view.y && l.y - l.radius < view.bottom) this.near.push(l);
      }
    }
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
    // The nearest light that reaches this spot, and how strongly (1 right on it, 0 at the edge of its pool).
    let light: Phaser.GameObjects.Light | null = null;
    let nearest = Infinity;
    for (const l of this.near) {
      const d = Math.hypot(x - l.x, y - l.y);
      if (d < l.radius && d < nearest) {
        nearest = d;
        light = l;
      }
    }
    const strength = light ? 1 - nearest / light.radius : 0;
    const width = radius * SHADOWS.width * (1 + (SHADOWS.stretch - 1) * strength);
    let dx = 0;
    let dy = 0;
    if (light) {
      const away = Math.atan2(y - light.y, x - light.x);
      dx = Math.cos(away) * SHADOWS.shift * strength;
      dy = Math.sin(away) * SHADOWS.shift * strength * SHADOWS.squash;
    }
    shadow
      .setVisible(true)
      .setPosition(x + dx, y + feet + dy)
      .setDisplaySize(width, width * SHADOWS.squash)
      .setAlpha(SHADOWS.alpha + (SHADOWS.alphaLit - SHADOWS.alpha) * strength);
    return index + 1;
  }
}
