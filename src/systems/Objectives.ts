import Phaser from 'phaser';
import { ENCRYPTION_KEY, EXTRACTION, HACK, RUN_OBJECTIVES, type ObjectiveDef } from '../data/objectives';
import { Dossier } from '../entities/Dossier';
import type { Enemy } from '../entities/Enemy';
import { ExtractionPoint } from '../entities/ExtractionPoint';
import { HackServer } from '../entities/HackServer';
import type { Player } from '../entities/Player';
import { Hack } from './Hack';

export interface ObjectiveEntry {
  def: ObjectiveDef;
  /** Hack state; only for 'hackServer' objectives. */
  hack: Hack | null;
  server: HackServer | null;
  /** Only for 'encryptionKey' objectives, until picked up. */
  dossier: Dossier | null;
  /** The Goon guarding the dossier. Hunts the player for good once the dossier is taken. */
  goon: Enemy | null;
  done: boolean;
}

/**
 * Runs the objectives of a run. All of them are in the world from the start and can be done in
 * any order. Only the closest server in range is "engaged" (progresses and takes key input).
 * Objective types: "hack server" and "encryption key" (a Goon guards a dossier you walk onto).
 */
export class Objectives {
  readonly entries: ObjectiveEntry[] = RUN_OBJECTIVES.map((def) => ({
    def,
    hack: def.type === 'hackServer' ? new Hack() : null,
    server: null,
    dossier: null,
    goon: null,
    done: false,
  }));
  /** The server the player is currently hacking, or null. */
  private engaged: ObjectiveEntry | null = null;
  private scene: Phaser.Scene;
  /** Revealed after the last objective is done; null before that. */
  private extraction: ExtractionPoint | null = null;
  /** Characters of the log-out text typed so far. */
  private logoutTyped = 0;
  /** Once the log-out text is complete: ms left on the countdown. */
  private countdownMs = 0;
  private counting = false;

  constructor(
    scene: Phaser.Scene,
    private player: Player,
    /** Keys are ignored while this returns false (paused, level-up picker, game over). */
    private acceptingInput: () => boolean,
    private onExtracted: () => void,
    /** Puts a Goon at a guard post (the scene owns the enemy pool). */
    spawnGoon: (x: number, y: number) => Enemy | null,
  ) {
    this.scene = scene;
    for (const e of this.entries) {
      const { x, y } = e.def;
      if (e.def.type === 'hackServer') {
        e.server = new HackServer(scene, x, y);
      } else {
        e.dossier = new Dossier(scene, x, y);
        e.goon = spawnGoon(x +ENCRYPTION_KEY.goonOffset.x, y + ENCRYPTION_KEY.goonOffset.y);
      }
    }
    scene.input.keyboard!.on('keydown', this.onKey, this);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey, this));
  }

  get isComplete() {
    return this.entries.every((e) => e.done);
  }

  /** World position the compass points at: the closest unfinished objective, or the extraction point once all are done. */
  get target() {
    if (this.isComplete) return { x: EXTRACTION.x, y: EXTRACTION.y };
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
    return (this.engaged !== null && !!this.engaged.hack?.typing) || this.loggingOut;
  }

  /** True while the player stands on the extraction point and still has to type the log-out text. */
  private get loggingOut() {
    return this.extraction !== null && !this.counting && this.onExtraction();
  }

  private onExtraction() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, EXTRACTION.x, EXTRACTION.y) <= EXTRACTION.radius;
  }

  /** Call when the player took damage. */
  onPlayerHit() {
    this.engaged?.hack?.halt(HACK.damageHaltMs);
  }

  update(deltaMs: number) {
    // Keep the current server while still in range (so two overlapping rings don't flip-flop);
    // otherwise engage the closest one in range.
    if (!this.engaged || this.engaged.done || !this.inRange(this.engaged)) this.engaged = this.closestInRange();

    for (const e of this.entries) {
      if (e.done) continue;
      if (e.dossier) {
        const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.def.x, e.def.y) <= ENCRYPTION_KEY.pickupRadius;
        if (near) this.finish(e);
        continue;
      }
      if (!e.server || !e.hack) continue;
      const inRange = e === this.engaged;
      e.hack.update(deltaMs, inRange);
      e.server.render(e.hack, inRange);
      if (e.hack.complete) this.finish(e);
    }
    this.player.typingLock = this.typing;

    if (this.extraction) {
      if (!this.onExtraction()) {
        // Leaving the point cancels the log-out: the typing and the countdown start over.
        this.logoutTyped = 0;
        this.counting = false;
        this.countdownMs = 0;
      } else if (this.counting) {
        this.countdownMs -= deltaMs;
        if (this.countdownMs <= 0) this.onExtracted();
      }
      this.extraction.render(EXTRACTION.logoutText, this.logoutTyped, this.counting ? Math.ceil(this.countdownMs / 1000) : 0);
    }
  }

  private inRange(e: ObjectiveEntry) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, e.def.x, e.def.y) <= HACK.range;
  }

  private closestInRange() {
    let best: ObjectiveEntry | null = null;
    let bestDist = Infinity;
    for (const e of this.entries) {
      if (e.done || !e.hack || !this.inRange(e)) continue;
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
    e.dossier?.playCollected();
    e.dossier = null;
    // Taking the dossier from under his nose: if he's still alive he never gives up.
    if (e.goon?.active) e.goon.provoke();
    e.goon = null;
    if (this.engaged === e) {
      this.engaged = null;
      this.player.typingLock = false;
    }
    if (this.isComplete) this.extraction = new ExtractionPoint(this.scene);
  }

  private onKey(ev: KeyboardEvent) {
    if (this.loggingOut && !ev.repeat && this.acceptingInput()) {
      if (ev.key.length !== 1) return;
      if (ev.key !== EXTRACTION.logoutText[this.logoutTyped]) return this.extraction!.flashError();
      this.logoutTyped++;
      if (this.logoutTyped >= EXTRACTION.logoutText.length) {
        this.counting = true;
        this.countdownMs = EXTRACTION.countdownSeconds * 1000;
      }
      return;
    }
    const e = this.engaged;
    if (ev.repeat || !e?.server || !e.hack || !this.acceptingInput()) return;
    const result = e.hack.onKey(ev.key);
    if (result === 'wrong') e.server.flashError();
    else if (e.hack.prompt?.kind === 'smack' && result === 'ok') e.server.wriggle();
  }
}
