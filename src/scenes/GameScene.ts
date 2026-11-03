import Phaser from 'phaser';
import { SPAWNING, STARTING_SKILL } from '../data/balance';
import { HACK } from '../data/objectives';
import { SKILLS } from '../data/skills';
import { playLevelUpFx } from '../effects/levelUpFx';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Weapon } from '../entities/Weapon';
import { Objectives } from '../systems/Objectives';
import { Progression, type Upgrade } from '../systems/Progression';
import { LevelUpPicker } from '../ui/LevelUpPicker';
import { ObjectiveMarker } from '../ui/ObjectiveMarker';
import { ObjectivePanel } from '../ui/ObjectivePanel';
import { SkillBar } from '../ui/SkillBar';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private progression!: Progression;
  private weapons: Weapon[] = [];
  private background!: Phaser.GameObjects.TileSprite;
  private hud!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private skillBar!: SkillBar;
  private objectives!: Objectives;
  private objectivePanel!: ObjectivePanel;
  private objectiveMarker!: ObjectiveMarker;

  private elapsedMs = 0;
  private nextSpawnAt = 0;
  private kills = 0;
  private gameOver = false;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  /** True from the level-up burst until the last pending upgrade is picked. The run is frozen meanwhile. */
  private levelingUp = false;
  private pendingLevelUps = 0;

  constructor() {
    super('game');
  }

  create() {
    this.elapsedMs = 0;
    this.nextSpawnAt = 0;
    this.kills = 0;
    this.gameOver = false;
    this.levelingUp = false;
    this.pendingLevelUps = 0;
    this.progression = new Progression(STARTING_SKILL);

    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'grid').setOrigin(0).setScrollFactor(0);

    // Object pools: everything is created up front-ish and reused, never destroyed mid-run.
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: SPAWNING.maxEnemies });
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });

    const stats = this.progression.stats;
    this.player = new Player(this, 0, 0, stats);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.weapons = [new Weapon(STARTING_SKILL, this.player, this.enemies, this.bullets, stats)];

    this.physics.add.overlap(this.bullets, this.enemies, (a, b) => {
      const bullet = (a instanceof Bullet ? a : b) as Bullet;
      const enemy = (a instanceof Enemy ? a : b) as Enemy;
      if (!bullet.active || !enemy.active) return;
      if (bullet.tryHit(enemy) && enemy.takeDamage(bullet.damage)) {
        this.kills++;
        this.gainXp(enemy.stats.xp);
      }
    });

    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      if (this.player.takeDamage((e as Enemy).stats.contactDamage, this.time.now)) this.objectives.onPlayerHit();
    });

    // Keep the swarm from collapsing into a single blob.
    this.physics.add.collider(this.enemies, this.enemies);

    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hud = this.add
      .text(16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f7ff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.skillBar = new SkillBar(this, this.progression);

    this.objectives = new Objectives(
      this,
      this.player,
      () => !this.gameOver && !this.paused && !this.levelingUp,
      () => this.endRun(true),
    );
    this.objectivePanel = new ObjectivePanel(this, this.objectives);
    this.objectiveMarker = new ObjectiveMarker(this, this.objectives, this.player);

    this.paused = false;
    this.input.keyboard!.on('keydown-ESC', this.togglePause, this);
    // P is a letter too: while a hack prompt is taking typed input it must not pause.
    this.input.keyboard!.on('keydown-P', () => {
      if (!this.objectives.typing) this.togglePause();
    });

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  update(time: number, delta: number) {
    this.background.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);
    if (this.gameOver || this.paused || this.levelingUp) return;

    this.elapsedMs += delta;
    this.player.update();
    for (const w of this.weapons) w.update(time);
    this.objectives.update(delta);
    this.spawnEnemies(time);

    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (e.active) e.chase(this.player.x, this.player.y);
    }

    this.drawHud();
    if (this.player.isDead && !this.gameOver) this.endRun();
  }

  private gainXp(amount: number) {
    if (this.player.isDead) return;
    const gained = this.progression.addXp(amount);
    if (gained === 0) return;
    this.pendingLevelUps += gained;
    if (this.levelingUp) return; // already showing the picker; the extra levels queue up
    this.levelingUp = true;
    this.physics.pause();
    this.drawHud();
    playLevelUpFx(this, this.player, this.progression.level);
    this.time.delayedCall(500, () => this.showUpgradePicker());
  }

  private showUpgradePicker() {
    const level = this.progression.level - this.pendingLevelUps + 1;
    new LevelUpPicker(this, level, this.progression.rollUpgrades(), (u) => {
      this.applyUpgrade(u);
      this.pendingLevelUps--;
      if (this.pendingLevelUps > 0) {
        this.showUpgradePicker();
      } else {
        this.levelingUp = false;
        this.physics.resume();
      }
    });
  }

  private applyUpgrade(u: Upgrade) {
    if (u.type === 'heal') {
      this.player.heal(u.amount);
      return;
    }
    const hpBefore = this.player.maxHp;
    this.progression.apply(u);
    this.skillBar.refresh();
    // Extra max HP from a passive comes with that much HP, so it isn't an empty bar.
    if (this.player.maxHp > hpBefore) this.player.heal(this.player.maxHp - hpBefore);

    if (SKILLS[u.skillId].kind !== 'weapon') return;
    const existing = this.weapons.find((w) => w.skillId === u.skillId);
    if (existing) existing.level = u.toLevel;
    else this.weapons.push(new Weapon(u.skillId, this.player, this.enemies, this.bullets, this.progression.stats));
  }

  private spawnEnemies(time: number) {
    if (time < this.nextSpawnAt) return;
    const seconds = this.elapsedMs / 1000;
    const interval = Math.max(SPAWNING.minIntervalMs, SPAWNING.startIntervalMs - seconds * SPAWNING.intervalDecayPerSecond);
    // Hacking draws enemies in a bit faster.
    this.nextSpawnAt = time + interval * (this.objectives.hacking ? HACK.spawnIntervalMultiplier : 1);

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

    const p = this.progression;
    const xpFrac = p.isMaxLevel ? 1 : p.xp / p.xpNeeded;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x1a2140).fillRect(16, 30, w, 5);
    this.xpBar.fillStyle(0xffd23e).fillRect(16, 30, w * xpFrac, 5);

    const t = Math.floor(this.elapsedMs / 1000);
    const time = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const live = this.enemies.countActive(true);
    const lv = this.progression.isMaxLevel ? 'MAX' : this.progression.level;
    this.hud.setText(`lv ${lv}   ${time}   kills ${this.kills}   enemies ${live}`);
    this.objectivePanel.update();
    this.objectiveMarker.update();
  }

  private endRun(won = false) {
    this.gameOver = true;
    this.physics.pause();
    this.drawHud();
    const cam = this.cameras.main;
    const title = won ? 'ALL OBJECTIVES COMPLETE' : 'SYSTEM FAILURE';
    this.add.rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.75).setOrigin(0).setScrollFactor(0).setDepth(199);
    this.add
      .text(cam.width / 2, cam.height / 2, `${title}\n\nlevel ${this.progression.level}   kills ${this.kills}\n\npress R or click to reboot`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: won ? '#5fe08a' : '#ff2e88',
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
    if (this.gameOver || this.levelingUp) return;
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
