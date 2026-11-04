import { CONNECT_SERVERS } from '../data/objectives';

/**
 * State of one "connect servers" objective: grab the cable at server A, carry it to server B,
 * hold E there to attach it. Pure logic, no Phaser; CableServers draws it.
 */
export class Connect {
  /** True once the cable has been grabbed at server A. */
  grabbed = false;
  /** How long E has been held at server B (ms). */
  attachMs = 0;

  get progress() {
    return Math.min(1, this.attachMs / CONNECT_SERVERS.attachMs);
  }

  get complete() {
    return this.attachMs >= CONNECT_SERVERS.attachMs;
  }

  /** Taking damage resets the attach action (the cable stays in hand). */
  reset() {
    this.attachMs = 0;
  }

  /** After a drop: where the loose end lay and how far the cable has unwound back to server A (ms). */
  unwind: { x: number; y: number; ms: number } | null = null;

  /**
   * @param pressed E went down this frame
   * @param held E is currently down
   * @param nearA player is within grab range of server A
   * @param nearB player is within attach range of server B
   */
  update(deltaMs: number, pressed: boolean, held: boolean, nearA: boolean, nearB: boolean, playerX: number, playerY: number) {
    if (this.unwind) {
      this.unwind.ms += deltaMs;
      if (this.unwind.ms >= CONNECT_SERVERS.unwindMs) this.unwind = null;
    }
    if (!this.grabbed) {
      if (pressed && nearA) {
        this.grabbed = true;
        this.unwind = null;
      }
      return;
    }
    // E away from server B drops the cable; it winds back to server A.
    if (pressed && !nearB) {
      this.grabbed = false;
      this.attachMs = 0;
      this.unwind = { x: playerX, y: playerY, ms: 0 };
      return;
    }
    if (held && nearB) this.attachMs += deltaMs;
    else this.attachMs = 0;
  }
}
