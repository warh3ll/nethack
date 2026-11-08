import Phaser from 'phaser'
import { CACHES, LEVELING, PASSIVE_SLOTS, PLAYER, WEAPON_SLOTS } from '../data/balance'
import {
  FALLBACK_UPGRADES,
  SKILLS,
  getPassiveStats,
  maxSkillLevel,
} from '../data/skills'

/** The player's live stats: base values from balance.ts plus all passive bonuses. */
export interface PlayerStats {
  maxHp: number
  /** HP regenerated per second. */
  hpRegenPerSec: number
  /** Part of hpRegenPerSec that each passive adds (the rest is base regen). For the run stats. */
  hpRegenBySkill: Record<string, number>
  /** Flat damage taken off every hit the player receives. */
  damageReduction: number
  /** Damage dealt back to an enemy whose touch reaches the player, blocked or not. */
  retaliationDamage: number
  /** Hits the shield absorbs when fully charged (0 = no shield). */
  shieldHits: number
  /** Time (ms) for the shield to get one hit back. */
  shieldRechargeMs: number
  moveSpeed: number
  /** Multiplier on all damage the player deals (1 = no bonus). */
  damageMult: number
}

export type Upgrade =
  /** Learn a skill (toLevel 1) or raise one the player already has. */
  | { type: 'skill'; skillId: string; toLevel: number }
  /** Restores this fraction of max HP (fallback choice). */
  | { type: 'heal'; fraction: number }
  /** Grants credits for the run (fallback choice, or the contents of a data cache). */
  | { type: 'credits'; amount: number }

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return LEVELING.xpForLevel2 + LEVELING.xpIncreasePerLevel * (level - 1)
}

/** Player level, XP, owned skills and the stats derived from them. */
export class Progression {
  level = 1
  /** XP collected toward the next level. */
  xp = 0
  /** Owned skills (weapons and passives) and their levels, in the order they were picked up. */
  readonly skills = new Map<string, number>()
  /** Shared by reference with the player and weapons; rewritten in place by recomputeStats(). */
  readonly stats: PlayerStats = {
    maxHp: 0,
    hpRegenPerSec: 0,
    hpRegenBySkill: {},
    damageReduction: 0,
    retaliationDamage: 0,
    shieldHits: 0,
    shieldRechargeMs: 0,
    moveSpeed: 0,
    damageMult: 1,
  }

  constructor(startingSkill: string) {
    this.skills.set(startingSkill, 1)
    this.recomputeStats()
  }

  get xpNeeded() {
    return xpToNextLevel(this.level)
  }

  /** Adds XP and returns how many levels were gained (can be more than one). */
  addXp(amount: number): number {
    this.xp += amount
    let gained = 0
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded
      this.level++
      gained++
    }
    return gained
  }

  /** Owned skill ids of one kind, in pickup order. Each kind has its own slot group. */
  ownedOfKind(kind: 'weapon' | 'passive'): string[] {
    return [...this.skills.keys()].filter((id) => SKILLS[id].kind === kind)
  }

  hasFreeSlot(kind: 'weapon' | 'passive'): boolean {
    const slots = kind === 'weapon' ? WEAPON_SLOTS : PASSIVE_SLOTS
    return this.ownedOfKind(kind).length < slots
  }

  /** Every upgrade that could be offered right now: level-ups for owned skills, plus new skills while a slot is free. */
  private offerPool(): Upgrade[] {
    const options: Upgrade[] = []
    for (const [id, lvl] of this.skills) {
      if (lvl < maxSkillLevel(id))
        options.push({ type: 'skill', skillId: id, toLevel: lvl + 1 })
    }
    for (const id of Object.keys(SKILLS)) {
      if (this.skills.has(id) || !this.hasFreeSlot(SKILLS[id].kind)) continue
      options.push({ type: 'skill', skillId: id, toLevel: 1 })
    }
    return options
  }

  /** Random distinct upgrade choices. On a reroll, pass the previous choices: those are only repeated if the pool is too small. */
  rollUpgrades(count = LEVELING.choices, previous: Upgrade[] = []): Upgrade[] {
    const options = this.offerPool()
    if (options.length === 0) {
      return [
        { type: 'heal', fraction: FALLBACK_UPGRADES.heal.fraction },
        { type: 'credits', amount: FALLBACK_UPGRADES.credits.amount },
      ]
    }
    const seen = (u: Upgrade) =>
      previous.some(
        (p) =>
          p.type === 'skill' && u.type === 'skill' && p.skillId === u.skillId,
      )
    // Shuffled, with anything shown on the previous roll last.
    const ordered = (list: Upgrade[]) => [
      ...Phaser.Utils.Array.Shuffle(list.filter((u) => !seen(u))),
      ...Phaser.Utils.Array.Shuffle(list.filter(seen)),
    ]
    const isNew = (u: Upgrade) => u.type === 'skill' && u.toLevel === 1
    const newSkills = ordered(options.filter(isNew))
    const upgrades = ordered(options.filter((u) => !isNew(u)))

    // Aim for (count - newSkillChoices) upgrades and newSkillChoices new skills.
    // When one group runs short, the other fills the gap.
    const wantNew = Math.min(LEVELING.newSkillChoices, count)
    let takeNew = Math.min(wantNew, newSkills.length)
    const takeUpgrades = Math.min(count - takeNew, upgrades.length)
    takeNew = Math.min(count - takeUpgrades, newSkills.length)
    return [...upgrades.slice(0, takeUpgrades), ...newSkills.slice(0, takeNew)]
  }

  /**
   * What a data cache holds: usually credits (CACHES.creditChance), otherwise one random entry from the
   * same pool as level-ups, so the slot rules apply. With nothing useful in the pool it always holds credits.
   */
  rollCacheContents(): Upgrade {
    const options = this.offerPool()
    if (options.length === 0 || Math.random() < CACHES.creditChance)
      return { type: 'credits', amount: CACHES.creditAmount }
    return Phaser.Utils.Array.GetRandom(options)
  }

  /** True when a reroll could show something different (more options than fit on one screen). */
  canReroll(count = LEVELING.choices): boolean {
    return this.offerPool().length > count
  }

  /** Records a skill upgrade. Healing is applied by the scene, which owns the player. */
  apply(upgrade: Upgrade) {
    if (upgrade.type !== 'skill') return
    this.skills.set(upgrade.skillId, upgrade.toLevel)
    this.recomputeStats()
  }

  /** Re-sums every passive bonus from scratch (never adjusted incrementally). */
  recomputeStats() {
    let damageReduction = 0
    let retaliation = 0
    let shieldHits = 0
    const shieldRecharges: number[] = []
    let hpRegen = 0
    const regenBySkill: Record<string, number> = {}
    let moveSpeedPct = 0
    let damagePct = 0
    for (const [id, lvl] of this.skills) {
      if (SKILLS[id].kind !== 'passive') continue
      const p = getPassiveStats(id, lvl)
      damageReduction += p.damageReduction ?? 0
      retaliation += p.retaliationDamage ?? 0
      shieldHits += p.shieldHits ?? 0
      if (p.shieldRechargeMs) shieldRecharges.push(p.shieldRechargeMs)
      hpRegen += p.hpRegenPerSec ?? 0
      if (p.hpRegenPerSec) regenBySkill[id] = p.hpRegenPerSec
      moveSpeedPct += p.moveSpeedPct ?? 0
      damagePct += p.damagePct ?? 0
    }
    this.stats.maxHp = PLAYER.maxHp
    this.stats.damageReduction = damageReduction
    this.stats.retaliationDamage = retaliation
    this.stats.shieldHits = shieldHits
    this.stats.shieldRechargeMs = shieldRecharges.length > 0 ? Math.min(...shieldRecharges) : 0
    this.stats.hpRegenPerSec = PLAYER.hpRegenPerSec + hpRegen
    this.stats.hpRegenBySkill = regenBySkill
    this.stats.moveSpeed = PLAYER.moveSpeed * (1 + moveSpeedPct / 100)
    this.stats.damageMult = 1 + damagePct / 100
  }
}
