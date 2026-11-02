// ─────────────────────────────────────────────────────────────
// SKILLS: each skill is data. `levels[0]` is level 1, `levels[1]` level 2, ...
// The code reads stats via getSkillStats(id, level), so adding a level is just adding a row.
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

export interface SkillData {
  name: string;
  kind: 'weapon' | 'passive';
  description: string;
  color: number;
  levels: WeaponStats[];
}

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
};

export function getSkillStats(id: string, level: number): WeaponStats {
  const skill = SKILLS[id];
  if (!skill) throw new Error(`Unknown skill "${id}"`);
  const i = Math.min(Math.max(level, 1), skill.levels.length) - 1;
  return skill.levels[i];
}
