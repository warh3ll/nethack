import Phaser from 'phaser';
import { EXTRACTION } from '../data/objectives';

const GREEN = 0x5fe08a;
const FONT = 'monospace';

/** The extraction point: the player's own 127.0.0.1 address. Only built once revealed. Pure view; state lives in Objectives. */
export class ExtractionPoint {
  private pulse: Phaser.GameObjects.GameObject[];
  private base: Phaser.GameObjects.Text;
  private typed: Phaser.GameObjects.Text;
  private countdown: Phaser.GameObjects.Text;
  private errorUntil = 0;

  constructor(private scene: Phaser.Scene) {
    const { x, y, radius } = EXTRACTION;
    const ring = scene.add.graphics().setDepth(1);
    ring.fillStyle(GREEN, 0.07).fillCircle(x, y, radius);
    ring.lineStyle(3, GREEN, 0.8).strokeCircle(x, y, radius);
    const label = scene.add
      .text(x, y, 'EXTRACT\n127.0.0.1', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#5fe08a', align: 'center' })
      .setOrigin(0.5)
      .setDepth(4);
    this.pulse = [ring, label];
    scene.tweens.add({ targets: this.pulse, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    const text = (size: string, color: string) => scene.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color }).setDepth(21);
    this.base = text('22px', '#ffffff').setOrigin(0, 0.5);
    this.typed = text('22px', '#5fe08a').setOrigin(0, 0.5);
    this.countdown = text('64px', '#5fe08a').setOrigin(0.5).setFontStyle('bold');

    const reveal = scene.add
      .text(x, y - radius - 24, 'EXTRACTION POINT OPEN', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    scene.tweens.add({ targets: reveal, y: reveal.y - 40, alpha: 0, duration: 2500, onComplete: () => reveal.destroy() });
  }

  flashError() {
    this.errorUntil = this.scene.time.now + 150;
  }

  /** `seconds` is the countdown left (0 = not counting). The text prompt shows only while not counting. */
  render(logoutText: string, typedCount: number, seconds: number) {
    const { x, y, radius } = EXTRACTION;
    const py = y - radius - 20;
    if (seconds > 0) {
      this.base.setText('');
      this.typed.setText('');
      this.countdown.setPosition(x, py - 20).setText(String(seconds));
      return;
    }
    this.countdown.setText('');
    this.base.setText(logoutText).setColor(this.scene.time.now < this.errorUntil ? '#ff2e88' : '#ffffff');
    this.typed.setText(logoutText.slice(0, typedCount));
    const left = x - this.base.width / 2;
    this.base.setPosition(left, py);
    this.typed.setPosition(left, py);
  }
}
