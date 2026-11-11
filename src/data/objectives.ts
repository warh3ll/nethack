// ─────────────────────────────────────────────────────────────
// OBJECTIVES + HACKING: tweak numbers here, no game logic lives in this file.
// Distances are in pixels, times in milliseconds.
// ─────────────────────────────────────────────────────────────

export interface ObjectiveDef {
  id: string
  type: 'hackServer' | 'encryptionKey' | 'connectServers' | 'stealSecrets' | 'destroyFactories'
  /** Shown in the objective list (top right). Keep it short, the panel is narrow. */
  name: string
  /** World position. For connectServers this is the first server, for stealSecrets the middle of the compound. */
  x: number
  y: number
  /** The second server of connectServers. */
  partner?: { x: number; y: number }
  /** Only for destroyFactories: how many factories have to go down. It has no spot of its own (x and y are unused). */
  total?: number
}

/**
 * Which objectives a run gets: 3-5 drawn at random, completable in any order.
 * Servers (hackServer, connectServers) stand on the sidewalk in front of a building. The rest go on plazas.
 */
export const RUN_GENERATION = {
  count: { min: 4, max: 5 },
  /** The same objective type can occur at most this many times in one run. */
  maxPerType: 2,
  /** Types every run must contain at least once (hacking is the core of the game). */
  required: ['hackServer'] as ObjectiveDef['type'][],
  /** Every run has exactly one Destroy factories objective, on top of the drawn ones (it counts towards the 4-5). */
  /** Types left out of the draw for now. Their code stays in the game; remove a type from this list to bring it back. */
  disabled: ['stealSecrets'] as ObjectiveDef['type'][],
  /** Name in the objective list; a " 1" / " 2" is added when a type occurs twice. */
  names: {
    hackServer: 'Hack server',
    encryptionKey: 'Grab encryption key',
    connectServers: 'Connect servers',
    stealSecrets: 'Steal secrets',
    destroyFactories: 'Destroy factories',
  } as Record<ObjectiveDef['type'], string>,
  /** No objective this close to the start (which is also the extraction point). */
  minDistFromStart: 900,
  /** One objective per run is placed within this distance of the start, so the first walk stays short. */
  firstObjectiveMaxDist: 2500,
  /** No two objectives closer than this. */
  minSpacing: 1300,
}

/** Destroy factories objective: any factories count, however the player gets to them. */
export const DESTROY_FACTORIES = {
  /** How many factories have to go down, picked at random per run. */
  count: { min: 2, max: 3 },
}

/** Steal secrets objective: destroy every outpost (they spawn drones while the player is near), then pick up the secrets. */
export const STEAL_SECRETS = {
  /** Outposts per objective, picked at random. */
  outposts: { min: 2, max: 3 },
  /** Outposts stand on a circle of this radius around the objective position. */
  ringRadius: 170,
  /** Each outpost beyond the minimum count takes this much hp off every outpost (see ENEMIES.outpost.hp). */
  hpLossPerExtra: 10,
  /** An outpost spawns drones only while the player is within this distance of it. */
  spawnTriggerRadius: 650,
  /** Time between drones from one outpost. */
  spawnIntervalMs: 4000,
  /** The player picks up the secrets within this distance. */
  pickupRadius: 36,
}

/** Connect servers objective: grab a cable (E) at the first server, hold E at the other to attach it (start at either). */
export const CONNECT_SERVERS = {
  /** The two servers stand this far apart, along the same building front. */
  gap: { min: 500, max: 800 },
  /** Press E within this distance of either server to grab the cable. */
  grabRadius: 60,
  /** Hold E within this distance of the other server to attach it. */
  attachRadius: 60,
  /** How long E must be held. Taking damage resets it. */
  attachMs: 2500,
  /** With the cable in hand the player can't get farther than this from the server it is attached to (they can still circle it). */
  maxCableLength: 1000,
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

/** The extraction point: the subway station on the exit plaza. Opens once the last objective is done. */
export const EXTRACTION = {
  /** The player must stay inside this radius for the whole countdown; leaving cancels it and it starts over. */
  radius: 100,
  /** Seconds of countdown from stepping into the ring, then the run is won. */
  countdownSeconds: 5,
}

/** Camera poles: an optional hack that unlocks the minimap for the rest of the run. Hacking either one does it. Found by exploring. */
export const CAMERA_POLE = {
  /** Poles per run, at least `minSeparation` apart from each other, so one is never far off. */
  count: 2,
  minSeparation: 4000,
  /** No pole this close to the start. */
  minDistFromStart: 2000,
  /** Keeps clear of objectives and caches, so E and typing can't mean two things at once. Has to stay above HACK.range + range. */
  minSpacing: 500,
  /** The player must be within this distance for the hack to run. Walking out pauses it. */
  range: 120,
  /** How long E must be held to insert the worm. Taking damage restarts it. */
  holdMs: 2000,
  /** Pause after the worm is in, and again after the PIN, before the next prompt opens (only runs in range; hack-speed cyberware shortens it). */
  stepDelayMs: 5000,
  /** What to type in the last step (case-sensitive, mistypes just get retyped). The PIN length is HACK.pinLength. */
  revealText: 'reveal',
  /** Shown above a pole that hasn't been touched yet, so it reads as something to do. */
  hintText: 'HACK TO REVEAL MAP',
}

/** The server sprite (public/assets/server/server.png: 2 frames of 64x64), shared by Hack server and Connect servers. */
export const SERVER = {
  spriteScale: 1,
  /** Frame size in pixels, before scaling. */
  frameSize: 64,
  /** Animation speed in frames per second. */
  animFps: 2,
}

export const HACK = {
  /** The player must stay within this distance of the server for the hack to progress. */
  range: 250,
  /** While the player is in range, the zone's background colour pulses between these opacities (0 to 1), one cycle per `zonePulseMs`. */
  zoneAlphaMin: 0.05,
  zoneAlphaMax: 0.16,
  zonePulseMs: 1200,
  /** Time the hack takes with no interruptions, from 0% to 100%. Prompts and damage add to this. */
  durationMs: 17000,
  /** Progress lost per second (fraction of the whole bar) while the player is out of range. */
  decayPerSecond: 0.01,
  /** Taking damage halts the progress for this long. */
  damageHaltMs: 200,
  /** While a hack is running (player in range), enemies spawn this much faster (interval x this). */
  spawnIntervalMultiplier: 0.5,
  /** Game speed while a prompt is being typed (1 = normal, 0.3 = 30%). Everything but the hack itself slows. */
  typingTimeScale: 0.3,
  /** Prompts per hack. They are spread evenly along the bar. */
  promptCount: { min: 3, max: 4 },
  smackHits: { min: 8, max: 12 },
  injectWordCount: { min: 2, max: 3 },
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
  'nat',
  'dns',
  'icmp',
  'tcp',
  'udp',
  'http',
  'get',
  'post',
  '404',
  '403',
  'git',
  'bash',
  'zsh',
  'sudo',
  'chmod',
  'grep',
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
  'head',
  'init',
  'tag',
  'sync',
  'mount',
]
