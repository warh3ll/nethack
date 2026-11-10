import { HACK, INJECT_WORDS, PASSWORD_ADJECTIVES, PASSWORD_NOUNS } from '../data/objectives';

export type PromptKind = 'ip' | 'password' | 'smack' | 'inject' | 'pin';
export type KeyResult = 'ignored' | 'ok' | 'wrong' | 'done';

export interface Prompt {
  kind: PromptKind;
  /** What to type. Empty for smack. */
  text: string;
  /** Characters typed correctly so far. */
  typed: number;
  hits: number;
  hitsNeeded: number;
}

/** General interact key (lowercase KeyboardEvent.key). Used by smack now, cables later. */
export const INTERACT_KEY = 'e';

const KINDS: PromptKind[] =['ip', 'password', 'smack', 'inject', 'pin'];

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(arr: ArrayLike<T>) => arr[Math.floor(Math.random() * arr.length)];

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The words of a prompt text, for word tiles: "neon-falcon" -> neon, falcon; "sudo grep" -> sudo, grep. */
export function promptWords(text: string) {
  return text.split(/[ -]/).filter((w) => w.length > 0);
}

/**
 * Picking a whole word instead of typing it (touch word tiles). If `word` is the next word of `text` after `typed`
 * characters, returns the new typed count (past the separator that follows it); otherwise -1.
 */
export function matchWord(text: string, typed: number, word: string) {
  if (!text.startsWith(word, typed)) return -1;
  const end = typed + word.length;
  if (end === text.length) return end;
  return text[end] === ' ' || text[end] === '-' ? end + 1 : -1;
}

/** `count` decoy words from `pool` (none equal to a correct word), mixed in with the correct ones in random order. */
export function wordTiles(correct: string[], pool: readonly string[], count: number) {
  const decoys = shuffled(pool.filter((w) => !correct.includes(w))).slice(0, Math.max(0, count - correct.length));
  return shuffled([...correct, ...decoys]);
}

/** A random PIN code, as typed in prompts. */
export function makePin() {
  return Array.from({ length: HACK.pinLength }, () => randInt(0, 9)).join('');
}

function makePrompt(kind: PromptKind): Prompt {
  const prompt: Prompt = { kind, text: '', typed: 0, hits: 0, hitsNeeded: 0 };
  switch (kind) {
    case 'ip':
      prompt.text = Array.from({ length: 4 }, () => randInt(0, 255)).join('.');
      break;
    case 'pin':
      prompt.text = makePin();
      break;
    case 'password':
      prompt.text = `${pick(PASSWORD_ADJECTIVES)}-${pick(PASSWORD_NOUNS)}`;
      break;
    case 'inject':
      prompt.text = shuffled(INJECT_WORDS)
        .slice(0, randInt(HACK.injectWordCount.min, HACK.injectWordCount.max))
        .join(' ');
      break;
    case 'smack':
      prompt.hitsNeeded = randInt(HACK.smackHits.min, HACK.smackHits.max);
      break;
  }
  return prompt;
}

/**
 * State of one server hack. Pure logic, no Phaser: the caller feeds it time and keys.
 * Progress fills while the player is in range; at a few points along the bar a prompt
 * appears and progress is halted until it is completed.
 */
export class Hack {
  /** 0..1 */
  progress = 0;
  prompt: Prompt | null = null;
  complete = false;
  private haltMs = 0;
  /** Prompts still to come, with the progress at which each one appears. */
  private upcoming: { at: number; kind: PromptKind }[];

  constructor() {
    const count = randInt(HACK.promptCount.min, HACK.promptCount.max);
    // Each prompt kind at most once per hack.
    this.upcoming = shuffled(KINDS)
      .slice(0, count)
      .map((kind, i) => ({ at: (i + 1) / (count + 1), kind }));
  }

  /** True while taking damage has paused the progress. */
  get damaged() {
    return this.haltMs > 0;
  }

  /** True while a prompt that needs typing is up (smack only needs the interact key). */
  get typing() {
    return this.prompt !== null && this.prompt.kind !== 'smack';
  }

  /** Damage taken by the player: pause the progress briefly. */
  halt(ms: number) {
    this.haltMs = Math.max(this.haltMs, ms);
  }

  update(deltaMs: number, inRange: boolean) {
    if (this.complete) return;
    this.haltMs = Math.max(0, this.haltMs - deltaMs);

    if (!inRange) {
      this.progress = Math.max(0, this.progress - (HACK.decayPerSecond * deltaMs) / 1000);
      return;
    }
    if (this.prompt || this.haltMs > 0) return;

    this.progress = Math.min(1, this.progress + deltaMs / HACK.durationMs);
    const next = this.upcoming[0];
    if (next && this.progress >= next.at) {
      this.progress = next.at;
      this.prompt = makePrompt(next.kind);
      this.upcoming.shift();
    } else if (this.progress >= 1) {
      this.complete = true;
    }
  }

  /** `key` is KeyboardEvent.key. Typing is case-sensitive; a wrong key is ignored (and reported). */
  onKey(key: string): KeyResult {
    const p = this.prompt;
    if (!p) return 'ignored';

    if (p.kind === 'smack') {
      if (key.toLowerCase() !== INTERACT_KEY) return 'ignored';
      p.hits++;
      if (p.hits < p.hitsNeeded) return 'ok';
    } else {
      if (key.length !== 1) return 'ignored'; // Shift, arrows, etc.
      const expected = p.text[p.typed];
      if (p.kind === 'ip' && expected === '.') {
        // Lenient dots: '.', ',' or space all count, and so does just typing the next digit.
        if (key === '.' || key === ',' || key === ' ') p.typed++;
        else if (key === p.text[p.typed + 1]) p.typed += 2;
        else return 'wrong';
      } else {
        if (key !== expected) return 'wrong';
        p.typed++;
      }
      if (p.typed < p.text.length) return 'ok';
    }
    this.prompt = null;
    return 'done';
  }

  /** A word picked from the touch word tiles (Password and Inject). Wrong or out of order: nothing is added. */
  onWord(word: string): KeyResult {
    const p = this.prompt;
    if (!p || (p.kind !== 'password' && p.kind !== 'inject')) return 'ignored';
    const typed = matchWord(p.text, p.typed, word);
    if (typed < 0) return 'wrong';
    p.typed = typed;
    if (p.typed < p.text.length) return 'ok';
    this.prompt = null;
    return 'done';
  }
}
