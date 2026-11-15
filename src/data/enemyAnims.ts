import Phaser from 'phaser';

/**
 * Enemy sprite sheets, like the player's: public/assets/enemies/<type>/<state>.png, one row of frames.
 * Enemy types without an entry here still use the generated coloured square from BootScene.
 * Texture and animation keys are `enemy-<type>-<state>`.
 *
 * To add an animation, add a state under `anims` (drop the PNG in the type's folder). The enemy plays `MOVE_STATE`
 * while alive; more states (and directions) can be hooked up as the art arrives.
 */
export interface EnemySpriteDef {
  /** Size of one frame in pixels. */
  frameWidth: number;
  frameHeight: number;
  /** Drawn at this scale. Art drawn at 64x64 uses 1. The hit circle (`radius` in ENEMIES) stays in world pixels. */
  scale: number;
  anims: Record<string, { file: string; frames: number; fps: number }>;
}

export const MOVE_STATE = 'move';

/** Enemies walk in four directions (the player has eight). Types with directional art define `move-<dir>` states instead of `move`. */
export const ENEMY_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type EnemyDirection = (typeof ENEMY_DIRECTIONS)[number];
export const moveStateFor = (dir: EnemyDirection) => `move-${dir}`;

/** The animation state to play: `move` for non-directional art, otherwise the direction state (falling back to down). */
export function pickMoveState(def: EnemySpriteDef, dir: EnemyDirection) {
  if (def.anims[MOVE_STATE]) return MOVE_STATE;
  return def.anims[moveStateFor(dir)] ? moveStateFor(dir) : moveStateFor('down');
}

/** Four-way facing from a velocity: the dominant axis wins. */
export function directionOf(vx: number, vy: number): EnemyDirection {
  return Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
}

export const ENEMY_SPRITES: Record<string, EnemySpriteDef> = {
  drone: {
    frameWidth: 32,
    frameHeight: 32,
    scale: 2,
    anims: { move: { file: 'move.png', frames: 4, fps: 8 } },
  },
  // Only the down walk is drawn so far: the other three directions reuse it until their art arrives (swap the file names).
  heavy: {
    frameWidth: 32,
    frameHeight: 32,
    scale: 2,
    anims: {
      'move-down': { file: 'move-down.png', frames: 4, fps: 6 },
      'move-up': { file: 'move-down.png', frames: 4, fps: 6 },
      'move-left': { file: 'move-down.png', frames: 4, fps: 6 },
      'move-right': { file: 'move-down.png', frames: 4, fps: 6 },
    },
  },
};

export const enemyAnimKey = (type: string, state: string) => `enemy-${type}-${state}`;

export function loadEnemySheets(scene: Phaser.Scene) {
  for (const [type, def] of Object.entries(ENEMY_SPRITES)) {
    scene.load.setPath(`assets/enemies/${type}/`);
    for (const [state, a] of Object.entries(def.anims)) {
      scene.load.spritesheet(enemyAnimKey(type, state), a.file, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
    }
  }
}

export function createEnemyAnims(scene: Phaser.Scene) {
  for (const [type, def] of Object.entries(ENEMY_SPRITES)) {
    for (const [state, a] of Object.entries(def.anims)) {
      const key = enemyAnimKey(type, state);
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: a.frames - 1 }), frameRate: a.fps, repeat: -1 });
    }
  }
}
