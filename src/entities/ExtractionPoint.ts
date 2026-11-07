import Phaser from 'phaser';
import { EXTRACTION } from '../data/objectives';

const GREEN = 0x5fe08a;
const FONT = 'monospace';

/**
 * The open subway station: a ring round the stairs, and a big countdown once the player stands in it.
 * Only built once the last objective is done. Pure view; state lives in Objectives.
 */
export class ExtractionPoint {
  private countdown: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
  ) {
    const { radius } = EXTRACTION;
    const ring = scene.add.graphics().setDepth(1);
    ring.fillStyle(GREEN, 0.07).fillCircle(x, y, radius);
    ring.lineStyle(3, GREEN, 0.8).strokeCircle(x, y, radius);
    scene.tweens.add({ targets: ring, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    const text = (size: string, color: string) =>
      scene.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color, fontStyle: 'bold', stroke: '#05060a', strokeThickness: 4 }).setOrigin(0.5).setDepth(21);
    this.countdown = text('64px', '#5fe08a');
    this.hint = text('16px', '#ffd23e');

    const reveal = scene.add
      .text(x, y - radius - 24, 'SUBWAY OPEN', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    scene.tweens.add({ targets: reveal, y: reveal.y - 40, alpha: 0, duration: 2500, onComplete: () => reveal.destroy() });
  }

  /** `seconds` is the countdown left (0 = nobody is in the ring). */
  render(seconds: number) {
    const { x, y } = this;
    const top = y - EXTRACTION.radius - 20;
    if (seconds > 0) {
      this.hint.setPosition(x, top + 20).setText('STAY IN THE RING');
      this.countdown.setPosition(x, top - 24).setText(String(seconds));
    } else {
      this.hint.setPosition(x, top).setText('STEP INTO THE RING');
      this.countdown.setText('');
    }
  }
}
