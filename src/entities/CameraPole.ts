import Phaser from 'phaser';
import { LIGHTING } from '../data/balance';
import { CAMERA_POLE } from '../data/objectives';
import { addGlow, lit } from '../systems/Lighting';
import type { CameraHack } from '../systems/CameraHack';

const BAR_W = 100;
const BAR_H = 8;
const CYAN = 0x2ef2ff;
const GREEN = 0x5fe08a;
const FONT = 'monospace';
/** How far above the pole's centre the prompt starts. */
const PROMPT_TOP = 56;

/**
 * The surveillance pole on the map: the pole, its range ring and the prompt above it.
 * Pure view, all state lives in CameraHack.
 */
export class CameraPole {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
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
    this.sprite = lit(scene.add.image(x, y, 'camera-pole').setDepth(4));
    addGlow(scene, x, y, LIGHTING.pole);
    this.bar = scene.add.graphics().setDepth(20);
    const text = (size: string, color: string) => scene.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color, stroke: '#05060a', strokeThickness: 3 }).setDepth(21);
    this.title = text('13px', '#ffd23e').setOrigin(0.5);
    this.base = text('22px', '#ffffff').setOrigin(0, 0.5);
    this.typed = text('22px', '#5fe08a').setOrigin(0, 0.5);
  }

  flashError() {
    this.errorUntil = this.scene.time.now + 150;
  }

  render(hack: CameraHack, inRange: boolean) {
    const { x, y } = this;
    this.ring.clear();
    this.ring.fillStyle(CYAN, inRange ? 0.08 : 0.02).fillCircle(x, y, CAMERA_POLE.range);
    this.ring.lineStyle(2, CYAN, inRange ? 0.6 : 0.25).strokeCircle(x, y, CAMERA_POLE.range);

    const top = y - PROMPT_TOP;
    this.bar.clear();
    this.base.setText('');
    this.typed.setText('');

    if (hack.step === 'worm') {
      this.title.setPosition(x, top).setText(inRange ? '1/3 HOLD [E] TO INSERT WORM' : '');
      if (hack.holdMs > 0) {
        this.bar.fillStyle(0x1a2140).fillRect(x - BAR_W / 2, top + 12, BAR_W, BAR_H);
        this.bar.fillStyle(GREEN).fillRect(x - BAR_W / 2, top + 12, BAR_W * hack.holdProgress, BAR_H);
      }
      return;
    }

    const title = hack.step === 'pin' ? '2/3 ENTER THE PIN CODE' : '3/3 TYPE THE COMMAND';
    this.title.setPosition(x, top - 24).setText(inRange ? title : 'OUT OF RANGE, GET CLOSER');
    this.base.setText(hack.text).setColor(this.scene.time.now < this.errorUntil ? '#ff2e88' : '#ffffff');
    this.typed.setText(hack.text.slice(0, hack.typed));
    const left = x - this.base.width / 2;
    this.base.setPosition(left, top);
    this.typed.setPosition(left, top);
  }

  /** Floating confirmation; the pole stays on the map, switched off. */
  playRevealed() {
    const label = this.scene.add
      .text(this.x, this.y - PROMPT_TOP, 'MAP ONLINE', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
    this.sprite.setAlpha(0.5);
    for (const o of [this.ring, this.bar, this.title, this.base, this.typed]) o.destroy();
  }
}
