import Phaser from 'phaser';
import { MAP, MINIMAP } from '../data/balance';
import { EXTRACTION } from '../data/objectives';
import type { Player } from '../entities/Player';
import type { SkillBar } from './SkillBar';

type Point = { x: number; y: number };

/**
 * Whole-map overview in the bottom right corner, unlocked by the camera pole for the rest of the run.
 * Dots for what's left to do, an arrow for the player that points the way they're moving.
 */
export class Minimap {
  private gfx: Phaser.GameObjects.Graphics;
  /** Starts pointing up; keeps the last direction when the player stops. */
  private heading = -Math.PI / 2;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private skillBar: SkillBar,
    private objectives: () => Point[],
    private caches: () => Point[],
    /** True once the extraction point is open; it stays off the map until then. */
    private extractionOpen: () => boolean,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100).setAlpha(0);
    scene.tweens.add({ targets: this.gfx, alpha: 1, duration: MINIMAP.fadeInMs });
  }

  update() {
    const { size, margin } = MINIMAP;
    const { width, height } = this.scene.scale;
    const left = width - size - margin;
    // Narrow screens: the skill bar reaches the corner, so sit on top of it instead.
    const top = left < this.skillBar.right ? this.skillBar.top - size - MINIMAP.skillBarGap : height - size - margin;
    const toMap = (p: Point) => ({ x: left + (p.x / MAP.size + 0.5) * size, y: top + (p.y / MAP.size + 0.5) * size });

    const g = this.gfx.clear();
    g.fillStyle(MINIMAP.backgroundColor, MINIMAP.backgroundAlpha).fillRect(left, top, size, size);
    g.lineStyle(2, MINIMAP.borderColor, 0.8).strokeRect(left, top, size, size);

    const dot = (p: Point, color: number) => {
      const m = toMap(p);
      g.fillStyle(color).fillCircle(m.x, m.y, MINIMAP.dotRadius);
    };
    for (const c of this.caches()) dot(c, MINIMAP.cacheColor);
    for (const o of this.objectives()) dot(o, MINIMAP.objectiveColor);
    if (this.extractionOpen()) dot(EXTRACTION, MINIMAP.extractionColor);

    const v = (this.player.body as Phaser.Physics.Arcade.Body).velocity;
    if (v.lengthSq() > 1) this.heading = Math.atan2(v.y, v.x);
    const at = toMap(this.player);
    const pt = (a: number) => ({ x: at.x + Math.cos(this.heading + a) * MINIMAP.arrowSize, y: at.y + Math.sin(this.heading + a) * MINIMAP.arrowSize });
    const tip = pt(0);
    const l = pt(2.5);
    const r = pt(-2.5);
    g.fillStyle(MINIMAP.playerColor).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  }
}
