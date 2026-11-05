import Phaser from 'phaser';
import { getVirusStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import { ENEMY_KILLED, type Enemy } from './Enemy';

const INFECTED_COLOR = 0x5fe08a;

/** Look of the spread animation (cosmetic only, not balance). */
const JUMP_FX = { radius: 5, durationMs: 160, pulseMs: 250 };

/**
 * Hacking weapon: infects an enemy in range, which then takes damage over time.
 * When an infected enemy dies (from anything), the infection jumps to nearby enemies.
 * Stats come from data/skills.ts.
 */
export class Virus {
  level = 1;
  private nextInfectAt = 0;
  private nextTickAt = 0;
  private fx: Phaser.GameObjects.Graphics;
  private jumpPool: Phaser.GameObjects.Arc[] = [];
  private pulsePool: Phaser.GameObjects.Arc[] = [];
  private scene: Phaser.Scene;

  constructor(
    readonly skillId: string,
    private owner: Phaser.GameObjects.Components.Transform,
    private enemies: Phaser.Physics.Arcade.Group,
    private playerStats: PlayerStats,
    scene: Phaser.Scene,
    /** Called when the infection itself kills an enemy, so the scene can count the kill and XP. */
    private onKill: (enemy: Enemy) => void,
  ) {
    this.scene = scene;
    this.fx = scene.add.graphics().setDepth(5);
    scene.events.on(ENEMY_KILLED, this.spreadFrom, this);
    scene.events.once('shutdown', () => scene.events.off(ENEMY_KILLED, this.spreadFrom, this));
  }

  get stats() {
    return getVirusStats(this.skillId, this.level);
  }

  update(time: number) {
    const s = this.stats;

    if (time >= this.nextInfectAt) {
      const target = this.nearestUninfected(this.owner.x, this.owner.y, s.infectRange, null);
      if (target) {
        this.infect(target, s.dps * this.playerStats.damageMult, s.spreadRange, s.spreadCount);
        this.nextInfectAt = time + s.cooldownMs;
      }
    }

    if (time >= this.nextTickAt) {
      this.nextTickAt = time + s.tickMs;
      for (const obj of this.enemies.getChildren()) {
        const e = obj as Enemy;
        if (!e.active || !e.infection) continue;
        // Killing here fires ENEMY_KILLED, which spreads the infection.
        if (e.takeDamage((e.infection.dps * s.tickMs) / 1000, false, this.skillId)) this.onKill(e);
      }
    }

    this.drawInfected();
  }

  private infect(e: Enemy, dps: number, spreadRange: number, spreadCount: number) {
    e.infection = { dps, spreadRange, spreadCount };
  }

  private spreadFrom(dead: Enemy) {
    const inf = dead.infection;
    if (!inf) return;
    for (let i = 0; i < inf.spreadCount; i++) {
      const next = this.nearestUninfected(dead.x, dead.y, inf.spreadRange, dead);
      if (!next) return;
      this.infect(next, inf.dps, inf.spreadRange, inf.spreadCount);
      this.playJump(dead.x, dead.y, next.x, next.y);
    }
  }

  /** Cosmetic: a glowing packet flies from the dead enemy to the new victim. Circles are pooled and reused. */
  private playJump(fromX: number, fromY: number, toX: number, toY: number) {
    let dot = this.jumpPool.find((d) => !d.visible);
    if (!dot) {
      dot = this.scene.add.circle(0, 0, JUMP_FX.radius, INFECTED_COLOR).setDepth(6);
      this.jumpPool.push(dot);
    }
    dot.setPosition(fromX, fromY).setScale(1.6).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: dot,
      x: toX,
      y: toY,
      scale: 0.6,
      alpha: 0.4,
      duration: JUMP_FX.durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        dot.setVisible(false);
        // Pulse on arrival.
        this.pulseAt(toX, toY);
      },
    });
  }

  private pulseAt(x: number, y: number) {
    let ring = this.pulsePool.find((r) => !r.visible);
    if (!ring) {
      ring = this.scene.add.circle(0, 0, JUMP_FX.radius * 2).setStrokeStyle(2, INFECTED_COLOR).setDepth(6);
      this.pulsePool.push(ring);
    }
    ring.setPosition(x, y).setScale(0.5).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: JUMP_FX.pulseMs,
      onComplete: () => ring.setVisible(false),
    });
  }

  private nearestUninfected(x: number, y: number, range: number, exclude: Enemy | null): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range * range;
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || e.infection || e === exclude) continue;
      const d = Phaser.Math.Distance.Squared(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Green ring around every infected enemy. */
  private drawInfected() {
    this.fx.clear().lineStyle(2, INFECTED_COLOR, 0.9);
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (e.active && e.infection) this.fx.strokeCircle(e.x, e.y, e.stats.radius + 4);
    }
  }
}
