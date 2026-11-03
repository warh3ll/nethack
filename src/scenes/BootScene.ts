import Phaser from 'phaser';
import { ENEMIES, PLAYER } from '../data/balance';
import { GUNS } from '../data/guns';
import { SKILLS } from '../data/skills';

/**
 * Creates placeholder textures from code so the game runs with zero art.
 * When real assets exist, load them here (this.load.image / spritesheet)
 * under the same keys and the rest of the game picks them up.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const g = this.add.graphics();

    // Player: cyan circle with a "nose" so facing is readable.
    const r = PLAYER.radius;
    g.fillStyle(0x2ef2ff).fillCircle(r, r, r);
    g.fillStyle(0xffffff).fillCircle(r * 1.6, r, r * 0.3);
    g.generateTexture('player', r * 2, r * 2).clear();

    for (const [key, e] of Object.entries(ENEMIES)) {
      g.fillStyle(e.color).fillRect(0, 0, e.radius * 2, e.radius * 2);
      g.fillStyle(0x05060a).fillRect(e.radius * 0.5, e.radius * 0.7, e.radius, e.radius * 0.35);
      g.generateTexture(`enemy-${key}`, e.radius * 2, e.radius * 2).clear();
    }

    for (const [key, s] of Object.entries(SKILLS)) {
      if (s.kind !== 'weapon') continue;
      g.fillStyle(s.color).fillRect(0, 0, 10, 4);
      g.generateTexture(`bullet-${key}`, 10, 4).clear();
    }

    for (const [key, gun] of Object.entries(GUNS)) {
      g.fillStyle(gun.color).fillRect(0, 0, gun.bulletWidth, gun.bulletHeight);
      g.generateTexture(`bullet-${key}`, gun.bulletWidth, gun.bulletHeight).clear();
    }

    // Background grid tile.
    const t = 64;
    g.fillStyle(0x05060a).fillRect(0, 0, t, t);
    g.lineStyle(1, 0x1a2140).strokeRect(0, 0, t, t);
    g.fillStyle(0x2a3a70).fillRect(0, 0, 2, 2);
    g.generateTexture('grid', t, t);

    g.destroy();
    this.scene.start('game');
  }
}
