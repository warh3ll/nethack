// ─────────────────────────────────────────────────────────────
// SKILLS: each skill is data. `levels[0]` is level 1, `levels[1]` level 2, ...
// The code reads stats via getSkillStats(id, level), so adding a level is just adding a row.
// A skill's max level is simply how many rows it has.
// ─────────────────────────────────────────────────────────────

export interface WeaponStats {
  damage: number
  cooldownMs: number
  projectileSpeed: number
  /** How many enemies a bullet passes through before disappearing (0 = stops at the first). */
  pierce: number
  /** Bullets fired per shot, fanned out by spreadDeg. */
  projectiles: number
  spreadDeg: number
  /** Max targeting distance, and how far a bullet flies. */
  range: number
  /** Cannot target enemies closer than this (default 0). */
  minRange?: number
  /** Which enemy to aim at: the nearest (default) or the one with the most hp. */
  targeting?: 'nearest' | 'highestHp'
}

/** Stats for the Virus: infects enemies, deals damage over time, spreads on death. */
export interface VirusStats {
  /** Damage per second to each infected enemy. */
  dps: number
  /** How often (ms) a new enemy is infected. */
  cooldownMs: number
  /** Max distance from the player to infect an enemy. */
  infectRange: number
  /** Max distance from a dying infected enemy to the enemies it spreads to. */
  spreadRange: number
  /** How many nearby enemies get infected when an infected enemy dies. */
  spreadCount: number
  /** How often (ms) the damage over time is applied. */
  tickMs: number
  /** How long (ms) an infection lasts on one enemy. Every new victim gets the full time. */
  maxDurationMs: number
}

/** Stats for Synaptic Overload: hack a random nearby enemy, it dies and explodes. */
export interface SynapticStats {
  /** Time (ms) the hack takes to upload. It restarts if the target dies or leaves the range band. */
  hackMs: number
  /** Targets are picked at random between minRange and maxRange from the player. */
  minRange: number
  maxRange: number
  /** Damage to every other enemy within `radius` of the target when it explodes. */
  damage: number
  radius: number
  /** Pause (ms) after an explosion before the next hack starts. */
  cooldownMs: number
}

/** Stats for EMP Shock: a ring pulses out from the player, damaging and stunning enemies. */
export interface EmpStats {
  /** Damage to every enemy the ring reaches. */
  damage: number
  /** How far (px) the ring travels from the player. */
  radius: number
  /** How long (ms) enemies hit by the ring are stunned (they stop moving and shooting). */
  stunMs: number
  /** Time (ms) between pulses. */
  cooldownMs: number
}

/** Stats for Rootkit: hijack an enemy, it fights for the player for a while, then explodes. */
export interface RootkitStats {
  /** Time (ms) between hijacks (counted from when the previous batch has exploded). */
  cooldownMs: number
  /** How long (ms) a hijacked enemy fights before it explodes. */
  durationMs: number
  /** Max distance from the player to hijack an enemy. */
  hijackRange: number
  /** How many enemies are hijacked at once. */
  count: number
  /** Damage a hijacked enemy deals to every other enemy it touches, once per `tickMs`. */
  contactDamage: number
  tickMs: number
  /** Damage to every other enemy within `explosionRadius` when the hijacked enemy explodes. */
  explosionDamage: number
  explosionRadius: number
}

/**
 * Bonuses a passive gives at one level. Each row is the passive's TOTAL bonus at that level
 * (not the step from the previous level). Bonuses from all passives are added together.
 */
export interface PassiveStats {
  /** Damage dealt back to an enemy whose touch reaches the player, whether the shield blocks it or not. */
  retaliationDamage?: number
  /** Hits the shield absorbs completely. Added up across passives, so items can raise it. */
  shieldHits?: number
  /** Time (ms) for the shield to get one hit back. The fastest source wins. */
  shieldRechargeMs?: number
  /** Flat damage taken off every hit the player receives (a hit the shield doesn't block never does less than PLAYER.minDamageTaken). */
  damageReduction?: number
  /** Flat extra HP regenerated per second (added to the base regen in balance.ts). */
  hpRegenPerSec?: number
  /** Percent extra move speed (10 = +10%). */
  moveSpeedPct?: number
  /** Percent extra damage for everything the player's weapons fire. */
  damagePct?: number
}

interface SkillBase {
  name: string
  description: string
  color: number
}

export interface WeaponSkill extends SkillBase {
  kind: 'weapon'
  behavior?: 'gun'
  levels: WeaponStats[]
}

/** Hacking-type weapon: no projectiles, see entities/Virus.ts. */
export interface VirusSkill extends SkillBase {
  kind: 'weapon'
  behavior: 'virus'
  levels: VirusStats[]
}

/** Hacking-type weapon: no projectiles, see entities/SynapticOverload.ts. */
export interface SynapticSkill extends SkillBase {
  kind: 'weapon'
  behavior: 'synaptic'
  levels: SynapticStats[]
}

/** Pulse weapon: no projectiles, see entities/EmpShock.ts. */
export interface EmpSkill extends SkillBase {
  kind: 'weapon'
  behavior: 'emp'
  levels: EmpStats[]
}

/** Hacking-type weapon: no projectiles, see entities/Rootkit.ts. */
export interface RootkitSkill extends SkillBase {
  kind: 'weapon'
  behavior: 'rootkit'
  levels: RootkitStats[]
}

export interface PassiveSkill extends SkillBase {
  kind: 'passive'
  levels: PassiveStats[]
}

export type SkillData =
  | WeaponSkill
  | VirusSkill
  | SynapticSkill
  | EmpSkill
  | RootkitSkill
  | PassiveSkill

export const SKILLS: Record<string, SkillData> = {
  autoPistol: {
    name: 'Auto-Pistol',
    kind: 'weapon',
    description: 'Fires at the nearest enemy.',
    color: 0xfff35c,
    levels: [
      {
        damage: 2,
        cooldownMs: 400,
        projectileSpeed: 700,
        pierce: 0,
        projectiles: 1,
        spreadDeg: 0,
        range: 500,
      },
      {
        damage: 3,
        cooldownMs: 350,
        projectileSpeed: 700,
        pierce: 1,
        projectiles: 1,
        spreadDeg: 0,
        range: 550,
      },
      {
        damage: 4,
        cooldownMs: 300,
        projectileSpeed: 700,
        pierce: 2,
        projectiles: 1,
        spreadDeg: 500,
        range: 600,
      },
    ],
  },

  virus: {
    name: 'Virus',
    kind: 'weapon',
    behavior: 'virus',
    description:
      'Infects an enemy for slow damage over time. When it dies, the infection spreads.',
    color: 0x5fe08a,
    levels: [
      {
        dps: 1,
        cooldownMs: 3000,
        infectRange: 300,
        spreadRange: 200,
        spreadCount: 1,
        tickMs: 350,
        maxDurationMs: 10000,
      },
      {
        dps: 2,
        cooldownMs: 2500,
        infectRange: 300,
        spreadRange: 200,
        spreadCount: 2,
        tickMs: 350,
        maxDurationMs: 10000,
      },
      {
        dps: 3,
        cooldownMs: 2000,
        infectRange: 300,
        spreadRange: 200,
        spreadCount: 3,
        tickMs: 350,
        maxDurationMs: 10000,
      },
    ],
  },

  railgun: {
    name: 'Railgun',
    kind: 'weapon',
    description:
      'Slow, superfast piercing shot at the toughest enemy in long range. Cannot hit close targets.',
    color: 0xff4fd8,
    levels: [
      {
        damage: 25,
        cooldownMs: 3000,
        projectileSpeed: 1800,
        pierce: 99,
        projectiles: 1,
        spreadDeg: 0,
        range: 700,
        minRange: 75,
        targeting: 'highestHp',
      },
      {
        damage: 30,
        cooldownMs: 2600,
        projectileSpeed: 1800,
        pierce: 99,
        projectiles: 1,
        spreadDeg: 0,
        range: 800,
        minRange: 75,
        targeting: 'highestHp',
      },
      {
        damage: 35,
        cooldownMs: 2200,
        projectileSpeed: 1800,
        pierce: 99,
        projectiles: 1,
        spreadDeg: 0,
        range: 900,
        minRange: 75,
        targeting: 'highestHp',
      },
    ],
  },

  scatterGun: {
    name: 'Shredder',
    kind: 'weapon',
    description: 'Short-range shotgun that fires at the nearest enemy.',
    color: 0xc77dff,
    levels: [
      {
        damage: 4,
        cooldownMs: 1100,
        projectileSpeed: 480,
        pierce: 0,
        projectiles: 3,
        spreadDeg: 15,
        range: 280,
      },
      {
        damage: 5,
        cooldownMs: 1000,
        projectileSpeed: 480,
        pierce: 0,
        projectiles: 4,
        spreadDeg: 14,
        range: 300,
      },
      {
        damage: 6,
        cooldownMs: 900,
        projectileSpeed: 500,
        pierce: 1,
        projectiles: 5,
        spreadDeg: 13,
        range: 320,
      },
    ],
  },
  synapticOverload: {
    name: 'Synaptic Overload',
    kind: 'weapon',
    behavior: 'synaptic',
    description:
      'Uploads a hack to a random enemy nearby. When it finishes, the enemy dies and explodes, hurting those around it.',
    color: 0x4d7cff,
    levels: [
      {
        hackMs: 500,
        minRange: 75,
        maxRange: 450,
        damage: 20,
        radius: 100,
        cooldownMs: 2500,
      },
      {
        hackMs: 400,
        minRange: 75,
        maxRange: 450,
        damage: 32,
        radius: 130,
        cooldownMs: 2000,
      },
      {
        hackMs: 300,
        minRange: 75,
        maxRange: 450,
        damage: 45,
        radius: 160,
        cooldownMs: 1500,
      },
    ],
  },
  empShock: {
    name: 'EMP Shock',
    kind: 'weapon',
    behavior: 'emp',
    description:
      'A ring pulses out from you, damaging and briefly stunning enemies.',
    color: 0x2ef2ff,
    levels: [
      { damage: 8, radius: 120, stunMs: 800, cooldownMs: 4000 },
      { damage: 13, radius: 180, stunMs: 1400, cooldownMs: 3600 },
      { damage: 20, radius: 250, stunMs: 2000, cooldownMs: 3200 },
    ],
  },
  rootkit: {
    name: 'Rootkit',
    kind: 'weapon',
    behavior: 'rootkit',
    description:
      'Turns an enemy against themselves. It fights for you for a few seconds, then explodes.',
    color: 0xff5a7a,
    levels: [
      {
        cooldownMs: 6000,
        durationMs: 3000,
        hijackRange: 400,
        count: 1,
        contactDamage: 6,
        tickMs: 300,
        explosionDamage: 25,
        explosionRadius: 95,
      },
      {
        cooldownMs: 5200,
        durationMs: 3600,
        hijackRange: 440,
        count: 1,
        contactDamage: 10,
        tickMs: 300,
        explosionDamage: 40,
        explosionRadius: 125,
      },
      {
        cooldownMs: 4400,
        durationMs: 4500,
        hijackRange: 480,
        count: 1,
        contactDamage: 15,
        tickMs: 300,
        explosionDamage: 62,
        explosionRadius: 155,
      },
    ],
  },
  firewall: {
    name: 'Firewall',
    kind: 'passive',
    description: 'Reduces the damage of every hit you take.',
    color: 0x9aa7c7,
    levels: [
      { damageReduction: 1 },
      { damageReduction: 2 },
      { damageReduction: 3 },
    ],
  },
  healingNanites: {
    name: 'Healing Nanites',
    kind: 'passive',
    description: 'Nanites repair you over time. Faster health regeneration.',
    color: 0x5fe08a,
    levels: [
      { hpRegenPerSec: 0.5 },
      { hpRegenPerSec: 0.75 },
      { hpRegenPerSec: 1 },
    ],
  },
  legServos: {
    name: 'Exoskeleton',
    kind: 'passive',
    description: 'Servo assisted legs for faster movement.',
    color: 0x2ef2ff,
    levels: [{ moveSpeedPct: 5 }, { moveSpeedPct: 10 }, { moveSpeedPct: 15 }],
  },
  overclock: {
    name: 'OverClock',
    kind: 'passive',
    description: 'CPU upgrade. Increased damage for all weapons.',
    color: 0xff9d2e,
    levels: [{ damagePct: 3 }, { damagePct: 6 }, { damagePct: 9 }],
  },
  defensiveMatrix: {
    name: 'Defensive Matrix',
    kind: 'passive',
    description:
      'Gains a shield that will protect from one hit, it also retaliates against melee enemies.',
    color: 0x7a5cff,
    levels: [
      { retaliationDamage: 4, shieldHits: 1, shieldRechargeMs: 5000 },
      { retaliationDamage: 8, shieldHits: 1, shieldRechargeMs: 4000 },
      { retaliationDamage: 12, shieldHits: 1, shieldRechargeMs: 3000 },
    ],
  },
}

/** Offered together when every owned skill is maxed and no slot is free (or no skill is left to offer). */
export const FALLBACK_UPGRADES = {
  heal: { name: 'Patch Up', description: 'Restore HP.', fraction: 0.3 },
  credits: {
    name: 'Payday',
    description: 'Take credits instead.',
    amount: 15,
  },
}

export function getSkillStats(
  id: string,
  level: number,
):
  | WeaponStats
  | VirusStats
  | SynapticStats
  | EmpStats
  | RootkitStats
  | PassiveStats {
  const skill = SKILLS[id]
  if (!skill) throw new Error(`Unknown skill "${id}"`)
  const i = Math.min(Math.max(level, 1), skill.levels.length) - 1
  return skill.levels[i]
}

export function getWeaponStats(id: string, level: number): WeaponStats {
  const skill = SKILLS[id]
  if (
    skill?.kind !== 'weapon' ||
    skill.behavior === 'virus' ||
    skill.behavior === 'synaptic' ||
    skill.behavior === 'emp' ||
    skill.behavior === 'rootkit'
  )
    throw new Error(`"${id}" is not a projectile weapon skill`)
  return getSkillStats(id, level) as WeaponStats
}

export function getVirusStats(id: string, level: number): VirusStats {
  if (
    !(
      SKILLS[id]?.kind === 'weapon' &&
      (SKILLS[id] as VirusSkill).behavior === 'virus'
    )
  )
    throw new Error(`"${id}" is not a virus skill`)
  return getSkillStats(id, level) as VirusStats
}

export function getSynapticStats(id: string, level: number): SynapticStats {
  if (
    !(
      SKILLS[id]?.kind === 'weapon' &&
      (SKILLS[id] as SynapticSkill).behavior === 'synaptic'
    )
  )
    throw new Error(`"${id}" is not a synaptic skill`)
  return getSkillStats(id, level) as SynapticStats
}

export function getEmpStats(id: string, level: number): EmpStats {
  if (
    !(
      SKILLS[id]?.kind === 'weapon' &&
      (SKILLS[id] as EmpSkill).behavior === 'emp'
    )
  )
    throw new Error(`"${id}" is not an EMP skill`)
  return getSkillStats(id, level) as EmpStats
}

export function getRootkitStats(id: string, level: number): RootkitStats {
  if (
    !(
      SKILLS[id]?.kind === 'weapon' &&
      (SKILLS[id] as RootkitSkill).behavior === 'rootkit'
    )
  )
    throw new Error(`"${id}" is not a rootkit skill`)
  return getSkillStats(id, level) as RootkitStats
}

export function getPassiveStats(id: string, level: number): PassiveStats {
  if (SKILLS[id]?.kind !== 'passive')
    throw new Error(`"${id}" is not a passive skill`)
  return getSkillStats(id, level) as PassiveStats
}

export function maxSkillLevel(id: string): number {
  return SKILLS[id].levels.length
}
