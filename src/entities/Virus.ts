import Phaser from 'phaser';
import { DAMAGE_NUMBERS } from '../data/balance';
import { getVirusStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import { ENEMY_KILLED, SHOW_DAMAGE_NUMBER, type Enemy } from './Enemy';

const INFECTED_COLOR = 0x5fe08a;

/** Look of the spread animation (cosmetic only, not balance). */
const JUMP_FX = {
  radius: 5,
  /** Packet speed in pixels/second, so a long jump takes visibly longer than a short one. */
  speed: 900,
  /** A jump never takes less than this, so very short ones still show. */
  minDurationMs: 120,
  pulseMs: 250,
};

/**
 * Hacking weapon: infects an enemy in range, which then takes damage over time.
 * When an infected enemy dies (from anything), the infection jumps to nearby enemies.
 * Every infection runs on the current level and damage bonus, so an upgrade reaches running chains at once.
 * Stats come from data/skills.ts.
 */
export class Virus {
  level = 1;
  private nextInfectAt = 0;
  private nextTickAt = 0;
  /** Game time of the latest update, for spreads that happen between updates. */
  private now = 0;
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
    const dps = s.dps * this.playerStats.damageMult;
    this.now = time;

    // Every frame, so the numbers, the ring and the damage all stop on time.
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || !e.infection) continue;
      if (time >= e.infection.nextNumberAt) {
        e.infection.nextNumberAt += DAMAGE_NUMBERS.dotIntervalMs;
        this.scene.events.emit(SHOW_DAMAGE_NUMBER, e, (dps * DAMAGE_NUMBERS.dotIntervalMs) / 1000, this.skillId);
      }
      if (time >= e.infection.expiresAt) e.infection = null;
    }

    if (time >= this.nextInfectAt) {
      const target = this.nearestUninfected(this.owner.x, this.owner.y, s.infectRange, null);
      if (target) {
        this.infect(target);
        this.playJump(this.owner.x, this.owner.y, target);
        this.nextInfectAt = time + s.cooldownMs;
      }
    }

    if (time >= this.nextTickAt) {
      // Stays on schedule instead of restarting from this frame, so real damage per second matches the shown number.
      this.nextTickAt = time - this.nextTickAt < s.tickMs ? this.nextTickAt + s.tickMs : time + s.tickMs;
      for (const obj of this.enemies.getChildren()) {
        const e = obj as Enemy;
        if (!e.active || !e.infection) continue;
        // Killing here fires ENEMY_KILLED, which spreads the infection.
        if (e.takeDamage((dps * s.tickMs) / 1000, false, this.skillId, false)) this.onKill(e);
      }
    }

    this.drawInfected();
  }

  private infect(e: Enemy) {
    e.infection = {
      expiresAt: this.now + this.stats.maxDurationMs,
      nextNumberAt: this.now + DAMAGE_NUMBERS.dotIntervalMs,
    };
  }

  private spreadFrom(dead: Enemy) {
    if (!dead.infection) return;
    const s = this.stats;
    for (let i = 0; i < s.spreadCount; i++) {
      const next = this.nearestUninfected(dead.x, dead.y, s.spreadRange, dead);
      if (!next) return;
      this.infect(next);
      this.playJump(dead.x, dead.y, next);
    }
  }

  /**
   * Cosmetic: a glowing packet flies to the new victim, from the player or from the dead enemy.
   * It follows the victim as it moves; if the victim dies mid-flight it finishes at the last spot. Circles are pooled and reused.
   */
  private playJump(fromX: number, fromY: number, target: Enemy) {
    let dot = this.jumpPool.find((d) => !d.visible);
    if (!dot) {
      dot = this.scene.add.circle(0, 0, JUMP_FX.radius, INFECTED_COLOR).setDepth(6);
      this.jumpPool.push(dot);
    }
    const packet = dot;
    packet.setPosition(fromX, fromY).setScale(1.6).setAlpha(1).setVisible(true);
    let toX = target.x;
    let toY = target.y;
    const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(JUMP_FX.minDurationMs, (distance / JUMP_FX.speed) * 1000),
      ease: 'Quad.easeIn',
      onUpdate: (tween) => {
        // Infection is cleared on death, so this also stops following a pooled enemy that respawned.
        if (target.active && target.infection) {
          toX = target.x;
          toY = target.y;
        }
        const t = tween.getValue() ?? 0;
        packet
          .setPosition(Phaser.Math.Linear(fromX, toX, t), Phaser.Math.Linear(fromY, toY, t))
          .setScale(Phaser.Math.Linear(1.6, 0.6, t))
          .setAlpha(Phaser.Math.Linear(1, 0.4, t));
      },
      onComplete: () => {
        packet.setVisible(false);
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
