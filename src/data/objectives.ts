// ─────────────────────────────────────────────────────────────
// OBJECTIVES + HACKING: tweak numbers here, no game logic lives in this file.
// Distances are in pixels, times in milliseconds.
// ─────────────────────────────────────────────────────────────

export interface ObjectiveDef {
  id: string
  type: 'hackServer'
  /** Shown in the objective list (top right). Keep it short, the panel is narrow. */
  name: string
  /** World position, relative to the player's start (0, 0). */
  x: number
  y: number
}

/** The objectives of one run, completed in this order. Placeholder positions until the map exists. */
export const RUN_OBJECTIVES: ObjectiveDef[] = [
  { id: 'hack1', type: 'hackServer', name: 'Hack server 1', x: 700, y: -450 },
  { id: 'hack2', type: 'hackServer', name: 'Hack server 2', x: -1100, y: -900 },
  { id: 'hack3', type: 'hackServer', name: 'Hack server 3', x: 1500, y: 900 },
]

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
  /** Prompts per hack. They are spread evenly along the bar. */
  promptCount: { min: 2, max: 3 },
  smackHits: { min: 8, max: 15 },
  passwordLength: { min: 6, max: 12 },
  passwordMaxSpecials: 2,
  injectWordCount: { min: 2, max: 4 },
}

/**
 * Password characters. Lookalikes (0/O, 1/l/I) are left out so a prompt is never ambiguous to read.
 * The password never has more than HACK.passwordMaxSpecials of the special characters.
 */
export const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
export const PASSWORD_SPECIALS = '!?-$#@&'

export const INJECT_WORDS = [
  'else', 'for', 'while', 'void', 'null', 'nil', 'int', 'char', 'bool', 'true', 'false', 'var', 'let', 'const',
  'func', 'def', 'async', 'await', 'yield', 'try', 'catch', 'throw', 'break', 'eval', 'exec', 'main', 'self',
  'this', 'new', 'enum', 'byte', 'bit', 'hex', 'json', 'yaml', 'regex', 'loop', 'array', 'hash', 'map', 'sort',
  'stack', 'queue', 'heap', 'node', 'tree', 'hack', 'root', 'pwn', 'pwned', 'leet', '1337', 'vuln', 'xss', 'sqli',
  'ddos', 'proxy', 'vpn', 'tor', 'port', 'shell', 'spoof', 'sniff', 'crack', 'brute', 'salt', 'token', 'admin',
  'login', 'pass', 'key', 'rsa', 'aes', 'md5', 'sha', 'cron', 'worm', 'virus', 'bomb', 'patch', 'ghost', 'nmap',
  'ACK', 'SYN', 'NAT', 'DNS', 'ICMP', 'TCP', 'UDP', 'HTTP', 'GET', 'POST', '404', '403', 'git', 'bash', 'zsh',
  'sudo', 'chmod', 'grep', 'sed', 'awk', 'curl', 'wget', 'ssh', 'ping', 'kill', 'top', 'cat', 'echo', 'pipe',
  'touch', 'mkdir', 'pwd', 'tar', 'diff', 'push', 'pull', 'fetch', 'merge', 'clone', 'stash', 'blame', 'fork',
  'HEAD', 'init', 'tag', 'sync', 'mount',
]
