import Phaser from 'phaser';
import type { Player } from '../entities/Player';

/** How far from the screen edge the marker sits. Clears the skill bar (bottom 60px) and other edge HUD. */
const INSET = 96;
const SIZE = 12;
const COLOR = 0xffd23e;

/** Something a compass needle can point at, with an optional tag shown before the distance. */
export type NeedleTarget = { x: number; y: number; tag?: string } | null;

/**
 * Compass: arrow at the edge of the screen pointing at a target, with the distance next to it.
 * Hidden while the target is on screen. The main one points at the closest unfinished objective;
 * the Optic Nerve HUD adds a second one in its own colour.
 */
export class ObjectiveMarker {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private target: () => NeedleTarget,
    private player: Player,
    private color = COLOR,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '13px', color: `#${color.toString(16).padStart(6, '0')}` })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update() {
    this.gfx.clear();
    const target = this.target();
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const hw = cam.width / 2;
    const hh = cam.height / 2;
    // Target relative to the screen center.
    const dx = target ? target.x - (view.x + hw) : 0;
    const dy = target ? target.y - (view.y + hh) : 0;
    const scale = Math.min((hw - INSET) / Math.abs(dx || 1e-6), (hh - INSET) / Math.abs(dy || 1e-6));

    if (!target || scale >= 1) {
      this.label.setText('');
      return;
    }

    const x = hw + dx * scale;
    const y = hh + dy * scale;
    const angle = Math.atan2(dy, dx);
    const pt = (a: number, r: number) => ({ x: x + Math.cos(angle + a) * r, y: y + Math.sin(angle + a) * r });
    const tip = pt(0, SIZE);
    const l = pt(2.5, SIZE);
    const r = pt(-2.5, SIZE);
    this.gfx.fillStyle(this.color, 0.95).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    // Put the label on the inner side of the arrow so it stays on screen.
    const text = `${target.tag ? `${target.tag} ` : ''}${Math.round(dist / 10)}m`;
    // Tagged labels are wider, so they sit a little further in.
    const inset = target.tag ? 44 : 30;
    this.label.setPosition(x - Math.cos(angle) * inset, y - Math.sin(angle) * 22).setText(text);
  }
}
