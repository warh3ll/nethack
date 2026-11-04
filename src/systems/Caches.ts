import Phaser from 'phaser';
import { CACHES, MAP } from '../data/balance';

/** Picks the cache positions of one run: random points away from the start (0, 0), the edge and each other. */
export function pickCachePositions(): { x: number; y: number }[] {
  const count = Phaser.Math.Between(CACHES.count.min, CACHES.count.max);
  const limit = MAP.size / 2 - CACHES.edgeMargin;
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let best: { x: number; y: number } | null = null;
    let bestGap = -1;
    // Retry until the spacing rule holds; if the map is too crowded, keep the roomiest try.
    for (let tries = 0; tries < 30; tries++) {
      const x = Phaser.Math.Between(-limit, limit);
      const y = Phaser.Math.Between(-limit, limit);
      if (Math.hypot(x, y) < CACHES.minDistFromStart) continue;
      const gap = placed.length ? Math.min(...placed.map((p) => Math.hypot(x - p.x, y - p.y))) : Infinity;
      if (gap > bestGap) {
        best = { x, y };
        bestGap = gap;
      }
      if (gap >= CACHES.minSpacing) break;
    }
    if (best) placed.push(best);
  }
  return placed;
}
