import Phaser from 'phaser';
import { LEVELING, PLAYER, SKILL_SLOTS } from '../data/balance';
import { FALLBACK_UPGRADE, SKILLS, getPassiveStats, maxSkillLevel } from '../data/skills';

/** The player's live stats: base values from balance.ts plus all passive bonuses. */
export interface PlayerStats {
  maxHp: number;
  moveSpeed: number;
  /** Multiplier on all damage the player deals (1 = no bonus). */
  damageMult: number;
}

export type Upgrade =
  /** Learn a skill (toLevel 1) or raise one the player already has. */
  | { type: 'skill'; skillId: string; toLevel: number }
  | { type: 'heal'; amount: number };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return LEVELING.xpForLevel2 + LEVELING.xpIncreasePerLevel * (level - 1);
}

/** Player level, XP, owned skills and the stats derived from them. */
export class Progression {
  level = 1;
  /** XP collected toward the next level. */
  xp = 0;
  /** Owned skills (weapons and passives) and their levels, in the order they were picked up. */
  readonly skills = new Map<string, number>();
  /** Shared by reference with the player and weapons; rewritten in place by recomputeStats(). */
  readonly stats: PlayerStats = { maxHp: 0, moveSpeed: 0, damageMult: 1 };

  constructor(startingSkill: string) {
    this.skills.set(startingSkill, 1);
    this.recomputeStats();
  }

  get isMaxLevel() {
    return this.level >= LEVELING.maxLevel;
  }

  get xpNeeded() {
    return xpToNextLevel(this.level);
  }

  /** Adds XP and returns how many levels were gained (can be more than one). */
  addXp(amount: number): number {
    if (this.isMaxLevel) return 0;
    this.xp += amount;
    let gained = 0;
    while (!this.isMaxLevel && this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      gained++;
    }
    if (this.isMaxLevel) this.xp = 0;
    return gained;
  }

  /** Random distinct upgrade choices: level-ups for owned skills, plus new skills while a slot is free. */
  rollUpgrades(count = LEVELING.choices): Upgrade[] {
    const options: Upgrade[] = [];
    for (const [id, lvl] of this.skills) {
      if (lvl < maxSkillLevel(id)) options.push({ type: 'skill', skillId: id, toLevel: lvl + 1 });
    }
    if (this.skills.size < SKILL_SLOTS) {
      for (const id of Object.keys(SKILLS)) {
        if (!this.skills.has(id)) options.push({ type: 'skill', skillId: id, toLevel: 1 });
      }
    }
    if (options.length === 0) return [{ type: 'heal', amount: FALLBACK_UPGRADE.heal }];
    return Phaser.Utils.Array.Shuffle(options).slice(0, count);
  }

  /** Records a skill upgrade. Healing is applied by the scene, which owns the player. */
  apply(upgrade: Upgrade) {
    if (upgrade.type !== 'skill') return;
    this.skills.set(upgrade.skillId, upgrade.toLevel);
    this.recomputeStats();
  }

  /** Re-sums every passive bonus from scratch (never adjusted incrementally). */
  recomputeStats() {
    let maxHp = 0;
    let moveSpeedPct = 0;
    let damagePct = 0;
    for (const [id, lvl] of this.skills) {
      if (SKILLS[id].kind !== 'passive') continue;
      const p = getPassiveStats(id, lvl);
      maxHp += p.maxHp ?? 0;
      moveSpeedPct += p.moveSpeedPct ?? 0;
      damagePct += p.damagePct ?? 0;
    }
    this.stats.maxHp = PLAYER.maxHp + maxHp;
    this.stats.moveSpeed = PLAYER.moveSpeed * (1 + moveSpeedPct / 100);
    this.stats.damageMult = 1 + damagePct / 100;
  }
}
