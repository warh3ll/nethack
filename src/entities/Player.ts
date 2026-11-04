import Phaser from 'phaser';
import { PLAYER } from '../data/balance';
import { FRAME, dirFromAngle, playerAnimKey, type Dir8, type PlayerState } from '../data/playerAnims';
import type { PlayerStats } from '../systems/Progression';

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  /** While true (a hack prompt wants typing), the WASD letters don't move the player; the arrow keys still do. */
  typingLock = false;
  private invulnerableUntil = 0;
  private facing: Dir8 = 'down';
  /** Ms left of the shooting pose; refilled by every shot (see noteShot). */
  private shootingMs = 0;
  private shotFacing: Dir8 = 'down';
  private deathStarted = false;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

  /** Live stats (base + passives), owned and re-summed by Progression. */
  constructor(scene: Phaser.Scene, x: number, y: number, private stats: PlayerStats) {
    super(scene, x, y, 'player-idle-down');
    this.hp = stats.maxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(PLAYER.spriteScale);
    // Hit circle (world pixels) centred on the frame; the offset is in unscaled frame pixels.
    const k = PLAYER.radius / PLAYER.spriteScale;
    this.body!.setCircle(PLAYER.radius, FRAME.width / 2 - k, FRAME.height / 2 - k);
    this.setCollideWorldBounds(true);
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
  update(stick?: Phaser.Math.Vector2, deltaMs = 0) {
    if (this.isDead) {
      this.setVelocity(0, 0);
      this.playDeath();
      return;
    }
    this.heal((this.stats.hpRegenPerSec * deltaMs) / 1000);
    const k = this.keys;
    const letters = !this.typingLock;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || (letters && k.d.isDown) ? 1 : 0) - (k.left.isDown || (letters && k.a.isDown) ? 1 : 0),
      (k.down.isDown || (letters && k.s.isDown) ? 1 : 0) - (k.up.isDown || (letters && k.w.isDown) ? 1 : 0),
    );
    if (dir.lengthSq() > 0) {
      // Normalize so diagonals aren't faster.
      dir.normalize();
    } else if (stick) {
      dir.copy(stick).limit(1);
    }
    dir.scale(this.stats.moveSpeed);
    this.setVelocity(dir.x, dir.y);
    const moving = dir.lengthSq() > 0;
    this.shootingMs = Math.max(0, this.shootingMs - deltaMs);
    const shooting = this.shootingMs > 0;
    if (shooting) this.facing = this.shotFacing;
    else if (moving) this.facing = dirFromAngle(dir.angle());
    const state: PlayerState = shooting ? (moving ? 'runshoot' : 'shooting') : moving ? 'run' : 'idle';
    this.play(playerAnimKey(state, this.facing), true);
  }

  /** Called by weapons when they fire: the player turns to the shot and shows the shooting pose for a moment. */
  noteShot(angle: number) {
    this.shotFacing = dirFromAngle(angle);
    this.shootingMs = PLAYER.shootingPoseMs;
  }

  /** Total time the death animation plus its hold take. */
  get deathDurationMs() {
    return (FRAME.count / PLAYER.deathFps) * 1000 + PLAYER.deathHoldMs;
  }

  private playDeath() {
    if (this.deathStarted) return;
    this.deathStarted = true;
    this.setAlpha(1);
    this.play(playerAnimKey('death', this.facing));
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
