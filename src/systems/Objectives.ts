import Phaser from 'phaser';
import { ENEMIES } from '../data/balance';
import { CAMERA_POLE, STEAL_SECRETS, CONNECT_SERVERS, ENCRYPTION_KEY, EXTRACTION, HACK, INJECT_WORDS, PASSWORD_ADJECTIVES, PASSWORD_NOUNS, type ObjectiveDef } from '../data/objectives';
import { CableServers } from '../entities/CableServers';
import { CameraPole } from '../entities/CameraPole';
import { Dossier } from '../entities/Dossier';
import type { Enemy } from '../entities/Enemy';
import { ExtractionPoint } from '../entities/ExtractionPoint';
import { HackServer } from '../entities/HackServer';
import type { Player } from '../entities/Player';
import { CameraHack, pickPolePositions } from './CameraHack';
import type { City, Point } from './City';
import { Connect } from './Connect';
import { Hack, INTERACT_KEY, promptWords, type KeyResult } from './Hack';
import type { TouchInteract, TouchTarget } from '../ui/TouchInteract';

/** The prompt that takes input right now, as the touch prompt panel needs it (GAME_DESIGN section 8b). */
export interface TouchPrompt {
  /** Changes when a new prompt comes up, so the panel knows to rebuild. */
  id: unknown;
  /** Keypad for digits (PIN, IP), word tiles for the rest. */
  input: 'keypad' | 'words';
  title: string;
  text: string;
  typed: number;
  /** For word tiles: the correct words in order, and the list the decoys are drawn from. */
  words: string[];
  pool: readonly string[];
}

const PASSWORD_POOL = [...PASSWORD_ADJECTIVES, ...PASSWORD_NOUNS];

export interface ObjectiveEntry {
  def: ObjectiveDef;
  /** Hack state; only for 'hackServer' objectives. */
  hack: Hack | null;
  server: HackServer | null;
  /** Only for 'encryptionKey' objectives, until picked up. */
  dossier: Dossier | null;
  /** The Goon guarding the dossier. Hunts the player for good once the dossier is taken. */
  goon: Enemy | null;
  /** Only for 'connectServers' objectives: the state and the look of the two servers and the cable. */
  connect: Connect | null;
  cable: CableServers | null;
  /** Only for 'stealSecrets' objectives: the outposts (kept after they die, to count them) and their drone timers. */
  outposts: Outpost[] | null;
  /** Only for 'destroyFactories' objectives: how many factories have gone down so far. */
  factoriesDown: number;
  done: boolean;
}

interface Outpost {
  enemy: Enemy;
  /** ms until this outpost may spawn its next drone. */
  spawnTimerMs: number;
}

/** Spawns an enemy of the given type (the scene owns the enemy pool). `hp` overrides the type's hp. */
export type EnemySpawner = (x: number, y: number, type: string, hp?: number) => Enemy | null;

/**
 * Runs the objectives of a run. All of them are in the world from the start and can be done in
 * any order. Only the closest server in range is "engaged" (progresses and takes key input).
 * Objective types: "hack server", "encryption key" (a Goon guards a dossier you walk onto)
 * and "connect servers" (carry a cable from one server to another, hold E to attach).
 */
export class Objectives {
  readonly entries: ObjectiveEntry[];
  /** E key for the cable. Not captured, so the browser keeps its shortcuts. */
  private eKey: Phaser.Input.Keyboard.Key;
  /** The server the player is currently hacking, or null. */
  private engaged: ObjectiveEntry | null = null;
  private scene: Phaser.Scene;
  /** Revealed after the last objective is done; null before that. */
  private extraction: ExtractionPoint | null = null;
  /** ms left on the extraction countdown while the player stands in the ring. */
  private countdownMs = 0;
  private counting = false;
  /** The optional camera poles: not objectives, but they share the keys and the hack rules. Each has its own hack, and either one reveals the map. */
  readonly poles: { pole: CameraPole; hack: CameraHack }[];
  private mapRevealed = false;
  /** Where the extraction point opens: the subway station on the exit plaza. */
  private exit: Point;
  /** The doors of the factories still standing; set by the scene once the factories exist. For the compass. */
  private standingFactories: () => Point[] = () => [];
  /** Touch stand-ins for E: a tap this frame, and the hold targets (any of them held counts as E held). */
  private tapE = false;
  private holds: TouchTarget[] = [];

  constructor(
    scene: Phaser.Scene,
    private player: Player,
    /** Keys are ignored while this returns false (paused, level-up picker, game over). */
    private acceptingInput: () => boolean,
    private onExtracted: () => void,
    private onMapRevealed: () => void,
    city: City,
    defs: ObjectiveDef[],
    /** Spots the camera pole keeps clear of, besides the objectives. */
    caches: Point[],
    private spawnEnemy: EnemySpawner,
    touch: TouchInteract,
  ) {
    this.scene = scene;
    this.exit = city.exit;
    this.entries = defs.map((def) => ({
      def,
      hack: def.type === 'hackServer' ? new Hack() : null,
      server: null,
      dossier: null,
      goon: null,
      connect: def.type === 'connectServers' ? new Connect() : null,
      cable: null,
      outposts: null,
      factoriesDown: 0,
      done: false,
    }));
    this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    for (const e of this.entries) {
      const { x, y } = e.def;
      if (e.def.type === 'hackServer') {
        e.server = new HackServer(scene, x, y);
      } else if (e.def.type === 'connectServers') {
        e.cable = new CableServers(scene, { x, y }, e.def.partner!);
      } else if (e.def.type === 'stealSecrets') {
        e.outposts = this.spawnOutposts(x, y);
      } else if (e.def.type === 'destroyFactories') {
        // Nothing stands on the map for this one: the factories are already there.
      } else {
        e.dossier = new Dossier(scene, x, y);
        e.goon = spawnEnemy(x + ENCRYPTION_KEY.goonOffset.x, y + ENCRYPTION_KEY.goonOffset.y, 'goon');
      }
    }
    this.poles = pickPolePositions(city, [...this.mapPoints, ...caches]).map((p) => ({ pole: new CameraPole(scene, p.x, p.y), hack: new CameraHack() }));
    this.addTouchTargets(touch);
    scene.input.keyboard!.on('keydown', this.onKey, this);
    scene.events.once('shutdown', () => {
      scene.input.keyboard?.off('keydown', this.onKey, this);
      scene.input.keyboard?.removeKey(this.eKey);
    });
  }

  /** Touch: tap the server to smack it, tap a cable server to grab, hold the other to attach, hold a pole to insert the worm. */
  private addTouchTargets(touch: TouchInteract) {
    const ok = () => this.acceptingInput() && !this.typing;
    const tapE = () => (this.tapE = true);
    for (const e of this.entries) {
      if (e.server) {
        touch.tap(e.server.x, e.server.y, () => ok() && this.engaged === e && e.hack?.prompt?.kind === 'smack', () => this.smack(e));
      }
      if (e.cable && e.connect) {
        const c = e.connect;
        const near = (side: 'a' | 'b') => this.playerWithin(e.cable![side], side === 'a' ? CONNECT_SERVERS.grabRadius : CONNECT_SERVERS.attachRadius);
        for (const side of ['a', 'b'] as const) {
          const at = e.cable[side];
          touch.tap(at.x, at.y, () => ok() && !e.done && !c.grabbed && near(side), tapE);
          this.holds.push(touch.hold(at.x, at.y, () => ok() && !e.done && c.grabbed && c.from !== side && near(side)));
        }
      }
    }
    for (const p of this.poles) {
      this.holds.push(touch.hold(p.pole.x, p.pole.y, () => ok() && !this.mapRevealed && p.hack.step === 'worm' && this.playerWithin(p.pole, CAMERA_POLE.range)));
    }
  }

  /** Touch: a double tap on open ground drops a cable being carried (like E away from the target server). */
  onDoubleTap() {
    if (this.entries.some((e) => !e.done && e.connect?.grabbed)) this.tapE = true;
  }

  /** One smack on the server (E, or a tap on the server). */
  private smack(e: ObjectiveEntry) {
    if (!e.server || !e.hack) return;
    if (e.hack.onKey(INTERACT_KEY) === 'ok') e.server.wriggle();
  }

  /** A random number of outposts on a ring around the centre; more outposts means a bit less hp each. */
  private spawnOutposts(cx: number, cy: number): Outpost[] {
    const count = Phaser.Math.Between(STEAL_SECRETS.outposts.min, STEAL_SECRETS.outposts.max);
    const hp = ENEMIES.outpost.hp - STEAL_SECRETS.hpLossPerExtra * (count - STEAL_SECRETS.outposts.min);
    const start = Math.random() * Math.PI * 2;
    const outposts: Outpost[] = [];
    for (let i = 0; i < count; i++) {
      const a = start + (i / count) * Math.PI * 2;
      const enemy = this.spawnEnemy(cx + Math.cos(a) * STEAL_SECRETS.ringRadius, cy + Math.sin(a) * STEAL_SECRETS.ringRadius, 'outpost', hp);
      if (enemy) outposts.push({ enemy, spawnTimerMs: 0 });
    }
    return outposts;
  }

  /** Outposts still standing. A dead one's pooled enemy may be reused as a drone, so check the type too. */
  private static standing(o: Outpost) {
    return o.enemy.active && !!o.enemy.stats.stationary;
  }

  /** Parts destroyed and total (outposts, or factories), for the objective panel; null for other objective types. */
  progressCount(e: ObjectiveEntry) {
    if (e.def.type === 'destroyFactories') return { down: Math.min(e.factoriesDown, e.def.total ?? 0), total: e.def.total ?? 0 };
    if (!e.outposts) return null;
    return { down: e.outposts.filter((o) => !Objectives.standing(o)).length, total: e.outposts.length };
  }

  /** The scene tells the objectives where the standing factories are (the compass points at the closest). */
  setFactorySource(standing: () => Point[]) {
    this.standingFactories = standing;
  }

  /** A factory went down: it counts for every Destroy factories objective, whichever factory it was. */
  onFactoryDestroyed() {
    for (const e of this.entries) {
      if (e.def.type !== 'destroyFactories' || e.done) continue;
      e.factoriesDown++;
      if (e.factoriesDown >= (e.def.total ?? 0)) this.finish(e);
    }
  }

  /** Steal secrets: outposts spawn drones while the player is near; once all are down the secrets appear. */
  private updateStealSecrets(e: ObjectiveEntry, deltaMs: number) {
    const outposts = e.outposts!;
    if (e.dossier) {
      if (this.playerWithin(e.dossier, STEAL_SECRETS.pickupRadius)) this.finish(e);
      return;
    }
    let alive = 0;
    for (const o of outposts) {
      if (!Objectives.standing(o)) continue;
      alive++;
      if (!this.playerWithin(o.enemy, STEAL_SECRETS.spawnTriggerRadius)) continue;
      o.spawnTimerMs -= deltaMs;
      if (o.spawnTimerMs > 0) continue;
      o.spawnTimerMs = STEAL_SECRETS.spawnIntervalMs;
      const a = Math.random() * Math.PI * 2;
      const r = o.enemy.stats.radius + ENEMIES.drone.radius + 6;
      this.spawnEnemy(o.enemy.x + Math.cos(a) * r, o.enemy.y + Math.sin(a) * r, 'drone');
    }
    if (alive === 0) e.dossier = new Dossier(this.scene, e.def.x, e.def.y, 'secrets', 'SECRETS STOLEN', STEAL_SECRETS.pickupRadius);
  }

  get isComplete() {
    return this.entries.every((e) => e.done);
  }

  /** World position the compass points at: the closest unfinished objective, or the extraction point once all are done. */
  get target() {
    if (this.isComplete) return this.exit;
    let best: ObjectiveEntry | null = null;
    let bestDist = Infinity;
    let spot: Point | null = null;
    for (const e of this.entries) {
      if (e.done) continue;
      // The factory objective has no spot of its own: it points at the closest factory still standing.
      const at = e.def.type === 'destroyFactories' ? this.closestFactory() : { x: e.def.x, y: e.def.y };
      if (!at) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, at.x, at.y);
      if (d < bestDist) {
        best = e;
        bestDist = d;
        spot = at;
      }
    }
    if (!best) return null;
    // With the cable in hand the way leads to the second server.
    if (best.connect?.grabbed && best.cable) return best.connect.from === 'a' ? { x: best.cable.b.x, y: best.cable.b.y } : { x: best.cable.a.x, y: best.cable.a.y };
    return spot;
  }

  private closestFactory(): Point | null {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (const f of this.standingFactories()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
      if (d < bestDist) {
        best = f;
        bestDist = d;
      }
    }
    return best;
  }

  /** Where the unfinished objectives are, for the minimap. Connect servers counts as both of its servers. */
  get mapPoints() {
    const points: { x: number; y: number }[] = [];
    for (const e of this.entries) {
      if (e.done || e.def.type === 'destroyFactories') continue;
      if (e.cable) points.push(e.cable.a, e.cable.b);
      else points.push({ x: e.def.x, y: e.def.y });
    }
    return points;
  }

  /** The objective being hacked right now, or null. */
  get current() {
    return this.engaged;
  }

  /** True while the player is hacking: in range of a server, or working on a camera pole. */
  get hacking() {
    return this.engaged !== null || this.polesInRange.some((p) => p.hack.started);
  }

  /** The camera poles the player is within range of (the map is only revealed once, so none after that). */
  private get polesInRange() {
    return this.mapRevealed ? [] : this.poles.filter((p) => this.playerWithin(p.pole, CAMERA_POLE.range));
  }

  /** The pole that owns typed letters right now, if any. */
  private get typingPole() {
    return this.polesInRange.find((p) => p.hack.typing) ?? null;
  }

  /** True while typed letters belong to a camera pole. */
  private get cameraTyping() {
    return this.typingPole !== null;
  }

  /** True while typed letters belong to a prompt (so P must not pause, WASD must not move). */
  get typing() {
    return (this.engaged !== null && !!this.engaged.hack?.typing) || this.cameraTyping;
  }

  private onExtraction() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y) <= EXTRACTION.radius;
  }

  /** Call when the player took damage. */
  onPlayerHit() {
    this.engaged?.hack?.halt(HACK.damageHaltMs);
    for (const p of this.poles) p.hack.resetHold();
    for (const e of this.entries) if (!e.done) e.connect?.reset();
  }

  update(deltaMs: number) {
    // Keep the current server while still in range (so two overlapping rings don't flip-flop);
    // otherwise engage the closest one in range.
    if (!this.engaged || this.engaged.done || !this.inRange(this.engaged)) this.engaged = this.closestInRange();

    // E only counts while the game takes input and no prompt owns the keyboard.
    const eOk = this.acceptingInput() && !this.typing;
    const ePressed = (Phaser.Input.Keyboard.JustDown(this.eKey) || this.tapE) && eOk;
    const eHeld = (this.eKey.isDown || this.holds.some((h) => h.held)) && eOk;
    this.tapE = false;

    for (const e of this.entries) {
      if (e.done) continue;
      if (e.connect && e.cable) {
        if (e.connect.grabbed) this.tetherPlayer(e.connect.from === 'a' ? e.cable.a : e.cable.b);
        const nearA = this.playerWithin(e.cable.a, CONNECT_SERVERS.grabRadius);
        const nearB = this.playerWithin(e.cable.b, CONNECT_SERVERS.attachRadius);
        e.connect.update(deltaMs, ePressed, eHeld, nearA, nearB, this.player.x, this.player.y);
        e.cable.render(e.connect, this.player.x, this.player.y, nearA, nearB);
        if (e.connect.complete) this.finish(e);
        continue;
      }
      if (e.outposts) {
        this.updateStealSecrets(e, deltaMs);
        continue;
      }
      if (e.def.type === 'destroyFactories') continue; // finished by onFactoryDestroyed
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
    this.updateCameraPole(deltaMs, eHeld);
    this.player.typingLock = this.typing;

    if (this.extraction) {
      if (!this.onExtraction()) {
        // Leaving the ring cancels the countdown: it starts over on the way back in.
        this.counting = false;
        this.countdownMs = 0;
      } else {
        if (!this.counting) {
          this.counting = true;
          this.countdownMs = EXTRACTION.countdownSeconds * 1000;
        }
        this.countdownMs -= deltaMs;
        if (this.countdownMs <= 0) this.onExtracted();
      }
      this.extraction.render(this.counting ? Math.max(1, Math.ceil(this.countdownMs / 1000)) : 0);
    }
  }

  private updateCameraPole(deltaMs: number, eHeld: boolean) {
    if (this.mapRevealed) return;
    const done = this.poles.find((p) => p.hack.done);
    if (done) {
      // One pole is enough: the other one switches off too.
      this.mapRevealed = true;
      for (const p of this.poles) p.pole.playRevealed(p === done);
      this.onMapRevealed();
      return;
    }
    for (const p of this.poles) {
      const inRange = this.playerWithin(p.pole, CAMERA_POLE.range);
      p.hack.update(deltaMs, eHeld, inRange);
      p.pole.render(p.hack, inRange);
    }
  }

  /** Holds the player inside the cable's reach: pulled back onto the circle, outward movement cancelled so they slide along it. */
  private tetherPlayer(anchor: { x: number; y: number }) {
    const max = CONNECT_SERVERS.maxCableLength;
    const dx = this.player.x - anchor.x;
    const dy = this.player.y - anchor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < max) return;
    const nx = dx / dist;
    const ny = dy / dist;
    this.player.setPosition(anchor.x + nx * max, anchor.y + ny * max);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const outward = body.velocity.x * nx + body.velocity.y * ny;
    if (outward > 0) body.setVelocity(body.velocity.x - outward * nx, body.velocity.y - outward * ny);
  }

  private playerWithin(p: { x: number; y: number }, radius: number) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) <= radius;
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
    e.cable?.playConnected();
    // Taking the dossier from under his nose: if he's still alive he never gives up.
    if (e.goon?.active) e.goon.provoke();
    e.goon = null;
    if (this.engaged === e) {
      this.engaged = null;
      this.player.typingLock = false;
    }
    if (this.isComplete) this.extraction = new ExtractionPoint(this.scene, this.exit.x, this.exit.y);
  }

  private onKey(ev: KeyboardEvent) {
    if (ev.repeat) return;
    this.typeKey(ev.key);
  }

  /** A key for whichever prompt takes input: a camera pole being typed at, or the engaged server. */
  typeKey(key: string): KeyResult {
    if (!this.acceptingInput()) return 'ignored';
    const pole = this.typingPole;
    if (pole) {
      const result = pole.hack.onKey(key);
      if (result === 'wrong') pole.pole.flashError();
      return result;
    }
    const e = this.engaged;
    if (!e?.server || !e.hack) return 'ignored';
    if (e.hack.prompt?.kind === 'smack') {
      if (key.toLowerCase() !== INTERACT_KEY) return 'ignored';
      this.smack(e);
      return 'ok';
    }
    const result = e.hack.onKey(key);
    if (result === 'wrong') e.server.flashError();
    return result;
  }

  /** Touch keypad: like typeKey, but the dots of an IP address fill in by themselves. */
  typeKeypad(key: string): KeyResult {
    const result = this.typeKey(key);
    const p = this.engaged?.hack?.prompt;
    if (result === 'ok' && p?.kind === 'ip') while (p.text[p.typed] === '.') this.typeKey('.');
    return result;
  }

  /** A word tile tapped: added if it's the next word, otherwise nothing happens. */
  typeWord(word: string): KeyResult {
    if (!this.acceptingInput()) return 'ignored';
    const pole = this.typingPole;
    if (pole) return pole.hack.onWord(word);
    return this.engaged?.hack?.onWord(word) ?? 'ignored';
  }

  /** The prompt that takes input right now, for the touch panel. Null when nothing is being typed. */
  get touchPrompt(): TouchPrompt | null {
    if (!this.acceptingInput()) return null;
    const pole = this.typingPole;
    if (pole) {
      const h = pole.hack;
      const pin = h.step === 'pin';
      return {
        id: `${this.poles.indexOf(pole)}:${h.step}`,
        input: pin ? 'keypad' : 'words',
        title: pin ? '2/3 ENTER THE PIN CODE' : '3/3 TAP THE COMMAND',
        text: h.text,
        typed: h.typed,
        words: pin ? [] : promptWords(h.text),
        pool: INJECT_WORDS,
      };
    }
    const p = this.engaged?.hack?.prompt;
    if (!p || p.kind === 'smack') return null;
    const keypad = p.kind === 'ip' || p.kind === 'pin';
    return {
      id: p,
      input: keypad ? 'keypad' : 'words',
      title: { ip: 'ENTER THE IP ADDRESS', pin: 'ENTER THE PIN CODE', password: 'TAP THE PASSWORD', inject: 'TAP THE CODE IN ORDER' }[p.kind],
      text: p.text,
      typed: p.typed,
      words: keypad ? [] : promptWords(p.text),
      pool: p.kind === 'password' ? PASSWORD_POOL : INJECT_WORDS,
    };
  }
}
