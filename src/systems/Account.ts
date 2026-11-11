import { CYBERWARE, isCyberwareId } from '../data/cyberware';
import { decodeSaveCode, encodeSaveCode, readSave, writeSave, type SaveData } from './Save';

/** Account-wide progress that outlives a run (GAME_DESIGN section 9), kept in localStorage. */
const empty = (): SaveData => ({ credits: 0, installed: [], blueprints: [] });
let save: SaveData = readSave() ?? empty();

/** The stored save, which another tab may have changed since this one loaded. Every change starts from it. */
const latest = () => (save = readSave() ?? save);

/** Why a purchase didn't happen, or 'ok'. */
export type BuyResult = 'ok' | 'owned' | 'locked' | 'poor' | 'unknown';

export const account = {
  /** Credits banked across all runs. */
  get credits() {
    return save.credits;
  },

  /** Installed cyberware ids the game knows, in the order they were bought. */
  get installed(): string[] {
    return save.installed.filter(isCyberwareId);
  },

  isInstalled(id: string) {
    return save.installed.includes(id);
  },

  /** Shop pieces are always available; blueprint pieces only once their blueprint has been found. */
  isAvailable(id: string) {
    return isCyberwareId(id) && (CYBERWARE[id].source === 'shop' || save.blueprints.includes(id));
  },

  /** Spends the credits and installs the piece. Changes nothing unless it returns 'ok'. */
  buy(id: string): BuyResult {
    if (!isCyberwareId(id)) return 'unknown';
    const s = latest();
    if (s.installed.includes(id)) return 'owned';
    if (!this.isAvailable(id)) return 'locked';
    const { cost } = CYBERWARE[id];
    if (s.credits < cost) return 'poor';
    save = { ...s, credits: s.credits - cost, installed: [...s.installed, id] };
    writeSave(save);
    return 'ok';
  },

  /**
   * Adds a finished run's credits and blueprints to the account and saves. Called once per run, won or lost, and
   * never during a run: leaving mid-run forfeits what the run found, so a run left idle can't be used to grind.
   */
  bankRun(credits: number, blueprints: string[] = []) {
    const s = latest();
    save = { ...s, credits: s.credits + credits, blueprints: [...new Set([...s.blueprints, ...blueprints])] };
    writeSave(save);
  },

  /** A code the player can keep as a backup against wiped storage. */
  exportCode() {
    return encodeSaveCode(latest());
  },

  /** Replaces the account with the save in `code`. Returns false, changing nothing, if the code is not valid. */
  importCode(code: string) {
    const decoded = decodeSaveCode(code);
    if (!decoded) return false;
    save = decoded;
    writeSave(save);
    return true;
  },
};
