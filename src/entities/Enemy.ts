import Phaser from 'phaser';
import { ENEMIES, EnemyType } from '../data/balance';

/** Pooled enemy. Never destroyed during a run: spawn() reuses it, kill() returns it to the pool. */
export class Enemy extends Phaser.Physics.Arcade.Image {
  hp = 0;
  stats!: EnemyType;

  spawn(x: number, y: number, typeKey: string) {
    this.stats = ENEMIES[typeKey];
    this.hp = this.stats.hp;
    this.setTexture(`enemy-${typeKey}`);
    this.enableBody(true, x, y, true, true);
    this.body!.setCircle(this.stats.radius);
    this.clearTint();
  }

  chase(targetX: number, targetY: number) {
    this.scene.physics.moveTo(this, targetX, targetY, this.stats.speed);
  }

  /** Returns true if this hit killed the enemy. */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.kill();
      return true;
    }
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    return false;
  }

  kill() {
    this.disableBody(true, true);
  }
}
