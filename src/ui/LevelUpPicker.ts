import Phaser from 'phaser';
import { FALLBACK_UPGRADE, SKILLS, getSkillStats } from '../data/skills';
import type { Upgrade } from '../systems/Progression';

const LABELS: Record<string, string> = {
  damage: 'damage',
  cooldownMs: 'cooldown ms',
  projectileSpeed: 'bullet speed',
  pierce: 'pierce',
  projectiles: 'bullets',
  spreadDeg: 'spread',
  range: 'range',
  dps: 'damage/sec',
  infectRange: 'infect range',
  spreadRange: 'spread range',
  spreadCount: 'spreads to',
  maxHp: 'max HP',
  moveSpeedPct: 'move speed %',
  damagePct: 'damage %',
};

/** Stats shown on a new weapon's card (the rest are noise at a glance). */
const NEW_WEAPON_KEYS = ['damage', 'cooldownMs', 'projectiles', 'range', 'dps', 'infectRange', 'spreadRange', 'spreadCount'];

/** Ignore clicks and key presses this long after the picker opens, so a click or mashed key from just before doesn't pick by accident. */
const ARM_DELAY_MS = 300;

/** Stat lines for a card: the new skill's stats, or "damage 5 > 6" for what changes on a level-up. */
function statLines(skillId: string, toLevel: number): string {
  const skill = SKILLS[skillId];
  const next = getSkillStats(skillId, toLevel) as Record<string, number>;
  const lines: string[] = [];
  if (toLevel === 1) {
    for (const key of Object.keys(next)) {
      if (skill.kind === 'weapon' && !NEW_WEAPON_KEYS.includes(key)) continue;
      lines.push(`${LABELS[key] ?? key}  ${next[key]}`);
    }
  } else {
    const prev = getSkillStats(skillId, toLevel - 1) as Record<string, number>;
    for (const key of Object.keys(next)) {
      const from = prev[key] ?? 0;
      if (from !== next[key]) lines.push(`${LABELS[key] ?? key}  ${from} > ${next[key]}`);
    }
  }
  return lines.join('\n');
}

function describe(u: Upgrade) {
  if (u.type === 'heal') {
    return { tag: 'REPAIR', name: FALLBACK_UPGRADE.name, body: `${FALLBACK_UPGRADE.description}\n\n+${u.amount} HP`, color: 0xff2e88 };
  }
  const s = SKILLS[u.skillId];
  const kind = s.kind === 'weapon' ? 'WEAPON' : 'PASSIVE';
  const tag = u.toLevel === 1 ? `NEW ${kind}` : `${kind}  LV ${u.toLevel}`;
  return { tag, name: s.name, body: `${s.description}\n\n${statLines(u.skillId, u.toLevel)}`, color: s.color };
}

/** Modal "pick 1 of N upgrades" screen. Click or tap a card, or press its number key. */
export class LevelUpPicker {
  private root: Phaser.GameObjects.Container;
  private onKey: (e: KeyboardEvent) => void;

  constructor(
    private scene: Phaser.Scene,
    level: number,
    upgrades: Upgrade[],
    onPick: (u: Upgrade) => void,
  ) {
    const cam = scene.cameras.main;
    const W = cam.width;
    const H = cam.height;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(160);

    const dim = scene.add.rectangle(0, 0, W, H, 0x05060a, 0.7).setOrigin(0).setScrollFactor(0).setInteractive();
    this.root.add(dim);

    const title = scene.add
      .text(W / 2, 0, `LEVEL ${level}\nchoose an upgrade`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffd23e',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.root.add(title);

    // Cards side by side, or stacked when the screen is too narrow (phone portrait).
    const gap = 16;
    const n = upgrades.length;
    const stacked = W < 3 * 220 + 4 * gap;
    const cw = stacked ? Math.min(360, W - 2 * gap) : 220;

    let picked = false;
    /** Card index the current press started on. A card is picked on release over the same card, like a button. */
    let pressed = -1;
    const armedAt = scene.time.now + ARM_DELAY_MS;
    const pick = (u: Upgrade) => {
      if (picked || scene.time.now < armedAt) return;
      picked = true;
      this.destroy();
      onPick(u);
    };

    // Build the card texts first so each card can be sized to fit its text.
    const cards = upgrades.map((u, i) => {
      const d = describe(u);
      const css = `#${d.color.toString(16).padStart(6, '0')}`;
      const key = scene.add.text(0, 0, `${i + 1}`, { fontFamily: 'monospace', fontSize: '16px', color: '#5a6a99' }).setOrigin(1, 0);
      const tag = scene.add.text(0, 0, d.tag, { fontFamily: 'monospace', fontSize: '12px', color: css });
      const name = scene.add.text(0, 0, d.name, {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#ffffff',
        wordWrap: { width: cw - 24 },
      });
      const body = scene.add.text(0, 0, d.body, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#c8f7ff',
        wordWrap: { width: cw - 24 },
        lineSpacing: 2,
      });
      return { u, d, key, tag, name, body, need: 32 + name.height + 8 + body.height + 14 };
    });

    // Side by side: one shared height. Stacked: each card only as tall as its text, to fit a phone screen.
    const rowH = Math.max(230, ...cards.map((c) => c.need));
    const heights = cards.map((c) => (stacked ? c.need : rowH));
    const totalW = stacked ? cw : n * cw + (n - 1) * gap;
    const cardsH = stacked ? heights.reduce((a, b) => a + b, 0) + (n - 1) * gap : rowH;
    const titleH = title.height + 16;
    const top = Math.max(12, (H - titleH - cardsH) / 2);
    title.setY(top);

    let y = top + titleH;
    cards.forEach((c, i) => {
      const { u, d, key, tag, name, body } = c;
      const ch = heights[i];
      const x = stacked ? (W - cw) / 2 : (W - totalW) / 2 + i * (cw + gap);

      const bg = scene.add.rectangle(x, y, cw, ch, 0x0d1226).setOrigin(0).setStrokeStyle(2, d.color, 0.8);
      const stripe = scene.add.rectangle(x, y, cw, 4, d.color).setOrigin(0);
      key.setPosition(x + cw - 12, y + 12);
      tag.setPosition(x + 12, y + 14);
      name.setPosition(x + 12, y + 32);
      body.setPosition(x + 12, y + 32 + name.height + 8);
      this.root.add([bg, stripe, key, tag, name, body]);
      if (stacked) y += ch + gap;

      // Children of a scrollFactor-0 container need their own scrollFactor 0, or hit-testing drifts with the camera.
      bg.setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x1a2140))
        .on('pointerout', () => {
          bg.setFillStyle(0x0d1226);
          if (pressed === i) pressed = -1; // slid off the card: cancel, so a stray swipe doesn't pick
        })
        .on('pointerdown', () => {
          pressed = i;
          bg.setFillStyle(0x1a2140);
        })
        .on('pointerup', () => {
          if (pressed === i) pick(u);
          pressed = -1;
        });
    });

    this.onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < n) pick(upgrades[i]);
    };
    scene.input.keyboard!.on('keydown', this.onKey);
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
  }
}
