import Phaser from 'phaser';
import { PLAYER } from './balance';

/**
 * Player sprite sheets (public/assets/player/<folder>/<file>.png): 8 frames of 48x64 in one row.
 * Directions are 8-way; sheets that only exist for 6 directions (no pure left/right) fall back
 * to the down-facing diagonal. Texture keys are `player-<state>-<dir>`, animations use the same key.
 */
export const FRAME = { width: 48, height: 64, count: 8 };

export type PlayerState = 'idle' | 'run' | 'shooting' | 'runshoot' | 'dash' | 'death';
export type Dir8 = 'right' | 'rightdown' | 'down' | 'leftdown' | 'left' | 'leftup' | 'up' | 'rightup';

/** Index = angle sector (angle 0 = right, 90° = down, screen coordinates). */
export const DIRS: Dir8[] = ['right', 'rightdown', 'down', 'leftdown', 'left', 'leftup', 'up', 'rightup'];

/** File name suffix per direction, per state. A missing direction falls back (see FALLBACK). */
const FILES: Record<PlayerState, { folder: string; prefix: string; dirs: Partial<Record<Dir8, string>> }> = {
  idle: { folder: 'idle', prefix: 'Idle_Gun_', dirs: six('Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up') },
  dash: { folder: 'dash', prefix: 'Dash_Gun_', dirs: six('Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up') },
  death: { folder: 'death', prefix: 'death_Gun_', dirs: six('Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up') },
  run: {
    folder: 'run',
    prefix: 'Run_Gun_',
    dirs: { ...six('Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up'), left: 'Left', right: 'Right' },
  },
  runshoot: {
    folder: 'runshoot',
    prefix: 'Run_while_shooting_',
    dirs: { ...six('Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up'), left: 'Left', right: 'Right' },
  },
  shooting: {
    folder: 'shooting',
    prefix: 'Shooting_',
    // Note the artist's file names: "Up_Left"/"Up_Right" and "Left_Right" (which is the right-down pose).
    dirs: { down: 'Down', up: 'Up', left: 'Left', right: 'Right', leftdown: 'Left_Down', rightdown: 'Left_Right', leftup: 'Up_Left', rightup: 'Up_Right' },
  },
};

function six(down: string, up: string, ld: string, lu: string, rd: string, ru: string): Partial<Record<Dir8, string>> {
  return { down, up, leftdown: ld, leftup: lu, rightdown: rd, rightup: ru };
}

const FALLBACK: Partial<Record<Dir8, Dir8>> = { left: 'leftdown', right: 'rightdown' };

const resolveDir = (state: PlayerState, dir: Dir8): Dir8 => (FILES[state].dirs[dir] ? dir : FALLBACK[dir] ?? dir);

export const playerAnimKey = (state: PlayerState, dir: Dir8) => `player-${state}-${resolveDir(state, dir)}`;

export function dirFromAngle(angle: number): Dir8 {
  const sector = Math.round(Phaser.Math.Angle.Normalize(angle) / (Math.PI / 4)) % 8;
  return DIRS[sector];
}

export function loadPlayerSheets(scene: Phaser.Scene) {
  scene.load.setPath('assets/player/');
  for (const [state, def] of Object.entries(FILES)) {
    for (const [dir, name] of Object.entries(def.dirs)) {
      scene.load.spritesheet(`player-${state}-${dir}`, `${def.folder}/${def.prefix}${name}.png`, {
        frameWidth: FRAME.width,
        frameHeight: FRAME.height,
      });
    }
  }
}

export function createPlayerAnims(scene: Phaser.Scene) {
  for (const [state, def] of Object.entries(FILES)) {
    for (const dir of Object.keys(def.dirs)) {
      const key = `player-${state}-${dir}`;
      const dying = state === 'death';
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: FRAME.count - 1 }),
        frameRate: dying ? PLAYER.deathFps : PLAYER.animFps,
        repeat: dying ? 0 : -1,
      });
    }
  }
}
