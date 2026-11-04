import Phaser from 'phaser';
import { ENEMIES } from '../data/balance';
import { SKILLS } from '../data/skills';
import { SERVER } from '../data/objectives';
import { loadEnemySheets, createEnemyAnims, ENEMY_SPRITES } from '../data/enemyAnims';
import { loadPlayerSheets, createPlayerAnims } from '../data/playerAnims';

/**
 * Creates textures from code and loads the sprite sheets.
 * Load image assets here (this.load.image / spritesheet)
 * under the texture keys the rest of the game uses.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.setPath('assets/parallax/');
    for (let i = 1; i <= 5; i++) this.load.image(`parallax-${i}`, `layer-${i}.png`);
    loadPlayerSheets(this);
    loadEnemySheets(this);
    this.load.setPath('assets/floor/');
    this.load.image('floor', 'floor.png');
    this.load.setPath('assets/server/');
    this.load.spritesheet('server', 'server.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    const g = this.add.graphics();
    createPlayerAnims(this);
    createEnemyAnims(this);

    // Pixel art sprites are scaled up, so sample them without smoothing (the default blurs them). Parallax and generated textures stay smooth.
    for (const key of this.textures.getTextureKeys()) {
      if (key === 'server' || key === 'floor' || key.startsWith('enemy-') || key.startsWith('player-')) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    for (const [key, e] of Object.entries(ENEMIES)) {
      if (key in ENEMY_SPRITES) continue; // drawn from its sprite sheet instead
      g.fillStyle(e.color).fillRect(0, 0, e.radius * 2, e.radius * 2);
      g.fillStyle(0x05060a).fillRect(e.radius * 0.5, e.radius * 0.7, e.radius, e.radius * 0.35);
      g.generateTexture(`enemy-${key}`, e.radius * 2, e.radius * 2).clear();
    }

    for (const [key, s] of Object.entries(SKILLS)) {
      if (s.kind !== 'weapon' || s.behavior === 'virus') continue;
      // Fast bullets are drawn long: the physics body is as wide as the texture, so they can't skip over enemies between frames.
      const w = s.levels.some((l) => (l as { projectileSpeed: number }).projectileSpeed > 1000) ? 32 : 10;
      g.fillStyle(s.color).fillRect(0, 0, w, 4);
      g.generateTexture(`bullet-${key}`, w, 4).clear();
    }

    // Enemy bullet: glowing orange ball.
    g.fillStyle(0xff8a2e).fillCircle(5, 5, 5);
    g.fillStyle(0xffffff).fillCircle(5, 5, 2);
    g.generateTexture('bullet-enemy', 10, 10).clear();

    // Credit chip: small gold microchip.
    g.fillStyle(0xffd23e).fillRect(1, 1, 10, 10);
    g.fillStyle(0x05060a).fillRect(4, 4, 4, 4);
    g.generateTexture('credit-chip', 12, 12).clear();

    this.anims.create({ key: 'server', frames: this.anims.generateFrameNumbers('server', { start: 0, end: 1 }), frameRate: SERVER.animFps, repeat: -1 });

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

    // Data cache: cyan crate with a bright core.
    g.fillStyle(0x0a2a3a).fillRect(0, 0, 32, 28);
    g.lineStyle(2, 0x2ef2ff).strokeRect(1, 1, 30, 26);
    g.fillStyle(0x2ef2ff).fillRect(12, 8, 8, 12);
    g.fillStyle(0xffffff).fillRect(14, 10, 4, 4);
    g.generateTexture('data-cache', 32, 28).clear();

    // Tile size of the wall texture below (the floor is loaded from public/assets/floor/floor.png).
    const t = 64;

    // Boundary wall: hazard stripes that tile in every direction.
    g.fillStyle(0x1a0a18).fillRect(0, 0, t, t);
    g.lineStyle(14, 0xff2e88, 0.8);
    // Lines overshoot the tile so their square ends don't leave notches at the seams.
    for (let x = -t; x <= t; x += t / 2) g.lineBetween(x - t / 2, t + t / 2, x + t + t / 2, -t / 2);
    g.generateTexture('wall', t, t);

    g.destroy();
    this.scene.start('game');
  }
}
