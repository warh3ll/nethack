import Phaser from 'phaser';
import { ATMS } from '../data/balance';
import { Atm, type AtmPhase } from '../entities/Atm';
import { type City, type Point } from './City';
import { distance, pickApart, serverSpots } from './CitySpots';

/**
 * Picks the ATM positions of one run: on the sidewalk against a building's south wall (the same spots servers use),
 * clear of everything in `avoid` (objectives, caches, poles, start and exit), of the spawn `doors` and of each other.
 */
export function pickAtmPositions(city: City, avoid: Point[], doors: Point[]): Point[] {
  const count = city.between(ATMS.count.min, ATMS.count.max);
  const spots = serverSpots(city).filter((s) => distance(s, city.start) >= ATMS.minDistFromStart && avoid.every((p) => distance(s, p) >= ATMS.clearance) && doors.every((p) => distance(s, p) >= ATMS.doorClearance));
  const placed: Point[] = [];
  for (let i = 0; i < count && spots.length > 0; i++) placed.push(pickApart(spots, placed, ATMS.minSpacing, city));
  return placed;
}

interface AtmState {
  atm: Atm;
  phase: AtmPhase;
  /** Decryption: how long E has been held (ms). */
  holdMs: number;
  /** Channeling: time spent so far and time since the last credit (ms), and how many waves have been sent. */
  channelMs: number;
  creditMs: number;
  wavesSent: number;
}

/**
 * The ATMs: hold E in the ring to decrypt, then stay in the ring to channel credits while goons come.
 * Leaving the ring while channeling, or running the clock out, switches that ATM off for good.
 * Time is fed in by the caller (game time, so it slows with the rest of the world while a hack prompt is typed).
 */
export class Atms {
  private states: AtmState[];
  private eKey: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    private player: { x: number; y: number },
    positions: Point[],
    /** Asked each frame: false while the game is paused, a hack prompt takes the keys, and so on. */
    private canInteract: () => boolean,
    private addCredits: (amount: number) => void,
    /** Sends a wave of hunters out of the spawn point closest to the ATM. */
    private summonWave: (x: number, y: number, enemies: string[]) => void,
  ) {
    this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.states = positions.map((p) => ({ atm: new Atm(scene, p.x, p.y), phase: 'idle', holdMs: 0, channelMs: 0, creditMs: 0, wavesSent: 0 }));
  }

  /** Where the ATMs are (for keeping other things clear of them). */
  get positions(): Point[] {
    return this.states.map((s) => s.atm);
  }

  /** Taking damage restarts a decryption. A channel in progress is not affected. */
  onPlayerHit() {
    for (const s of this.states) if (s.phase === 'idle') s.holdMs = 0;
  }

  update(deltaMs: number) {
    const held = this.eKey.isDown && this.canInteract();
    for (const s of this.states) {
      const inRange = distance(this.player, s.atm) <= ATMS.radius;
      switch (s.phase) {
        case 'idle':
          this.decrypt(s, deltaMs, held && inRange);
          break;
        case 'channeling':
          this.channel(s, deltaMs, inRange);
          break;
      }
      this.render(s, inRange);
    }
  }

  private decrypt(s: AtmState, deltaMs: number, holding: boolean) {
    s.holdMs = holding ? s.holdMs + deltaMs : 0;
    if (s.holdMs < ATMS.decryptMs) return;
    s.phase = 'channeling';
    s.holdMs = 0;
  }

  private channel(s: AtmState, deltaMs: number, inRange: boolean) {
    if (!inRange) return this.shutDown(s);
    s.channelMs += deltaMs;
    s.creditMs += deltaMs;
    const every = 1000 / ATMS.creditsPerSecond;
    while (s.creditMs >= every) {
      s.creditMs -= every;
      this.addCredits(1);
      s.atm.floatCredit(1);
    }
    if (s.channelMs >= ATMS.channelMs) return this.shutDown(s);
    while (s.wavesSent < ATMS.waves.length && s.channelMs >= ATMS.waves[s.wavesSent].atMs) {
      this.summonWave(s.atm.x, s.atm.y, ATMS.waves[s.wavesSent].enemies);
      s.wavesSent++;
    }
  }

  private shutDown(s: AtmState) {
    s.phase = 'offline';
    s.atm.goOffline();
  }

  private render(s: AtmState, inRange: boolean) {
    const { phase } = s;
    if (phase === 'offline') return s.atm.render(phase, 0, 'OFFLINE', false);
    if (phase === 'channeling') {
      const left = Math.max(0, ATMS.channelMs - s.channelMs);
      return s.atm.render(phase, left / ATMS.channelMs, `CHANNELING FUNDS  ${Math.ceil(left / 1000)}s  STAY IN THE RING`, true);
    }
    if (s.holdMs > 0) return s.atm.render('decrypting', s.holdMs / ATMS.decryptMs, 'DECRYPTING, KEEP HOLDING [E]', true);
    s.atm.render('idle', 0, inRange ? 'HOLD [E] TO DECRYPT' : '', inRange);
  }
}
