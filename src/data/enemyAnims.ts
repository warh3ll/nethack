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

export const ENEMY_SPRITES: Record<string, EnemySpriteDef> = {
  drone: {
    frameWidth: 32,
    frameHeight: 32,
    scale: 2,
    anims: { move: { file: 'move.png', frames: 4, fps: 8 } },
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
