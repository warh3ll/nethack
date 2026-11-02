// ─────────────────────────────────────────────────────────────
// BALANCE: tweak numbers here, no game logic lives in this file.
// Save the file while `npm run dev` is running and the game reloads.
// Distances are in pixels, times in milliseconds, speeds in pixels/second.
// ─────────────────────────────────────────────────────────────

export const PLAYER = {
  maxHp: 100,
  moveSpeed: 200,
  radius: 14,
  /** Time after taking a hit during which the player can't be hit again. */
  invulnerableMs: 500,
};

export interface EnemyType {
  hp: number;
  speed: number;
  /** Damage dealt per touch (once per player invulnerability window). */
  contactDamage: number;
  radius: number;
  color: number;
}

export const ENEMIES: Record<string, EnemyType> = {
  drone: { hp: 10, speed: 70, contactDamage: 8, radius: 11, color: 0xff2e88 },
};

export const SPAWNING = {
  /** Spawn interval at the start of a run. */
  startIntervalMs: 900,
  /** The interval shrinks toward this over time. */
  minIntervalMs: 180,
  /** How much the interval shrinks every second of the run. */
  intervalDecayPerSecond: 4,
  /** Enemies appear on a ring this far outside the screen edge. */
  spawnMargin: 60,
  /** Hard cap on live enemies (performance safety net). */
  maxEnemies: 400,
  enemyType: 'drone',
};

export const STARTING_SKILL = 'autoPistol';
