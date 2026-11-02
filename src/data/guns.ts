// ─────────────────────────────────────────────────────────────
// GUNS: player-aimed primary guns (fired with the mouse), as opposed to the
// auto-firing weapon skills in skills.ts. Distances in pixels, times in ms.
// ─────────────────────────────────────────────────────────────

export interface GunData {
  name: string;
  damage: number;
  cooldownMs: number;
  projectileSpeed: number;
  /** How many enemies a bullet passes through before disappearing (0 = stops at the first). */
  pierce: number;
  /** Bullets fired per shot, fanned out by spreadDeg. */
  projectiles: number;
  spreadDeg: number;
  /** How far a bullet flies. */
  range: number;
  color: number;
  /** Placeholder bullet size. */
  bulletWidth: number;
  bulletHeight: number;
}

export const GUNS: Record<string, GunData> = {
  rifle: {
    name: 'Rifle',
    damage: 20,
    cooldownMs: 1000,
    projectileSpeed: 900,
    pierce: 2,
    projectiles: 1,
    spreadDeg: 0,
    range: 700,
    color: 0xff9d2e,
    bulletWidth: 18,
    bulletHeight: 5,
  },
};

/** The gun fired with the left mouse button. */
export const PRIMARY_GUN = 'rifle';
