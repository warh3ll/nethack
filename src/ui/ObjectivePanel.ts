import Phaser from 'phaser';
import type { Objectives } from '../systems/Objectives';

const WIDTH = 270;
const MARGIN = 16;
const PAD = 10;
const ROW_H = 22;
const HEADER_H = 26;
/** Opacity of the Extract row until every objective is done. */
const LOCKED_ALPHA = 0.6;
const COLORS ={ done: '#5fe08a', active: '#2ef2ff', pending: '#6a7ba8' };

/**
 * Objective list in the top right: every objective of the run, with the finished ones ticked,
 * the current one highlighted (with its progress) and the rest dimmed.
 */
export class ObjectivePanel {
  private bg: Phaser.GameObjects.Graphics;
  private header: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private lastKey = '';

  constructor(
    private scene: Phaser.Scene,
    private objectives: Objectives,
  ) {
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    const style = { fontFamily: 'monospace', fontSize: '15px' };
    this.header = scene.add.text(0, 0, 'OBJECTIVES', { ...style, fontStyle: 'bold', color: '#ffd23e' }).setScrollFactor(0).setDepth(101);
    // One row per objective plus the extraction row at the bottom (not one of the 3-5).
    for (let i = 0; i < objectives.entries.length + 1; i++) {
      this.rows.push(scene.add.text(0, 0, '', { ...style, color: COLORS.pending }).setScrollFactor(0).setDepth(101));
    }
    this.layout();
    this.update();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  private layout() {
    const x = this.scene.scale.width - MARGIN - WIDTH;
    // On a phone the top-left HUD (bars + stats line) spans most of the width, so sit below it.
    const top = this.scene.scale.width < 600 ? 64 : MARGIN;
    const height = PAD * 2 + HEADER_H + this.rows.length * ROW_H;
    this.bg.clear();
    this.bg.fillStyle(0x0a0e1e, 0.75).fillRect(x, top, WIDTH, height);
    this.bg.lineStyle(2, 0x2a3358, 1).strokeRect(x + 1, top + 1, WIDTH - 2, height - 2);
    this.header.setPosition(x + PAD, top + PAD);
    this.rows.forEach((row, i) => row.setPosition(x + PAD, top + PAD + HEADER_H + i * ROW_H));
  }

  /** Call every frame; only touches the text objects when something changed. */
  update() {
    const states = this.objectives.entries.map((e) => (e.done ? 'done' : e === this.objectives.current ? 'active' : 'pending'));
    const locked = !this.objectives.isComplete;
    const key = states.join() + locked;
    const recolor = key !== this.lastKey;
    this.lastKey = key;

    this.objectives.entries.forEach((entry, i) => {
      const state = states[i];
      const mark = state === 'done' ? '[x]' : state === 'active' ? '[>]' : '[ ]';
      // Show progress for anything started but unfinished (it decays when the player leaves).
      const p = entry.hack?.progress ?? 0;
      const outposts = this.objectives.outpostCount(entry);
      const pct = outposts
        ? `${outposts.down}/${outposts.total}`
        : !entry.done && p > 0
          ? `${Math.floor(p * 100)}%`
          : '';
      // Monospace: pad the name so the percentage lines up on the right.
      this.rows[i].setText(`${mark} ${entry.def.name.padEnd(19)}${pct.padStart(4)}`);
      if (recolor) this.rows[i].setColor(COLORS[state as keyof typeof COLORS]);
    });

    // Extraction row: faded until every objective is done, then it becomes the active goal.
    const row = this.rows[this.rows.length - 1];
    row.setText(`${locked ? '[ ]' : '[>]'} ${'Extract'.padEnd(19)}${''.padStart(4)}`);
    if (recolor) {
      row.setColor(locked ? COLORS.pending : COLORS.active);
      row.setAlpha(locked ? LOCKED_ALPHA : 1);
    }
  }
}
