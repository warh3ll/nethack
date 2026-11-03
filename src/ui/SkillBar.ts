import Phaser from 'phaser';
import { PASSIVE_SLOTS, WEAPON_SLOTS } from '../data/balance';
import { SKILLS, maxSkillLevel } from '../data/skills';
import type { Progression } from '../systems/Progression';

const BOX = 44;
const GAP = 6;
/** Extra space between the weapon group and the passive group. */
const GROUP_GAP = 22;
const MARGIN_BOTTOM = 16;
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

  constructor(
    private scene: Phaser.Scene,
    private progression: Progression,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
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

    const totalW = (WEAPON_SLOTS + PASSIVE_SLOTS) * BOX + (WEAPON_SLOTS + PASSIVE_SLOTS - 2) * GAP + GROUP_GAP;
    let x = Math.round((this.scene.scale.width - totalW) / 2);
    const y = this.scene.scale.height - MARGIN_BOTTOM - BOX;

    this.gfx.clear();
    let slotIndex = 0;
    const drawGroup = (count: number, owned: string[]) => {
      for (let i = 0; i < count; i++) {
        this.drawSlot(slotIndex++, x, y, owned[i]);
        x += BOX + GAP;
      }
      x += GROUP_GAP - GAP;
    };
    drawGroup(WEAPON_SLOTS, weapons);
    drawGroup(PASSIVE_SLOTS, passives);
  }

  private drawSlot(index: number, x: number, y: number, skillId?: string) {
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
