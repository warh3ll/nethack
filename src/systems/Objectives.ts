import Phaser from 'phaser';
import { HACK, RUN_OBJECTIVES } from '../data/objectives';
import { HackServer } from '../entities/HackServer';
import type { Player } from '../entities/Player';
import { Hack } from './Hack';

/**
 * Runs the objectives of a run in order. Only the current objective has a server in the world.
 * Right now the only objective type is "hack server".
 */
export class Objectives {
  /** Index of the current objective; equals the total when the run is complete. */
  index = 0;
  readonly total = RUN_OBJECTIVES.length;
  private hack: Hack | null = null;
  private server: HackServer | null = null;
  private inRange = false;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    /** Keys are ignored while this returns false (paused, level-up picker, game over). */
    private acceptingInput: () => boolean,
    private onAllDone: () => void,
  ) {
    this.startCurrent();
    scene.input.keyboard!.on('keydown', this.onKey, this);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey, this));
  }

  get isComplete() {
    return this.index >= this.total;
  }

  /** World position of the current objective, or null when the run is complete. */
  get target() {
    return this.server ? { x: this.server.x, y: this.server.y } : null;
  }

  /** 0..1 progress of the current objective. */
  get progress() {
    return this.hack?.progress ?? 0;
  }

  /** True while the player is hacking: in range of the server with the hack still running. */
  get hacking() {
    return this.hack !== null && this.inRange;
  }

  /** True while typed letters belong to a prompt (so P must not pause, WASD must not move). */
  get typing() {
    return this.hacking && this.hack!.typing;
  }

  /** Call when the player took damage. */
  onPlayerHit() {
    this.hack?.halt(HACK.damageHaltMs);
  }

  update(deltaMs: number) {
    const { hack, server } = this;
    if (!hack || !server) return;

    this.inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, server.x, server.y) <= HACK.range;
    hack.update(deltaMs, this.inRange);
    this.player.typingLock = this.typing;
    server.render(hack, this.inRange);
    if (hack.complete) this.finishCurrent();
  }

  private startCurrent() {
    const def = RUN_OBJECTIVES[this.index];
    this.hack = new Hack();
    this.server = new HackServer(this.scene, def.x, def.y);
    this.inRange = false;
  }

  private finishCurrent() {
    this.server?.playHacked();
    this.server = null;
    this.hack = null;
    this.inRange = false;
    this.player.typingLock = false;
    this.index++;
    if (this.isComplete) this.onAllDone();
    else this.startCurrent();
  }

  private onKey(e: KeyboardEvent) {
    if (e.repeat || !this.hack || !this.server || !this.inRange || !this.acceptingInput()) return;
    const result = this.hack.onKey(e.key);
    if (result === 'wrong') this.server.flashError();
    else if (this.hack.prompt?.kind === 'smack' && result === 'ok') this.server.wriggle();
  }
}
