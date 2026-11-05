import type Phaser from 'phaser';
import { FALLBACK_UPGRADES, SKILLS } from '../data/skills';
import { ENEMY_DAMAGED, type Enemy } from '../entities/Enemy';
import { BASE_REGEN, PLAYER_HEALED } from '../entities/Player';

/** The "Patch Up" fallback level-up reward. */
export const PATCH_UP = 'patchUp';

/** What a damage/healing source is called and coloured on the results screen. */
export function sourceInfo(id: string): { name: string; color: number } {
  if (id === BASE_REGEN) return { name: 'Base regen', color: 0x9aa7c7 };
  if (id === PATCH_UP) return { name: FALLBACK_UPGRADES.heal.name, color: 0x5fe08a };
  const s = SKILLS[id];
  return { name: s?.name.replace(/^\[PH\]\s*/, '') ?? id, color: s?.color ?? 0xffffff };
}

export interface StatRow {
  id: string;
  amount: number;
}

/** Per-run numbers for the results screen: damage per skill, HP healed per source, distance walked. */
export class RunStats {
  private damage = new Map<string, number>();
  private healing = new Map<string, number>();
  private distancePx = 0;
  private last: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene) {
    scene.events.on(ENEMY_DAMAGED, this.onDamage, this);
    scene.events.on(PLAYER_HEALED, this.onHeal, this);
    scene.events.once('shutdown', () => {
      scene.events.off(ENEMY_DAMAGED, this.onDamage, this);
      scene.events.off(PLAYER_HEALED, this.onHeal, this);
    });
  }

  /** `dealt` is the damage that actually counted (not the overkill beyond the enemy's remaining HP). */
  private onDamage(_enemy: Enemy, _amount: number, skillId: string, dealt: number) {
    this.damage.set(skillId, (this.damage.get(skillId) ?? 0) + dealt);
  }

  private onHeal(amount: number, sourceId: string) {
    this.healing.set(sourceId, (this.healing.get(sourceId) ?? 0) + amount);
  }

  /** Call every frame with the player's position (dashes count too). */
  trackPosition(x: number, y: number) {
    if (this.last) this.distancePx += Math.hypot(x - this.last.x, y - this.last.y);
    this.last = { x, y };
  }

  get damageRows(): StatRow[] {
    return this.sorted(this.damage);
  }

  get healingRows(): StatRow[] {
    return this.sorted(this.healing);
  }

  get totalDamage() {
    return this.sum(this.damage);
  }

  get totalHealing() {
    return this.sum(this.healing);
  }

  get distancePixels() {
    return this.distancePx;
  }

  private sorted(m: Map<string, number>): StatRow[] {
    return [...m].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount);
  }

  private sum(m: Map<string, number>) {
    let t = 0;
    for (const v of m.values()) t += v;
    return t;
  }
}
