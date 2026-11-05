import Phaser from 'phaser';
import { PASSIVE_SLOTS, WEAPON_SLOTS } from '../data/balance';
import { SKILLS, maxSkillLevel } from '../data/skills';
import type { Progression } from '../systems/Progression';

const BOX = 44;
const GAP = 6;
/** Extra space between the weapon group and the passive group. */
const GROUP_GAP = 22;
const MARGIN_BOTTOM = 16;
/** Keep at least this much space on each side; the bar shrinks to fit narrow (phone) screens. */
const MARGIN_SIDE = 8;
const EMPTY_COLOR = 0x2a3358;

interface Slot {
  letter: Phaser.GameObjects.Text;
}

/**
 * Row of skill slots at the bottom center: weapons on the left, passives on the right.
 * Empty slots are shown dimmed. Call refresh() whenever the owned skills change.
 */
export class SkillBar {
  private gfx: Phaser.GameObjects.Graphics;
  private slots: Slot[] = [];
  /** Current slot size in px (BOX, or smaller on narrow screens). */
  private box = BOX;
  /** Dash recharge bar, drawn just above the slots across their full width. */
  private dashGfx: Phaser.GameObjects.Graphics;
  private dashFrac = 1;
  private dashRect = { x: 0, y: 0, w: 0 };

  constructor(
    private scene: Phaser.Scene,
    private progression: Progression,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.dashGfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    for (let i = 0; i < WEAPON_SLOTS + PASSIVE_SLOTS; i++) {
      const letter = scene.add
        .text(0, 0, '', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#05060a' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);
      this.slots.push({ letter });
    }
    this.refresh();
    scene.scale.on('resize', this.refresh, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.refresh, this));
  }

  refresh() {
    const weapons = this.progression.ownedOfKind('weapon');
    const passives = this.progression.ownedOfKind('passive');

    const n = WEAPON_SLOTS + PASSIVE_SLOTS;
    const fullW = n * BOX + (n - 2) * GAP + GROUP_GAP;
    const k = Math.min(1, (this.scene.scale.width - 2 * MARGIN_SIDE) / fullW);
    this.box = Math.floor(BOX * k);
    const gap = Math.max(2, Math.floor(GAP * k));
    const groupGap = Math.floor(GROUP_GAP * k);
    const totalW = n * this.box + (n - 2) * gap + groupGap;
    let x = Math.round((this.scene.scale.width - totalW) / 2);
    const y = this.scene.scale.height - MARGIN_BOTTOM - this.box;
    for (const s of this.slots) s.letter.setFontSize(Math.round(20 * Math.max(k, 0.6)));

    this.dashRect = { x, y: y - 9, w: totalW };
    this.drawDash();
    this.gfx.clear();
    let slotIndex = 0;
    const drawGroup = (count: number, owned: string[]) => {
      for (let i = 0; i < count; i++) {
        this.drawSlot(slotIndex++, x, y, owned[i]);
        x += this.box + gap;
      }
      x += groupGap - gap;
    };
    drawGroup(WEAPON_SLOTS, weapons);
    drawGroup(PASSIVE_SLOTS, passives);
  }

  /** 0..1, how far the dash has recharged (1 = ready). */
  setDashProgress(frac: number) {
    if (frac === this.dashFrac) return;
    this.dashFrac = frac;
    this.drawDash();
  }

  private drawDash() {
    const { x, y, w } = this.dashRect;
    this.dashGfx.clear();
    this.dashGfx.fillStyle(0x1a2140, 0.85).fillRect(x, y, w, 4);
    this.dashGfx.fillStyle(this.dashFrac >= 1 ? 0x2ef2ff : 0x3a6a78).fillRect(x, y, w * this.dashFrac, 4);
  }

  private drawSlot(index: number, x: number, y: number, skillId?: string) {
    const BOX = this.box;
    const { letter } = this.slots[index];
    if (!skillId) {
      this.gfx.fillStyle(0x0a0e1e, 0.55).fillRect(x, y, BOX, BOX);
      this.gfx.lineStyle(2, EMPTY_COLOR, 1).strokeRect(x + 1, y + 1, BOX - 2, BOX - 2);
      letter.setText('');
      return;
    }

    const skill = SKILLS[skillId];
    const level = this.progression.skills.get(skillId) ?? 1;
    const max = maxSkillLevel(skillId);
    this.gfx.fillStyle(0x0a0e1e, 0.85).fillRect(x, y, BOX, BOX);
    this.gfx.fillStyle(skill.color, 0.9).fillRect(x + 4, y + 4, BOX - 8, BOX - 16);
    this.gfx.lineStyle(2, skill.color, 1).strokeRect(x + 1, y + 1, BOX - 2, BOX - 2);

    // One pip per skill level; lit pips are levels reached.
    const pipW = Math.min(6, (BOX - 8 - (max - 1) * 2) / max);
    const pipsW = max * pipW + (max - 1) * 2;
    for (let p = 0; p < max; p++) {
      this.gfx.fillStyle(p < level ? skill.color : EMPTY_COLOR, 1);
      this.gfx.fillRect(x + (BOX - pipsW) / 2 + p * (pipW + 2), y + BOX - 9, pipW, 4);
    }

    letter.setText(skill.name.replace(/^\[PH\]\s*/, '').charAt(0).toUpperCase()).setPosition(x + BOX / 2, y + (BOX - 12) / 2 + 2);
  }
}
