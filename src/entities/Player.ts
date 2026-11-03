import Phaser from 'phaser';
import { PLAYER } from '../data/balance';
import type { PlayerStats } from '../systems/Progression';

export class Player extends Phaser.Physics.Arcade.Image {
  hp: number;
  private invulnerableUntil = 0;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

  /** Live stats (base + passives), owned and re-summed by Progression. */
  constructor(scene: Phaser.Scene, x: number, y: number, private stats: PlayerStats) {
    super(scene, x, y, 'player');
    this.hp = stats.maxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body!.setCircle(PLAYER.radius);
    this.setDepth(10);
    this.keys = scene.input.keyboard!.addKeys('up,down,left,right,w,a,s,d') as Player['keys'];
  }

  get maxHp() {
    return this.stats.maxHp;
  }

  get isDead() {
    return this.hp <= 0;
  }

  /** `stick` is the touch joystick (length 0..1); it's used when no movement key is held. */
  update(stick?: Phaser.Math.Vector2) {
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0),
      (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0),
    );
    if (dir.lengthSq() > 0) {
      // Normalize so diagonals aren't faster.
      dir.normalize();
    } else if (stick) {
      dir.copy(stick).limit(1);
    }
    dir.scale(this.stats.moveSpeed);
    this.setVelocity(dir.x, dir.y);
    if (dir.lengthSq() > 0) this.setRotation(dir.angle());
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Returns true if damage was applied (false while invulnerable). */
  takeDamage(amount: number, now: number): boolean {
    if (now < this.invulnerableUntil || this.isDead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = now + PLAYER.invulnerableMs;
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 2 });
    return true;
  }
}
