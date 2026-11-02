import Phaser from 'phaser';
import { SPAWNING, STARTING_SKILL } from '../data/balance';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { PrimaryGun } from '../entities/PrimaryGun';
import { PRIMARY_GUN } from '../data/guns';
import { Weapon } from '../entities/Weapon';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private weapons: Weapon[] = [];
  private primaryGun!: PrimaryGun;
  private background!: Phaser.GameObjects.TileSprite;
  private hud!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;

  private elapsedMs = 0;
  private nextSpawnAt = 0;
  private kills = 0;
  private gameOver = false;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  create() {
    this.elapsedMs = 0;
    this.nextSpawnAt = 0;
    this.kills = 0;
    this.gameOver = false;

    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'grid').setOrigin(0).setScrollFactor(0);

    // Object pools: everything is created up front-ish and reused, never destroyed mid-run.
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: SPAWNING.maxEnemies });
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });

    this.player = new Player(this, 0, 0);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.weapons = [new Weapon(STARTING_SKILL, this.player, this.enemies, this.bullets)];
    this.primaryGun = new PrimaryGun(PRIMARY_GUN, this.player, this.bullets, this.cameras.main, this.input.activePointer);

    this.physics.add.overlap(this.bullets, this.enemies, (a, b) => {
      const bullet = (a instanceof Bullet ? a : b) as Bullet;
      const enemy = (a instanceof Enemy ? a : b) as Enemy;
      if (!bullet.active || !enemy.active) return;
      if (bullet.tryHit(enemy) && enemy.takeDamage(bullet.damage)) this.kills++;
    });

    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      this.player.takeDamage((e as Enemy).stats.contactDamage, this.time.now);
    });

    // Keep the swarm from collapsing into a single blob.
    this.physics.add.collider(this.enemies, this.enemies);

    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hud = this.add
      .text(16, 34, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f7ff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.paused = false;
    this.input.keyboard!.on('keydown-ESC', this.togglePause, this);
    this.input.keyboard!.on('keydown-P', this.togglePause, this);

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  update(time: number, delta: number) {
    this.background.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);
    if (this.gameOver || this.paused) return;

    this.elapsedMs += delta;
    this.player.update();
    for (const w of this.weapons) w.update(time);
    this.primaryGun.update(time);
    this.spawnEnemies(time);

    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (e.active) e.chase(this.player.x, this.player.y);
    }

    this.drawHud();
    if (this.player.isDead) this.endRun();
  }

  private spawnEnemies(time: number) {
    if (time < this.nextSpawnAt) return;
    const seconds = this.elapsedMs / 1000;
    const interval = Math.max(SPAWNING.minIntervalMs, SPAWNING.startIntervalMs - seconds * SPAWNING.intervalDecayPerSecond);
    this.nextSpawnAt = time + interval;

    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return; // at the cap

    // Pick a point on a circle just outside the visible screen.
    const cam = this.cameras.main;
    const radius = Math.hypot(cam.width, cam.height) / 2 + SPAWNING.spawnMargin;
    const angle = Math.random() * Math.PI * 2;
    enemy.spawn(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, SPAWNING.enemyType);
  }

  private drawHud() {
    const w = 220;
    const frac = this.player.hp / this.player.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x1a2140).fillRect(16, 14, w, 12);
    this.hpBar.fillStyle(frac > 0.3 ? 0x2ef2ff : 0xff2e88).fillRect(16, 14, w * frac, 12);

    const t = Math.floor(this.elapsedMs / 1000);
    const time = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const live = this.enemies.countActive(true);
    this.hud.setText(`${time}   kills ${this.kills}   enemies ${live}`);
  }

  private endRun() {
    this.gameOver = true;
    this.physics.pause();
    const cam = this.cameras.main;
    this.add.rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.75).setOrigin(0).setScrollFactor(0).setDepth(199);
    this.add
      .text(cam.width / 2, cam.height / 2, `SYSTEM FAILURE\n\nkills ${this.kills}\n\npress R or click to reboot`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ff2e88',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
    const restart = () => this.scene.restart();
    this.input.keyboard!.once('keydown-R', restart);
    this.input.once('pointerdown', restart);
  }

  private togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.tweens.pauseAll();
      this.time.paused = true;
      const cam = this.cameras.main;
      this.pauseOverlay = this.add
        .container(0, 0, [
          this.add.rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.6).setOrigin(0),
          this.add
            .text(cam.width / 2, cam.height / 2, 'PAUSED\n\npress Esc or P to resume', {
              fontFamily: 'monospace',
              fontSize: '24px',
              color: '#2ef2ff',
              align: 'center',
            })
            .setOrigin(0.5),
        ])
        .setScrollFactor(0)
        .setDepth(150);
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused = false;
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  private onResize(size: Phaser.Structs.Size) {
    this.background.setSize(size.width, size.height);
  }
}
