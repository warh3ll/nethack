import Phaser from 'phaser';
import type { Upgrade } from '../systems/Progression';
import { describe } from './LevelUpPicker';

/** Ignore clicks and key presses this long after the screen opens, so the key that opened it can't also answer it. */
const ARM_DELAY_MS = 300;

/** Modal for an opened data cache: shows what is inside, then take it or discard it (the cache is gone either way). */
export class CachePicker {
  private root: Phaser.GameObjects.Container;
  private onKey: (e: KeyboardEvent) => void;
  private done = false;
  private armedAt: number;

  /** @param onResolve true = take the contents, false = discard them */
  constructor(
    private scene: Phaser.Scene,
    contents: Upgrade,
    private onResolve: (take: boolean) => void,
  ) {
    this.armedAt = scene.time.now + ARM_DELAY_MS;
    this.onKey = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T' || e.key === 'Enter') this.resolve(true);
      else if (e.key === 'd' || e.key === 'D') this.resolve(false);
    };
    scene.input.keyboard!.on('keydown', this.onKey);

    const cam = scene.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const d = describe(contents);
    const css = `#${d.color.toString(16).padStart(6, '0')}`;
    const cw = Math.min(300, W - 32);
    const gap = 12;

    const title = scene.add.text(0, 0, 'DATA CACHE', { fontFamily: 'monospace', fontSize: '24px', color: '#2ef2ff' }).setOrigin(0.5, 0);
    const tag = scene.add.text(0, 0, d.tag, { fontFamily: 'monospace', fontSize: '12px', color: css });
    const name = scene.add.text(0, 0, d.name, { fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', wordWrap: { width: cw - 24 } });
    const body = scene.add.text(0, 0, d.body, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c8f7ff',
      wordWrap: { width: cw - 24 },
      lineSpacing: 2,
    });
    const ch = 32 + name.height + 8 + body.height + 14;
    const bh = 36;
    const top = Math.max(12, (H - title.height - 16 - ch - 16 - bh) / 2);
    const cx = (W - cw) / 2;
    const cy = top + title.height + 16;

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(160);
    const dim = scene.add.rectangle(0, 0, W, H, 0x05060a, 0.7).setOrigin(0).setScrollFactor(0).setInteractive();
    title.setPosition(W / 2, top);
    const bg = scene.add.rectangle(cx, cy, cw, ch, 0x0d1226).setOrigin(0).setStrokeStyle(2, d.color, 0.8);
    const stripe = scene.add.rectangle(cx, cy, cw, 4, d.color).setOrigin(0);
    tag.setPosition(cx + 12, cy + 14);
    name.setPosition(cx + 12, cy + 32);
    body.setPosition(cx + 12, cy + 32 + name.height + 8);
    this.root.add([dim, title, bg, stripe, tag, name, body]);

    const buttons = [
      { text: '[T] take', color: '#5fe08a', take: true },
      { text: '[D] discard', color: '#ff2e88', take: false },
    ];
    const bw = Math.min(140, (cw - gap) / 2);
    const bx0 = W / 2 - (2 * bw + gap) / 2;
    buttons.forEach((b, i) => {
      const x = bx0 + i * (bw + gap);
      const y = cy + ch + 16;
      const btn = scene.add.rectangle(x, y, bw, bh, 0x0d1226).setOrigin(0).setStrokeStyle(2, 0x5a6a99, 0.8).setScrollFactor(0);
      const t = scene.add.text(x + bw / 2, y + bh / 2, b.text, { fontFamily: 'monospace', fontSize: '14px', color: b.color }).setOrigin(0.5);
      this.root.add([btn, t]);
      btn
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setFillStyle(0x1a2140))
        .on('pointerout', () => btn.setFillStyle(0x0d1226))
        .on('pointerup', () => this.resolve(b.take));
    });
  }

  private resolve(take: boolean) {
    if (this.done || this.scene.time.now < this.armedAt) return;
    this.destroy();
    this.onResolve(take);
  }

  destroy() {
    this.done = true;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
  }
}
