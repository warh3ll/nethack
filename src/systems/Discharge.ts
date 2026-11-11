import Phaser from 'phaser';
import { CYBER_COLOR, CYBER_FX, type CyberEffects } from '../data/cyberware';
import type { Enemy } from '../entities/Enemy';

/** Source id for damage and kills, so the run stats and damage numbers name the piece. */
const SOURCE = 'dischargePlates';

/**
 * Auxilliary Discharge Plates (docs/CYBERWARE.md): when an enemy comes within the radius, every enemy in it is zapped
 * for flat damage and a stun, then the plates recharge. They wait, charged, until something is close.
 */
export class Discharge {
  private readyAt = 0;
  private gfx: Phaser.GameObjects.Graphics;
  /** Arcs still on screen: endpoints and the game time they were made. */
  private arcs: { x: number; y: number; at: number }[] = [];

  constructor(
    scene: Phaser.Scene,
    private player: { x: number; y: number },
    private enemies: Phaser.Physics.Arcade.Group,
    private cfg: NonNullable<CyberEffects['discharge']>,
    /** Called for each enemy the zap kills (XP and the kill count). */
    private onKill: (e: Enemy) => void,
  ) {
    this.gfx = scene.add.graphics().setDepth(11);
  }

  update(time: number) {
    this.draw(time);
    if (time < this.readyAt) return;
    const r2 = this.cfg.radius ** 2;
    const inRange = (this.enemies.getChildren() as Enemy[]).filter(
      (e) => e.active && !e.hijacked && (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2 <= r2,
    );
    if (inRange.length === 0) return;
    this.readyAt = time + this.cfg.cooldownMs;
    for (const e of inRange) {
      this.arcs.push({ x: e.x, y: e.y, at: time });
      // Flat damage (not boosted by OverClock). Stun-immune enemies (stunMultiplier 0) only take the damage.
      if (e.takeDamage(this.cfg.damage, true, SOURCE)) this.onKill(e);
      else e.stun(time, this.cfg.stunMs);
    }
  }

  /** Jagged lightning from the player to each zapped enemy, fading out. */
  private draw(time: number) {
    this.gfx.clear();
    this.arcs = this.arcs.filter((a) => time - a.at < CYBER_FX.dischargeFxMs);
    const j = CYBER_FX.dischargeJitter;
    for (const a of this.arcs) {
      const life = 1 - (time - a.at) / CYBER_FX.dischargeFxMs;
      this.gfx.lineStyle(2, CYBER_COLOR, life);
      this.gfx.beginPath().moveTo(this.player.x, this.player.y);
      const steps = 5;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        this.gfx.lineTo(Phaser.Math.Linear(this.player.x, a.x, t) + Phaser.Math.Between(-j, j), Phaser.Math.Linear(this.player.y, a.y, t) + Phaser.Math.Between(-j, j));
      }
      this.gfx.lineTo(a.x, a.y).strokePath();
    }
  }
}
