import Phaser from 'phaser';
import { CONNECT_SERVERS } from '../data/objectives';
import type { Connect } from '../systems/Connect';

const BAR_W = 100;
const BAR_H = 8;
const CYAN = 0x2ef2ff;
const GREEN = 0x5fe08a;
const FONT = 'monospace';
const CABLE_SEGMENTS = 16;

/**
 * The world-space look of the "connect servers" objective: two servers, the cable between
 * server A and the player (or server B once attached) and the prompt above whichever one is relevant.
 * Pure view, all state lives in Connect.
 */
export class CableServers {
  private rings: Phaser.GameObjects.Graphics;
  private cable: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    readonly a: { x: number; y: number },
    readonly b: { x: number; y: number },
  ) {
    this.rings = scene.add.graphics().setDepth(1);
    this.cable = scene.add.graphics().setDepth(3);
    for (const p of [a, b]) scene.add.image(p.x, p.y, 'server').setDepth(4);
    this.bar = scene.add.graphics().setDepth(20);
    this.label = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: '#ffd23e' }).setOrigin(0.5).setDepth(21);
  }

  render(state: Connect, playerX: number, playerY: number, nearA: boolean, nearB: boolean) {
    this.rings.clear();
    this.ring(this.a, CONNECT_SERVERS.grabRadius, !state.grabbed && nearA);
    this.ring(this.b, CONNECT_SERVERS.attachRadius, state.grabbed && nearB);

    this.cable.clear();
    if (state.grabbed) {
      this.drawCable(this.a.x, this.a.y, playerX, playerY, state.attachMs > 0 ? GREEN : CYAN);
    } else if (state.unwind) {
      // The loose end slides back along the ground to server A and the cable vanishes.
      const t = Math.min(1, state.unwind.ms / CONNECT_SERVERS.unwindMs);
      this.drawCable(this.a.x, this.a.y, Phaser.Math.Linear(state.unwind.x, this.a.x, t), Phaser.Math.Linear(state.unwind.y, this.a.y, t), CYAN);
    }

    this.bar.clear();
    const at = state.grabbed ? this.b : this.a;
    if (!state.grabbed) {
      this.label.setText(nearA ? '[E] GRAB CABLE' : 'GRAB CABLE HERE');
    } else if (state.attachMs > 0) {
      this.label.setText('ATTACHING...');
      this.bar.fillStyle(0x1a2140).fillRect(at.x - BAR_W / 2, at.y - 56, BAR_W, BAR_H);
      this.bar.fillStyle(GREEN).fillRect(at.x - BAR_W / 2, at.y - 56, BAR_W * state.progress, BAR_H);
    } else {
      this.label.setText(nearB ? 'HOLD [E] TO ATTACH' : 'BRING THE CABLE HERE  ([E] DROP)');
    }
    this.label.setPosition(at.x, at.y - 70);
  }

  private ring(p: { x: number; y: number }, radius: number, active: boolean) {
    this.rings.fillStyle(CYAN, active ? 0.08 : 0.02).fillCircle(p.x, p.y, radius);
    this.rings.lineStyle(2, CYAN, active ? 0.6 : 0.25).strokeCircle(p.x, p.y, radius);
  }

  /** A cable that sags a little under its own weight (a quadratic curve with the control point pulled down). */
  private drawCable(x1: number, y1: number, x2: number, y2: number, color: number) {
    const sag = Math.min(40, Phaser.Math.Distance.Between(x1, y1, x2, y2) * 0.2);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + sag * 2;
    this.cable.lineStyle(4, color, 0.9).beginPath().moveTo(x1, y1);
    for (let i = 1; i <= CABLE_SEGMENTS; i++) {
      const t = i / CABLE_SEGMENTS;
      const u = 1 - t;
      this.cable.lineTo(u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2);
    }
    this.cable.strokePath();
  }

  /** Floating "CONNECTED". The servers and the cable between them stay as a trophy. */
  playConnected() {
    this.rings.clear();
    this.bar.clear();
    this.label.setText('');
    this.cable.clear();
    this.drawCable(this.a.x, this.a.y, this.b.x, this.b.y, GREEN);
    const mx = (this.a.x + this.b.x) / 2;
    const text = this.scene.add
      .text(mx, this.a.y - 40, 'CONNECTED', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#5fe08a' })
      .setOrigin(0.5)
      .setDepth(21);
    this.scene.tweens.add({ targets: text, y: text.y - 50, alpha: 0, duration: 1200, onComplete: () => text.destroy() });
  }
}
