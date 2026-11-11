/**
 * Cyberware: permanent upgrades bought at the ripdoc in the main menu (docs/CYBERWARE.md).
 * Every piece can be installed at once; a slot only says where it sits on the body.
 * Henrik tunes cost and effect numbers here.
 */

export type CyberSlot = 'head' | 'chest' | 'hands' | 'back' | 'legs' | 'feet' | 'icu' | 'trinket';

export interface SlotInfo {
  label: string;
  /** Where the slot's marker sits on the ripdoc silhouette, as a fraction of its width and height. */
  anchor: { x: number; y: number };
}

/** In the order the ripdoc lists them. */
export const CYBER_SLOTS: Record<CyberSlot, SlotInfo> = {
  head: { label: 'HEAD', anchor: { x: 0.5, y: 0.085 } },
  icu: { label: 'ICU', anchor: { x: 0.5, y: 0.2 } },
  chest: { label: 'CHEST', anchor: { x: 0.5, y: 0.32 } },
  back: { label: 'BACK', anchor: { x: 0.68, y: 0.28 } },
  hands: { label: 'HANDS', anchor: { x: 0.125, y: 0.56 } },
  legs: { label: 'LEGS', anchor: { x: 0.39, y: 0.72 } },
  feet: { label: 'FEET', anchor: { x: 0.6, y: 0.95 } },
  trinket: { label: 'TRINKETS', anchor: { x: 0.875, y: 0.56 } },
};

/** What a piece of cyberware does in a run. Applied at run start; nothing here is in effect yet before PLAN D step 3. */
export interface CyberEffects {
  /** Added to the passives' percentage damage reduction (all sources stack additively). */
  damageReductionPct?: number;
  /** Run speed. Adds to the passives' move speed percentage. */
  moveSpeedPct?: number;
  /** Dash distance; the dash takes the same time, so it is faster. */
  dashDistancePct?: number;
  /** Credit chip magnet radius. */
  magnetRadiusPct?: number;
  /** Targeting range of active skills: gun range, Virus infect, Rootkit hijack, Synaptic Overload max range. Not area sizes. */
  weaponRangePct?: number;
  /** Speed of every timed hack step: server upload, camera pole hold, ATM decrypt, Connect servers attach. Not typing or Smack. */
  hackSpeedPct?: number;
  /** Enemies within `radius` px move `pct` percent slower. */
  enemySlow?: { pct: number; radius: number };
  /** Ranged enemies aim up to this many degrees off. */
  enemyAimSpreadDeg?: number;
  /** Chance (0..1) that an enemy bullet hitting the player does no damage and flies back as the player's bullet. */
  ricochetChance?: number;
  /** Zaps every enemy within `radius` px for flat `damage` and a `stunMs` stun, at most every `cooldownMs`. */
  discharge?: { damage: number; stunMs: number; cooldownMs: number; radius: number };
  /** A second compass needle pointing at the nearest camera pole and ATM still usable. */
  poiCompass?: boolean;
}

export interface Cyberware {
  name: string;
  slot: CyberSlot;
  cost: number;
  /** 'blueprint' pieces stay hidden at the ripdoc until their blueprint is found in a data cache. */
  source: 'shop' | 'blueprint';
  description: string;
  effects: CyberEffects;
}

/** Keyed by id. Ids are stored in saves, so never rename one; names can change freely. */
export const CYBERWARE: Record<string, Cyberware> = {
  opticNerveHud: {
    name: 'Optic Nerve HUD',
    slot: 'head',
    cost: 300,
    source: 'shop',
    description: 'A compass to the closest camera pole and ATM.',
    effects: { poiCompass: true },
  },
  proximitySensors: {
    name: 'Heightened Proximity Sensors',
    slot: 'head',
    cost: 550,
    source: 'shop',
    description: 'Enemies move 20% slower while near you.',
    effects: { enemySlow: { pct: 20, radius: 150 } },
  },
  depthBridge: {
    name: 'Depth Enhancement Bridge',
    slot: 'head',
    cost: 1250,
    source: 'blueprint',
    description: '+20% range for all weapons.',
    effects: { weaponRangePct: 20 },
  },
  softTissueShielding: {
    name: 'Exposed Soft Tissue Shielding',
    slot: 'chest',
    cost: 450,
    source: 'shop',
    description: '5% damage reduction.',
    effects: { damageReductionPct: 5 },
  },
  dischargePlates: {
    name: 'Auxilliary Discharge Plates',
    slot: 'chest',
    cost: 900,
    source: 'shop',
    description: 'Every 12 s at most, zaps enemies close to you for 5 damage and stuns them for 2 s.',
    effects: { discharge: { damage: 5, stunMs: 2000, cooldownMs: 12000, radius: 100 } },
  },
  carbonFiberSkin: {
    name: 'Carbon Fiber Second Skin',
    slot: 'chest',
    cost: 1500,
    source: 'blueprint',
    description: '10% damage reduction. 25% chance to ricochet a ranged attack back at the attacker.',
    effects: { damageReductionPct: 10, ricochetChance: 0.25 },
  },
  magnetized: {
    name: 'Magnetized',
    slot: 'hands',
    cost: 400,
    source: 'shop',
    description: 'Gather credits from 30% further away.',
    effects: { magnetRadiusPct: 30 },
  },
  holographicDisruptors: {
    name: 'Holographic Disruptors',
    slot: 'back',
    cost: 600,
    source: 'shop',
    description: 'Enemies are more likely to miss you with ranged attacks.',
    effects: { enemyAimSpreadDeg: 12 },
  },
  hydraulicJointsLegs: {
    name: 'Hydraulic Joints',
    slot: 'legs',
    cost: 600,
    source: 'shop',
    description: '+8% run speed.',
    effects: { moveSpeedPct: 8 },
  },
  maglevSoles: {
    name: 'MagLev Soles',
    slot: 'feet',
    cost: 850,
    source: 'shop',
    description: '+30% dash distance.',
    effects: { dashDistancePct: 30 },
  },
  megathreading: {
    name: 'Megathreading',
    slot: 'icu',
    cost: 500,
    source: 'shop',
    description: '+10% hacking speed.',
    effects: { hackSpeedPct: 10 },
  },
};

/** Damage numbers and results-screen rows for cyberware that deals damage (Discharge Plates, ricochets). */
export const CYBER_COLOR = 0x7df9ff;

/** Tuning for the cyberware with behaviour. The per-piece numbers live in each piece's effects above. */
export const CYBER_FX = {
  /** Proximity Sensors: faint ring at the slow radius around the player, so the zone reads. 0 hides it. */
  slowRingAlpha: 0.12,
  /** Discharge Plates: how long the lightning arcs stay on screen, and how jagged they are (px). */
  dischargeFxMs: 220,
  dischargeJitter: 10,
  /** Carbon Fiber ricochet: speed of the returned bullet (px/s). */
  ricochetSpeed: 520,
  /** Optic Nerve HUD needle colour (the objective needle is gold). */
  poiNeedleColor: 0x2ef2ff,
};

export const isCyberwareId = (id: string) => Object.hasOwn(CYBERWARE, id);
