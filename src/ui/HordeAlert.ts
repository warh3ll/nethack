import Phaser from 'phaser';
import { HORDES } from '../data/balance';

/**
 * "Incoming enemy horde" banner, under the run clock. Pulses while the spawn points flash, then fades out.
 * Runs on game time (`update(now)`), so it holds still while the game is paused.
 */
export class HordeAlert {
  private text: Phaser.GameObjects.Text;
  private shownAt = -1;
  private warningMs = 0;

  constructor(private scene: Phaser.Scene) {
    const color = `#${HORDES.alertColor.toString(16).padStart(6, '0')}`;
    this.text = scene.add
      .text(scene.scale.width / 2, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${HORDES.alertFontSize}px`,
        fontStyle: 'bold',
        color,
        stroke: '#05060a',
        strokeThickness: 5,
        align: 'center',
        wordWrap: { width: scene.scale.width - 32 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  /** `wave` is 1-based; `of` is the number of hordes in the run. */
  show(now: number, wave: number, of: number) {
    this.shownAt = now;
    this.warningMs = HORDES.warningMs;
    this.text.setText(`${HORDES.alertText}\n${wave}/${of}`).setVisible(true).setAlpha(1);
  }

  update(now: number) {
    if (this.shownAt < 0) return;
    const t = now - this.shownAt;
    if (t < this.warningMs) {
      // Pulses faster as the horde comes closer, like the spawn point flash.
      const p = t / this.warningMs;
      this.text.setAlpha(0.45 + 0.55 * Math.abs(Math.cos(p * p * Math.PI * 6)));
      return;
    }
    const fade = (t - this.warningMs) / HORDES.alertFadeMs;
    if (fade >= 1) {
      this.text.setVisible(false);
      this.shownAt = -1;
      return;
    }
    this.text.setAlpha(1 - fade);
  }

  private layout() {
    const { width, height } = this.scene.scale;
    this.text.setPosition(width / 2, Math.round(height * 0.18)).setWordWrapWidth(width - 32);
  }
}
