import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

const FLASH_COLOR = 0xffffff;
const FLASH_ALPHA = 0.4;
const SHIELD_DEPTH = 11;
const SPIKE_DEPTH = 12;
/** Size of the shield's hexagon around the player; the texture is drawn in BootScene. */
const SHIELD_SCALE = 1;
const INNER_SCALE = 0.72;
const SHIELD_ALPHA = 0.85;
const SHARDS = 8;
const SHARD_FLIGHT = 70;
const SHATTER_MS = 380;
const APPEAR_MS = 320;
/** The spike starts this far from the player's centre, at the edge of the shield. */
const SPIKE_START = 26;
/** How far past the enemy the spike reaches, so it clearly goes through them. */
const SPIKE_OVERSHOOT = 30;
/** An enemy touching the player is very close, so the spike never gets shorter than this. */
const SPIKE_MIN_LENGTH = 58;
const SPIKE_SIDE_ANGLE = 0.5;
const SPIKE_SIDE_LENGTH = 0.6;
const SPIKE_OUT_MS = 70;
const SPIKE_FADE_MS = 150;

/**
 * Cosmetics for Defensive Matrix: the hex shield around the player, its shatter and return, and the retaliation spike.
 * Pure view: the shield itself lives in Player, and this just reacts to its charges changing.
 */
export class DefensiveMatrixFx {
  private outer: Phaser.GameObjects.Image;
  private inner: Phaser.GameObjects.Image;
  private shards: Phaser.GameObjects.Image[] = [];
  private flash: Phaser.GameObjects.Arc;
  private spikes: Phaser.GameObjects.Image[] = [];
  private shownCharges = 0;

  constructor(private scene: Phaser.Scene, private player: Player) {
    const hex = () => scene.add.image(0, 0, 'shield-hex').setDepth(SHIELD_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.outer = hex();
    this.inner = hex();
    for (let i = 0; i < SHARDS; i++) {
      this.shards.push(scene.add.image(0, 0, 'shield-shard').setDepth(SHIELD_DEPTH).setVisible(false));
    }
    this.flash = scene.add.circle(0, 0, 44, FLASH_COLOR).setDepth(SHIELD_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    scene.events.once('shutdown', () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.follow, this));
  }

  /** Spikes out of the player through the enemy that touched them: one long, two short on either side. */
  spike(enemy: Enemy) {
    const { x, y } = this.player;
    const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
    const reach = Math.max(Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) - SPIKE_START + SPIKE_OVERSHOOT, SPIKE_MIN_LENGTH);
    this.playSpike(angle, reach);
    this.playSpike(angle - SPIKE_SIDE_ANGLE, reach * SPIKE_SIDE_LENGTH);
    this.playSpike(angle + SPIKE_SIDE_ANGLE, reach * SPIKE_SIDE_LENGTH);
  }

  private playSpike(angle: number, length: number) {
    let spike = this.spikes.find((s) => !s.visible);
    if (!spike) {
      spike = this.scene.add.image(0, 0, 'retaliation-spike').setOrigin(0, 0.5).setDepth(SPIKE_DEPTH);
      this.spikes.push(spike);
    }
    const s = spike;
    const { x, y } = this.player;
    s.setPosition(x + Math.cos(angle) * SPIKE_START, y + Math.sin(angle) * SPIKE_START);
    s.setRotation(angle).setScale(0.05, 1).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: s,
      scaleX: length / s.width,
      duration: SPIKE_OUT_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: s, alpha: 0, scaleY: 0.2, duration: SPIKE_FADE_MS, onComplete: () => s.setVisible(false) });
      },
    });
  }

  private follow() {
    const { x, y } = this.player;
    const charges = this.player.isDead ? 0 : this.player.shieldCharges;
    if (charges < this.shownCharges && !this.player.isDead) {
      if (charges === 0) this.shatter();
      else this.playFlash();
    } else if (charges > 0 && this.shownCharges === 0) {
      this.appear();
    }
    this.shownCharges = charges;

    const up = charges > 0;
    this.outer.setVisible(up).setPosition(x, y);
    this.inner.setVisible(up).setPosition(x, y);
  }

  /** Pops in, then keeps a slow counter-rotation and a soft pulse, so a charged shield always reads as alive. */
  private appear() {
    for (const [hex, scale] of [[this.outer, SHIELD_SCALE], [this.inner, SHIELD_SCALE * INNER_SCALE]] as const) {
      this.scene.tweens.killTweensOf(hex);
      hex.setScale(scale * 0.5).setAlpha(0);
      this.scene.tweens.add({ targets: hex, scale, alpha: SHIELD_ALPHA, duration: APPEAR_MS, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: hex, angle: hex === this.outer ? 360 : -360, duration: hex === this.outer ? 9000 : 6000, repeat: -1 });
    }
    this.scene.tweens.add({ targets: this.inner, alpha: SHIELD_ALPHA * 0.45, duration: 900, yoyo: true, repeat: -1, delay: APPEAR_MS, ease: 'Sine.easeInOut' });
  }

  private playFlash() {
    const { x, y } = this.player;
    this.scene.tweens.killTweensOf(this.flash);
    this.flash.setPosition(x, y).setScale(0.7).setAlpha(FLASH_ALPHA).setVisible(true);
    this.scene.tweens.add({ targets: this.flash, scale: 1.5, alpha: 0, duration: SHATTER_MS * 0.7, ease: 'Quad.easeOut', onComplete: () => this.flash.setVisible(false) });
  }

  /** The hexagon bursts into shards that fly outward and fade. */
  private shatter() {
    this.playFlash();
    const { x, y } = this.player;
    this.shards.forEach((shard, i) => {
      const angle = (i / SHARDS) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const flight = SHARD_FLIGHT * Phaser.Math.FloatBetween(0.7, 1.2);
      this.scene.tweens.killTweensOf(shard);
      shard.setPosition(x + Math.cos(angle) * 30, y + Math.sin(angle) * 30).setRotation(angle).setScale(1).setAlpha(1).setVisible(true);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * (30 + flight),
        y: y + Math.sin(angle) * (30 + flight),
        angle: shard.angle + Phaser.Math.Between(-160, 160),
        alpha: 0,
        scale: 0.4,
        duration: SHATTER_MS,
        ease: 'Quad.easeOut',
        onComplete: () => shard.setVisible(false),
      });
    });
  }
}

