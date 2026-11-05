import { decodeSaveCode, encodeSaveCode, readSave, writeSave } from './Save';

/** Account-wide progress that outlives a run (GAME_DESIGN section 9), kept in localStorage. */
let credits = readSave()?.credits ?? 0;

/** The stored total, which another tab may have raised since this one loaded. */
const latestCredits = () => readSave()?.credits ?? credits;

export const account = {
  /** Credits banked across all runs. */
  get credits() {
    return credits;
  },

  /**
   * Adds a finished run's credits to the total and saves. Called once per run, won or lost, and never during a run:
   * leaving mid-run forfeits that run's credits, so a run left idle can't be used to grind.
   */
  bankCredits(amount: number) {
    credits = latestCredits() + amount;
    writeSave({ credits });
  },

  /** A code the player can keep as a backup against wiped storage. */
  exportCode() {
    return encodeSaveCode({ credits: latestCredits() });
  },

  /** Replaces the account with the save in `code`. Returns false, changing nothing, if the code is not valid. */
  importCode(code: string) {
    const save = decodeSaveCode(code);
    if (!save) return false;
    credits = save.credits;
    writeSave(save);
    return true;
  },
};
