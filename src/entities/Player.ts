import Phaser from 'phaser';
import { DASH, PLAYER } from '../data/balance';
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
  /** Dash timers, in game ms. */
  private dashMs = 0;
  private dashCooldownMs = 0;
  private dashSafeMs = 0;
  private dashVel = new Phaser.Math.Vector2();
  private trail: { x: number; y: number; age: number }[] = [];
  private trailGfx: Phaser.GameObjects.Graphics;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space', Phaser.Input.Keyboard.Key>;

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
    this.trailGfx = scene.add.graphics().setDepth(9);
    this.on(Phaser.GameObjects.Events.DESTROY, () => this.trailGfx.destroy());
    this.keys = scene.input.keyboard!.addKeys('up,down,left,right,w,a,s,d,space') as Player['keys'];
  }

  get maxHp() {
    return this.stats.maxHp;
  }

  get isDead() {
    return this.hp <= 0;
  }

  /** 0..1, how far the dash cooldown has recharged (1 = ready). */
  get dashReadiness() {
    return 1 - this.dashCooldownMs / DASH.cooldownMs;
  }

  /** `stick` is the touch joystick (length 0..1); it's used when no movement key is held. */
  update(stick?: Phaser.Math.Vector2, deltaMs = 0) {
    if (this.isDead) {
      this.setVelocity(0, 0);
      this.playDeath();
      return;
    }
    this.heal((this.stats.hpRegenPerSec * deltaMs) / 1000);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    this.dashSafeMs = Math.max(0, this.dashSafeMs - deltaMs);
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
    if (this.dashMs <= 0 && this.dashCooldownMs <= 0 && Phaser.Input.Keyboard.JustDown(k.space) && dir.lengthSq() > 0) {
      // Snap to one of the 8 directions (the stick can point anywhere).
      const a = Math.round(dir.angle() / (Math.PI / 4)) * (Math.PI / 4);
      this.dashVel.setToPolar(a, DASH.distance / (DASH.durationMs / 1000));
      this.dashMs = DASH.durationMs;
      this.dashCooldownMs = DASH.cooldownMs;
      this.facing = dirFromAngle(a);
    }
    if (this.dashMs > 0) {
      this.dashMs -= deltaMs;
      if (this.dashMs <= 0) this.dashSafeMs = DASH.invulnerableAfterMs;
      this.setVelocity(this.dashVel.x, this.dashVel.y);
      this.trail.push({ x: this.x, y: this.y, age: 0 });
      this.play(playerAnimKey('dash', this.facing), true);
      this.drawTrail(deltaMs);
      return;
    }
    this.drawTrail(deltaMs);
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

  /** Teal streak: the recent dash positions as a tapered ribbon that fades with age. */
  private drawTrail(deltaMs: number) {
    const g = this.trailGfx;
    g.clear();
    for (const p of this.trail) p.age += deltaMs;
    while (this.trail.length && this.trail[0].age >= DASH.trailFadeMs) this.trail.shift();
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const life = 1 - b.age / DASH.trailFadeMs;
      g.lineStyle(DASH.trailWidth * life, DASH.trailColor, 0.8 * life);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
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
    if (now < this.invulnerableUntil || this.dashMs > 0 || this.dashSafeMs > 0 || this.isDead) return false;
    this.hp = Math.max(0, this.hp - Math.max(PLAYER.minDamageTaken, amount - this.stats.damageReduction));
    this.invulnerableUntil = now + PLAYER.invulnerableMs;
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 2 });
    return true;
  }
}
