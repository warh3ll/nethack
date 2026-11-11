/**
 * What is stored between sessions (GAME_DESIGN section 9): localStorage, plus a save code the player can keep
 * as a backup. Storage can be blocked or wiped, so nothing here throws; callers just get null or false.
 */

/** Distinctive on purpose: every game on itch.io shares one origin, and so does everything on github.io. */
const STORAGE_KEY = 'nethack-survivors.save';
/** Version 1 held only credits; it still loads, with nothing installed. */
const SAVE_VERSION = 2;
/** Unchanged from version 1, so old codes still import. The version inside the code tells them apart. */
const CODE_PREFIX = 'NH1';

export interface SaveData {
  credits: number;
  /** Cyberware ids bought at the ripdoc. */
  installed: string[];
  /** Cyberware ids whose blueprint has been found (and so can be bought). */
  blueprints: string[];
}

const serialize = (save: SaveData) => JSON.stringify({ version: SAVE_VERSION, ...save });

function parseSave(json: string): SaveData | null {
  try {
    const data = JSON.parse(json) as { version?: unknown; credits?: unknown; installed?: unknown; blueprints?: unknown } | null;
    if (data?.version !== 1 && data?.version !== SAVE_VERSION) return null;
    const { credits } = data;
    if (typeof credits !== 'number' || !Number.isSafeInteger(credits) || credits < 0) return null;
    if (data.version === 1) return { credits, installed: [], blueprints: [] };
    const installed = idList(data.installed);
    const blueprints = idList(data.blueprints);
    if (!installed || !blueprints) return null;
    return { credits, installed, blueprints };
  } catch {
    return null;
  }
}

/**
 * A list of ids, or null if it isn't one. Ids the game doesn't know are kept (a newer build may have written them);
 * the account ignores them.
 */
function idList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) return null;
  return [...new Set(value as string[])];
}

/** The stored save, or null if there is none, it is unreadable, or storage is blocked. */
export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : parseSave(raw);
  } catch {
    return null;
  }
}

/** Returns false if storage is blocked or full; the game keeps running on what it has in memory. */
export function writeSave(save: SaveData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(save));
    return true;
  } catch {
    return false;
  }
}

/** FNV-1a. Catches a mistyped or cut-off code and casual edits; it is not meant to stop a determined cheat. */
function checksum(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function encodeSaveCode(save: SaveData) {
  const body = btoa(serialize(save));
  return `${CODE_PREFIX}.${body}.${checksum(body)}`;
}

/** The save inside a code, or null if the code is damaged or not one of ours. */
export function decodeSaveCode(code: string): SaveData | null {
  const [prefix, body, sum, ...extra] = code.trim().split('.');
  if (prefix !== CODE_PREFIX || !body || sum !== checksum(body) || extra.length > 0) return null;
  try {
    return parseSave(atob(body));
  } catch {
    return null;
  }
}
