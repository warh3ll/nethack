import Phaser from 'phaser';
import { MAP, MINIMAP } from '../data/balance';
import type { Player } from '../entities/Player';
import type { City, Rect } from '../systems/City';
import type { SkillBar } from './SkillBar';

type Point = { x: number; y: number };
type FactoryMark = { rect: Rect; running: boolean };

/**
 * Whole-map overview in the bottom right corner, unlocked by the camera pole for the rest of the run.
 * The street layout underneath (buildings, plazas and factories), dots for what's left to do,
 * and an arrow for the player that points the way they're moving.
 */
export class Minimap {
  /** The street layout, drawn once (and again when a factory goes down) and moved with the corner. */
  private layout: Phaser.GameObjects.Graphics;
  private gfx: Phaser.GameObjects.Graphics;
  private factoriesDrawn = -1;
  /** Starts pointing up; keeps the last direction when the player stops. */
  private heading = -Math.PI / 2;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private skillBar: SkillBar,
    private objectives: () => Point[],
    private caches: () => Point[],
    private extraction: Point,
    /** True once the extraction point is open; it stays off the map until then. */
    private extractionOpen: () => boolean,
    private city: City,
    private factories: () => FactoryMark[],
  ) {
    this.layout = scene.add.graphics().setScrollFactor(0).setDepth(100).setAlpha(0);
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100).setAlpha(0);
    scene.tweens.add({ targets: [this.layout, this.gfx], alpha: 1, duration: MINIMAP.fadeInMs });
  }

  /** Background, plazas, buildings and factories, in the minimap's own coordinates (0 to size). */
  private drawLayout(factories: FactoryMark[]) {
    const { size } = MINIMAP;
    const k = size / this.city.size;
    const box = (r: Rect, color: number, alpha = 1) => this.layout.fillStyle(color, alpha).fillRect(r.x * k, r.y * k, r.w * k, r.h * k);
    const g = this.layout.clear();
    g.fillStyle(MINIMAP.backgroundColor, MINIMAP.backgroundAlpha).fillRect(0, 0, size, size);
    for (const b of this.city.blocks) {
      if (b.plaza) box(b, MINIMAP.plazaColor);
      else if (!b.factory) for (const r of b.buildings) box(r, MINIMAP.buildingColor);
    }
    for (const f of factories) box(f.rect, f.running ? MINIMAP.factoryColor : MINIMAP.factoryDownColor);
  }

  update() {
    const { size, margin } = MINIMAP;
    const { width, height } = this.scene.scale;
    const left = width - size - margin;
    // Narrow screens: the skill bar reaches the corner, so sit on top of it instead.
    const top = left < this.skillBar.right ? this.skillBar.top - size - MINIMAP.skillBarGap : height - size - margin;
    const toMap = (p: Point) => ({ x: left + (p.x / MAP.size + 0.5) * size, y: top + (p.y / MAP.size + 0.5) * size });

    const factories = this.factories();
    const running = factories.filter((f) => f.running).length;
    if (running !== this.factoriesDrawn) {
      this.factoriesDrawn = running;
      this.drawLayout(factories);
    }
    this.layout.setPosition(left, top);

    const g = this.gfx.clear();
    g.lineStyle(2, MINIMAP.borderColor, 0.8).strokeRect(left, top, size, size);

    const dot = (p: Point, color: number) => {
      const m = toMap(p);
      g.fillStyle(color).fillCircle(m.x, m.y, MINIMAP.dotRadius);
    };
    for (const c of this.caches()) dot(c, MINIMAP.cacheColor);
    for (const o of this.objectives()) dot(o, MINIMAP.objectiveColor);
    if (this.extractionOpen()) dot(this.extraction, MINIMAP.extractionColor);

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
