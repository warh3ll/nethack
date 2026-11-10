import Phaser from 'phaser';
import { TOUCH_INTERACT, TOUCH_JOYSTICK } from '../data/balance';

/**
 * Floating virtual joystick for touch screens: put a thumb down anywhere, drag to move.
 * Only touch input starts it (mouse clicks are ignored), and it is hidden until a thumb is down.
 * Read `vector` each frame: x/y in -1..1, length 0 (idle) up to 1 (full push).
 */
export class TouchJoystick {
  readonly vector = new Phaser.Math.Vector2();
  private gfx: Phaser.GameObjects.Graphics;
  private pointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;
  /** For telling taps from moves: when the current touch started, and the farthest it has moved. */
  private downAt = 0;
  private maxMove = 0;
  /** The last tap (a short touch that barely moved), for spotting a double tap. */
  private lastTap: { at: number; x: number; y: number } | null = null;
  /** Called on a double tap on open ground (not on a button or object). */
  onDoubleTap: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    /** Joystick only grabs new touches while this returns true (e.g. not during level-up or pause). */
    private isEnabled: () => boolean,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(120).setVisible(false);
    // Phaser tracks 2 pointers by default (mouse + 1 touch); allow a second finger, e.g. for the pause button.
    if (scene.input.manager.pointersTotal < 3) scene.input.addPointer(3 - scene.input.manager.pointersTotal);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  get active() {
    return this.pointerId !== null;
  }

  /** Drop the current thumb, e.g. when the game freezes for a level-up. The player has to put it down again. */
  release() {
    this.pointerId = null;
    this.vector.set(0, 0);
    this.gfx.setVisible(false);
  }

  private onDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) {
    if (this.pointerId !== null || !pointer.wasTouch || !this.isEnabled()) return;
    // Let on-screen buttons (pause etc.) have their tap.
    if (over.length > 0) return;
    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.downAt = pointer.downTime;
    this.maxMove = 0;
    this.vector.set(0, 0);
    this.draw(pointer.x, pointer.y);
    this.gfx.setVisible(true);
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    const { radius, deadZone, analog, baseFollows } = TOUCH_JOYSTICK;
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    let dist = Math.hypot(dx, dy);
    this.maxMove = Math.max(this.maxMove, dist);

    if (dist > radius && baseFollows) {
      // Drag the base along behind the thumb.
      this.baseX = pointer.x - (dx / dist) * radius;
      this.baseY = pointer.y - (dy / dist) * radius;
      dx = pointer.x - this.baseX;
      dy = pointer.y - this.baseY;
      dist = radius;
    }

    const push = Math.min(1, dist / radius);
    if (push < deadZone) {
      this.vector.set(0, 0);
    } else {
      // Rescale so speed ramps from 0 right at the dead zone edge instead of jumping.
      const strength = analog ? (push - deadZone) / (1 - deadZone) : 1;
      this.vector.set(dx / dist, dy / dist).scale(strength);
    }

    const knob = Math.min(dist, radius);
    this.draw(this.baseX + (dist > 0 ? (dx / dist) * knob : 0), this.baseY + (dist > 0 ? (dy / dist) * knob : 0));
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    this.checkTap(pointer);
    this.release();
  }

  private checkTap(pointer: Phaser.Input.Pointer) {
    const t = TOUCH_INTERACT.doubleTap;
    if (pointer.upTime - this.downAt > t.tapMaxMs || this.maxMove > t.tapMaxMove) {
      this.lastTap = null;
      return;
    }
    const prev = this.lastTap;
    if (prev && pointer.upTime - prev.at <= t.gapMs && Math.hypot(pointer.x - prev.x, pointer.y - prev.y) <= t.maxDistance) {
      this.lastTap = null;
      this.onDoubleTap?.();
      return;
    }
    this.lastTap = { at: pointer.upTime, x: pointer.x, y: pointer.y };
  }

  private draw(knobX: number, knobY: number) {
    const r = TOUCH_JOYSTICK.radius;
    this.gfx.clear();
    this.gfx.fillStyle(0x2ef2ff, 0.08).fillCircle(this.baseX, this.baseY, r);
    this.gfx.lineStyle(2, 0x2ef2ff, 0.45).strokeCircle(this.baseX, this.baseY, r);
    this.gfx.fillStyle(0x2ef2ff, 0.45).fillCircle(knobX, knobY, r * 0.42);
    this.gfx.lineStyle(2, 0xc8f7ff, 0.8).strokeCircle(knobX, knobY, r * 0.42);
  }
}
