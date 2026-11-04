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
}

/**
 * Bonuses a passive gives at one level. Each row is the passive's TOTAL bonus at that level
 * (not the step from the previous level). Bonuses from all passives are added together.
 */
export interface PassiveStats {
  /** Damage dealt to enemies that hit the player. */
  damage?: number
  /** Flat extra max HP. */
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

export interface PassiveSkill extends SkillBase {
  kind: 'passive'
  levels: PassiveStats[]
}

export type SkillData = WeaponSkill | VirusSkill | PassiveSkill

export const SKILLS: Record<string, SkillData> = {
  autoPistol: {
    name: 'Auto-Pistol',
    kind: 'weapon',
    description: 'Fires at the nearest enemy.',
    color: 0xfff35c,
    levels: [
      {
        damage: 7,
        cooldownMs: 600,
        projectileSpeed: 520,
        pierce: 0,
        projectiles: 1,
        spreadDeg: 0,
        range: 500,
      },
      {
        damage: 8,
        cooldownMs: 540,
        projectileSpeed: 540,
        pierce: 0,
        projectiles: 1,
        spreadDeg: 0,
        range: 525,
      },
      {
        damage: 9,
        cooldownMs: 480,
        projectileSpeed: 560,
        pierce: 1,
        projectiles: 2,
        spreadDeg: 0,
        range: 550,
      },
      {
        damage: 10,
        cooldownMs: 440,
        projectileSpeed: 580,
        pierce: 2,
        projectiles: 2,
        spreadDeg: 8,
        range: 600,
      },
      {
        damage: 12,
        cooldownMs: 400,
        projectileSpeed: 600,
        pierce: 3,
        projectiles: 3,
        spreadDeg: 8,
        range: 650,
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
        dps: 2,
        cooldownMs: 1500,
        infectRange: 400,
        spreadRange: 200,
        spreadCount: 1,
        tickMs: 250,
      },
      {
        dps: 3,
        cooldownMs: 1500,
        infectRange: 420,
        spreadRange: 200,
        spreadCount: 1,
        tickMs: 250,
      },
      {
        dps: 4,
        cooldownMs: 1500,
        infectRange: 440,
        spreadRange: 200,
        spreadCount: 1,
        tickMs: 250,
      },
      {
        dps: 5.5,
        cooldownMs: 1500,
        infectRange: 460,
        spreadRange: 200,
        spreadCount: 2,
        tickMs: 250,
      },
      {
        dps: 7,
        cooldownMs: 1500,
        infectRange: 480,
        spreadRange: 200,
        spreadCount: 2,
        tickMs: 250,
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
        damage: 40,
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
        damage: 52,
        cooldownMs: 2800,
        projectileSpeed: 1800,
        pierce: 99,
        projectiles: 1,
        spreadDeg: 0,
        range: 750,
        minRange: 75,
        targeting: 'highestHp',
      },
      {
        damage: 66,
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
        damage: 82,
        cooldownMs: 2400,
        projectileSpeed: 1800,
        pierce: 99,
        projectiles: 1,
        spreadDeg: 0,
        range: 850,
        minRange: 75,
        targeting: 'highestHp',
      },
      {
        damage: 100,
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
    name: 'Scatter Gun',
    kind: 'weapon',
    description: 'Short-range spread at the nearest enemy.',
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
  firewall: {
    name: 'Firewall',
    kind: 'passive',
    description: 'Reduces incoming damage.',
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
    description: 'Faster health regeneration.',
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
  blackICE: {
    name: 'Black ICE',
    kind: 'passive',
    description:
      'Your internal ICE is now upgraded to retaliate against enemies that hit you',
    color: 0xff9d2e,
    levels: [{ damage: 4 }, { damage: 8 }, { damage: 12 }],
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
): WeaponStats | VirusStats | PassiveStats {
  const skill = SKILLS[id]
  if (!skill) throw new Error(`Unknown skill "${id}"`)
  const i = Math.min(Math.max(level, 1), skill.levels.length) - 1
  return skill.levels[i]
}

export function getWeaponStats(id: string, level: number): WeaponStats {
  const skill = SKILLS[id]
  if (skill?.kind !== 'weapon' || skill.behavior === 'virus')
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

export function getPassiveStats(id: string, level: number): PassiveStats {
  if (SKILLS[id]?.kind !== 'passive')
    throw new Error(`"${id}" is not a passive skill`)
  return getSkillStats(id, level) as PassiveStats
}

export function maxSkillLevel(id: string): number {
  return SKILLS[id].levels.length
}
