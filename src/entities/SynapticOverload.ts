import Phaser from 'phaser';
import { getSynapticStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import { ENEMY_KILLED, type Enemy } from './Enemy';

const COLOR = 0x4d7cff;

/** Look of the explosion (cosmetic only, not balance). */
const FX = { durationMs: 300 };

/**
 * Hacking skill: picks a random enemy between minRange and maxRange from the player and uploads a hack to it.
 * If the hack finishes the enemy dies and explodes, hurting every enemy around it (never the player).
 * The hack restarts on a new target if the enemy dies or leaves the range band while it uploads.
 * Enemies with a health bar (Goon, outposts) are never picked. Stats come from data/skills.ts.
 */
export class SynapticOverload {
  level = 1;
  private target: Enemy | null = null;
  private hackStartedAt = 0;
  private nextHackAt = 0;
  private fx: Phaser.GameObjects.Graphics;
  private boomPool: Phaser.GameObjects.Arc[] = [];

  constructor(
    readonly skillId: string,
    private owner: Phaser.GameObjects.Components.Transform,
    private enemies: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
    private scene: Phaser.Scene,
    /** Called for every enemy this skill kills, so the scene can count the kill and XP. */
    private onKill: (enemy: Enemy) => void,
  ) {
    this.fx = scene.add.graphics().setDepth(5);
    scene.events.on(ENEMY_KILLED, this.onEnemyDied, this);
    scene.events.once('shutdown', () => scene.events.off(ENEMY_KILLED, this.onEnemyDied, this));
  }

  get stats() {
    return getSynapticStats(this.skillId, this.level);
  }

  update(time: number) {
    const s = this.stats;
    this.fx.clear();

    if (this.target && !this.validTarget(this.target, s.minRange, s.maxRange)) this.target = null;
    if (!this.target) {
      if (time < this.nextHackAt) return;
      this.target = this.pickTarget(s.minRange, s.maxRange);
      if (!this.target) return;
      this.hackStartedAt = time;
    }

    const t = this.target;
    const progress = Math.min(1, (time - this.hackStartedAt) / s.hackMs);
    // Upload beam from the player to the target, and a ring that closes in on the target as the hack fills.
    this.fx.lineStyle(1 + progress * 2, COLOR, 0.35 + progress * 0.5).lineBetween(this.owner.x, this.owner.y, t.x, t.y);
    this.fx.lineStyle(2, COLOR, 0.9).strokeCircle(t.x, t.y, t.stats.radius + 4 + (1 - progress) * 14);

    if (progress < 1) return;
    this.target = null;
    this.nextHackAt = time + s.cooldownMs;
    this.explode(t, s.damage * this.playerStats.damageMult, s.radius);
  }

  private validTarget(e: Enemy, minRange: number, maxRange: number) {
    if (!e.active) return false;
    const d = Phaser.Math.Distance.Between(this.owner.x, this.owner.y, e.x, e.y);
    return d >= minRange && d <= maxRange;
  }

  private pickTarget(minRange: number, maxRange: number): Enemy | null {
    const candidates = this.enemies.getChildren().filter((obj) => {
      const e = obj as Enemy;
      return !e.stats.healthBar && this.validTarget(e, minRange, maxRange);
    });
    return candidates.length ? (Phaser.Utils.Array.GetRandom(candidates) as Enemy) : null;
  }

  /** The target dies outright, then everything near where it stood takes damage. */
  private explode(target: Enemy, damage: number, radius: number) {
    const { x, y } = target;
    if (target.takeDamage(target.hp, false)) this.onKill(target);
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || Phaser.Math.Distance.Between(x, y, e.x, e.y) > radius) continue;
      if (e.takeDamage(damage, true, this.skillId)) this.onKill(e);
    }
    this.playBoom(x, y, radius);
  }

  /** The hack target died to something else (a bullet, the Virus...): the upload is lost. */
  private onEnemyDied(e: Enemy) {
    if (e === this.target) this.target = null;
  }

  private playBoom(x: number, y: number, radius: number) {
    let ring = this.boomPool.find((r) => !r.visible);
    if (!ring) {
      ring = this.scene.add.circle(0, 0, 1, COLOR, 0.25).setStrokeStyle(3, COLOR).setDepth(6);
      this.boomPool.push(ring);
    }
    ring.setPosition(x, y).setRadius(radius).setScale(0.2).setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: FX.durationMs, ease: 'Quad.easeOut', onComplete: () => ring.setVisible(false) });
  }
}
