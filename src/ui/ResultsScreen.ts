import Phaser from 'phaser';

/** Everything the end-of-run screen shows (GAME_DESIGN section 7). */
export interface RunResult {
  won: boolean;
  level: number;
  kills: number;
  timeMs: number;
  objectivesDone: number;
  objectivesTotal: number;
  /** Credits picked up this run. Stays 0 until credit chips exist (PLAN section 7). */
  credits: number;
  /** Items found this run. Stays 0 until caches and drops exist (PLAN section 4). */
  items: number;
}

const WIN_COLOR = '#5fe08a';
const LOSE_COLOR = '#ff2e88';
const LABEL_COLOR = '#7f93b8';
const VALUE_COLOR = '#c8f7ff';

function formatTime(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Full-screen win/lose summary. Stays up until the scene is restarted. */
export class ResultsScreen {
  constructor(scene: Phaser.Scene, r: RunResult) {
    const cam = scene.cameras.main;
    const narrow = cam.width < 420;
    const accent = r.won ? WIN_COLOR : LOSE_COLOR;
    const cx = cam.width / 2;

    scene.add.rectangle(0, 0, cam.width, cam.height, 0x05060a, 0.8).setOrigin(0).setScrollFactor(0).setDepth(199);

    const rows: [string, string][] = [
      ['objectives', `${r.objectivesDone}/${r.objectivesTotal}`],
      ['level reached', String(r.level)],
      ['kills', String(r.kills)],
      ['time', formatTime(r.timeMs)],
      ['credits gained', String(r.credits)],
      ['items found', String(r.items)],
    ];

    const titleSize = narrow ? 24 : 32;
    const rowSize = narrow ? 16 : 20;
    const rowGap = rowSize * 1.8;
    const blockHeight = titleSize + 40 + rows.length * rowGap + 60;
    let y = Math.max(24, (cam.height - blockHeight) / 2);

    const text = (x: number, yy: number, s: string, size: number, color: string, originX = 0.5) =>
      scene.add
        .text(x, yy, s, { fontFamily: 'monospace', fontSize: `${size}px`, color })
        .setOrigin(originX, 0)
        .setScrollFactor(0)
        .setDepth(200);

    text(cx, y, r.won ? 'EXTRACTION COMPLETE' : 'SYSTEM FAILURE', titleSize, accent);
    y += titleSize + 40;

    // Labels hug the left of the column, values the right, so the numbers line up.
    const colWidth = Math.min(cam.width - 48, 360);
    const left = cx - colWidth / 2;
    const right = cx + colWidth / 2;
    for (const [label, value] of rows) {
      text(left, y, label, rowSize, LABEL_COLOR, 0);
      text(right, y, value, rowSize, VALUE_COLOR, 1);
      y += rowGap;
    }

    text(cx, y + 24, 'press R or tap\nto reboot', rowSize, accent).setAlign('center');
  }
}
