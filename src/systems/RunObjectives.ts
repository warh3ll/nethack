import Phaser from 'phaser';
import { RUN_GENERATION, type ObjectiveDef } from '../data/objectives';

const TYPES = Object.keys(RUN_GENERATION.names) as ObjectiveDef['type'][];

/** Picks the objectives of one run: a random count, at most `maxPerType` of one type, at random positions. */
export function generateRunObjectives(): ObjectiveDef[] {
  const g = RUN_GENERATION;
  // Every type appears maxPerType times in the pool; draw without replacement.
  const pool = TYPES.flatMap((t) => Array<ObjectiveDef['type']>(g.maxPerType).fill(t));
  const count = Math.min(Phaser.Math.Between(g.count.min, g.count.max), pool.length);
  const types = Phaser.Utils.Array.Shuffle(pool).slice(0, count);
  // Guarantee the required types: swap in a random slot not already holding a required type.
  for (const req of g.required) {
    if (types.includes(req)) continue;
    const free = types.map((_, i) => i).filter((i) => !g.required.includes(types[i]));
    types[Phaser.Utils.Array.GetRandom(free)] = req;
  }

  const placed: { x: number; y: number }[] = [];
  const seen: Partial<Record<ObjectiveDef['type'], number>> = {};
  return types.map((type) => {
    const { x, y } = pickPosition(placed);
    placed.push({ x, y });
    const total = types.filter((t) => t === type).length;
    const n = (seen[type] = (seen[type] ?? 0) + 1);
    return { id: `${type}${n}`, type, name: total > 1 ? `${g.names[type]} ${n}` : g.names[type], x, y };
  });
}

/** Random point away from the start and from the others. Gives up on the spacing rule if the area is too crowded. */
function pickPosition(placed: { x: number; y: number }[]) {
  const g = RUN_GENERATION;
  let best = { x: 0, y: 0 };
  let bestGap = -1;
  for (let i = 0; i < 200; i++) {
    const x = Phaser.Math.Between(-g.areaHalfSize, g.areaHalfSize);
    const y = Phaser.Math.Between(-g.areaHalfSize, g.areaHalfSize);
    const fromStart = Math.hypot(x, y);
    if (fromStart < g.minDistFromStart) continue;
    const gap = Math.min(fromStart, ...placed.map((p) => Math.hypot(x - p.x, y - p.y)));
    if (gap >= g.minSpacing) return { x, y };
    if (gap > bestGap) {
      best = { x, y };
      bestGap = gap;
    }
  }
  return best;
}
