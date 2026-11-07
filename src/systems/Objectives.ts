import Phaser from 'phaser';
import { ENEMIES } from '../data/balance';
import { CAMERA_POLE, STEAL_SECRETS, CONNECT_SERVERS, ENCRYPTION_KEY, EXTRACTION, HACK, type ObjectiveDef } from '../data/objectives';
import { CableServers } from '../entities/CableServers';
import { CameraPole } from '../entities/CameraPole';
import { Dossier } from '../entities/Dossier';
import type { Enemy } from '../entities/Enemy';
import { ExtractionPoint } from '../entities/ExtractionPoint';
import { HackServer } from '../entities/HackServer';
import type { Player } from '../entities/Player';
import { CameraHack, pickPolePosition } from './CameraHack';
import type { City, Point } from './City';
import { Connect } from './Connect';
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
  /** Only for 'connectServers' objectives: the state and the look of the two servers and the cable. */
  connect: Connect | null;
  cable: CableServers | null;
  /** Only for 'stealSecrets' objectives: the outposts (kept after they die, to count them) and their drone timers. */
  outposts: Outpost[] | null;
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
  /** Characters of the log-out text typed so far. */
  private logoutTyped = 0;
  /** Once the log-out text is complete: ms left on the countdown. */
  private countdownMs = 0;
  private counting = false;
  /** The optional camera pole hack: not an objective, but it shares the keys and the hack rules. */
  private cameraHack = new CameraHack();
  private pole: CameraPole;
  private mapRevealed = false;
  /** Where the extraction point opens. */
  private start: Point;

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
  ) {
    this.scene = scene;
    this.start = city.start;
    this.entries = defs.map((def) => ({
      def,
      hack: def.type === 'hackServer' ? new Hack() : null,
      server: null,
      dossier: null,
      goon: null,
      connect: def.type === 'connectServers' ? new Connect() : null,
      cable: null,
      outposts: null,
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
      } else {
        e.dossier = new Dossier(scene, x, y);
        e.goon = spawnEnemy(x + ENCRYPTION_KEY.goonOffset.x, y + ENCRYPTION_KEY.goonOffset.y, 'goon');
      }
    }
    const pole = pickPolePosition(city, [...this.mapPoints, ...caches]);
    this.pole = new CameraPole(scene, pole.x, pole.y);
    scene.input.keyboard!.on('keydown', this.onKey, this);
    scene.events.once('shutdown', () => {
      scene.input.keyboard?.off('keydown', this.onKey, this);
      scene.input.keyboard?.removeKey(this.eKey);
    });
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

  /** Outposts destroyed and total, for the objective panel; null for other objective types. */
  outpostCount(e: ObjectiveEntry) {
    if (!e.outposts) return null;
    return { down: e.outposts.filter((o) => !Objectives.standing(o)).length, total: e.outposts.length };
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
    if (this.isComplete) return this.start;
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
    if (!best) return null;
    // With the cable in hand the way leads to the second server.
    if (best.connect?.grabbed && best.cable) return best.connect.from === 'a' ? { x: best.cable.b.x, y: best.cable.b.y } : { x: best.cable.a.x, y: best.cable.a.y };
    return { x: best.def.x, y: best.def.y };
  }

  /** Where the unfinished objectives are, for the minimap. Connect servers counts as both of its servers. */
  get mapPoints() {
    const points: { x: number; y: number }[] = [];
    for (const e of this.entries) {
      if (e.done) continue;
      if (e.cable) points.push(e.cable.a, e.cable.b);
      else points.push({ x: e.def.x, y: e.def.y });
    }
    return points;
  }

  /** The objective being hacked right now, or null. */
  get current() {
    return this.engaged;
  }

  /** True while the player is hacking: in range of a server, or working on the camera pole. */
  get hacking() {
    return this.engaged !== null || (this.cameraHack.started && this.inCameraRange);
  }

  private get inCameraRange() {
    return this.playerWithin(this.pole, CAMERA_POLE.range);
  }

  /** True while typed letters belong to the camera pole. */
  private get cameraTyping() {
    return this.cameraHack.typing && this.inCameraRange;
  }

  /** True while typed letters belong to a prompt (so P must not pause, WASD must not move). */
  get typing() {
    return (this.engaged !== null && !!this.engaged.hack?.typing) || this.cameraTyping || this.loggingOut;
  }

  /** True while the player stands on the extraction point and still has to type the log-out text. */
  private get loggingOut() {
    return this.extraction !== null && !this.counting && this.onExtraction();
  }

  private onExtraction() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.start.x, this.start.y) <= EXTRACTION.radius;
  }

  /** Call when the player took damage. */
  onPlayerHit() {
    this.engaged?.hack?.halt(HACK.damageHaltMs);
    this.cameraHack.resetHold();
    for (const e of this.entries) if (!e.done) e.connect?.reset();
  }

  update(deltaMs: number) {
    // Keep the current server while still in range (so two overlapping rings don't flip-flop);
    // otherwise engage the closest one in range.
    if (!this.engaged || this.engaged.done || !this.inRange(this.engaged)) this.engaged = this.closestInRange();

    // E only counts while the game takes input and no prompt owns the keyboard.
    const eOk = this.acceptingInput() && !this.typing;
    const ePressed = Phaser.Input.Keyboard.JustDown(this.eKey) && eOk;
    const eHeld = this.eKey.isDown && eOk;

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

  private updateCameraPole(deltaMs: number, eHeld: boolean) {
    if (this.mapRevealed) return;
    if (this.cameraHack.done) {
      this.mapRevealed = true;
      this.pole.playRevealed();
      this.onMapRevealed();
      return;
    }
    const inRange = this.inCameraRange;
    this.cameraHack.update(deltaMs, eHeld, inRange);
    this.pole.render(this.cameraHack, inRange);
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
    if (this.isComplete) this.extraction = new ExtractionPoint(this.scene, this.start.x, this.start.y);
  }

  private onKey(ev: KeyboardEvent) {
    if (this.cameraTyping && !ev.repeat && this.acceptingInput()) {
      if (this.cameraHack.onKey(ev.key) === 'wrong') this.pole.flashError();
      return;
    }
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
