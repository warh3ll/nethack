import { MAP } from '../data/balance';
import { CAMERA_POLE } from '../data/objectives';
import { makePin, type KeyResult } from './Hack';

export type CameraStep = 'worm' | 'pin' | 'reveal' | 'done';

/** Picks the camera pole's spot: far from the start, inside the edge margin, and clear of everything in `avoid`. */
export function pickPolePosition(avoid: { x: number; y: number }[]): { x: number; y: number } {
  const limit = MAP.size / 2 - CAMERA_POLE.edgeMargin;
  // Corner fallback: only used if no try lands far enough from the start, which a map this size won't do.
  let best = { x: limit, y: limit };
  let bestGap = -1;
  // Retry until the spacing rule holds; if the map is too crowded, keep the roomiest try.
  for (let tries = 0; tries < 200; tries++) {
    const x = (Math.random() * 2 - 1) * limit;
    const y = (Math.random() * 2 - 1) * limit;
    if (Math.hypot(x, y) < CAMERA_POLE.minDistFromStart) continue;
    const gap = Math.min(...avoid.map((p) => Math.hypot(x - p.x, y - p.y)));
    if (gap > bestGap) {
      best = { x, y };
      bestGap = gap;
    }
    if (gap >= CAMERA_POLE.minSpacing) break;
  }
  return best;
}

/**
 * State of the camera pole hack: hold E to insert the worm, enter the PIN, type the reveal word.
 * Pure logic, no Phaser: the caller feeds it time and keys. Finished steps stay finished, so walking
 * away only pauses it. Letting go of E, leaving range or taking damage restarts the hold.
 */
export class CameraHack {
  step: CameraStep = 'worm';
  /** How long E has been held for the worm (ms). */
  holdMs = 0;
  /** Characters of the current text typed so far. */
  typed = 0;
  private pin = makePin();

  /** What to type at this step. Empty when nothing needs typing. */
  get text() {
    if (this.step === 'pin') return this.pin;
    return this.step === 'reveal' ? CAMERA_POLE.revealText : '';
  }

  /** 0..1, how far the worm hold has come. */
  get holdProgress() {
    return Math.min(1, this.holdMs / CAMERA_POLE.holdMs);
  }

  get typing() {
    return this.step === 'pin' || this.step === 'reveal';
  }

  /** True once the player has actually begun the hack, rather than just walking past. */
  get started() {
    return this.holdMs > 0 || this.typing;
  }

  get done() {
    return this.step === 'done';
  }

  /** Taking damage restarts the hold. Typed steps are not affected. */
  resetHold() {
    this.holdMs = 0;
  }

  update(deltaMs: number, held: boolean, inRange: boolean) {
    if (this.step !== 'worm') return;
    this.holdMs = held && inRange ? this.holdMs + deltaMs : 0;
    if (this.holdMs >= CAMERA_POLE.holdMs) {
      this.holdMs = 0;
      this.step = 'pin';
    }
  }

  /** `key` is KeyboardEvent.key. Case-sensitive; a wrong key is just ignored (and reported). */
  onKey(key: string): KeyResult {
    if (!this.typing || key.length !== 1) return 'ignored';
    if (key !== this.text[this.typed]) return 'wrong';
    this.typed++;
    if (this.typed < this.text.length) return 'ok';
    this.typed = 0;
    this.step = this.step === 'pin' ? 'reveal' : 'done';
    return 'done';
  }
}
