// ─────────────────────────────────────────────────────────────
// SKILLS: each skill is data. `levels[0]` is level 1, `levels[1]` level 2, ...
// The code reads stats via getSkillStats(id, level), so adding a level is just adding a row.
// A skill's max level is simply how many rows it has.
//
// Skills marked `placeholder: true` (and "[PH]" in the name) are stand-ins so the
// level-up picker has something to offer. Replace or delete them as real skills are designed.
// ─────────────────────────────────────────────────────────────

export interface WeaponStats {
  damage: number;
  cooldownMs: number;
  projectileSpeed: number;
  /** How many enemies a bullet passes through before disappearing (0 = stops at the first). */
  pierce: number;
  /** Bullets fired per shot, fanned out by spreadDeg. */
  projectiles: number;
  spreadDeg: number;
  /** Max targeting distance, and how far a bullet flies. */
  range: number;
}

/**
 * Bonuses a passive gives at one level. Each row is the passive's TOTAL bonus at that level
 * (not the step from the previous level). Bonuses from all passives are added together.
 */
export interface PassiveStats {
  /** Flat extra max HP. */
  maxHp?: number;
  /** Percent extra move speed (10 = +10%). */
  moveSpeedPct?: number;
  /** Percent extra damage for everything the player's weapons fire. */
  damagePct?: number;
}

interface SkillBase {
  name: string;
  description: string;
  color: number;
  /** Stand-in until the real skill list is designed. */
  placeholder?: boolean;
}

export interface WeaponSkill extends SkillBase {
  kind: 'weapon';
  levels: WeaponStats[];
}

export interface PassiveSkill extends SkillBase {
  kind: 'passive';
  levels: PassiveStats[];
}

export type SkillData = WeaponSkill | PassiveSkill;

export const SKILLS: Record<string, SkillData> = {
  autoPistol: {
    name: 'Auto-Pistol',
    kind: 'weapon',
    description: 'Fires at the nearest enemy.',
    color: 0xfff35c,
    levels: [
      { damage: 5, cooldownMs: 600, projectileSpeed: 520, pierce: 0, projectiles: 1, spreadDeg: 0, range: 420 },
      { damage: 6, cooldownMs: 540, projectileSpeed: 540, pierce: 0, projectiles: 1, spreadDeg: 0, range: 440 },
      { damage: 7, cooldownMs: 480, projectileSpeed: 560, pierce: 1, projectiles: 1, spreadDeg: 0, range: 460 },
      { damage: 8, cooldownMs: 440, projectileSpeed: 580, pierce: 1, projectiles: 2, spreadDeg: 8, range: 480 },
      { damage: 10, cooldownMs: 400, projectileSpeed: 600, pierce: 2, projectiles: 2, spreadDeg: 8, range: 500 },
    ],
  },

  // ── Placeholders ───────────────────────────────────────────
  phScatter: {
    name: '[PH] Scatter Gun',
    kind: 'weapon',
    placeholder: true,
    description: 'Placeholder weapon. Short-range spread at the nearest enemy.',
    color: 0xc77dff,
    levels: [
      { damage: 4, cooldownMs: 1100, projectileSpeed: 480, pierce: 0, projectiles: 3, spreadDeg: 15, range: 280 },
      { damage: 5, cooldownMs: 1000, projectileSpeed: 480, pierce: 0, projectiles: 4, spreadDeg: 14, range: 300 },
      { damage: 6, cooldownMs: 900, projectileSpeed: 500, pierce: 1, projectiles: 5, spreadDeg: 13, range: 320 },
    ],
  },
  phPlating: {
    name: '[PH] Armor Plating',
    kind: 'passive',
    placeholder: true,
    description: 'Placeholder passive. More max HP.',
    color: 0x9aa7c7,
    levels: [{ maxHp: 20 }, { maxHp: 40 }, { maxHp: 60 }],
  },
  phServos: {
    name: '[PH] Leg Servos',
    kind: 'passive',
    placeholder: true,
    description: 'Placeholder passive. Faster movement.',
    color: 0x2ef2ff,
    levels: [{ moveSpeedPct: 8 }, { moveSpeedPct: 16 }, { moveSpeedPct: 24 }],
  },
  phOverclock: {
    name: '[PH] Overclock',
    kind: 'passive',
    placeholder: true,
    description: 'Placeholder passive. More damage from everything you fire.',
    color: 0xff9d2e,
    levels: [{ damagePct: 10 }, { damagePct: 20 }, { damagePct: 30 }],
  },
};

/** Offered when every owned skill is maxed and no slot is free (or no skill is left to offer). */
export const FALLBACK_UPGRADE = {
  name: 'Patch Up',
  description: 'Restore HP.',
  heal: 30,
};

export function getSkillStats(id: string, level: number): WeaponStats | PassiveStats {
  const skill = SKILLS[id];
  if (!skill) throw new Error(`Unknown skill "${id}"`);
  const i = Math.min(Math.max(level, 1), skill.levels.length) - 1;
  return skill.levels[i];
}

export function getWeaponStats(id: string, level: number): WeaponStats {
  if (SKILLS[id]?.kind !== 'weapon') throw new Error(`"${id}" is not a weapon skill`);
  return getSkillStats(id, level) as WeaponStats;
}

export function getPassiveStats(id: string, level: number): PassiveStats {
  if (SKILLS[id]?.kind !== 'passive') throw new Error(`"${id}" is not a passive skill`);
  return getSkillStats(id, level) as PassiveStats;
}

export function maxSkillLevel(id: string): number {
  return SKILLS[id].levels.length;
}
