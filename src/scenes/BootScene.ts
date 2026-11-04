import Phaser from 'phaser';
import { ENEMIES, PLAYER } from '../data/balance';
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
      if (s.kind !== 'weapon' || s.behavior === 'virus') continue;
      g.fillStyle(s.color).fillRect(0, 0, 10, 4);
      g.generateTexture(`bullet-${key}`, 10, 4).clear();
    }

    // Enemy bullet: glowing orange ball.
    g.fillStyle(0xff8a2e).fillCircle(5, 5, 5);
    g.fillStyle(0xffffff).fillCircle(5, 5, 2);
    g.generateTexture('bullet-enemy', 10, 10).clear();

    // Credit chip: small gold microchip.
    g.fillStyle(0xffd23e).fillRect(1, 1, 10, 10);
    g.fillStyle(0x05060a).fillRect(4, 4, 4, 4);
    g.generateTexture('credit-chip', 12, 12).clear();

    // Hackable server: dark tower with status lights.
    g.fillStyle(0x0a0e1e).fillRect(0, 0, 40, 56);
    g.lineStyle(2, 0x2ef2ff).strokeRect(1, 1, 38, 54);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x1a2140).fillRect(6, 6 + i * 12, 28, 8);
      g.fillStyle(i % 2 ? 0xff2e88 : 0x5fe08a).fillRect(8, 8 + i * 12, 4, 4);
    }
    g.generateTexture('server', 40, 56).clear();

    // Dossier: gold folder with text lines.
    g.fillStyle(0xffd23e).fillRect(0, 4, 28, 30);
    g.fillRect(0, 0, 12, 6);
    g.fillStyle(0x05060a).fillRect(5, 13, 18, 2).fillRect(5, 19, 18, 2).fillRect(5, 25, 12, 2);
    g.generateTexture('dossier', 28, 34).clear();

    // Company secrets: purple data disk.
    g.fillStyle(0x9b5cff).fillRect(0, 0, 30, 30);
    g.fillStyle(0x05060a).fillRect(6, 0, 18, 10).fillRect(10, 18, 10, 12);
    g.fillStyle(0xffffff).fillRect(17, 2, 4, 6);
    g.generateTexture('secrets', 30, 30).clear();

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
