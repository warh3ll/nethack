import Phaser from 'phaser';
import { TOUCH_INTERACT } from '../data/balance';

export interface TouchTarget {
  /** True while a finger that started on this target is still down (a hold target only). */
  readonly held: boolean;
  /** Moves the target, e.g. when the object it belongs to is placed. */
  setPosition(x: number, y: number): void;
  destroy(): void;
}

interface Entry extends TouchTarget {
  zone: Phaser.GameObjects.Zone;
  mode: 'tap' | 'hold';
  enabled: () => boolean;
  onTap?: () => void;
  pointerId: number | null;
}

/**
 * Tapping and holding objects in the world, the touch stand-in for E (GAME_DESIGN section 8b).
 * Each target is an invisible circle a bit bigger than its object, and only takes touches while `enabled()` says so
 * (in range, and the gesture means something right now). Because it is an interactive object, the joystick
 * leaves those touches alone. A hold lasts while the finger that started it stays down, even if it drifts off
 * the target. Mouse clicks work too, which keeps it testable on desktop.
 */
export class TouchInteract {
  private entries: Entry[] = [];

  constructor(private scene: Phaser.Scene) {
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  /** A target you tap: `onTap` runs once per touch. */
  tap(x: number, y: number, enabled: () => boolean, onTap: () => void) {
    return this.add(x, y, 'tap', enabled, onTap);
  }

  /** A target you hold: read `held` each frame. */
  hold(x: number, y: number, enabled: () => boolean) {
    return this.add(x, y, 'hold', enabled);
  }

  /** Call every frame: switches targets on and off, and lets go of holds whose target switched off. */
  update() {
    for (const e of this.entries) {
      const on = e.enabled();
      if (e.zone.input) e.zone.input.enabled = on;
      if (!on) e.pointerId = null;
    }
  }

  private add(x: number, y: number, mode: 'tap' | 'hold', enabled: () => boolean, onTap?: () => void): TouchTarget {
    const r = TOUCH_INTERACT.tapRadius;
    const zone = this.scene.add.zone(x, y, r * 2, r * 2).setDepth(5);
    zone.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    zone.input!.enabled = false;
    const entries = this.entries;
    const entry: Entry = {
      zone,
      mode,
      enabled,
      onTap,
      pointerId: null,
      get held() {
        return this.pointerId !== null;
      },
      setPosition(px: number, py: number) {
        zone.setPosition(px, py);
      },
      destroy() {
        zone.destroy();
        entries.splice(entries.indexOf(entry), 1);
      },
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!entry.enabled()) return;
      if (entry.mode === 'tap') entry.onTap?.();
      else entry.pointerId = p.id;
    });
    entries.push(entry);
    return entry;
  }

  private onUp(p: Phaser.Input.Pointer) {
    for (const e of this.entries) if (e.pointerId === p.id) e.pointerId = null;
  }
}
