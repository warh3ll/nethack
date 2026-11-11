import Phaser from 'phaser';
import { CYBERWARE, CYBER_SLOTS, type CyberSlot } from '../data/cyberware';
import { createParallax } from '../entities/Parallax';
import { account } from '../systems/Account';
import { addButton } from '../ui/Button';

const CYAN = '#2ef2ff';
const GOLD = '#ffd23e';
const GREEN = '#5cff9b';
const PURPLE = '#b88cff';
const DIM = '#6a7ba8';
const FONT = 'monospace';
const PAD = 16;
/** Narrower than this, the silhouette moves above the list. */
const WIDE_MIN = 720;
const MAX_W = 1040;
const ROW_H = 36;
const HEADING_H = 30;
/** A press that moves further than this scrolls the list instead of tapping a row. */
const DRAG_SLOP = 8;
/** Silhouette texture size (BootScene). */
const SIL_W = 200;
const SIL_H = 400;

/** One line of the list: a slot heading or a piece of cyberware. */
type Line = { kind: 'heading'; slot: CyberSlot } | { kind: 'item'; id: string };

/**
 * The ripdoc (docs/CYBERWARE.md): buy permanent cyberware with banked credits. A list on the left, a silhouette with
 * a marker per slot on the right (above the list on narrow screens). Blueprint pieces only show once found.
 * The list scrolls in its own camera, which only draws `listRoot`; the main camera draws everything else.
 */
export class RipdocScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private listRoot!: Phaser.GameObjects.Container;
  private listCam!: Phaser.Cameras.Scene2D.Camera;
  private listRect = new Phaser.Geom.Rectangle();
  private listContentH = 0;
  private scroll = 0;
  /** Rows of the current list, for keyboard selection and keeping the selection in view. */
  private rowSpans: { id: string; top: number; bottom: number }[] = [];
  private selected: string | null = null;
  /** The piece whose BUY was pressed once and now asks for confirmation. */
  private confirming: string | null = null;
  private notice = '';
  private drag: { startY: number; startScroll: number; moved: boolean } | null = null;

  constructor() {
    super('ripdoc');
  }

  create() {
    this.scroll = 0;
    this.confirming = null;
    this.notice = '';
    this.drag = null;
    this.selected = this.visibleIds()[0] ?? null;

    createParallax(this);
    this.root = this.add.container(0, 0).setScrollFactor(0);
    this.listRoot = this.add.container(0, 0);
    this.cameras.main.ignore(this.listRoot);
    this.listCam = this.cameras.add(0, 0, 1, 1, false, 'ripdoc-list');

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown-BACKSPACE', () => this.back());
    kb.on('keydown-UP', () => this.moveSelection(-1));
    kb.on('keydown-W', () => this.moveSelection(-1));
    kb.on('keydown-DOWN', () => this.moveSelection(1));
    kb.on('keydown-S', () => this.moveSelection(1));
    kb.on('keydown-ENTER', () => this.selected && this.pressBuy(this.selected));
    kb.on('keydown-SPACE', () => this.selected && this.pressBuy(this.selected));

    // Drag (touch or mouse) and the wheel scroll the list.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = this.listRect.contains(p.x, p.y) ? { startY: p.y, startScroll: this.scroll, moved: false } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dy = p.y - this.drag.startY;
      if (Math.abs(dy) > DRAG_SLOP) this.drag.moved = true;
      if (this.drag.moved) this.setScroll(this.drag.startScroll - dy);
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (this.listRect.contains(p.x, p.y)) this.setScroll(this.scroll + dy);
    });

    this.render();
    this.scale.on('resize', this.render, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.render, this));
  }

  /** Cyberware shown at the ripdoc, in list order: by slot, then as listed in the data. */
  private visibleIds(): string[] {
    const ids = Object.keys(CYBERWARE).filter((id) => account.isAvailable(id));
    const slotOrder = Object.keys(CYBER_SLOTS);
    return ids.sort((a, b) => slotOrder.indexOf(CYBERWARE[a].slot) - slotOrder.indexOf(CYBERWARE[b].slot));
  }

  private back() {
    this.scene.start('menu');
  }

  private moveSelection(step: number) {
    const ids = this.visibleIds();
    if (ids.length === 0) return;
    const i = this.selected ? ids.indexOf(this.selected) : -1;
    this.select(ids[Phaser.Math.Clamp(i + step, 0, ids.length - 1)]);
  }

  private select(id: string) {
    if (this.selected === id) return;
    this.selected = id;
    this.confirming = null;
    this.notice = '';
    this.render();
    this.scrollIntoView(id);
  }

  /** First press asks for confirmation; the second buys. Purchases can't be undone. */
  private pressBuy(id: string) {
    if (account.isInstalled(id) || account.credits < CYBERWARE[id].cost) return;
    if (this.confirming !== id) {
      this.confirming = id;
      this.render();
      return;
    }
    this.confirming = null;
    const result = account.buy(id);
    this.notice = result === 'ok' ? `${CYBERWARE[id].name} installed.` : 'Purchase failed. Nothing was spent.';
    this.render();
  }

  private setScroll(value: number) {
    this.scroll = Phaser.Math.Clamp(value, 0, Math.max(0, this.listContentH - this.listRect.height));
    this.listCam.setScroll(0, this.scroll);
  }

  private scrollIntoView(id: string) {
    const span = this.rowSpans.find((s) => s.id === id);
    if (!span) return;
    if (span.top < this.scroll) this.setScroll(span.top - HEADING_H);
    else if (span.bottom > this.scroll + this.listRect.height) this.setScroll(span.bottom - this.listRect.height);
  }

  /** Rebuilds the whole screen. It is a menu, so this only runs on input and resize. */
  private render() {
    this.tweens.killAll();
    this.root.removeAll(true);
    this.listRoot.removeAll(true);
    const { width: W, height: H } = this.scale;
    const cw = Math.min(MAX_W, W - PAD * 2);
    const x0 = (W - cw) / 2;
    const wide = W >= WIDE_MIN;

    this.root.add(this.add.rectangle(0, 0, W, H, 0x05060a, 0.75).setOrigin(0));

    // Header: title and credits on the left, back button on the right.
    const title = this.add.text(x0, PAD, 'RIPDOC', { fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: CYAN });
    const credits = this.add.text(x0, title.y + title.height + 4, `credits ${account.credits}`, {
      fontFamily: FONT,
      fontSize: '18px',
      color: GOLD,
    });
    const sub = this.add.text(x0, credits.y + credits.height + 4, this.notice || 'Permanent upgrades, active in every run.', {
      fontFamily: FONT,
      fontSize: '12px',
      color: this.notice ? GREEN : DIM,
    });
    this.root.add([title, credits, sub]);
    const backW = 120;
    addButton(this, this.root, { x: x0 + cw - backW, y: PAD, width: backW, height: 40, label: '[ESC] BACK', color: CYAN, run: () => this.back() });
    const bodyTop = sub.y + sub.height + 14;
    const bodyH = H - PAD - bodyTop;

    // Body: list and silhouette side by side, or the silhouette in a band above the list.
    let list: Phaser.Geom.Rectangle;
    if (wide) {
      const listW = Math.round(cw * 0.58);
      list = new Phaser.Geom.Rectangle(x0, bodyTop, listW, bodyH);
      this.drawSilhouette(x0 + listW + 24, bodyTop, cw - listW - 24, bodyH);
    } else {
      const bandH = Phaser.Math.Clamp(Math.round(bodyH * 0.3), 110, 220);
      this.drawSilhouette(x0, bodyTop, cw, bandH);
      list = new Phaser.Geom.Rectangle(x0, bodyTop + bandH + 10, cw, bodyH - bandH - 10);
    }
    this.root.add(this.add.rectangle(list.x - 1, list.y - 1, list.width + 2, list.height + 2).setOrigin(0).setStrokeStyle(1, 0x5a6a99, 0.5));
    this.listRect = list;
    this.listCam.setViewport(list.x, list.y, list.width, list.height);
    this.buildList(list.width);
    this.setScroll(this.scroll);
    // The list camera draws only the list.
    this.listCam.ignore(this.children.list.filter((o) => o !== this.listRoot));
  }

  private buildList(w: number) {
    const lines: Line[] = [];
    const ids = this.visibleIds();
    for (const slot of Object.keys(CYBER_SLOTS) as CyberSlot[]) {
      const inSlot = ids.filter((id) => CYBERWARE[id].slot === slot);
      if (inSlot.length === 0) continue;
      lines.push({ kind: 'heading', slot }, ...inSlot.map((id): Line => ({ kind: 'item', id })));
    }
    this.rowSpans = [];
    let y = 0;
    for (const line of lines) {
      if (line.kind === 'heading') {
        const t = this.add.text(10, y + 10, CYBER_SLOTS[line.slot].label, { fontFamily: FONT, fontSize: '12px', color: DIM });
        this.listRoot.add(t);
        y += HEADING_H;
        continue;
      }
      const top = y;
      y += this.buildRow(line.id, y, w);
      this.rowSpans.push({ id: line.id, top, bottom: y });
    }
    this.listContentH = y + 8;
  }

  /** One piece of cyberware; the selected one opens to show its description and buy button. Returns its height. */
  private buildRow(id: string, y: number, w: number): number {
    const cw = CYBERWARE[id];
    const open = this.selected === id;
    const installed = account.isInstalled(id);
    const affordable = account.credits >= cw.cost;

    const bg = this.add.rectangle(0, y, w, ROW_H, open ? 0x1a2140 : 0x0d1226, open ? 0.95 : 0.7).setOrigin(0);
    bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.tap(() => this.select(id)));
    const price = this.add
      .text(w - 12, y + ROW_H / 2, installed ? 'INSTALLED' : `${cw.cost} cr`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: installed ? GREEN : affordable ? GOLD : DIM,
      })
      .setOrigin(1, 0.5);
    // The name wraps short of the price on narrow screens; the BLUEPRINT tag goes under it when it doesn't fit beside it.
    const nameW = w - 24 - price.width - 12;
    const name = this.add.text(12, 0, cw.name, { fontFamily: FONT, fontSize: '15px', color: installed ? GREEN : '#ffffff', wordWrap: { width: nameW } });
    this.listRoot.add([bg, name, price]);
    let headH = name.height;
    if (cw.source === 'blueprint') {
      const tag = this.add.text(0, 0, 'BLUEPRINT', { fontFamily: FONT, fontSize: '10px', color: PURPLE }).setOrigin(0, 0.5);
      const lastLine = name.getWrappedText().at(-1) ?? '';
      const lastLineW = this.add.text(0, 0, lastLine, name.style).setVisible(false);
      if (lastLineW.width + 8 + tag.width <= nameW) tag.setPosition(12 + lastLineW.width + 8, name.height - name.height / name.getWrappedText().length / 2);
      else {
        tag.setPosition(12, name.height + 8);
        headH += 14;
      }
      lastLineW.destroy();
      this.listRoot.add(tag);
      tag.y += y + Math.max(0, (ROW_H - headH) / 2);
    }
    const headTop = y + Math.max(0, (ROW_H - headH) / 2);
    name.setY(headTop);
    let h = Math.max(ROW_H, headH + 14);
    price.setY(y + Math.min(ROW_H, h) / 2);
    if (open) {
      const desc = this.add.text(12, y + h, cw.description, { fontFamily: FONT, fontSize: '13px', color: '#c8f7ff', wordWrap: { width: w - 24 }, lineSpacing: 2 });
      this.listRoot.add(desc);
      h += desc.height + 10;
      if (!installed) {
        const confirming = this.confirming === id;
        const label = !affordable ? `NEED ${cw.cost} cr` : confirming ? `[ENTER] CONFIRM  -${cw.cost} cr` : `[ENTER] BUY  ${cw.cost} cr`;
        addButton(this, this.listRoot, {
          x: 12,
          y: y + h,
          width: Math.min(280, w - 24),
          height: 38,
          label,
          color: confirming ? GOLD : CYAN,
          fontSize: 14,
          run: affordable ? () => this.tap(() => this.pressBuy(id)) : undefined,
        });
        // Buttons come pinned to the screen; in the list they have to scroll with the list camera.
        for (const o of this.listRoot.list.slice(-2)) (o as Phaser.GameObjects.Rectangle).setScrollFactor(1);
        h += 38;
      }
      h += 10;
    }
    bg.setSize(w, h);
    return h + 4;
  }

  /** Runs `action` unless the press was a drag to scroll the list. */
  private tap(action: () => void) {
    if (this.drag?.moved) return;
    // Next tick: the action rebuilds the screen, which would destroy the object whose handler is still running.
    this.time.delayedCall(0, action);
  }

  /** The body outline with a marker per slot: filled where something is installed, ringed for the selected piece's slot. */
  private drawSilhouette(x: number, y: number, w: number, h: number) {
    const scale = Math.min(w / SIL_W, h / SIL_H);
    const sx = x + (w - SIL_W * scale) / 2;
    const sy = y + (h - SIL_H * scale) / 2;
    this.root.add(this.add.image(sx, sy, 'ripdoc-silhouette').setOrigin(0).setScale(scale));

    const visible = this.visibleIds();
    const selectedSlot = this.selected ? CYBERWARE[this.selected].slot : null;
    const r = Math.max(5, 9 * scale);
    for (const [slot, info] of Object.entries(CYBER_SLOTS) as [CyberSlot, (typeof CYBER_SLOTS)[CyberSlot]][]) {
      const inSlot = visible.filter((id) => CYBERWARE[id].slot === slot);
      if (inSlot.length === 0) continue;
      const mx = sx + info.anchor.x * SIL_W * scale;
      const my = sy + info.anchor.y * SIL_H * scale;
      const installed = inSlot.filter((id) => account.isInstalled(id));
      // Real art, once it exists, replaces the placeholder marker.
      const art = installed.filter((id) => this.textures.exists(`cyberware-${id}`));
      for (const id of art) this.root.add(this.add.image(mx, my, `cyberware-${id}`).setScale(scale));
      if (art.length === 0) {
        const dot = this.add.circle(mx, my, r, installed.length > 0 ? 0x5cff9b : 0x05060a, installed.length > 0 ? 0.9 : 0.6);
        dot.setStrokeStyle(2, installed.length > 0 ? 0x5cff9b : 0x5a6a99);
        this.root.add(dot);
      }
      if (slot === selectedSlot) {
        const ring = this.add.circle(mx, my, r + 6).setStrokeStyle(2, 0x2ef2ff);
        this.root.add(ring);
        this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
        const label = this.add.text(mx + r + 12, my, info.label, { fontFamily: FONT, fontSize: '12px', color: CYAN }).setOrigin(0, 0.5);
        if (label.x + label.width > x + w) label.setOrigin(1, 0.5).setX(mx - r - 12);
        this.root.add(label);
      }
    }
  }
}
