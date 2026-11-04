import Phaser from 'phaser';
import { insideMap } from './MapWall';

/** Pooled projectile fired by an enemy (the Goon). Hurts the player, passes through other enemies. */
export class EnemyBullet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  private maxDistance = 0;
  private startX = 0;
  private startY = 0;

  fire(x: number, y: number, angle: number, speed: number, damage: number, range: number) {
    this.setTexture('bullet-enemy');
    this.enableBody(true, x, y, true, true);
    this.body!.setCircle(this.width / 2);
    this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
    this.damage = damage;
    this.maxDistance = range;
    this.startX = x;
    this.startY = y;
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
