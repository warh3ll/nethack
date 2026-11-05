import Phaser from 'phaser';

const FILL = 0x0d1226;
const FILL_HOVER = 0x1a2140;
const BORDER = 0x5a6a99;
const DISABLED_COLOR = '#4a5578';

export interface ButtonSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  fontSize?: number;
  /** Left out for a button that is shown but can't be pressed yet. */
  run?: () => void;
}

/** A framed text button, added to `root`. Pinned to the screen, so it also works over a scrolled camera. */
export function addButton(scene: Phaser.Scene, root: Phaser.GameObjects.Container, b: ButtonSpec) {
  const bg = scene.add.rectangle(b.x, b.y, b.width, b.height, FILL).setOrigin(0).setScrollFactor(0);
  bg.setStrokeStyle(2, BORDER, b.run ? 0.8 : 0.3);
  const text = scene.add
    .text(b.x + b.width / 2, b.y + b.height / 2, b.label, {
      fontFamily: 'monospace',
      fontSize: `${b.fontSize ?? 16}px`,
      color: b.run ? b.color : DISABLED_COLOR,
    })
    .setOrigin(0.5)
    .setScrollFactor(0);
  root.add([bg, text]);
  if (b.run) {
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(FILL_HOVER))
      .on('pointerout', () => bg.setFillStyle(FILL))
      .on('pointerup', b.run);
  }
}
