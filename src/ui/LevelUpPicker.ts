import Phaser from 'phaser';
import { FALLBACK_UPGRADES, SKILLS, getSkillStats } from '../data/skills';
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
  hackMs: 'hack time ms',
  radius: 'blast radius',
  stunMs: 'stun ms',
  durationMs: 'duration ms',
  hijackRange: 'hijack range',
  count: 'hijacks at once',
  contactDamage: 'touch damage',
  explosionDamage: 'blast damage',
  explosionRadius: 'blast radius',
  damageReduction: 'damage reduction',
  retaliationDamage: 'retaliation damage',
  shieldHits: 'shield hits',
  shieldRechargeMs: 'shield recharge ms',
  hpRegenPerSec: 'HP regen/sec',
  moveSpeedPct: 'move speed %',
  damagePct: 'damage %',
};

/** Stats shown on a new weapon's card (the rest are noise at a glance). */
const NEW_WEAPON_KEYS = ['damage', 'cooldownMs', 'projectiles', 'range', 'dps', 'infectRange', 'spreadRange', 'spreadCount', 'hackMs', 'radius', 'stunMs', 'durationMs', 'count', 'explosionDamage', 'explosionRadius'];

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

/** Card text and colour for an upgrade; shared with the cache screen. */
export function describe(u: Upgrade) {
  if (u.type === 'heal') {
    const f = FALLBACK_UPGRADES.heal;
    return { tag: 'REPAIR', name: f.name, body: `${f.description}\n\n+${Math.round(u.fraction * 100)}% max HP`, color: 0xff2e88 };
  }
  if (u.type === 'credits') {
    const f = FALLBACK_UPGRADES.credits;
    return { tag: 'PAYOUT', name: f.name, body: `${f.description}\n\n+${u.amount} credits`, color: 0xffd23e };
  }
  const s = SKILLS[u.skillId];
  const kind = s.kind === 'weapon' ? 'WEAPON' : 'PASSIVE';
  const tag = u.toLevel === 1 ? `NEW ${kind}` : `${kind}  LV ${u.toLevel}`;
  return { tag, name: s.name, body: `${s.description}\n\n${statLines(u.skillId, u.toLevel)}`, color: s.color };
}

/** Modal "pick 1 of N upgrades" screen. Click or tap a card, or press its number key. */
export class LevelUpPicker {
  private root!: Phaser.GameObjects.Container;
  private onKey: (e: KeyboardEvent) => void;
  private rerollsLeft: number;
  private upgrades: Upgrade[];
  private done = false;
  private armedAt = 0;

  /**
   * @param reroll returns a fresh set of choices (given the current ones), or null when a reroll would show nothing new
   * @param onPick called with the chosen upgrade, or null when the player skips (no reward)
   */
  constructor(
    private scene: Phaser.Scene,
    private level: number,
    upgrades: Upgrade[],
    rerolls: number,
    private reroll: (current: Upgrade[]) => Upgrade[] | null,
    private onPick: (u: Upgrade | null) => void,
  ) {
    this.upgrades = upgrades;
    this.rerollsLeft = rerolls;
    this.onKey = (e: KeyboardEvent) => {
      if (this.done) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < this.upgrades.length) this.pick(this.upgrades[i]);
      else if (e.key === 'r' || e.key === 'R') this.doReroll();
      else if (e.key === 's' || e.key === 'S') this.pick(null);
    };
    scene.input.keyboard!.on('keydown', this.onKey);
    this.render();
  }

  private pick(u: Upgrade | null) {
    if (this.done || this.scene.time.now < this.armedAt) return;
    this.done = true;
    this.destroy();
    this.onPick(u);
  }

  private doReroll() {
    if (this.done || this.rerollsLeft <= 0 || this.scene.time.now < this.armedAt) return;
    const next = this.reroll(this.upgrades);
    if (!next) return;
    this.rerollsLeft--;
    this.upgrades = next;
    this.root.destroy();
    this.render();
  }

  /** True when the reroll button is shown: one is left and it would show something new. */
  private get canReroll() {
    return this.rerollsLeft > 0 && this.upgrades.some((u) => u.type === 'skill') && this.reroll(this.upgrades) !== null;
  }

  private render() {
    const { scene, level, upgrades } = this;
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

    /** Card index the current press started on. A card is picked on release over the same card, like a button. */
    let pressed = -1;
    this.armedAt = scene.time.now + ARM_DELAY_MS;

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
    const buttonsH = 52;
    const top = Math.max(12, (H - titleH - cardsH - buttonsH) / 2);
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
          if (pressed === i) this.pick(u);
          pressed = -1;
        });
    });

    // Reroll and skip buttons under the cards.
    const btnY = y + (stacked ? 0 : rowH) + 16;
    const labels: { text: string; color: string; run: () => void }[] = [];
    if (this.canReroll) labels.push({ text: `[R] reroll (${this.rerollsLeft})`, color: '#2ef2ff', run: () => this.doReroll() });
    labels.push({ text: '[S] skip (no reward)', color: '#8a96c0', run: () => this.pick(null) });
    const bw = Math.min(190, (W - gap * (labels.length + 1)) / labels.length);
    const bh = 36;
    const bx0 = W / 2 - (labels.length * bw + (labels.length - 1) * gap) / 2;
    labels.forEach((l, i) => {
      const x = bx0 + i * (bw + gap);
      const bg = scene.add.rectangle(x, btnY, bw, bh, 0x0d1226).setOrigin(0).setStrokeStyle(2, 0x5a6a99, 0.8).setScrollFactor(0);
      const t = scene.add.text(x + bw / 2, btnY + bh / 2, l.text, { fontFamily: 'monospace', fontSize: '14px', color: l.color }).setOrigin(0.5);
      this.root.add([bg, t]);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x1a2140))
        .on('pointerout', () => bg.setFillStyle(0x0d1226))
        .on('pointerup', l.run);
    });
  }

  destroy() {
    this.done = true;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
  }
}
