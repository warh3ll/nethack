/**
 * Account-wide progress that outlives a run (GAME_DESIGN section 9).
 * Held in memory for now: it survives a new run but not a page reload, until saving lands (PLAN package D).
 */
let credits = 0;

export const account = {
  /** Credits banked across all runs. */
  get credits() {
    return credits;
  },

  /** Adds a finished run's credits to the total. Called once per run, won or lost. */
  bankCredits(amount: number) {
    credits += amount;
  },
};
