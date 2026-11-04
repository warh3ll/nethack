// ─────────────────────────────────────────────────────────────
// OBJECTIVES + HACKING: tweak numbers here, no game logic lives in this file.
// Distances are in pixels, times in milliseconds.
// ─────────────────────────────────────────────────────────────

export interface ObjectiveDef {
  id: string
  type: 'hackServer' | 'encryptionKey' | 'connectServers' | 'stealSecrets'
  /** Shown in the objective list (top right). Keep it short, the panel is narrow. */
  name: string
  /** World position, relative to the player's start (0, 0). */
  x: number
  y: number
}

/**
 * Which objectives a run gets: 3-5 drawn at random, completable in any order.
 * (For connectServers, x, y is the first server and the second is placed nearby. For stealSecrets,
 * x, y is the middle of the compound.)
 */
export const RUN_GENERATION = {
  count: { min: 3, max: 5 },
  /** The same objective type can occur at most this many times in one run. */
  maxPerType: 2,
  /** Types every run must contain at least once (hacking is the core of the game). */
  required: ['hackServer'] as ObjectiveDef['type'][],
  /** Name in the objective list; a " 1" / " 2" is added when a type occurs twice. */
  names: {
    hackServer: 'Hack server',
    encryptionKey: 'Grab encryption key',
    connectServers: 'Connect servers',
    stealSecrets: 'Steal secrets',
  } as Record<ObjectiveDef['type'], string>,
  /**
   * Objectives stay at least this far from the map edge. Has to fit everything built around the
   * objective position, the largest being the second server of Connect servers (CONNECT_SERVERS.gap).
   */
  edgeMargin: 700,
  /** No objective this close to the start (which is also the extraction point). */
  minDistFromStart: 900,
  /** One objective per run is placed within this distance of the start, so the first walk stays short. */
  firstObjectiveMaxDist: 2500,
  /** No two objectives closer than this. */
  minSpacing: 1300,
}

/** Steal secrets objective: destroy every outpost (they spawn drones while the player is near), then pick up the secrets. */
export const STEAL_SECRETS = {
  /** Outposts per objective, picked at random. */
  outposts: { min: 2, max: 4 },
  /** Outposts stand on a circle of this radius around the objective position. */
  ringRadius: 170,
  /** Each outpost beyond the minimum count takes this much hp off every outpost (see ENEMIES.outpost.hp). */
  hpLossPerExtra: 10,
  /** An outpost spawns drones only while the player is within this distance of it. */
  spawnTriggerRadius: 650,
  /** Time between drones from one outpost. */
  spawnIntervalMs: 2500,
  /** The player picks up the secrets within this distance. */
  pickupRadius: 36,
}

/** Connect servers objective: grab a cable (E) at the first server, hold E at the other to attach it (start at either). */
export const CONNECT_SERVERS = {
  /** The second server is placed this far from the first, in a random direction. */
  gap: { min: 500, max: 600 },
  /** Press E within this distance of either server to grab the cable. */
  grabRadius: 60,
  /** Hold E within this distance of the other server to attach it. */
  attachRadius: 60,
  /** How long E must be held. Taking damage resets it. */
  attachMs: 2500,
  /** With the cable in hand the player can't get farther than this from the server it is attached to (they can still circle it). */
  maxCableLength: 800,
  /** Pressing E away from the second server drops the cable; this is how long it takes to wind back. */
  unwindMs: 600,
}

/** Grab encryption key objective: a Goon stands guard next to a dossier; walking onto the dossier takes the key. */
export const ENCRYPTION_KEY = {
  /** The player picks up the dossier within this distance of it. */
  pickupRadius: 36,
  /** The Goon's guard post, relative to the dossier. */
  goonOffset: { x: 70, y: 0 },
}

/** The extraction point (the player's own 127.0.0.1). Appears once the last objective is done. */
export const EXTRACTION = {
  /** World position, relative to the player's start (0, 0). */
  x: 0,
  y: 0,
  /** The player must stay inside this radius to log out; leaving cancels the typing and the countdown. */
  radius: 140,
  /** What to type at the extraction point (case-sensitive, mistypes just get retyped). */
  logoutText: 'log out',
  /** Seconds of countdown after the text is typed, then the run is won. */
  countdownSeconds: 3,
}

export const HACK = {
  /** The player must stay within this distance of the server for the hack to progress. */
  range: 220,
  /** Time the hack takes with no interruptions, from 0% to 100%. Prompts and damage add to this. */
  durationMs: 20000,
  /** Progress lost per second (fraction of the whole bar) while the player is out of range. */
  decayPerSecond: 0.01,
  /** Taking damage halts the progress for this long. */
  damageHaltMs: 200,
  /** While a hack is running (player in range), enemies spawn this much faster (interval x this). */
  spawnIntervalMultiplier: 0.8,
  /** Game speed while a prompt is being typed (1 = normal, 0.3 = 30%). Everything but the hack itself slows. */
  typingTimeScale: 0.3,
  /** Prompts per hack. They are spread evenly along the bar. */
  promptCount: { min: 2, max: 3 },
  smackHits: { min: 8, max: 15 },
  injectWordCount: { min: 2, max: 4 },
  /** Digits in a PIN prompt. */
  pinLength: 4,
}

/**
 * Password prompts are "adjective-noun" (GAME_DESIGN section 8), e.g. "neon-falcon".
 * All lowercase, plain a-z only (no å/ä/ö, no lookalikes), so any keyboard layout can type them.
 * Add or remove words freely; keep them short and unambiguous to read.
 */
export const PASSWORD_ADJECTIVES = [
  'neon',
  'chrome',
  'rusty',
  'silent',
  'toxic',
  'rapid',
  'hollow',
  'brittle',
  'savage',
  'glitchy',
  'frozen',
  'burning',
  'cold',
  'dark',
  'electric',
  'feral',
  'ghostly',
  'hidden',
  'iron',
  'lazy',
  'lethal',
  'lucky',
  'mad',
  'narrow',
  'noisy',
  'pale',
  'quiet',
  'rogue',
  'sharp',
  'shady',
  'slick',
  'smoky',
  'solar',
  'static',
  'stolen',
  'sunken',
  'swift',
  'tidal',
  'twisted',
  'vivid',
  'wired',
  'wild',
  'bitter',
  'broken',
  'crimson',
  'digital',
  'dusty',
  'faded',
  'grim',
  'hungry',
]

export const PASSWORD_NOUNS = [
  'falcon',
  'wolf',
  'cobra',
  'raven',
  'tiger',
  'viper',
  'hornet',
  'badger',
  'jackal',
  'mantis',
  'dragon',
  'ghost',
  'comet',
  'anvil',
  'blade',
  'bridge',
  'cipher',
  'circuit',
  'dagger',
  'engine',
  'furnace',
  'harbor',
  'hammer',
  'lantern',
  'mirror',
  'needle',
  'orbit',
  'pistol',
  'plasma',
  'portal',
  'pulse',
  'quartz',
  'radar',
  'reactor',
  'signal',
  'spark',
  'storm',
  'tunnel',
  'turbine',
  'vector',
  'window',
  'zebra',
  'rocket',
  'kernel',
  'beacon',
  'dynamo',
  'magnet',
  'prism',
  'relay',
  'thunder',
]

export const INJECT_WORDS = [
  'else',
  'for',
  'while',
  'void',
  'null',
  'nil',
  'int',
  'char',
  'bool',
  'true',
  'false',
  'var',
  'let',
  'const',
  'func',
  'def',
  'async',
  'await',
  'yield',
  'try',
  'catch',
  'throw',
  'break',
  'eval',
  'exec',
  'main',
  'self',
  'this',
  'new',
  'enum',
  'byte',
  'bit',
  'hex',
  'json',
  'yaml',
  'regex',
  'loop',
  'array',
  'hash',
  'map',
  'sort',
  'stack',
  'queue',
  'heap',
  'node',
  'tree',
  'hack',
  'root',
  'pwn',
  'pwned',
  'leet',
  '1337',
  'vuln',
  'xss',
  'sqli',
  'ddos',
  'proxy',
  'vpn',
  'tor',
  'port',
  'shell',
  'spoof',
  'sniff',
  'crack',
  'brute',
  'salt',
  'token',
  'admin',
  'login',
  'pass',
  'key',
  'rsa',
  'aes',
  'md5',
  'sha',
  'cron',
  'worm',
  'virus',
  'bomb',
  'patch',
  'ghost',
  'nmap',
  'ACK',
  'SYN',
  'NAT',
  'DNS',
  'ICMP',
  'TCP',
  'UDP',
  'HTTP',
  'GET',
  'POST',
  '404',
  '403',
  'git',
  'bash',
  'zsh',
  'sudo',
  'chmod',
  'grep',
  'sed',
  'awk',
  'curl',
  'wget',
  'ssh',
  'ping',
  'kill',
  'top',
  'cat',
  'echo',
  'pipe',
  'touch',
  'mkdir',
  'pwd',
  'tar',
  'diff',
  'push',
  'pull',
  'fetch',
  'merge',
  'clone',
  'stash',
  'blame',
  'fork',
  'HEAD',
  'init',
  'tag',
  'sync',
  'mount',
]
