import { CONNECT_SERVERS } from '../data/objectives';

/**
 * State of one "connect servers" objective: grab the cable at either server, carry it to the other,
 * hold E there to attach it. Pure logic, no Phaser; CableServers draws it.
 */
export class Connect {
  /** True once the cable has been grabbed at either server. */
  grabbed = false;
  /** Which server the cable is attached to while grabbed; the other one is the target. */
  from: 'a' | 'b' = 'a';
  /** How long E has been held at the target server (ms). */
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

  /** After a drop: where the loose end lay and how far the cable has unwound back to the server it came from (ms). */
  unwind: { x: number; y: number; ms: number; from: 'a' | 'b' } | null = null;

  /**
   * @param pressed E went down this frame
   * @param held E is currently down
   * @param nearA player is within grab range of server A (either server can be the start)
   * @param nearB player is within grab range of server B
   */
  update(deltaMs: number, pressed: boolean, held: boolean, nearA: boolean, nearB: boolean, playerX: number, playerY: number) {
    if (this.unwind) {
      this.unwind.ms += deltaMs;
      if (this.unwind.ms >= CONNECT_SERVERS.unwindMs) this.unwind = null;
    }
    if (!this.grabbed) {
      if (pressed && (nearA || nearB)) {
        this.grabbed = true;
        this.from = nearA ? 'a' : 'b';
        this.unwind = null;
      }
      return;
    }
    const nearTarget = this.from === 'a' ? nearB : nearA;
    // E away from the target server drops the cable; it winds back to where it came from.
    if (pressed && !nearTarget) {
      this.grabbed = false;
      this.attachMs = 0;
      this.unwind = { x: playerX, y: playerY, ms: 0, from: this.from };
      return;
    }
    if (held && nearTarget) this.attachMs += deltaMs;
    else this.attachMs = 0;
  }
}
