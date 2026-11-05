import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { insideMap } from './MapWall';

/** Pooled projectile. */
export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  /** The skill that fired this (its colour tints the damage numbers). */
  skillId = '';
  pierceLeft = 0;
  private maxDistance = 0;
  private startX = 0;
  private startY = 0;
  /** Enemies already hit by this bullet, so a piercing bullet can't hit the same one twice. */
  private hit = new Set<Enemy>();

  fire(x: number, y: number, angle: number, speed: number, damage: number, pierce: number, range: number, texture: string, skillId: string) {
    this.setTexture(texture);
    this.enableBody(true, x, y, true, true);
    this.setRotation(angle);
    this.body!.setSize(this.width, this.width).setOffset(0, -(this.width - this.height) / 2);
    this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
    this.damage = damage;
    this.skillId = skillId;
    this.pierceLeft = pierce;
    this.maxDistance = range;
    this.startX = x;
    this.startY = y;
    this.hit.clear();
  }

  /** Called on overlap. Returns false if this enemy was already hit by this bullet. */
  tryHit(enemy: Enemy): boolean {
    if (this.hit.has(enemy)) return false;
    this.hit.add(enemy);
    if (this.pierceLeft-- <= 0) this.kill();
    return true;
  }

  /** Called every frame by its group (runChildUpdate). */
  update() {
    if (!this.active) return;
    const spent = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y) > this.maxDistance;
    if (spent || !insideMap(this.x, this.y)) this.kill();
  }

  kill() {
    this.disableBody(true, true);
  }
}
