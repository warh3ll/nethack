import Phaser from 'phaser';
import { TOUCH_PROMPT } from '../data/balance';
import { wordTiles, type KeyResult } from '../systems/Hack';
import type { TouchPrompt } from '../systems/Objectives';
import { isTouchMode } from './touchMode';

const DEPTH = 130; // under the pause button (140), over the HUD
const FONT = 'monospace';
const FILL = 0x0d1226;
const FILL_PRESSED = 0x1f3a5c;
const FILL_WRONG = 0x6a1036;
const BORDER = 0x2ef2ff;
const PAD = 14;
const HEADER_H = 74;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Tile {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  /** Place in the correct order, or -1 for a decoy. */
  order: number;
}

/** The handlers the panel types into (Objectives). */
export interface PromptInput {
  typeKeypad(key: string): KeyResult;
  typeWord(word: string): KeyResult;
}

/**
 * Touch input for hack prompts (GAME_DESIGN section 8b): a keypad for PIN and IP, word tiles for Password, Inject and
 * the camera pole's command. Takes the bottom half of the screen in portrait and the right side in landscape, so the
 * player can still move by starting a drag in the free part. Only shown in touch mode; the keyboard works as before.
 */
export class TouchPromptPanel {
  private root: Phaser.GameObjects.Container | null = null;
  private id: unknown = null;
  /** The tile order of the current prompt, kept so tiles don't reshuffle if the panel closes and reopens. */
  private tileWords: { id: unknown; words: string[] } | null = null;
  private tiles: Tile[] = [];
  private base: Phaser.GameObjects.Text | null = null;
  private typed: Phaser.GameObjects.Text | null = null;
  private builtFor = { w: 0, h: 0 };

  constructor(
    private scene: Phaser.Scene,
    private input: PromptInput,
  ) {
    scene.events.once('shutdown', () => this.close());
  }

  get open() {
    return this.root !== null;
  }

  /** Where the camera should aim relative to the player so they sit in the middle of the part the panel leaves free. */
  cameraOffset() {
    if (!this.root) return { x: 0, y: 0 };
    const { width: w, height: h } = this.scene.scale;
    return portrait(w, h) ? { x: 0, y: -h / 4 } : { x: -w / 4, y: 0 };
  }

  /** Call every frame with the prompt taking input (or null). Builds, refreshes or closes the panel. */
  update(prompt: TouchPrompt | null) {
    if (!prompt || !isTouchMode()) return this.close();
    const { width, height } = this.scene.scale;
    if (prompt.id !== this.id || width !== this.builtFor.w || height !== this.builtFor.h) this.build(prompt);
    this.refresh(prompt);
  }

  private close() {
    this.root?.destroy();
    this.root = null;
    this.id = null;
    this.tiles = [];
    this.base = this.typed = null;
  }

  private rect(): Rect {
    const { width: w, height: h } = this.scene.scale;
    if (portrait(w, h)) return { x: 0, y: Math.round(h / 2), w, h: h - Math.round(h / 2) };
    const top = TOUCH_PROMPT.landscapeTop;
    return { x: Math.round(w / 2), y: top, w: w - Math.round(w / 2), h: h - top };
  }

  private build(prompt: TouchPrompt) {
    this.close();
    this.id = prompt.id;
    this.builtFor = { w: this.scene.scale.width, h: this.scene.scale.height };
    const r = this.rect();
    const root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.root = root;

    // The backing swallows touches, so a thumb landing between keys doesn't start the joystick under the panel.
    const back = this.scene.add.rectangle(r.x, r.y, r.w, r.h, 0x05060a, 0.95).setOrigin(0).setScrollFactor(0).setInteractive();
    const edge = this.scene.add.rectangle(r.x, r.y, r.w, r.h).setOrigin(0).setScrollFactor(0).setStrokeStyle(2, BORDER, 0.5);
    const title = this.text(r.x + r.w / 2, r.y + PAD + 8, prompt.title, 14, '#ffd23e').setOrigin(0.5);
    this.base = this.text(0, r.y + PAD + 42, prompt.text, 24, '#ffffff').setOrigin(0, 0.5);
    this.typed = this.text(0, r.y + PAD + 42, '', 24, '#5fe08a').setOrigin(0, 0.5);
    root.add([back, edge, title, this.base, this.typed]);

    const content: Rect = { x: r.x + PAD, y: r.y + HEADER_H, w: r.w - PAD * 2, h: r.h - HEADER_H - PAD };
    if (prompt.input === 'keypad') this.buildKeypad(content);
    else this.buildTiles(prompt, content);
  }

  private buildKeypad(c: Rect) {
    const { gap, keyHeight, keyMaxWidth } = TOUCH_PROMPT;
    const keyW = Math.min(keyMaxWidth, (c.w - gap * 2) / 3);
    const keyH = Phaser.Math.Clamp((c.h - gap * 3) / 4, keyHeight.min, keyHeight.max);
    const gridW = keyW * 3 + gap * 2;
    const gridH = keyH * 4 + gap * 3;
    const left = c.x + (c.w - gridW) / 2;
    const top = c.y + Math.max(0, (c.h - gridH) / 2);
    KEYS.forEach((key, i) => {
      if (!key) return;
      const x = left + (i % 3) * (keyW + gap);
      const y = top + Math.floor(i / 3) * (keyH + gap);
      const bg = this.button(x, y, keyW, keyH);
      const label = this.text(x + keyW / 2, y + keyH / 2, key, 26, '#c8f7ff').setOrigin(0.5);
      this.root!.add([bg, label]);
      bg.on('pointerdown', () => {
        const result = this.input.typeKeypad(key);
        this.blink(bg, result === 'wrong' ? FILL_WRONG : FILL_PRESSED, result === 'wrong' ? TOUCH_PROMPT.wrongBlinkMs : 90);
      });
    });
  }

  private buildTiles(prompt: TouchPrompt, c: Rect) {
    const { gap, tileHeight, wordTiles: count } = TOUCH_PROMPT;
    if (this.tileWords?.id !== prompt.id) this.tileWords = { id: prompt.id, words: wordTiles(prompt.words, prompt.pool, count) };
    const { words } = this.tileWords!;

    // A masonry of bricks as wide as their words, filled row by row and centred.
    const labels = words.map((w) => this.text(0, 0, w, 20, '#c8f7ff').setOrigin(0.5));
    const widths = labels.map((l) => Math.max(72, l.width + 32));
    const rows: number[][] = [[]];
    let rowW = 0;
    widths.forEach((w, i) => {
      const row = rows[rows.length - 1];
      if (row.length > 0 && rowW + gap + w > c.w) {
        rows.push([i]);
        rowW = w;
      } else {
        rowW += (row.length > 0 ? gap : 0) + w;
        row.push(i);
      }
    });
    const blockH = rows.length * tileHeight + (rows.length - 1) * gap;
    let y = c.y + Math.max(0, (c.h - blockH) / 2);
    for (const row of rows) {
      const total = row.reduce((sum, i) => sum + widths[i], 0) + gap * (row.length - 1);
      let x = c.x + (c.w - total) / 2;
      for (const i of row) {
        const word = words[i];
        const bg = this.button(x, y, widths[i], tileHeight);
        const label = labels[i].setPosition(x + widths[i] / 2, y + tileHeight / 2);
        this.root!.add([bg, label]);
        const tile: Tile = { bg, label, order: prompt.words.indexOf(word) };
        this.tiles.push(tile);
        bg.on('pointerdown', () => {
          if (this.input.typeWord(word) === 'wrong') this.blink(bg, FILL_WRONG, TOUCH_PROMPT.wrongBlinkMs);
        });
        x += widths[i] + gap;
      }
      y += tileHeight + gap;
    }
  }

  /** Typed progress in green over the full text, and used tiles dimmed in place (they never move). */
  private refresh(prompt: TouchPrompt) {
    if (!this.base || !this.typed) return;
    const r = this.rect();
    this.base.setText(prompt.text);
    this.typed.setText(prompt.text.slice(0, prompt.typed));
    const left = r.x + (r.w - this.base.width) / 2;
    this.base.setX(left);
    this.typed.setX(left);

    const done = wordsDone(prompt.words, prompt.typed);
    for (const t of this.tiles) {
      const used = t.order >= 0 && t.order < done;
      t.bg.setAlpha(used ? 0.3 : 1);
      t.label.setAlpha(used ? 0.3 : 1);
      if (used && t.bg.input?.enabled) t.bg.disableInteractive();
    }
  }

  private button(x: number, y: number, w: number, h: number) {
    return this.scene.add.rectangle(x, y, w, h, FILL).setOrigin(0).setScrollFactor(0).setStrokeStyle(2, BORDER, 0.7).setInteractive();
  }

  private text(x: number, y: number, s: string, size: number, color: string) {
    return this.scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setScrollFactor(0);
  }

  private blink(bg: Phaser.GameObjects.Rectangle, color: number, ms: number) {
    bg.setFillStyle(color);
    this.scene.time.delayedCall(ms, () => {
      if (bg.active) bg.setFillStyle(FILL);
    });
  }
}

function portrait(w: number, h: number) {
  return h >= w;
}

/** How many of `words` are complete after `typed` characters (each word is followed by one separator). */
function wordsDone(words: string[], typed: number) {
  let pos = 0;
  let done = 0;
  for (const w of words) {
    pos += w.length;
    if (typed < pos) break;
    done++;
    pos++;
  }
  return done;
}
