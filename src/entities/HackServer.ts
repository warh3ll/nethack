import Phaser from 'phaser';
import { HACK } from '../data/objectives';
import type { Hack, PromptKind } from '../systems/Hack';

const BAR_W = 120;
const BAR_H = 8;
const CYAN = 0x2ef2ff;
const FONT = 'monospace';

const TITLES: Record<PromptKind, string> = {
  ip: 'TYPE THE IP ADDRESS',
  password: 'TYPE THE PASSWORD',
  inject: 'INJECT THE CODE',
  smack: 'SMACK THE SERVER',
};

/**
 * The world-space look of a hackable server: the server itself, its range ring,
 * the progress bar and the current prompt floating above it. Pure view, all state lives in Hack.
 */
export class HackServer {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private percent: Phaser.GameObjects.Text;
  private title: Phaser.GameObjects.Text;
  /** The full text to type, and on top of it the already typed part in green. */
  private base: Phaser.GameObjects.Text;
  private typed: Phaser.GameObjects.Text;
  private errorUntil = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.ring = scene.add.graphics().setDepth(1);
    this.sprite = scene.add.image(x, y, 'server').setDepth(4);
    this.bar = scene.add.graphics().setDepth(20);
    const text = (size: string, color: string) => scene.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color }).setDepth(21);
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
    this.ring.fillStyle(CYAN, inRange ? 0.06 : 0.02).fillCircle(x, y, HACK.range);
    this.ring.lineStyle(2, CYAN, inRange ? 0.6 : 0.25).strokeCircle(x, y, HACK.range);

    const barX = x - BAR_W / 2;
    const barY = y - 58;
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

    this.title.setPosition(x, barY - 36).setText(inRange ? TITLES[p.kind] : 'OUT OF RANGE, GET CLOSER');
    const py = barY - 58;
    if (p.kind === 'smack') {
      this.base.setText(`[E]${p.hits}/${p.hitsNeeded}`);
      this.typed.setText('');
    } else {
      this.base.setText(p.text);
      this.typed.setText(p.text.slice(0, p.typed));
    }
    this.base.setColor(this.scene.time.now < this.errorUntil ? '#ff2e88' : '#ffffff');
    const left = x - this.base.width / 2;
    this.base.setPosition(left, py);
    this.typed.setPosition(left, py);
  }

  /** Floating "HACKED" and then the server is gone. */
  playHacked() {
    const label = this.scene.add
      .text(this.x, this.y - 30, 'HACKED', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
    this.destroy();
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.sprite);
    for (const o of [this.sprite, this.ring, this.bar, this.percent, this.title, this.base, this.typed]) o.destroy();
  }
}
