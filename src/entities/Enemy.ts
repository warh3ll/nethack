import Phaser from 'phaser';
import { ENEMIES, EnemyType, NAVIGATION } from '../data/balance';
import { ENEMY_SPRITES, MOVE_STATE, enemyAnimKey } from '../data/enemyAnims';
import { lit } from '../systems/Lighting';
import type { FlowField, Navigation } from '../systems/Navigation';

/** Scene event fired when an enemy dies, with the enemy as argument. */
export const ENEMY_KILLED = 'enemy-killed';

/** Scene event fired when a skill damages an enemy: (enemy, amount, skillId, dealt, showNumber). `dealt` excludes overkill. */
export const ENEMY_DAMAGED = 'enemy-damaged';

const HIJACK_TINT = 0xff5a7a;

/** Half the width of a bullet, for the clear-line check before shooting. */
export const SHOT_RADIUS = 3;

/** Set on an enemy infected by the Virus. Holds timers only: its strength always comes from the Virus's current level. */
export interface Infection {
  /** Game time when the infection runs out. Every new victim gets a fresh one. */
  expiresAt: number;
}

/** Pooled enemy. Never destroyed during a run: spawn() reuses it, kill() returns it to the pool. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp = 0;
  /** Starting hp of this spawn (may differ from stats.hp), for health bars. */
  maxHp = 0;
  stats!: EnemyType;
  infection: Infection | null = null;
  /** Game time until which the enemy is stunned (no moving, no shooting). */
  private stunnedUntil = 0;
  private stunTinted = false;
  /** Hijacked by Rootkit: fights for the player (driven by the Rootkit, not by act()). */
  hijacked = false;
  /** Guard post (guards only): where the enemy stands and returns to. */
  private homeX = 0;
  private homeY = 0;
  private chasing = false;
  /** Set once a guard has been damaged: from then on it chases regardless of distance. */
  private provoked = false;
  /** Game time of the next shot; -1 = not armed yet (starts when a chase starts). */
  private nextShotAt = -1;
  /** Route: rethought every NAVIGATION.rethinkMs. `direct` = clear line to the target, otherwise walk to the waypoint. */
  private rethinkAt = 0;
  private direct = true;
  private waypointX = 0;
  private waypointY = 0;

  spawn(x: number, y: number, typeKey: string, hp?: number) {
    this.stats = ENEMIES[typeKey];
    lit(this);
    this.hp = this.maxHp = hp ?? this.stats.hp;
    this.infection = null;
    this.stunnedUntil = 0;
    this.stunTinted = false;
    this.hijacked = false;
    this.homeX = x;
    this.homeY = y;
    this.chasing = false;
    this.provoked = false;
    this.nextShotAt = -1;
    this.rethinkAt = 0;
    this.direct = true;
    this.enableBody(true, x, y, true, true);
    const sprite = ENEMY_SPRITES[typeKey];
    if (sprite) {
      // Animated sheet: the hit circle is centred on the frame. Phaser reads radius and offset in unscaled frame pixels, so divide the world radius by the sprite scale.
      const key = enemyAnimKey(typeKey, MOVE_STATE);
      this.setTexture(key).setScale(sprite.scale).play(key);
      const k = this.stats.radius / sprite.scale;
      this.body!.setCircle(k, sprite.frameWidth / 2 - k, sprite.frameHeight / 2 - k);
    } else {
      // Pooled enemies are reused, so undo any sprite state left by a previous type.
      this.anims.stop();
      this.setTexture(`enemy-${typeKey}`).setScale(1);
      this.body!.setCircle(this.stats.radius);
    }
    // The swarm shoves itself around; this keeps it from being pushed through the wall.
    this.setCollideWorldBounds(true);
    // Stationary: frozen in place (no integration, can't be pushed). Pooled bodies must be reset for other types.
    this.setImmovable(!!this.stats.stationary);
    (this.body as Phaser.Physics.Arcade.Body).moves = !this.stats.stationary;
    this.clearTint();
  }

  /** Multiplier on walking speed this frame (Proximity Sensors slows enemies near the player). */
  private speedMult = 1;

  /**
   * Per-frame behaviour: swarm enemies come for the player through the streets, guards follow their aggro rules.
   * `slow`: enemies within `radius` of the player walk `pct` percent slower.
   */
  act(playerX: number, playerY: number, time: number, nav: Navigation, decoy: { x: number; y: number } | null = null, slow: { pct: number; radius: number } | null = null) {
    if (this.hijacked) return; // Rootkit steers it
    this.speedMult = slow && Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= slow.radius ? Math.max(0, 1 - slow.pct / 100) : 1;
    if (time < this.stunnedUntil) {
      if (!this.stunTinted) this.applyStunTint();
      return this.setVelocity(0, 0);
    }
    if (this.stunTinted) {
      this.stunTinted = false;
      this.clearTint();
    }
    if (this.stats.stationary) return this.setVelocity(0, 0);
    const guard = this.stats.guard;
    if (!guard) {
      this.chasing = true;
      // A Rootkit decoy takes preference over the player for as long as it lives.
      const tx = decoy ? decoy.x : playerX;
      const ty = decoy ? decoy.y : playerY;
      this.route(tx, ty, decoy ? nav.toDecoy : nav.toPlayer, time, nav);
      // A marksman stops once in range, but only where it can see the target.
      const ranged = this.stats.ranged;
      if (ranged?.holdAtRange && this.direct && Phaser.Math.Distance.Between(this.x, this.y, tx, ty) <= ranged.range) {
        return this.setVelocity(0, 0);
      }
      return this.walk(tx, ty);
    }

    const d = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    // Two radii so a guard at the edge of its range doesn't flicker between chasing and returning.
    this.chasing = this.provoked || d <= guard.aggroRadius || (this.chasing && d <= guard.leashRadius);
    if (this.chasing) {
      this.route(playerX, playerY, nav.toPlayer, time, nav);
      return this.walk(playerX, playerY);
    }

    if (Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY) > 6) {
      this.route(this.homeX, this.homeY, nav.towards({ x: this.homeX, y: this.homeY }), time, nav);
      this.walk(this.homeX, this.homeY);
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Angle to shoot at the player if this enemy is ranged, chasing, in range and off cooldown; otherwise null.
   * The first shot of a chase comes one full cooldown after it starts, so there's time to react.
   * Buildings stop bullets, so it only fires with a clear line; otherwise it stays ready and fires as soon as it has one.
   */
  shotAngle(time: number, playerX: number, playerY: number, nav: Navigation, decoy: { x: number; y: number } | null = null): number | null {
    const ranged = this.stats.ranged;
    if (!ranged || this.hijacked) return null;
    // Swarm enemies shoot at the Rootkit decoy instead of the player while it lives.
    if (decoy && !this.stats.guard) {
      playerX = decoy.x;
      playerY = decoy.y;
    }
    if (time < this.stunnedUntil) {
      // Stunned: no shots, and the cooldown is held so it doesn't fire the instant the stun ends.
      if (this.nextShotAt >= 0) this.nextShotAt = Math.max(this.nextShotAt, this.stunnedUntil);
      return null;
    }
    if (!this.chasing) {
      this.nextShotAt = -1;
      return null;
    }
    if (this.nextShotAt < 0) this.nextShotAt = time + ranged.cooldownMs;
    if (time < this.nextShotAt) return null;
    if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) > ranged.range) return null;
    if (!nav.clearLine(this.x, this.y, playerX, playerY, SHOT_RADIUS)) return null;
    this.nextShotAt = time + ranged.cooldownMs;
    return Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
  }

  /** Stuns for `ms` from game time `now`, scaled by the enemy's stunMultiplier. A shorter stun never cuts a longer one short. */
  stun(now: number, ms: number) {
    if (this.hijacked) return;
    const duration = ms * (this.stats.stunMultiplier ?? 1);
    if (duration <= 0) return;
    this.stunnedUntil = Math.max(this.stunnedUntil, now + duration);
    this.applyStunTint();
  }

  /** Rootkit: switch sides (reddish tint while hijacked). */
  setHijacked(on: boolean) {
    this.hijacked = on;
    if (on) {
      this.stunTinted = false;
      this.setTint(HIJACK_TINT).setTintMode(Phaser.TintModes.MULTIPLY);
    } else {
      this.clearTint();
    }
  }

  private applyStunTint() {
    this.stunTinted = true;
    this.setTint(0x2ef2ff).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** A guard that is provoked chases regardless of distance until it dies. */
  provoke() {
    this.provoked = true;
  }

  /**
   * Decides how to get to the target: straight at it when close with a clear line, otherwise along the flow field.
   * Rethought every NAVIGATION.rethinkMs (a bit randomised so the swarm doesn't all think on the same frame),
   * or as soon as the waypoint is reached.
   */
  private route(targetX: number, targetY: number, field: FlowField, time: number, nav: Navigation) {
    // The hit circle (not the sprite) is what bumps into buildings, so the route is planned from it.
    const body = this.body as Phaser.Physics.Arcade.Body;
    const { x, y } = body.center;
    const atWaypoint = !this.direct && Phaser.Math.Distance.Between(x, y, this.waypointX, this.waypointY) < 8;
    if (time < this.rethinkAt && !atWaypoint) return;
    this.rethinkAt = time + NAVIGATION.rethinkMs * (0.75 + Math.random() * 0.5);
    const r = body.halfWidth;
    const close = Phaser.Math.Distance.Between(x, y, targetX, targetY) <= NAVIGATION.directRange;
    this.direct = close && nav.clearLine(x, y, targetX, targetY, r);
    if (this.direct) return;
    const next = nav.waypoint(field, x, y, r, NAVIGATION.lookahead);
    if (next) {
      this.waypointX = next.x;
      this.waypointY = next.y;
    } else {
      this.direct = true; // no route known (already on the target's tile): straight it is
    }
  }

  /** Straight at the target (the sprite goes there, like the guard's post), or the hit circle along the route. */
  private walk(targetX: number, targetY: number) {
    const speed = this.stats.speed * this.speedMult;
    if (this.direct) return this.scene.physics.moveTo(this, targetX, targetY, speed);
    const { x, y } = (this.body as Phaser.Physics.Arcade.Body).center;
    const a = Math.atan2(this.waypointY - y, this.waypointX - x);
    this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  /** Returns true if this hit killed the enemy. `flash: false` is for damage over time. */
  takeDamage(amount: number, flash = true, skillId?: string, showNumber = true): boolean {
    // Attributed damage is counted in the run stats and gets a floating number (not for outright kills: showNumber = false).
    if (skillId) this.scene.events.emit(ENEMY_DAMAGED, this, amount, skillId, Math.min(amount, Math.max(0, this.hp)), showNumber);
    this.hp -= amount;
    this.provoke();
    if (this.hp <= 0) {
      this.kill();
      return true;
    }
    if (flash) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.scene.time.delayedCall(60, () => {
        if (!this.active) return;
        this.clearTint();
        if (this.hijacked) this.setTint(HIJACK_TINT).setTintMode(Phaser.TintModes.MULTIPLY);
        else if (this.stunTinted) this.applyStunTint(); // still stunned: back to the stun colour
      });
    }
    return false;
  }

  /** Quietly back to the pool: no death event, so no drop, no XP and no Virus spread. For stragglers left far behind. */
  despawn() {
    this.infection = null;
    this.hijacked = false;
    this.disableBody(true, true);
  }

  kill() {
    // Emitted while the enemy still has its position, so listeners (Virus) can spread from it.
    this.scene.events.emit(ENEMY_KILLED, this);
    this.infection = null;
    this.hijacked = false;
    this.disableBody(true, true);
  }
}
