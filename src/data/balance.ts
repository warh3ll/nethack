// ─────────────────────────────────────────────────────────────
// BALANCE: tweak numbers here, no game logic lives in this file.
// Save the file while `npm run dev` is running and the game reloads.
// Distances are in pixels, times in milliseconds, speeds in pixels/second.
// ─────────────────────────────────────────────────────────────

export const PLAYER = {
  maxHp: 100,
  /** Base passive health regeneration in HP per second (0.1 = 1 HP every 10 s). */
  hpRegenPerSec: 0.15,
  moveSpeed: 200,
  radius: 14,
  /** Sprite size multiplier (the frames are 48x64). The hit circle (radius) is not scaled by this. */
  spriteScale: 2,
  /** Time after taking a hit during which the player can't be hit again. */
  invulnerableMs: 500,
  /** Damage reduction (Firewall) can never bring a hit below this. */
  minDamageTaken: 1,
  /** How long after a shot the player keeps the shooting pose. */
  shootingPoseMs: 350,
  /** Animation speed (frames per second; every sheet has 8 frames). */
  animFps: 12,
  /** Death animation speed, and how long the last frame is held before the results screen. */
  deathFps: 12,
  deathHoldMs: 700,
}

/** The dash (Space + a direction). */
export const DASH = {
  /** Distance covered by one dash, in pixels. */
  distance: 260,
  /** How long the dash takes. */
  durationMs: 180,
  /** Time from the start of one dash until the next is allowed. */
  cooldownMs: 5000,
  /** Extra invulnerability after the dash ends (the player is also invulnerable during it). */
  invulnerableAfterMs: 250,
  /** Teal streak following the player: colour, width at the head (px), and how long it takes to fade. */
  trailColor: 0x2ef2ff,
  trailWidth: 22,
  trailFadeMs: 350,
}

/** Floating damage numbers over enemies (coloured like the skill that did the damage). */
export const DAMAGE_NUMBERS = {
  fontSize: 16,
  /** Colour when the damage has no skill colour. */
  defaultColor: 0xffffff,
  /** How far the number floats up, and how long until it has faded out. */
  risePx: 30,
  durationMs: 700,
  /** Spawn height above the top of the enemy's hit circle, and the random sideways spread (px). */
  heightAbove: 6,
  jitterX: 8,
  /** Hits on one enemy from the same skill within this time add up into one number. */
  mergeMs: 120,
  /** Max numbers on screen at once (the oldest is recycled beyond this). */
  poolSize: 80,
}

/** The map is a square centred on the player's start. Edge to edge takes size / PLAYER.moveSpeed seconds (50 s). */
export const MAP = {
  size: 10000,
  /** How thick the boundary wall is drawn. */
  wallThickness: 96,
  /** The floor tile (public/assets/floor/floor.png, 32x32) is drawn at this scale. */
  floorScale: 2,
}

/**
 * City backdrop seen past the map wall. Layers are listed back to front.
 * depth: 0 = never moves, 1 = slides the full spare margin as you cross the map (nearer layers use more).
 */
export const PARALLAX = {
  layers: [
    { key: 'parallax-1', depth: 0 }, // sky gradient
    { key: 'parallax-2', depth: 0.25 },
    { key: 'parallax-3', depth: 0.5 },
    { key: 'parallax-4', depth: 0.75 },
    { key: 'parallax-5', depth: 1 },
  ],
  /** How much bigger than the screen the layers are drawn; the extra is the room they slide in. */
  overscan: 1.2,
  /** Vertical movement as a share of the horizontal one. */
  verticalShare: 0.4,
}

export interface EnemyType {
  hp: number
  speed: number
  /** Damage dealt per touch (once per player invulnerability window). */
  contactDamage: number
  /** XP the player gets for killing one. */
  xp: number
  /** Credits in the chip dropped on death. */
  credits: number
  /** Chance (0 to 1) that a death drops a chip at all. */
  creditChance: number
  radius: number
  color: number
  /** Show a small health bar above the enemy. */
  healthBar?: boolean
  /** Never moves and can't be pushed (outposts). */
  stationary?: boolean
  /** Scales the length of any stun on this enemy (default 1; 0.5 = half as long, 0 = immune). */
  stunMultiplier?: number
  /**
   * Guards its spawn point instead of swarming. Stands still until the player comes within
   * `aggroRadius`, chases while the player is within `leashRadius`, then walks back to its post.
   * Damaging it makes it chase regardless of distance.
   */
  guard?: { aggroRadius: number; leashRadius: number }
  /** Shoots at the player while chasing and within `range`. */
  ranged?: {
    damage: number
    /** Bullet speed in pixels/second. */
    speed: number
    /** How far a bullet flies, and how close the player must be for the enemy to shoot. */
    range: number
    cooldownMs: number
    /** Swarm enemies only: stop moving once within `range` of the player instead of closing in. */
    holdAtRange?: boolean
  }
}

export const ENEMIES: Record<string, EnemyType> = {
  drone: {
    hp: 10,
    speed: 100,
    contactDamage: 8,
    xp: 1,
    credits: 1,
    creditChance: 0.1,
    radius: 11,
    color: 0xff2e88,
  },
  // Ranged swarm enemy: walks up to `range` of the player, stops there and shoots. Slightly weaker than a drone.
  marksman: {
    hp: 8,
    speed: 120,
    contactDamage: 6,
    xp: 2,
    credits: 2,
    creditChance: 0.1,
    radius: 11,
    color: 0xffd62e,
    ranged: {
      damage: 6,
      speed: 260,
      range: 250,
      cooldownMs: 2000,
      holdAtRange: true,
    },
  },
  heavy: {
    hp: 45,
    speed: 90,
    contactDamage: 12,
    xp: 3,
    credits: 3,
    creditChance: 0.2,
    radius: 18,
    color: 0x800020,
  },
  // Miniboss that guards the dossier in the Grab encryption key objective. Not part of the random swarm.
  goon: {
    hp: 150,
    speed: 130,
    contactDamage: 20,
    xp: 15,
    credits: 5,
    creditChance: 1,
    radius: 28,
    color: 0xff8a2e,
    healthBar: true,
    stunMultiplier: 0.5,
    guard: { aggroRadius: 380, leashRadius: 700 },
    ranged: { damage: 10, speed: 260, range: 500, cooldownMs: 1800 },
  },
  // Destructible structure in the Steal secrets objective. Its hp is the value for the fewest outposts;
  // see STEAL_SECRETS in objectives.ts for how it shrinks with more of them.
  outpost: {
    hp: 120,
    speed: 0,
    contactDamage: 0,
    xp: 5,
    credits: 3,
    creditChance: 1,
    radius: 30,
    color: 0x9b5cff,
    healthBar: true,
    stationary: true,
    stunMultiplier: 0,
  },
}

export const SPAWNING = {
  /** Spawn interval at the start of a run. */
  startIntervalMs: 900,
  /** The interval shrinks toward this over time. */
  minIntervalMs: 250,
  /** How much the interval shrinks every second of the run. */
  intervalDecayPerSecond: 5,
  /** Enemies appear on a ring this far outside the screen edge. */
  spawnMargin: 200,
  /** Hard cap on live enemies (performance safety net). */
  maxEnemies: 400,
  /** Enemy type spawned when no entry in `specialEnemies` wins its roll. */
  enemyType: 'drone',
  /**
   * Harder enemies sharing the same spawn pool: each spawn rolls these in order, and if none hits it
   * is a plain `enemyType`. The chance of each is `startChance` plus `chanceStep` for every
   * `stepSeconds` of run time (0.05 + 0.01 per 30 s = 5%, 6% at 0:30, ...), but never more than `maxChance`.
   * Keep the `maxChance` values adding up to less than 1, or plain enemies stop spawning.
   */
  specialEnemies: [
    { type: 'marksman', startChance: 0.10, chanceStep: 0.025, stepSeconds: 30, maxChance: 0.3 },
    { type: 'heavy', startChance: 0, chanceStep: 0.075, stepSeconds: 25, maxChance: 0.25 },
  ],
}

/** Credit chips dropped by enemies. How many credits each enemy type drops is `credits` in ENEMIES. */
export const CREDITS = {
  /** Chips within this distance of the player start flying toward them. */
  magnetRadius: 120,
  /** Speed (px/s) of a chip being pulled in. Faster than the player so it always catches up. */
  magnetSpeed: 420,
  /** A chip this close to the player is collected. */
  collectRadius: 20,
  /** Credits added to the run's total on a successful extraction. */
  extractionBonus: 15,
}

/** Data caches scattered on the map. Rare on purpose; the compass and objective marker never point to them. */
export const CACHES = {
  /** Caches per run, picked at random. */
  count: { min: 6, max: 10 },
  /** No cache this close to the start. */
  minDistFromStart: 600,
  /** Caches stay at least this far from the map edge. */
  edgeMargin: 300,
  /** No two caches closer than this. */
  minSpacing: 1000,
  /** Radius of the pulsing ring drawn around a cache. */
  ringRadius: 40,
  /** Press E (or tap the prompt) within this distance of a cache to open it. */
  openRadius: 80,
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
  /**
   * How many of those choices should be new skills; the rest are upgrades to owned skills (3 choices, 1 new = 2 upgrades + 1 new).
   * If one group runs out (early game: few owned skills; late game: slots full), the other fills the gap.
   */
  newSkillChoices: 1,
  /** Rerolls of the choices per level-up. Skipping is always allowed but gives no reward. */
  rerolls: 1,
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
