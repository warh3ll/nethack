import Phaser from 'phaser';
import { ATMS, LIGHTING, TOUCH_INTERACT } from '../data/balance';
import { holdRaise } from '../ui/touchMode';
import { addGlow, lit, setGlow } from '../systems/Lighting';

const GOLD = 0xffc83a;
const GREEN = 0x5fe08a;
const FONT = 'monospace';
/** Where the sprite stands relative to the spot: pushed up against the building's south wall. */
const WALL_OFFSET = -12;
/** How far above the spot the prompt starts. */
const PROMPT_TOP = 62;
const BAR_W = 100;
const BAR_H = 8;

export type AtmPhase = 'idle' | 'decrypting' | 'channeling' | 'offline';

/**
 * An ATM set against a building's south wall: the machine, a faint gold ring and the prompt above it.
 * Pure view, all state lives in Atms (systems/Atms.ts).
 */
export class Atm {
  private sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private light: Phaser.GameObjects.Light | null;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.ring = scene.add.graphics().setDepth(1);
    this.sprite = lit(scene.add.image(x, y + WALL_OFFSET, 'atm').setDepth(3));
    this.light = addGlow(scene, x, y + WALL_OFFSET, LIGHTING.atm);
    this.bar = scene.add.graphics().setDepth(20);
    this.label = scene.add
      .text(x, y - PROMPT_TOP, '', { fontFamily: FONT, fontSize: '13px', color: '#ffc83a', stroke: '#05060a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(21);
  }

  /** `progress` is 0..1 (decryption done, or channel time left), `text` goes above the machine, `inRange` brightens the ring. */
  render(phase: AtmPhase, progress: number, text: string, inRange: boolean) {
    const { x, y } = this;
    this.ring.clear();
    this.bar.clear();
    // On touch screens the label and bar sit higher, clear of the thumb holding the ATM.
    const raise = holdRaise(TOUCH_INTERACT.holdBarRaise);
    this.label.setText(text).setY(y - PROMPT_TOP - raise);
    if (phase === 'offline') return;

    const active = phase === 'channeling';
    this.ring.fillStyle(GOLD, active ? 0.12 : inRange ? 0.07 : 0.03).fillCircle(x, y, ATMS.radius);
    this.ring.lineStyle(2, GOLD, active ? 0.8 : inRange ? 0.5 : 0.25).strokeCircle(x, y, ATMS.radius);

    if (phase === 'idle') return;
    const top = y - PROMPT_TOP - raise + 14;
    this.bar.fillStyle(0x1a2140).fillRect(x - BAR_W / 2, top, BAR_W, BAR_H);
    this.bar.fillStyle(active ? GREEN : GOLD).fillRect(x - BAR_W / 2, top, BAR_W * progress, BAR_H);
  }

  /** A "+1" that floats up from the machine. */
  floatCredit(amount: number) {
    const t = this.scene.add
      .text(this.x, this.y - 40, `+${amount}`, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffc83a', stroke: '#05060a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  /** Switched off for the rest of the run: dark screen, no ring, no light. */
  goOffline() {
    this.sprite.setAlpha(0.55).setTint(0x777777);
    setGlow(this.light, null);
  }
}
