import Phaser from 'phaser';
import { HACK, RUN_OBJECTIVES, type ObjectiveDef } from '../data/objectives';
import { HackServer } from '../entities/HackServer';
import type { Player } from '../entities/Player';
import { Hack } from './Hack';

export interface ObjectiveEntry {
  def: ObjectiveDef;
  hack: Hack;
  server: HackServer | null;
  done: boolean;
}

/**
 * Runs the objectives of a run. All of them are in the world from the start and can be done in
 * any order. Only the closest server in range is "engaged" (progresses and takes key input).
 * Right now the only objective type is "hack server".
 */
export class Objectives {
  readonly entries: ObjectiveEntry[] = RUN_OBJECTIVES.map((def) => ({
    def,
    hack: new Hack(),
    server: null,
    done: false,
  }));
  /** The server the player is currently hacking, or null. */
  private engaged: ObjectiveEntry | null = null;

  constructor(
    scene: Phaser.Scene,
    private player: Player,
    /** Keys are ignored while this returns false (paused, level-up picker, game over). */
    private acceptingInput: () => boolean,
    private onAllDone: () => void,
  ) {
    for (const e of this.entries) e.server = new HackServer(scene, e.def.x, e.def.y);
    scene.input.keyboard!.on('keydown', this.onKey, this);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey, this));
  }

  get isComplete() {
    return this.entries.every((e) => e.done);
  }

  /** World position of the closest unfinished objective to the player, or null when the run is complete. */
  get target() {
    let best: ObjectiveEntry | null = null;
    let bestDist = Infinity;
    for (const e of this.entries) {
      if (e.done) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.def.x, e.def.y);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best ? { x: best.def.x, y: best.def.y } : null;
  }

  /** The objective being hacked right now, or null. */
  get current() {
    return this.engaged;
  }

  /** True while the player is hacking: in range of a server with the hack still running. */
  get hacking() {
    return this.engaged !== null;
  }

  /** True while typed letters belong to a prompt (so P must not pause, WASD must not move). */
  get typing() {
    return this.engaged !== null && this.engaged.hack.typing;
  }

  /** Call when the player took damage. */
  onPlayerHit() {
    this.engaged?.hack.halt(HACK.damageHaltMs);
  }

  update(deltaMs: number) {
    // Keep the current server while still in range (so two overlapping rings don't flip-flop);
    // otherwise engage the closest one in range.
    if (!this.engaged || this.engaged.done || !this.inRange(this.engaged)) this.engaged = this.closestInRange();

    for (const e of this.entries) {
      if (e.done || !e.server) continue;
      const inRange = e === this.engaged;
      e.hack.update(deltaMs, inRange);
      e.server.render(e.hack, inRange);
      if (e.hack.complete) this.finish(e);
    }
    this.player.typingLock = this.typing;
  }

  private inRange(e: ObjectiveEntry) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, e.def.x, e.def.y) <= HACK.range;
  }

  private closestInRange() {
    let best: ObjectiveEntry | null = null;
    let bestDist = Infinity;
    for (const e of this.entries) {
      if (e.done || !this.inRange(e)) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.def.x, e.def.y);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  private finish(e: ObjectiveEntry) {
    e.done = true;
    e.server?.playHacked();
    e.server = null;
    if (this.engaged === e) {
      this.engaged = null;
      this.player.typingLock = false;
    }
    if (this.isComplete) this.onAllDone();
  }

  private onKey(ev: KeyboardEvent) {
    const e = this.engaged;
    if (ev.repeat || !e?.server || !this.acceptingInput()) return;
    const result = e.hack.onKey(ev.key);
    if (result === 'wrong') e.server.flashError();
    else if (e.hack.prompt?.kind === 'smack' && result === 'ok') e.server.wriggle();
  }
}
