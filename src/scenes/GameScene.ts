import Phaser from 'phaser';
import { CREDITS, ENEMIES, LEVELING, MAP, SPAWNING, STARTING_SKILL } from '../data/balance';
import { HACK } from '../data/objectives';
import { SKILLS } from '../data/skills';
import { playLevelUpFx } from '../effects/levelUpFx';
import { Bullet } from '../entities/Bullet';
import { DataCache } from '../entities/DataCache';
import { pickCachePositions } from '../systems/Caches';
import { CreditChip } from '../entities/CreditChip';
import { Enemy, ENEMY_KILLED } from '../entities/Enemy';
import { EnemyBullet } from '../entities/EnemyBullet';
import { createMap } from '../entities/MapWall';
import { createParallax } from '../entities/Parallax';
import { Player } from '../entities/Player';
import { Virus } from '../entities/Virus';
import { SynapticOverload } from '../entities/SynapticOverload';
import { EmpShock } from '../entities/EmpShock';
import { Rootkit } from '../entities/Rootkit';
import { Weapon } from '../entities/Weapon';
import { Objectives } from '../systems/Objectives';
import { Progression, type Upgrade } from '../systems/Progression';
import { CachePicker } from '../ui/CachePicker';
import { LevelUpPicker } from '../ui/LevelUpPicker';
import { ObjectiveMarker } from '../ui/ObjectiveMarker';
import { ObjectivePanel } from '../ui/ObjectivePanel';
import { ResultsScreen } from '../ui/ResultsScreen';
import { SkillBar } from '../ui/SkillBar';
import { TouchJoystick } from '../ui/TouchJoystick';

/** Ignore taps this long after the game-over screen appears, so a thumb still steering doesn't skip it. */
const RESTART_ARM_DELAY_MS = 800;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private dying = false;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private chips!: Phaser.GameObjects.Group;
  private progression!: Progression;
  private caches: DataCache[] = [];
  private weapons: (Weapon | Virus | SynapticOverload | EmpShock | Rootkit)[] = [];
  private hud!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private enemyBars!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private skillBar!: SkillBar;
  private objectives!: Objectives;
  private objectivePanel!: ObjectivePanel;
  private objectiveMarker!: ObjectiveMarker;
  private joystick!: TouchJoystick;
  private pauseButton!: Phaser.GameObjects.Container;

  private elapsedMs = 0;
  private nextSpawnAt = 0;
  /** Scaled game clock (ms): runs slower than real time during hack typing. */
  private gameTime = 0;
  private appliedScale = 1;
  private kills = 0;
  /** Credits picked up this run. */
  private credits = 0;
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
    this.gameTime = 0;
    this.appliedScale = 0; // forces the first update to set the time scale
    this.kills = 0;
    this.credits = 0;
    this.gameOver = false;
    this.dying = false;
    this.levelingUp = false;
    this.pendingLevelUps = 0;
    this.progression = new Progression(STARTING_SKILL);

    createParallax(this);
    createMap(this);

    // Object pools: everything is created up front-ish and reused, never destroyed mid-run.
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: SPAWNING.maxEnemies });
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });

    this.enemyBullets = this.physics.add.group({ classType: EnemyBullet, maxSize: 60, runChildUpdate: true });

    // Drops are rare, so the pool needs no cap.
    this.chips = this.add.group({ classType: CreditChip });
    // Every enemy death (bullets, Virus, anything) may drop a chip, wherever it died.
    const dropChip = (e: Enemy) => {
      if (Math.random() >= e.stats.creditChance) return;
      const chip = this.chips.get(e.x, e.y) as CreditChip | null;
      chip?.drop(e.x, e.y, e.stats.credits);
    };
    this.events.on(ENEMY_KILLED, dropChip);
    this.events.once('shutdown', () => this.events.off(ENEMY_KILLED, dropChip));

    // Data caches: scattered on the map. Not objectives, so the compass and marker ignore them.
    this.caches.forEach((c) => c.destroy());
    this.caches = pickCachePositions().map((p) => new DataCache(this, p.x, p.y));

    this.input.keyboard!.on('keydown-E', this.onOpenKey, this);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-E', this.onOpenKey, this));

    const stats = this.progression.stats;
    this.player = new Player(this, 0, 0, stats);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    // Draw sprites on whole pixels so a moving pixel-art sprite does not shimmer or blur between pixel positions.
    this.cameras.main.roundPixels = true;

    this.weapons = [this.createWeapon(STARTING_SKILL)];

    this.physics.add.overlap(this.bullets, this.enemies, (a, b) => {
      const bullet = (a instanceof Bullet ? a : b) as Bullet;
      const enemy = (a instanceof Enemy ? a : b) as Enemy;
      if (!bullet.active || !enemy.active || enemy.hijacked) return; // hijacked enemies are allies
      if (bullet.tryHit(enemy) && enemy.takeDamage(bullet.damage)) {
        this.kills++;
        this.gainXp(enemy.stats.xp);
      }
    });

    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const enemy = e as Enemy;
      if (enemy.stats.contactDamage <= 0 || enemy.hijacked) return; // outposts and hijacked enemies don't hurt on touch
      if (!this.player.takeDamage(enemy.stats.contactDamage, this.gameTime)) return;
      this.objectives.onPlayerHit();
      // Black ICE: the enemy whose touch landed takes damage back.
      const back = this.progression.stats.retaliationDamage;
      if (back > 0 && enemy.takeDamage(back)) {
        this.kills++;
        this.gainXp(enemy.stats.xp);
      }
    });

    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
      const bullet = b as EnemyBullet;
      if (!bullet.active) return;
      bullet.kill();
      if (this.player.takeDamage(bullet.damage, this.gameTime)) this.objectives.onPlayerHit();
    });

    // Keep the swarm from collapsing into a single blob.
    this.physics.add.collider(this.enemies, this.enemies);

    this.enemyBars = this.add.graphics().setDepth(6);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hpText = this.add
      .text(16 + 220 + 8, 12, '', { fontFamily: 'monospace', fontSize: '14px', color: '#c8f7ff', stroke: '#05060a', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(100);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hud = this.add
      // Wraps on narrow (phone) screens instead of running under the pause button.
      .text(16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f7ff', wordWrap: { width: this.scale.width - 80 } })
      .setScrollFactor(0)
      .setDepth(100);

    // Run clock, always visible, top centre.
    this.clockText = this.add
      .text(this.scale.width / 2, 12, '0:00', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', stroke: '#05060a', strokeThickness: 4 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.placeClock(this.scale.width);

    this.skillBar = new SkillBar(this, this.progression);

    this.objectives = new Objectives(
      this,
      this.player,
      () => !this.gameOver && !this.paused && !this.levelingUp,
      () => this.endRun(true),
      (x, y, type, hp) => {
        const enemy = this.enemies.get() as Enemy | null;
        enemy?.spawn(x, y, type, hp);
        return enemy;
      },
    );
    this.objectivePanel = new ObjectivePanel(this, this.objectives);
    this.objectiveMarker = new ObjectiveMarker(this, this.objectives, this.player);

    this.paused = false;
    this.input.keyboard!.on('keydown-ESC', this.togglePause, this);
    // P is a letter too: while a hack prompt is taking typed input it must not pause.
    this.input.keyboard!.on('keydown-P', () => {
      if (!this.objectives.typing) this.togglePause();
    });
    this.pauseButton = this.createPauseButton();

    this.joystick = new TouchJoystick(this, () => !this.gameOver && !this.paused && !this.levelingUp);

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  update(_time: number, delta: number) {
    if (this.gameOver || this.paused || this.levelingUp || this.dying) return;

    // Slow motion while typing a hack prompt: the world runs on scaled time, the hack on real time.
    const scale = this.objectives.typing ? HACK.typingTimeScale : 1;
    this.applyTimeScale(scale);
    const gameDelta = delta * scale;
    this.gameTime += gameDelta;

    this.elapsedMs += gameDelta;
    this.player.update(this.joystick.vector, gameDelta);
    for (const w of this.weapons) w.update(this.gameTime);
    this.objectives.update(delta);
    this.spawnEnemies(this.gameTime);

    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active) continue;
      e.act(this.player.x, this.player.y, this.gameTime);
      const angle = e.shotAngle(this.gameTime, this.player.x, this.player.y);
      if (angle !== null && e.stats.ranged) {
        const r = e.stats.ranged;
        (this.enemyBullets.get() as EnemyBullet | null)?.fire(e.x, e.y, angle, r.speed, r.damage, r.range);
      }
    }
    this.drawEnemyBars();
    this.updateChips(gameDelta / 1000);
    this.updateCachePrompts();

    this.drawHud();
    if (this.player.isDead && !this.gameOver) this.onPlayerDeath();
  }

  /** Freezes the world, lets the death animation play out, then shows the results. */
  private onPlayerDeath() {
    if (this.dying) return;
    this.dying = true;
    this.player.update(undefined, 0); // starts the death animation
    this.joystick.release();
    this.physics.pause();
    this.time.delayedCall(this.player.deathDurationMs, () => this.endRun());
  }

  /** The cache within reach, if any. Not while typing a hack prompt (the E would be text) or during a modal. */
  private reachableCache(): DataCache | null {
    if (this.gameOver || this.paused || this.levelingUp || this.player.isDead || this.objectives.typing) return null;
    return this.caches.find((c) => c.isNear(this.player.x, this.player.y)) ?? null;
  }

  private updateCachePrompts() {
    const reach = this.reachableCache();
    for (const c of this.caches) c.showPrompt(c === reach, () => this.openCache(c));
  }

  private onOpenKey() {
    const c = this.reachableCache();
    if (c) this.openCache(c);
  }

  /** Shows the cache's contents. The cache leaves the map whether the player takes or discards them. */
  private openCache(cache: DataCache) {
    if (this.levelingUp || this.gameOver || this.paused) return;
    this.levelingUp = true; // same freeze as the level-up picker
    this.joystick.release();
    this.physics.pause();
    const contents = this.progression.rollCacheContents();
    new CachePicker(this, contents, (take) => {
      if (take) this.applyUpgrade(contents);
      this.caches = this.caches.filter((c) => c !== cache);
      cache.destroy();
      this.levelingUp = false;
      this.physics.resume();
    });
  }

  private updateChips(dtSeconds: number) {
    if (this.player.isDead) return;
    for (const obj of this.chips.getChildren()) {
      const chip = obj as CreditChip;
      if (chip.active) this.credits += chip.update(this.player.x, this.player.y, dtSeconds);
    }
  }

  /** Slows physics and tweens to `scale` (1 = normal). Arcade's fixed step is retuned so motion stays smooth. */
  private applyTimeScale(scale: number) {
    if (scale === this.appliedScale) return;
    this.appliedScale = scale;
    // One physics step per rendered frame, each covering only `scale` of a frame's time.
    this.physics.world.setFPS(60 / scale);
    this.physics.world.timeScale = 1 / scale;
    this.tweens.timeScale = scale;
  }

  private gainXp(amount: number) {
    if (this.player.isDead) return;
    const gained = this.progression.addXp(amount);
    if (gained === 0) return;
    this.pendingLevelUps += gained;
    if (this.levelingUp) return; // already showing the picker; the extra levels queue up
    this.levelingUp = true;
    this.joystick.release();
    this.physics.pause();
    this.drawHud();
    playLevelUpFx(this, this.player, this.progression.level);
    this.time.delayedCall(500, () => this.showUpgradePicker());
  }

  private showUpgradePicker() {
    const level = this.progression.level - this.pendingLevelUps + 1;
    const choices = this.progression.rollUpgrades();
    // The heal/credits fallback has nothing to reroll; a reroll with nothing new to show is hidden too.
    const rerolls = this.progression.canReroll() ? LEVELING.rerolls : 0;
    new LevelUpPicker(this, level, choices, rerolls, (current) => (this.progression.canReroll() ? this.progression.rollUpgrades(LEVELING.choices, current) : null), (u) => {
      if (u) this.applyUpgrade(u); // null = skipped: no reward
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
      this.player.heal(this.player.maxHp * u.fraction);
      return;
    }
    if (u.type === 'credits') {
      this.credits += u.amount;
      return;
    }
    const hpBefore = this.player.maxHp;
    this.progression.apply(u);
    this.skillBar.refresh();
    // Extra max HP from a passive comes with that much HP, so it isn't an empty bar.
    if (this.player.maxHp > hpBefore) this.player.heal(this.player.maxHp - hpBefore);

    const skill = SKILLS[u.skillId];
    if (skill.kind !== 'weapon') return;
    const existing = this.weapons.find((w) => w.skillId === u.skillId);
    if (existing) existing.level = u.toLevel;
    else this.weapons.push(this.createWeapon(u.skillId));
  }

  /** The runtime object for a damage skill, by its behavior. */
  private createWeapon(skillId: string): Weapon | Virus | SynapticOverload | EmpShock | Rootkit {
    const behavior = (SKILLS[skillId] as { behavior?: string }).behavior;
    const stats = this.progression.stats;
    if (behavior === 'virus') return new Virus(skillId, this.player, this.enemies, stats, this, (e) => this.onSkillKill(e));
    if (behavior === 'synaptic') return new SynapticOverload(skillId, this.player, this.enemies, stats, this, (e) => this.onSkillKill(e));
    if (behavior === 'emp') return new EmpShock(skillId, this.player, this.enemies, stats, this, (e) => this.onSkillKill(e));
    if (behavior === 'rootkit') return new Rootkit(skillId, this.player, this.enemies, stats, this, (e) => this.onSkillKill(e));
    return new Weapon(skillId, this.player, this.enemies, this.bullets, stats);
  }

  /** An enemy was killed by a skill that doesn't go through the bullet overlap (Virus, Synaptic Overload). */
  private onSkillKill(enemy: Enemy) {
    this.kills++;
    this.gainXp(enemy.stats.xp);
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
    let dx = Math.cos(angle) * radius;
    let dy = Math.sin(angle) * radius;
    const type = this.rollEnemyType(seconds);
    // A point past the wall is mirrored across the player: same distance, so still off screen, but on the map.
    const limit = MAP.size / 2 - ENEMIES[type].radius;
    if (Math.abs(this.player.x + dx) > limit) dx = -dx;
    if (Math.abs(this.player.y + dy) > limit) dy = -dy;
    enemy.spawn(this.player.x + dx, this.player.y + dy, type);
  }

  /** One roll per spawn: each special type gets its time-scaled chance, otherwise a plain swarm enemy. */
  private rollEnemyType(seconds: number): string {
    let roll = Math.random();
    for (const s of SPAWNING.specialEnemies) {
      const chance = s.startChance + s.chanceStep * Math.floor(seconds / s.stepSeconds);
      if (roll < chance) return s.type;
      roll -= chance;
    }
    return SPAWNING.enemyType;
  }

  /** Small health bar above enemies that have one (the Goon). */
  private drawEnemyBars() {
    this.enemyBars.clear();
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || !e.stats.healthBar) continue;
      const w = e.stats.radius * 2;
      const x = e.x - w / 2;
      const y = e.y - e.stats.radius - 12;
      this.enemyBars.fillStyle(0x1a2140).fillRect(x, y, w, 5);
      this.enemyBars.fillStyle(0xff2e88).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  private drawHud() {
    const w = 220;
    const frac = this.player.hp / this.player.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x1a2140).fillRect(16, 14, w, 12);
    this.hpBar.fillStyle(frac > 0.3 ? 0x2ef2ff : 0xff2e88).fillRect(16, 14, w * frac, 12);
    this.hpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);

    const p = this.progression;
    const xpFrac = p.isMaxLevel ? 1 : p.xp / p.xpNeeded;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x1a2140).fillRect(16, 30, w, 5);
    this.xpBar.fillStyle(0xffd23e).fillRect(16, 30, w * xpFrac, 5);

    this.skillBar.setDashProgress(this.player.dashReadiness);

    const t = Math.floor(this.elapsedMs / 1000);
    const time = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const lv = this.progression.isMaxLevel ? 'MAX' : this.progression.level;
    this.clockText.setText(time);
    this.hud.setText(`lv ${lv}   kills ${this.kills}   credits ${this.credits}`);
    this.objectivePanel.update();
    this.objectiveMarker.update();
  }

  private endRun(won = false) {
    this.gameOver = true;
    this.physics.pause();
    const bonus = won ? CREDITS.extractionBonus : 0;
    this.credits += bonus;
    this.drawHud();
    new ResultsScreen(this, {
      won,
      level: this.progression.level,
      kills: this.kills,
      timeMs: this.elapsedMs,
      objectivesDone: this.objectives.entries.filter((e) => e.done).length,
      objectivesTotal: this.objectives.entries.length,
      credits: this.credits,
      bonus,
      items: 0, // TODO: caches and drops (PLAN section 4)
    });
    this.joystick.release();
    this.pauseButton.setVisible(false);
    const restart = () => this.scene.restart();
    this.input.keyboard!.once('keydown-R', restart);
    this.time.delayedCall(RESTART_ARM_DELAY_MS, () => this.input.once('pointerdown', restart));
  }

  private togglePause() {
    if (this.gameOver || this.levelingUp) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.joystick.release();
      this.physics.pause();
      this.tweens.pauseAll();
      this.time.paused = true;
      const cam = this.cameras.main;
      this.pauseOverlay = this.add
        .container(0, 0, [
          // Tap anywhere to resume (touch has no Esc key).
          this.add
            .rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.6)
            .setOrigin(0)
            .setScrollFactor(0)
            .setInteractive()
            .on('pointerdown', () => this.togglePause()),
          this.add
            .text(cam.width / 2, cam.height / 2, 'PAUSED\n\npress Esc or P\nor tap to resume', {
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

  /** Top-right pause button, mainly for touch screens (no Esc key there). */
  private createPauseButton() {
    const size = 40;
    const bg = this.add.rectangle(0, 0, size, size, 0x0d1226, 0.7).setOrigin(0).setStrokeStyle(2, 0x2ef2ff, 0.6);
    const bars = this.add.graphics().fillStyle(0x2ef2ff, 0.9).fillRect(13, 11, 5, 18).fillRect(22, 11, 5, 18);
    const button = this.add.container(this.scale.width - size - 12, 12, [bg, bars]).setScrollFactor(0).setDepth(140);
    // Children of a scrollFactor-0 container need their own scrollFactor 0, or hit-testing drifts with the camera.
    bg.setScrollFactor(0);
    bars.setScrollFactor(0);
    // A bit bigger than it looks, so it's easy to hit with a thumb.
    bg.setInteractive(new Phaser.Geom.Rectangle(-8, -8, size + 16, size + 16), Phaser.Geom.Rectangle.Contains).on('pointerdown', () => {
      if (!this.paused) this.togglePause();
    });
    return button;
  }

  /** Centred on wide screens; on phones it sits left of the pause button so it clears the HP bar. */
  private placeClock(width: number) {
    const narrow = width < 600;
    this.clockText.setFontSize(narrow ? 22 : 28).setOrigin(narrow ? 1 : 0.5, 0).setX(narrow ? width - 64 : width / 2);
  }

  private onResize(size: Phaser.Structs.Size) {
    this.pauseButton.setPosition(size.width - 52, 12);
    this.hud.setWordWrapWidth(size.width - 80);
    this.placeClock(size.width);
  }
}
