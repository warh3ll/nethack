import Phaser from 'phaser';
import { ENEMIES, EnemyType } from '../data/balance';

/** Scene event fired when an enemy dies, with the enemy as argument. */
export const ENEMY_KILLED = 'enemy-killed';

/** Set on an enemy infected by the Virus. Spread copies these numbers onto the next victims. */
export interface Infection {
  dps: number;
  spreadRange: number;
  spreadCount: number;
}

/** Pooled enemy. Never destroyed during a run: spawn() reuses it, kill() returns it to the pool. */
export class Enemy extends Phaser.Physics.Arcade.Image {
  hp = 0;
  /** Starting hp of this spawn (may differ from stats.hp), for health bars. */
  maxHp = 0;
  stats!: EnemyType;
  infection: Infection | null = null;
  /** Guard post (guards only): where the enemy stands and returns to. */
  private homeX = 0;
  private homeY = 0;
  private chasing = false;
  /** Set once a guard has been damaged: from then on it chases regardless of distance. */
  private provoked = false;
  /** Game time of the next shot; -1 = not armed yet (starts when a chase starts). */
  private nextShotAt = -1;

  spawn(x: number, y: number, typeKey: string, hp?: number) {
    this.stats = ENEMIES[typeKey];
    this.hp = this.maxHp = hp ?? this.stats.hp;
    this.infection = null;
    this.homeX = x;
    this.homeY = y;
    this.chasing = false;
    this.provoked = false;
    this.nextShotAt = -1;
    this.setTexture(`enemy-${typeKey}`);
    this.enableBody(true, x, y, true, true);
    this.body!.setCircle(this.stats.radius);
    this.setImmovable(!!this.stats.stationary);
    this.clearTint();
  }

  /** Per-frame behaviour: swarm enemies head straight for the player, guards follow their aggro rules. */
  act(playerX: number, playerY: number) {
    if (this.stats.stationary) return this.setVelocity(0, 0);
    const guard = this.stats.guard;
    if (!guard) {
      this.chasing = true;
      return this.chase(playerX, playerY);
    }

    const d = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    // Two radii so a guard at the edge of its range doesn't flicker between chasing and returning.
    this.chasing = this.provoked || d <= guard.aggroRadius || (this.chasing && d <= guard.leashRadius);
    if (this.chasing) return this.chase(playerX, playerY);

    if (Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY) > 6) {
      this.scene.physics.moveTo(this, this.homeX, this.homeY, this.stats.speed);
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Angle to shoot at the player if this enemy is ranged, chasing, in range and off cooldown; otherwise null.
   * The first shot of a chase comes one full cooldown after it starts, so there's time to react.
   */
  shotAngle(time: number, playerX: number, playerY: number): number | null {
    const ranged = this.stats.ranged;
    if (!ranged) return null;
    if (!this.chasing) {
      this.nextShotAt = -1;
      return null;
    }
    if (this.nextShotAt < 0) this.nextShotAt = time + ranged.cooldownMs;
    if (time < this.nextShotAt) return null;
    if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) > ranged.range) return null;
    this.nextShotAt = time + ranged.cooldownMs;
    return Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
  }

  /** A guard that is provoked chases regardless of distance until it dies. */
  provoke() {
    this.provoked = true;
  }

  private chase(targetX: number, targetY: number) {
    this.scene.physics.moveTo(this, targetX, targetY, this.stats.speed);
  }

  /** Returns true if this hit killed the enemy. `flash: false` is for damage over time. */
  takeDamage(amount: number, flash = true): boolean {
    this.hp -= amount;
    this.provoke();
    if (this.hp <= 0) {
      this.kill();
      return true;
    }
    if (flash) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    }
    return false;
  }

  kill() {
    // Emitted while the enemy still has its position, so listeners (Virus) can spread from it.
    this.scene.events.emit(ENEMY_KILLED, this);
    this.infection = null;
    this.disableBody(true, true);
  }
}
