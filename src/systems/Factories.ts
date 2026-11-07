import Phaser from 'phaser';
import { LIGHTING, SPAWN_POINTS } from '../data/balance';
import { addGlow, setGlow } from './Lighting';
import { CITY } from '../data/city';
import { ENEMY_KILLED, type Enemy } from '../entities/Enemy';
import { tileToWorld, type City, type Rect } from './City';
import type { SpawnPoint } from './SpawnPoints';

/** Above the city's tile layers, below the spawn flashes and everything standing in the street. */
const DEPTH = -9;

type State = 'intact' | 'damaged' | 'destroyed';

interface Site {
  building: Rect;
  point: SpawnPoint;
  core: Enemy | null;
  state: State;
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  /** One light by the door and one at the core. */
  lights: (Phaser.GameObjects.Light | null)[];
}

/**
 * The factories of one run. Each one has a core by its door, a structure that can be shot like an outpost.
 * Destroying it shuts the factory down: it stops spawning, and every factory down lowers the spawn rate of the
 * whole map (SPAWN_POINTS.rateCutPerFactory). The look is a placeholder until the factory art exists.
 */
export class Factories {
  private sites: Site[] = [];

  constructor(
    private scene: Phaser.Scene,
    city: City,
    points: SpawnPoint[],
    spawnCore: (x: number, y: number) => Enemy | null,
    /** Called once when a factory goes down, with its spawn point. */
    private onDestroyed: (point: SpawnPoint) => void,
  ) {
    const t = CITY.tileSize;
    for (const b of city.blocks) {
      if (!b.factory) continue;
      const building = b.buildings[0];
      const doorX = tileToWorld(building.x + Math.floor(building.w / 2) + 0.5);
      const point = points.find((p) => p.kind === 'factory' && p.door.x === doorX);
      if (!point) continue;
      // The core stands on the sidewalk against the front, three tiles left of the door, clear of the door's flash.
      const front = tileToWorld(building.y + building.h);
      const core = spawnCore(point.door.x - t * 3, front + 20);
      const x = tileToWorld(building.x);
      const roof = (building.h - CITY.frontRows) * t;
      const label = scene.add
        .text(x + (building.w * t) / 2, tileToWorld(building.y) + roof / 2, '', { fontFamily: 'monospace', fontSize: '28px' })
        .setOrigin(0.5)
        .setDepth(DEPTH);
      const lights = [addGlow(scene, point.door.x, point.door.y, LIGHTING.factory), addGlow(scene, point.door.x - t * 3, front + 20, LIGHTING.factory)];
      const site: Site = { building, point, core, state: 'intact', gfx: scene.add.graphics().setDepth(DEPTH), label, lights };
      this.sites.push(site);
      this.draw(site);
    }

    const onKilled = (e: Enemy) => {
      const site = this.sites.find((s) => s.core === e && s.state !== 'destroyed');
      if (site) this.destroy(site);
    };
    scene.events.on(ENEMY_KILLED, onKilled);
    scene.events.once('shutdown', () => scene.events.off(ENEMY_KILLED, onKilled));
  }

  /** How many factories are down this run. */
  get destroyed() {
    return this.sites.filter((s) => s.state === 'destroyed').length;
  }

  /** For the minimap: every factory's building and whether it still runs. */
  get buildings() {
    return this.sites.map((s) => ({ rect: s.building, running: s.state !== 'destroyed' }));
  }

  /** Spawn-rate multiplier for the whole map: 1 with every factory running, less for each one down. */
  get rateFactor() {
    return Math.max(0.1, 1 - this.destroyed * SPAWN_POINTS.rateCutPerFactory);
  }

  /** Switches a factory to its damaged look once its core is hurt badly enough. */
  update() {
    for (const s of this.sites) {
      if (s.state !== 'intact' || !s.core) continue;
      if (s.core.hp >= s.core.maxHp * SPAWN_POINTS.factoryDamagedAt) continue;
      s.state = 'damaged';
      s.core.setTexture('enemy-factoryCore-damaged');
      for (const l of s.lights) setGlow(l, LIGHTING.factoryDamaged);
      this.draw(s);
    }
  }

  private destroy(site: Site) {
    site.state = 'destroyed';
    site.core = null; // the enemy goes back to the pool and may come back as something else
    for (const l of site.lights) setGlow(l, null);
    this.draw(site);
    this.onDestroyed(site.point);
    this.explode(site.point.door.x - CITY.tileSize * 3, tileToWorld(site.building.y + site.building.h));
  }

  /** A burst where the core stood, and a short shake. */
  private explode(x: number, y: number) {
    const ring = this.scene.add.circle(x, y, 20, 0xffa02e, 0.6).setStrokeStyle(4, 0xfff35c).setDepth(5);
    this.scene.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.scene.cameras.main.shake(250, 0.006);
  }

  private draw(site: Site) {
    const t = CITY.tileSize;
    const r = site.building;
    const x = tileToWorld(r.x);
    const y = tileToWorld(r.y);
    const w = r.w * t;
    const h = r.h * t;
    const roof = (r.h - CITY.frontRows) * t;
    const down = site.state === 'destroyed';
    const accent = down ? 0x4a4a52 : site.state === 'damaged' ? 0xff4a2e : SPAWN_POINTS.factoryFlashColor;
    const g = site.gfx.clear();

    g.fillStyle(down ? 0x15151a : 0x3a2410, down ? 0.85 : 0.75).fillRect(x, y, w, h);
    g.lineStyle(6, accent, 0.9).strokeRect(x + 8, y + 8, w - 16, roof - 16);
    for (let sx = x + 24; sx < x + w - 40; sx += 48) g.fillStyle(accent, 0.35).fillRect(sx, y + roof - 30, 24, 14);

    // Cracks once it's hurt, in the same places every time (they follow from the building's size).
    if (site.state !== 'intact') {
      g.lineStyle(3, 0x05060a, 0.9);
      for (let i = 0; i < 4; i++) {
        let cx = x + w * (0.2 + 0.2 * i);
        let cy = y + 16;
        g.beginPath().moveTo(cx, cy);
        for (let j = 0; j < 5; j++) {
          cx += (j % 2 === 0 ? 1 : -1) * (10 + ((i * 7 + j * 13) % 18));
          cy += roof / 7;
          g.lineTo(cx, cy);
        }
        g.strokePath();
      }
    }

    // The door the groups come out of: shut and crossed out once the factory is down.
    const dw = t * 1.5;
    const dh = t * 0.8;
    const dx = site.point.door.x - dw / 2;
    const dy = site.point.door.y + t / 2 - dh;
    g.fillStyle(0x05060a, 0.95).fillRect(dx, dy, dw, dh);
    g.lineStyle(2, accent, down ? 0.6 : 0.8).strokeRect(dx, dy, dw, dh);
    if (down) g.lineBetween(dx, dy, dx + dw, dy + dh).lineBetween(dx + dw, dy, dx, dy + dh);

    site.label
      .setText(down ? 'OFFLINE' : 'FACTORY')
      .setColor(`#${accent.toString(16).padStart(6, '0')}`)
      .setAlpha(down ? 0.6 : 0.8);
  }
}
