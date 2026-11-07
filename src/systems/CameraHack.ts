import { CAMERA_POLE } from '../data/objectives';
import { CELL, type City, type Point } from './City';
import { distance, pickApart, tileSpots } from './CitySpots';
import { makePin, type KeyResult } from './Hack';

export type CameraStep = 'worm' | 'pin' | 'reveal' | 'done';

/**
 * Picks the camera poles' spots: on sidewalks, far from the start, clear of everything in `avoid` and at least
 * CAMERA_POLE.minSeparation from each other (if a map has no room for that, the farthest spot there is).
 */
export function pickPolePositions(city: City, avoid: Point[]): Point[] {
  const spots = tileSpots(city, [CELL.sidewalk]).filter((s) => distance(s, city.start) >= CAMERA_POLE.minDistFromStart);
  const poles: Point[] = [];
  for (let i = 0; i < CAMERA_POLE.count; i++) {
    const apart = poles.length === 0 ? spots : spots.filter((s) => poles.every((p) => distance(s, p) >= CAMERA_POLE.minSeparation));
    // No room for the separation: take the spot farthest from the poles already placed.
    const farthest = [...spots].sort((a, b) => Math.min(...poles.map((p) => distance(b, p))) - Math.min(...poles.map((p) => distance(a, p))))[0];
    poles.push(apart.length > 0 ? pickApart(apart, [...avoid, ...poles], CAMERA_POLE.minSpacing, city) : farthest);
  }
  return poles;
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
