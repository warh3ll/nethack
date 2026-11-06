import Phaser from 'phaser';
import { DAMAGE_NUMBERS } from '../data/balance';
import { SKILLS } from '../data/skills';
import { ENEMY_DAMAGED, SHOW_DAMAGE_NUMBER, type Enemy } from '../entities/Enemy';

interface Entry {
  text: Phaser.GameObjects.Text;
  tween?: Phaser.Tweens.Tween;
  enemy: Enemy | null;
  color: number;
  total: number;
  born: number;
}

/**
 * Floating damage numbers over enemies, tinted with the colour of the skill that dealt the damage.
 * Pooled: a fixed set of Text objects is reused (the oldest is recycled when all are busy).
 * Hits on the same enemy from the same skill within `mergeMs` add up into one number.
 */
export class DamageNumbers {
  private pool: Entry[] = [];

  constructor(private scene: Phaser.Scene) {
    scene.events.on(ENEMY_DAMAGED, this.onDamaged, this);
    scene.events.on(SHOW_DAMAGE_NUMBER, this.show, this);
    scene.events.once('shutdown', () => {
      scene.events.off(ENEMY_DAMAGED, this.onDamaged, this);
      scene.events.off(SHOW_DAMAGE_NUMBER, this.show, this);
    });
  }

  private onDamaged(enemy: Enemy, amount: number, skillId: string, _dealt: number, showNumber: boolean) {
    if (showNumber) this.show(enemy, amount, skillId);
  }

  private show(enemy: Enemy, amount: number, skillId: string) {
    const color = SKILLS[skillId]?.color ?? DAMAGE_NUMBERS.defaultColor;
    const now = this.scene.time.now;
    const live = this.pool.find(
      (e) => e.text.visible && e.enemy === enemy && e.color === color && now - e.born < DAMAGE_NUMBERS.mergeMs,
    );
    if (live) {
      live.total += amount;
      live.text.setText(this.format(live.total));
      return;
    }
    const entry = this.acquire();
    entry.enemy = enemy;
    entry.color = color;
    entry.total = amount;
    entry.born = now;
    const t = entry.text;
    const x = enemy.x + Phaser.Math.Between(-DAMAGE_NUMBERS.jitterX, DAMAGE_NUMBERS.jitterX);
    const y = enemy.y - enemy.stats.radius - DAMAGE_NUMBERS.heightAbove;
    t.setText(this.format(amount))
      .setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    entry.tween?.stop();
    entry.tween = this.scene.tweens.add({
      targets: t,
      y: y - DAMAGE_NUMBERS.risePx,
      alpha: 0,
      duration: DAMAGE_NUMBERS.durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.setVisible(false);
        entry.enemy = null;
      },
    });
  }

  /** Whole numbers, but never "0" for a hit that did something. */
  private format(amount: number) {
    return String(Math.max(1, Math.round(amount)));
  }

  private acquire(): Entry {
    const free = this.pool.find((e) => !e.text.visible);
    if (free) return free;
    if (this.pool.length < DAMAGE_NUMBERS.poolSize) {
      const text = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: `${DAMAGE_NUMBERS.fontSize}px`,
          fontStyle: 'bold',
          stroke: '#05060a',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(50)
        .setVisible(false);
      const entry: Entry = { text, enemy: null, color: 0, total: 0, born: 0 };
      this.pool.push(entry);
      return entry;
    }
    // All busy: recycle the oldest.
    return this.pool.reduce((a, b) => (b.born < a.born ? b : a));
  }
}
