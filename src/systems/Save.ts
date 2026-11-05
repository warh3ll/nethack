/**
 * What is stored between sessions (GAME_DESIGN section 9): localStorage, plus a save code the player can keep
 * as a backup. Storage can be blocked or wiped, so nothing here throws; callers just get null or false.
 */

/** Distinctive on purpose: every game on itch.io shares one origin, and so does everything on github.io. */
const STORAGE_KEY = 'nethack-survivors.save';
const SAVE_VERSION = 1;
const CODE_PREFIX = 'NH1';

export interface SaveData {
  credits: number;
}

const serialize = (save: SaveData) => JSON.stringify({ version: SAVE_VERSION, ...save });

function parseSave(json: string): SaveData | null {
  try {
    const data = JSON.parse(json) as { version?: unknown; credits?: unknown } | null;
    if (data?.version !== SAVE_VERSION) return null;
    const { credits } = data;
    if (typeof credits !== 'number' || !Number.isSafeInteger(credits) || credits < 0) return null;
    return { credits };
  } catch {
    return null;
  }
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
