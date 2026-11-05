import Phaser from 'phaser';
import { sourceInfo, type RunStats } from '../systems/RunStats';
import { addButton } from './Button';

/** Where the player can go from the end-of-run screen. */
export interface ResultActions {
  reboot: () => void;
  menu: () => void;
}

/** Everything the end-of-run screen shows (GAME_DESIGN section 7). */
export interface RunResult {
  won: boolean;
  level: number;
  kills: number;
  timeMs: number;
  objectivesDone: number;
  objectivesTotal: number;
  /** Credits picked up this run. */
  credits: number;
  /** Part of `credits` that came from the extraction bonus (shown on its own row). */
  bonus: number;
  /** Credits banked across all runs, this one included. */
  totalCredits: number;
  /** Items found this run. Stays 0 until caches and drops exist (PLAN section 4). */
  items: number;
  /** Damage per skill, healing and distance, shown beside the summary. */
  stats: RunStats;
}

const WIN_COLOR = '#5fe08a';
const LOSE_COLOR = '#ff2e88';
const LABEL_COLOR = '#7f93b8';
const VALUE_COLOR = '#c8f7ff';
const HEADING_COLOR = '#ffd23e';
const TRACK_COLOR = 0x1a2140;
/** Screen width from which the stats sit beside the summary instead of below it. */
const WIDE_WIDTH = 820;
/** Distance is shown in metres at the same scale as the compass (10 px = 1 m). */
const PX_PER_METRE = 10;
const BUTTON_W = 170;
const BUTTON_H = 44;
const BUTTON_GAP = 20;

function formatTime(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const css = (c: number) => Phaser.Display.Color.IntegerToColor(c).rgba;

/**
 * Full-screen win/lose summary. Stays up until the scene is restarted.
 * Everything is laid out at its natural size in a container, which is then scaled down to fit small screens.
 */
export class ResultsScreen {
  constructor(scene: Phaser.Scene, r: RunResult, actions: ResultActions) {
    const cam = scene.cameras.main;
    const accent = r.won ? WIN_COLOR : LOSE_COLOR;
    const wide = cam.width >= WIDE_WIDTH;

    scene.add.rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.8).setOrigin(0).setScrollFactor(0).setDepth(199);
    const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(200);

    const text = (x: number, y: number, s: string, size: number, color: string, originX = 0.5) => {
      const t = scene.add.text(x, y, s, { fontFamily: 'monospace', fontSize: `${size}px`, color }).setOrigin(originX, 0);
      root.add(t);
      return t;
    };

    const SIZE = 18;
    const GAP = SIZE * 1.7;
    const COL = 360;

    // ── Summary column: x from 0 to COL ──
    const rows: [string, string][] = [
      ['objectives', `${r.objectivesDone}/${r.objectivesTotal}`],
      ['level reached', String(r.level)],
      ['kills', String(r.kills)],
      ['time', formatTime(r.timeMs)],
      ['distance travelled', `${whole(r.stats.distancePixels / PX_PER_METRE)} m`],
      ['credits gained', String(r.credits - r.bonus)],
      ...(r.bonus > 0 ? ([['extraction bonus', `+${r.bonus}`]] as [string, string][]) : []),
      ['total credits', String(r.totalCredits)],
      ['items found', String(r.items)],
    ];
    const contentW = wide ? COL * 2 + 80 : COL;
    text(contentW / 2, 0, r.won ? 'EXTRACTION COMPLETE' : 'SYSTEM FAILURE', 30, accent);
    let y = 70;
    for (const [label, value] of rows) {
      text(0, y, label, SIZE, LABEL_COLOR, 0);
      text(COL, y, value, SIZE, VALUE_COLOR, 1);
      y += GAP;
    }
    const summaryBottom = y;

    // ── Stats column ──
    const sx = wide ? COL + 80 : 0;
    let sy = wide ? 70 : summaryBottom + 24;
    const heading = (label: string, total: string) => {
      text(sx, sy, label, SIZE, HEADING_COLOR, 0);
      text(sx + COL, sy, total, SIZE, HEADING_COLOR, 1);
      sy += GAP;
    };

    heading('DAMAGE DEALT', whole(r.stats.totalDamage));
    const total = r.stats.totalDamage;
    if (r.stats.damageRows.length === 0) {
      text(sx, sy, 'none', SIZE - 2, LABEL_COLOR, 0);
      sy += GAP;
    }
    for (const row of r.stats.damageRows) {
      const info = sourceInfo(row.id);
      const share = total > 0 ? row.amount / total : 0;
      text(sx, sy, info.name, SIZE - 2, css(info.color), 0);
      text(sx + COL, sy, `${whole(row.amount)}  ${Math.round(share * 100)}%`, SIZE - 2, VALUE_COLOR, 1);
      // Bar under the row: how big a share of all damage this skill did.
      root.add(scene.add.rectangle(sx, sy + SIZE + 1, COL, 3, TRACK_COLOR).setOrigin(0));
      root.add(scene.add.rectangle(sx, sy + SIZE + 1, Math.max(2, COL * share), 3, info.color).setOrigin(0));
      sy += GAP + 4;
    }

    sy += 10;
    heading('HP HEALED', whole(r.stats.totalHealing));
    if (r.stats.healingRows.length === 0) {
      text(sx, sy, 'none', SIZE - 2, LABEL_COLOR, 0);
      sy += GAP;
    }
    for (const row of r.stats.healingRows) {
      const info = sourceInfo(row.id);
      text(sx, sy, info.name, SIZE - 2, css(info.color), 0);
      text(sx + COL, sy, whole(row.amount), SIZE - 2, VALUE_COLOR, 1);
      sy += GAP;
    }

    const buttonY = Math.max(sy, summaryBottom) + 20;
    const buttonX = (contentW - BUTTON_W * 2 - BUTTON_GAP) / 2;
    const button = (x: number, label: string, run: () => void) =>
      addButton(scene, root, { x, y: buttonY, width: BUTTON_W, height: BUTTON_H, label, color: accent, run });
    button(buttonX, '[R] reboot', actions.reboot);
    button(buttonX + BUTTON_W + BUTTON_GAP, '[M] main menu', actions.menu);
    const contentH = buttonY + BUTTON_H;

    // Fit: centre, and shrink if the content is bigger than the screen.
    const fit = Math.min(1, (cam.width - 32) / contentW, (cam.height - 32) / contentH);
    root.setScale(fit).setPosition((cam.width - contentW * fit) / 2, (cam.height - contentH * fit) / 2);
  }
}
