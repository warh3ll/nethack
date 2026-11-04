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
  stats!: EnemyType;
  infection: Infection | null = null;

  spawn(x: number, y: number, typeKey: string) {
    this.stats = ENEMIES[typeKey];
    this.hp = this.stats.hp;
    this.infection = null;
    this.setTexture(`enemy-${typeKey}`);
    this.enableBody(true, x, y, true, true);
    this.body!.setCircle(this.stats.radius);
    this.clearTint();
  }

  chase(targetX: number, targetY: number) {
    this.scene.physics.moveTo(this, targetX, targetY, this.stats.speed);
  }

  /** Returns true if this hit killed the enemy. `flash: false` is for damage over time. */
  takeDamage(amount: number, flash = true): boolean {
    this.hp -= amount;
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
