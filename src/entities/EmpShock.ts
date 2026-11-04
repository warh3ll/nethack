import Phaser from 'phaser';
import { getEmpStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import type { Enemy } from './Enemy';

const COLOR = 0x2ef2ff;

/** Look of the pulse (cosmetic only, not balance). */
const FX = { durationMs: 350 };

/**
 * Pulse skill: every cooldownMs a ring expands from the player out to `radius`.
 * Every enemy the ring reaches takes damage and is stunned. Nothing happens while no enemy is in range.
 * Stats come from data/skills.ts.
 */
export class EmpShock {
  level = 1;
  private nextPulseAt = 0;
  private ringPool: Phaser.GameObjects.Arc[] = [];

  constructor(
    readonly skillId: string,
    private owner: Phaser.GameObjects.Components.Transform,
    private enemies: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
    private scene: Phaser.Scene,
    /** Called for every enemy this skill kills, so the scene can count the kill and XP. */
    private onKill: (enemy: Enemy) => void,
  ) {}

  get stats() {
    return getEmpStats(this.skillId, this.level);
  }

  update(time: number) {
    if (time < this.nextPulseAt) return;
    const s = this.stats;
    const hit = this.enemies.getChildren().filter((obj) => {
      const e = obj as Enemy;
      return e.active && Phaser.Math.Distance.Between(this.owner.x, this.owner.y, e.x, e.y) <= s.radius + e.stats.radius;
    }) as Enemy[];
    if (hit.length === 0) return; // wait until something is in range
    this.nextPulseAt = time + s.cooldownMs;

    const damage = s.damage * this.playerStats.damageMult;
    for (const e of hit) {
      e.stun(time, s.stunMs);
      if (e.takeDamage(damage)) this.onKill(e);
    }
    this.playRing(s.radius);
  }

  private playRing(radius: number) {
    let ring = this.ringPool.find((r) => !r.visible);
    if (!ring) {
      ring = this.scene.add.circle(0, 0, 1, COLOR, 0.12).setStrokeStyle(3, COLOR).setDepth(6);
      this.ringPool.push(ring);
    }
    ring.setPosition(this.owner.x, this.owner.y).setRadius(radius).setScale(0.1).setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: FX.durationMs, ease: 'Quad.easeOut', onComplete: () => ring.setVisible(false) });
  }
}
