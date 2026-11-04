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
}

export interface EnemyType {
  hp: number
  speed: number
  /** Damage dealt per touch (once per player invulnerability window). */
  contactDamage: number
  /** XP the player gets for killing one. */
  xp: number
  radius: number
  color: number
}

export const ENEMIES: Record<string, EnemyType> = {
  drone: {
    hp: 10,
    speed: 70,
    contactDamage: 8,
    xp: 1,
    radius: 11,
    color: 0xff2e88,
  },
}

export const SPAWNING = {
  /** Spawn interval at the start of a run. */
  startIntervalMs: 900,
  /** The interval shrinks toward this over time. */
  minIntervalMs: 400,
  /** How much the interval shrinks every second of the run. */
  intervalDecayPerSecond: 4,
  /** Enemies appear on a ring this far outside the screen edge. */
  spawnMargin: 200,
  /** Hard cap on live enemies (performance safety net). */
  maxEnemies: 400,
  enemyType: 'drone',
}

export const STARTING_SKILL = 'autoPistol'

/** Skill slots: weapons (and other active skills) and passives each have their own group. */
export const WEAPON_SLOTS = 5
export const PASSIVE_SLOTS = 5

export const LEVELING = {
  /** Highest player level. Reaching it stops XP gain and level-ups. */
  maxLevel: 20,
  /** XP needed to go from level 1 to level 2. A drone gives 1 XP, so this is roughly "kills per level". */
  xpForLevel2: 5,
  /**
   * Each level after that needs this much more XP than the previous one.
   * With 20 and 12: 20, 32, 44, ... 236 XP for level 19 to 20 (2432 XP in total to reach 20).
   * Formula: XP for level n -> n+1 = xpForLevel2 + xpIncreasePerLevel * (n - 1).
   */
  xpIncreasePerLevel: 12,
  /** Upgrade choices offered on each level-up. */
  choices: 3,
}

/** On-screen joystick for touch play. Appears wherever the thumb lands. */
export const TOUCH_JOYSTICK = {
  /** How far (px) the knob can travel from the base. Dragging this far = full speed. */
  radius: 60,
  /** Fraction of the radius that counts as "not moving", so a resting thumb doesn't drift. */
  deadZone: 0.15,
  /** true: speed scales with how far the knob is pushed. false: any push beyond the dead zone is full speed. */
  analog: true,
  /** When the thumb drags past the radius, the base follows it so the stick never "runs out". */
  baseFollows: true,
}
