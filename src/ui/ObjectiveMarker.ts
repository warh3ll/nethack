import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Objectives } from '../systems/Objectives';

/** How far from the screen edge the marker sits. */
const INSET = 44;
const SIZE = 12;
const COLOR = 0xffd23e;

/**
 * Arrow at the edge of the screen pointing at the current objective, with the distance next to it.
 * Hidden while the objective is on screen.
 */
export class ObjectiveMarker {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private objectives: Objectives,
    private player: Player,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffd23e' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update() {
    this.gfx.clear();
    const target = this.objectives.target;
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
    this.gfx.fillStyle(COLOR, 0.95).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    // Put the label on the inner side of the arrow so it stays on screen.
    this.label.setPosition(x - Math.cos(angle) * 30, y - Math.sin(angle) * 22).setText(`${Math.round(dist / 10)}m`);
  }
}
