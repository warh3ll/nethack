import Phaser from 'phaser';
import { RUN_OBJECTIVES } from '../data/objectives';
import type { Objectives } from '../systems/Objectives';

const WIDTH = 270;
const MARGIN = 16;
const PAD = 10;
const ROW_H = 22;
const HEADER_H = 26;
const COLORS = { done: '#5fe08a', active: '#2ef2ff', pending: '#6a7ba8' };

/**
 * Objective list in the top right: every objective of the run, with the finished ones ticked,
 * the current one highlighted (with its progress) and the rest dimmed.
 */
export class ObjectivePanel {
  private bg: Phaser.GameObjects.Graphics;
  private header: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private lastIndex = -1;

  constructor(
    private scene: Phaser.Scene,
    private objectives: Objectives,
  ) {
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    const style = { fontFamily: 'monospace', fontSize: '15px' };
    this.header = scene.add.text(0, 0, 'OBJECTIVES', { ...style, fontStyle: 'bold', color: '#ffd23e' }).setScrollFactor(0).setDepth(101);
    for (let i = 0; i < RUN_OBJECTIVES.length; i++) {
      this.rows.push(scene.add.text(0, 0, '', { ...style, color: COLORS.pending }).setScrollFactor(0).setDepth(101));
    }
    this.layout();
    this.update();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  private layout() {
    const x = this.scene.scale.width - MARGIN - WIDTH;
    const height = PAD * 2 + HEADER_H + this.rows.length * ROW_H;
    this.bg.clear();
    this.bg.fillStyle(0x0a0e1e, 0.75).fillRect(x, MARGIN, WIDTH, height);
    this.bg.lineStyle(2, 0x2a3358, 1).strokeRect(x + 1, MARGIN + 1, WIDTH - 2, height - 2);
    this.header.setPosition(x + PAD, MARGIN + PAD);
    this.rows.forEach((row, i) => row.setPosition(x + PAD, MARGIN + PAD + HEADER_H + i * ROW_H));
  }

  /** Call every frame; only touches the text objects when something changed. */
  update() {
    const index = this.objectives.index;
    const recolor = index !== this.lastIndex;
    this.lastIndex = index;

    this.rows.forEach((row, i) => {
      const state = i < index ? 'done' : i === index ? 'active' : 'pending';
      const mark = state === 'done' ? '[x]' : state === 'active' ? '[>]' : '[ ]';
      const pct = state === 'active' ? `${Math.floor(this.objectives.progress * 100)}%` : '';
      const name = RUN_OBJECTIVES[i].name;
      // Monospace: pad the name so the percentage lines up on the right.
      row.setText(`${mark} ${name.padEnd(19)}${pct.padStart(4)}`);
      if (recolor) row.setColor(COLORS[state]);
    });
  }
}
