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
  radius: 18,
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

/** The minimap unlocked by the camera pole. It always shows the whole map. */
export const MINIMAP = {
  /** Width and height in pixels. */
  size: 150,
  /** Distance from the screen edges. */
  margin: 16,
  /** Gap above the skill bar on screens too narrow to fit beside it. */
  skillBarGap: 12,
  dotRadius: 2.5,
  /** Size of the player arrow. */
  arrowSize: 7,
  fadeInMs: 400,
  backgroundColor: 0x05060a,
  backgroundAlpha: 0.75,
  /** The street layout: roads are the background showing through. */
  buildingColor: 0x2a3350,
  plazaColor: 0x1a2038,
  factoryColor: 0x8a5420,
  factoryDownColor: 0x3a3a42,
  borderColor: 0x2ef2ff,
  objectiveColor: 0xffd23e,
  cacheColor: 0x2ef2ff,
  extractionColor: 0x5fe08a,
  playerColor: 0xffffff,
}

/** The map is a square centred on (0, 0). Straight edge to edge takes size / PLAYER.moveSpeed seconds (51 s); streets add about 30%. */
export const MAP = {
  /** A multiple of CITY.tileSize, since the city is built from whole tiles. */
  size: 10240,
  /** How thick the boundary wall is drawn. */
  wallThickness: 96,
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
  /** Other enemies walk through it instead of bumping into it (factory cores, which stand on the sidewalk). */
  passable?: boolean
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
    speed: 85,
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
    speed: 70,
    contactDamage: 6,
    xp: 2,
    credits: 2,
    creditChance: 0.1,
    radius: 11,
    color: 0xffd62e,
    ranged: {
      damage: 6,
      speed: 260,
      range: 350,
      cooldownMs: 2000,
      holdAtRange: true,
    },
  },
  heavy: {
    hp: 45,
    speed: 100,
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
    speed: 120,
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
    hp: 90,
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
  // The part of a factory that can be shot, by its door. Destroying it shuts the factory down (SPAWN_POINTS).
  factoryCore: {
    hp: 250,
    speed: 0,
    contactDamage: 0,
    xp: 20,
    credits: 10,
    creditChance: 1,
    radius: 30,
    color: 0xffa02e,
    healthBar: true,
    stationary: true,
    passable: true,
    stunMultiplier: 0,
  },
}

export const SPAWNING = {
  /** Spawn interval at the start of a run. */
  startIntervalMs: 900,
  /** The interval shrinks toward this over time. */
  minIntervalMs: 400,
  /** How much the interval shrinks every second of the run. */
  intervalDecayPerSecond: 5,
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
    {
      type: 'marksman',
      startChance: 0.1,
      chanceStep: 0.025,
      stepSeconds: 30,
      maxChance: 0.3,
    },
    {
      type: 'heavy',
      startChance: 0,
      chanceStep: 0.025,
      stepSeconds: 30,
      maxChance: 0.25,
    },
    {
      type: 'goon',
      startChance: 0,
      chanceStep: 0.025,
      stepSeconds: 30,
      maxChance: 0.05,
    },
  ],
}

/**
 * Where swarm enemies come from: factories and small exits (placed by the city generator, counts in city.ts).
 * Which ones are active depends only on world distance to the player, never on the screen size.
 * Every spawn from SPAWNING picks one active spawn point; with few of them around, some spawns are skipped (quiet zones).
 */
export const SPAWN_POINTS = {
  /** A spawn point is active while the player is between `min` and `max` away from it. */
  exitRange: { min: 500, max: 1400 },
  factoryRange: { min: 300, max: 2000 },
  /** How much more often a factory is picked than an exit. */
  factoryWeight: 2,
  /** A factory lets out a small group at once, this many enemies (both ends included). Each one rolls its own type. */
  factoryGroup: { min: 3, max: 5 },
  /** Every destroyed factory takes this share off the spawn rate of the whole map (0.08 = 8% fewer spawns per factory). */
  rateCutPerFactory: 0.08,
  /** A factory core below this share of its hp shows as damaged. */
  factoryDamagedAt: 0.5,
  /** Active spawn points (factories count `factoryWeight` each) needed for the full SPAWNING rate. Fewer means a share of spawns is skipped. */
  fullRateAt: 5,
  /** The spawn point flashes this long before its enemy steps out, so enemies never just appear. */
  exitFlashMs: 500,
  factoryFlashMs: 2000,
  exitFlashColor: 0xff2e88,
  factoryFlashColor: 0xffa02e,
  /** Swarm enemies this far from the player are quietly removed, so stragglers can't fill `maxEnemies`. Keep it above both `max` ranges. */
  recycleDistance: 2600,
}

/** How enemies find their way through the streets (one shared flow field of walking distance from the player). */
export const NAVIGATION = {
  /** Within this distance, an enemy with a clear line to the player walks straight at it instead of following the streets. */
  directRange: 1200,
  /** How often each enemy rethinks its route. Lower is smoother but costs more. */
  rethinkMs: 150,
  /** How many tiles ahead along its route an enemy looks for a point it can walk to in a straight line. */
  lookahead: 4,
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
  /** No two caches closer than this. */
  minSpacing: 1000,
  /** No cache this close to an objective, so E and typing can't mean two things at once. Has to stay above HACK.range + openRadius. */
  objectiveSpacing: 400,
  /** Radius of the pulsing ring drawn around a cache. */
  ringRadius: 40,
  /** Press E (or tap the prompt) within this distance of a cache to open it. */
  openRadius: 80,
  /** Chance (0-1) that a cache holds credits. The rest hold a skill upgrade; find-only items will come out of that share. */
  creditChance: 0.75,
  /** Credits in a cache that holds credits. */
  creditAmount: 5,
}

/**
 * ATMs: an optional find, like caches. Hold E in the ring to decrypt, then stay in the ring to channel credits
 * while goons come hunting. Leaving the ring while channeling (or running out the clock) switches that ATM off for the run.
 */
export const ATMS = {
  /** ATMs per run, picked at random. They stand on the sidewalk against a building's south wall. */
  count: { min: 4, max: 6 },
  /** No ATM this close to the start. */
  minDistFromStart: 800,
  /** No two ATMs closer than this. */
  minSpacing: 1500,
  /** No ATM this close to an objective, cache, camera pole, or the start and exit stations (E must never mean two things). */
  clearance: 450,
  /** No ATM this close to a spawn door, so it never blocks one. There are about a hundred, so this has to stay small. */
  doorClearance: 130,
  /** The ring: hold E inside it to decrypt, stay inside it to channel. Keep it small. */
  radius: 70,
  /** How long E must be held to decrypt. Letting go, leaving the ring or taking damage restarts it. */
  decryptMs: 5000,
  /** Longest a channel can run. When it is up, the ATM is switched off. */
  channelMs: 20000,
  creditsPerSecond: 1,
  /**
   * Waves sent at the player while channeling: once each, `atMs` after the channel starts, out of the spawn point
   * closest to the ATM. Enemy keys are from ENEMIES. They hunt the player until dead.
   */
  waves: [
    { atMs: 5000, enemies: ['drone', 'marksman'] },
    { atMs: 10000, enemies: ['heavy', 'heavy'] },
    { atMs: 15000, enemies: ['goon'] },
  ],
}

export const STARTING_SKILL = 'autoPistol'

/** Skill slots: weapons (and other active skills) and passives each have their own group. */
export const WEAPON_SLOTS = 5
export const PASSIVE_SLOTS = 5

export const LEVELING = {
  /** XP needed to go from level 1 to level 2. A drone gives 1 XP, so this is roughly "kills per level". */
  xpForLevel2: 5,
  /**
   * Each level needs this many times the XP of the previous one (1.15 = 15% more).
   * Formula: XP for level n -> n+1 = xpForLevel2 * xpGrowth ^ (n - 1). Total XP to reach level 10 / 20 / 30 / 40 / 50:
   * about 84 / 441 / 1,886 / 7,731 / 31,377. Level 30 is roughly where every skill is maxed.
   * There is no level cap (GAME_DESIGN section 3): the curve getting steeper is what slows levelling down late.
   */
  xpGrowth: 1.15,
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

/**
 * Night-time lighting. Lit things (the city, props, servers, the player and enemies) are multiplied by `ambient`
 * and brightened by the lights near them. Bullets, effects and the UI are not lit, so they always read clearly.
 * Phaser lights have no normal maps here, so they just add a soft coloured pool of light.
 */
export const LIGHTING = {
  enabled: true,
  /** The light everything gets with no lamp nearby, as 0xRRGGBB. Brighter = easier to see, darker = lamps stand out more. */
  ambient: 0x8a92b8,
  /** Most lights drawn at once (the closest to the camera win). Each one costs a little per pixel, so keep it modest. */
  maxLights: 24,
  /** How far above the ground a light hangs, as a fraction of its radius. Higher = flatter, more even pool. */
  height: 0.45,
  /** The pools of light. Radius in px, colour 0xRRGGBB, intensity 1 = normal. */
  lamp: { radius: 440, color: 0x7fe9ff, intensity: 1.7 },
  factory: { radius: 460, color: 0xffa02e, intensity: 2 },
  /** A factory whose core is badly hurt. A destroyed one has no light. */
  factoryDamaged: { radius: 380, color: 0xff3a2a, intensity: 1.5 },
  server: { radius: 300, color: 0x2ef2ff, intensity: 1.4 },
  /** Hacked or connected servers. */
  serverDone: { radius: 300, color: 0x5fe08a, intensity: 1.4 },
  cache: { radius: 170, color: 0x2ef2ff, intensity: 1 },
  /** The subway stations (start and exit). */
  subway: { radius: 320, color: 0x5fe08a, intensity: 1.3 },
  pole: { radius: 260, color: 0xff2e88, intensity: 1.2 },
  /** ATMs: a faint gold glow. Goes out when the ATM is switched off. */
  atm: { radius: 220, color: 0xffc83a, intensity: 1 },
}

/** Blob shadows: a soft dark ellipse under the player and every enemy. It stays put under the feet, whatever the lights do. */
export const SHADOWS = {
  enabled: true,
  /** How dark the shadow is (0 to 1). */
  alpha: 0.4,
  /** Width of the shadow as a multiple of the thing's hit radius, and its height as a fraction of that width. */
  width: 2.6,
  squash: 0.45,
  /** How far below the thing's centre its feet are, as a multiple of its hit radius. The player's is in px. */
  feet: 1.15,
  playerFeet: 6,
}
