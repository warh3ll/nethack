import Phaser from 'phaser';
import { getRootkitStats } from '../data/skills';
import type { PlayerStats } from '../systems/Progression';
import { ENEMY_KILLED, type Enemy } from './Enemy';

const COLOR = 0xff5a7a;
const SMOKE_COLOR = 0x3a3446;

/** Look of the hijack (cosmetic only, not balance). */
const FX = {
  flashMs: 220,
  flashRadius: 26,
  /** A smoke puff leaves the hijacked enemy this often. */
  puffEveryMs: 90,
  puffMs: 750,
  puffRiseY: 38,
  puffRadius: 7,
  boomMs: 300,
};

interface Hijack {
  enemy: Enemy;
  endsAt: number;
  nextTickAt: number;
  nextPuffAt: number;
}

/**
 * Hacking skill: hijacks nearby enemies. A hijacked enemy turns on the swarm (it chases the nearest other enemy and hurts
 * those it touches, and stops hurting the player and being hit by the player's bullets), smoking until its time runs out,
 * then explodes, hurting everything around it. Enemies with a health bar (Goon, outposts) are never hijacked.
 * Stats come from data/skills.ts.
 */
export class Rootkit {
  level = 1;
  private nextHijackAt = 0;
  /** True from the moment enemies are hijacked until the cooldown has been started after the last one is gone. */
  private hijacking = false;
  private active: Hijack[] = [];
  private flashPool: Phaser.GameObjects.Arc[] = [];
  private smokePool: Phaser.GameObjects.Arc[] = [];
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
    scene.events.on(ENEMY_KILLED, this.onEnemyDied, this);
    scene.events.once('shutdown', () => scene.events.off(ENEMY_KILLED, this.onEnemyDied, this));
  }

  get stats() {
    return getRootkitStats(this.skillId, this.level);
  }

  update(time: number) {
    const s = this.stats;

    // Hijack new enemies when off cooldown and nothing is still hijacked.
    if (this.active.length === 0 && time >= this.nextHijackAt) {
      const targets = this.pickTargets(s.hijackRange, s.count);
      for (const e of targets) this.hijack(e, time, s.durationMs, s.tickMs);
      this.hijacking = targets.length > 0;
    }

    // Iterate over a copy: an explosion can kill other hijacked enemies and change the list.
    for (const h of [...this.active]) {
      if (!this.active.includes(h)) continue;
      const e = h.enemy;
      if (!e.active) continue;

      if (time >= h.endsAt) {
        this.explode(h, s.explosionDamage * this.playerStats.damageMult, s.explosionRadius);
        continue;
      }

      this.steer(e);

      if (time >= h.nextTickAt) {
        h.nextTickAt = time + s.tickMs;
        this.touchDamage(e, s.contactDamage * this.playerStats.damageMult);
      }
      if (time >= h.nextPuffAt) {
        h.nextPuffAt = time + FX.puffEveryMs;
        this.playSmoke(e.x, e.y - e.stats.radius * 0.4);
      }
    }

    // The cooldown starts once the whole batch is gone (exploded, or killed by something else).
    if (this.hijacking && this.active.length === 0) {
      this.hijacking = false;
      this.nextHijackAt = time + s.cooldownMs;
    }
  }

  private pickTargets(range: number, count: number): Enemy[] {
    const candidates = this.enemies.getChildren().filter((obj) => {
      const e = obj as Enemy;
      return (
        e.active &&
        !e.hijacked &&
        !e.stats.healthBar &&
        Phaser.Math.Distance.Between(this.owner.x, this.owner.y, e.x, e.y) <= range
      );
    }) as Enemy[];
    return Phaser.Utils.Array.Shuffle(candidates).slice(0, count);
  }

  private hijack(e: Enemy, time: number, durationMs: number, tickMs: number) {
    e.setHijacked(true);
    this.active.push({ enemy: e, endsAt: time + durationMs, nextTickAt: time + tickMs, nextPuffAt: time });
    this.playFlash(e.x, e.y);
  }

  /** Run at the nearest enemy that is still on the swarm's side; stand still if there is none. */
  private steer(e: Enemy) {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const obj of this.enemies.getChildren()) {
      const o = obj as Enemy;
      if (!o.active || o.hijacked || o.stats.stationary) continue;
      const d = Phaser.Math.Distance.Squared(e.x, e.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best) this.scene.physics.moveTo(e, best.x, best.y, e.stats.speed);
    else e.setVelocity(0, 0);
  }

  /** Damage every swarm enemy the hijacked enemy is touching. */
  private touchDamage(e: Enemy, damage: number) {
    for (const obj of this.enemies.getChildren()) {
      const o = obj as Enemy;
      if (!o.active || o.hijacked) continue;
      const reach = e.stats.radius + o.stats.radius + 4;
      if (Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y) > reach) continue;
      if (o.takeDamage(damage)) this.onKill(o);
    }
  }

  /** The hijacked enemy dies outright, then everything near where it stood takes damage. */
  private explode(h: Hijack, damage: number, radius: number) {
    const e = h.enemy;
    const { x, y } = e;
    this.release(h);
    if (e.takeDamage(e.hp, false)) this.onKill(e);
    for (const obj of this.enemies.getChildren()) {
      const o = obj as Enemy;
      if (!o.active || o.hijacked || Phaser.Math.Distance.Between(x, y, o.x, o.y) > radius) continue;
      if (o.takeDamage(damage)) this.onKill(o);
    }
    this.playBoom(x, y, radius);
  }

  private release(h: Hijack) {
    const i = this.active.indexOf(h);
    if (i >= 0) this.active.splice(i, 1);
  }

  /** A hijacked enemy killed by something else (Virus, EMP, ...) just stops being tracked. */
  private onEnemyDied(e: Enemy) {
    const h = this.active.find((a) => a.enemy === e);
    if (h) this.release(h);
  }

  /** Cosmetic: a quick bright flash on the enemy at the moment it is hijacked. */
  private playFlash(x: number, y: number) {
    let flash = this.flashPool.find((f) => !f.visible);
    if (!flash) {
      flash = this.scene.add.circle(0, 0, FX.flashRadius, 0xffffff, 0.9).setStrokeStyle(3, COLOR).setDepth(7);
      this.flashPool.push(flash);
    }
    flash.setPosition(x, y).setScale(0.4).setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: flash, scale: 1.7, alpha: 0, duration: FX.flashMs, ease: 'Quad.easeOut', onComplete: () => flash.setVisible(false) });
  }

  /** Cosmetic: one smoke puff that rises, grows and fades. Together they make a plume over the enemy. */
  private playSmoke(x: number, y: number) {
    let puff = this.smokePool.find((p) => !p.visible);
    if (!puff) {
      puff = this.scene.add.circle(0, 0, FX.puffRadius, SMOKE_COLOR).setDepth(7);
      this.smokePool.push(puff);
    }
    const drift = Phaser.Math.Between(-10, 10);
    puff.setPosition(x + Phaser.Math.Between(-4, 4), y).setScale(0.6).setAlpha(0.7).setVisible(true);
    this.scene.tweens.add({
      targets: puff,
      x: puff.x + drift,
      y: y - FX.puffRiseY,
      scale: 1.9,
      alpha: 0,
      duration: FX.puffMs,
      ease: 'Quad.easeOut',
      onComplete: () => puff.setVisible(false),
    });
  }

  private playBoom(x: number, y: number, radius: number) {
    let ring = this.boomPool.find((r) => !r.visible);
    if (!ring) {
      ring = this.scene.add.circle(0, 0, 1, COLOR, 0.25).setStrokeStyle(3, COLOR).setDepth(6);
      this.boomPool.push(ring);
    }
    ring.setPosition(x, y).setRadius(radius).setScale(0.2).setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: FX.boomMs, ease: 'Quad.easeOut', onComplete: () => ring.setVisible(false) });
  }
}
