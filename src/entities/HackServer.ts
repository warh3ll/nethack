import Phaser from 'phaser';
import { HACK, SERVER } from '../data/objectives';
import type { Hack, PromptKind } from '../systems/Hack';
import { LIGHTING } from '../data/balance';
import { addGlow, lit } from '../systems/Lighting';
import { hint, isTouchMode } from '../ui/touchMode';

const BAR_W = 120;
const BAR_H = 8;
const CYAN = 0x2ef2ff;
const FONT = 'monospace';

/** On touch screens the words are tapped from tiles and the server itself is smacked. */
const TOUCH_TITLES: Partial<Record<PromptKind, string>> = {
  ip: 'ENTER THE IP ADDRESS',
  password: 'TAP THE PASSWORD',
  inject: 'TAP THE CODE IN ORDER',
  smack: 'TAP THE SERVER TO SMACK IT',
};

const TITLES: Record<PromptKind, string> = {
  ip: 'TYPE THE IP ADDRESS',
  password: 'TYPE THE PASSWORD',
  inject: 'INJECT THE CODE',
  pin: 'ENTER THE PIN CODE',
  smack: 'SMACK THE SERVER',
};

/**
 * The world-space look of a hackable server: the server itself, its range ring,
 * the progress bar and the current prompt floating above it. Pure view, all state lives in Hack.
 */
export class HackServer {
  private sprite: Phaser.GameObjects.Sprite;
  private ring: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private percent: Phaser.GameObjects.Text;
  private title: Phaser.GameObjects.Text;
  /** The full text to type, and on top of it the already typed part in green. */
  private base: Phaser.GameObjects.Text;
  private typed: Phaser.GameObjects.Text;
  private errorUntil = 0;
  private light: Phaser.GameObjects.Light | null;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.ring = scene.add.graphics().setDepth(1);
    this.sprite = lit(scene.add.sprite(x, y, 'server').setScale(SERVER.spriteScale).setDepth(4).play('server'));
    this.light = addGlow(scene, x, y, LIGHTING.server);
    this.bar = scene.add.graphics().setDepth(20);
    const text = (size: string, color: string) => scene.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color, stroke: '#05060a', strokeThickness: size === '22px' ? 4 : 3 }).setDepth(21);
    this.percent = text('14px', '#c8f7ff').setOrigin(0.5);
    this.title = text('13px', '#ffd23e').setOrigin(0.5);
    this.base = text('22px', '#ffffff').setOrigin(0, 0.5);
    this.typed = text('22px', '#5fe08a').setOrigin(0, 0.5);
  }

  /** Little shake when the player smacks it. */
  wriggle() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0);
    this.scene.tweens.add({ targets: this.sprite, angle: Phaser.Math.Between(6, 10) * (Math.random() < 0.5 ? -1 : 1), duration: 40, yoyo: true });
  }

  flashError() {
    this.errorUntil = this.scene.time.now + 150;
  }

  render(hack: Hack, inRange: boolean) {
    const { x, y } = this;

    this.ring.clear();
    this.ring.fillStyle(CYAN, inRange ? this.zoneAlpha() : 0.02).fillCircle(x, y, HACK.range);
    this.ring.lineStyle(2, CYAN, inRange ? 0.6 : 0.25).strokeCircle(x, y, HACK.range);

    const barX = x - BAR_W / 2;
    const barY = y - SERVER.frameSize * SERVER.spriteScale / 2 - 30;
    this.bar.clear();
    this.bar.fillStyle(0x1a2140).fillRect(barX, barY, BAR_W, BAR_H);
    // Pink while damage has the hack halted, dimmer while out of range.
    const fill = hack.damaged ? 0xff2e88 : CYAN;
    this.bar.fillStyle(fill, inRange ? 1 : 0.5).fillRect(barX, barY, BAR_W * hack.progress, BAR_H);
    this.percent.setPosition(x, barY - 11).setText(`${Math.floor(hack.progress * 100)}%`);

    const p = hack.prompt;
    if (!p) {
      this.title.setText('');
      this.base.setText('');
      this.typed.setText('');
      return;
    }

    this.title.setPosition(x, barY - 36).setText(inRange ? ((isTouchMode() && TOUCH_TITLES[p.kind]) || TITLES[p.kind]) : 'OUT OF RANGE, GET CLOSER');
    const py = barY - 58;
    if (p.kind === 'smack') {
      this.base.setText(`${hint('[E]', '')}${p.hits}/${p.hitsNeeded}`);
      this.typed.setText('');
    } else {
      this.base.setText(p.text);
      this.typed.setText(p.text.slice(0, p.typed).replace(/ /g, '_'));
    }
    this.base.setColor(this.scene.time.now < this.errorUntil ? '#ff2e88' : '#ffffff');
    const left = x - this.base.width / 2;
    this.base.setPosition(left, py);
    this.typed.setPosition(left, py);
  }

  /** Background opacity while the player is in range: a slow sine pulse so the zone feels active. */
  private zoneAlpha() {
    const wave = (Math.sin((this.scene.time.now / HACK.zonePulseMs) * Math.PI * 2) + 1) / 2;
    return HACK.zoneAlphaMin + (HACK.zoneAlphaMax - HACK.zoneAlphaMin) * wave;
  }

  /** Floating "HACKED" and then the server is gone. */
  playHacked() {
    const label = this.scene.add
      .text(this.x, this.y - SERVER.frameSize * SERVER.spriteScale / 4, 'HACKED', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#5fe08a', stroke: '#05060a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
    this.destroy();
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.sprite);
    if (this.light) this.scene.lights.removeLight(this.light);
    for (const o of [this.sprite, this.ring, this.bar, this.percent, this.title, this.base, this.typed]) o.destroy();
  }
}
