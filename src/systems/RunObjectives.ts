import { RUN_GENERATION, type ObjectiveDef } from '../data/objectives';
import type { City, Point } from './City';
import { distance, plazaSpots, serverPairs, serverSpots } from './CitySpots';

const TYPES = Object.keys(RUN_GENERATION.names) as ObjectiveDef['type'][];

/** Where an objective can stand. Connect servers also needs a spot for its second server. */
type Site = Point & { partner?: Point };

/** Everything the objectives put on the map: Connect servers has two spots, the others one. */
export const objectivePoints = (defs: ObjectiveDef[]): Point[] => defs.flatMap((d) => (d.partner ? [d, d.partner] : [d]));

/** Picks the objectives of one run: a random count, at most `maxPerType` of one type, each where its type belongs in the city. */
export function generateRunObjectives(city: City): ObjectiveDef[] {
  const g = RUN_GENERATION;
  const clearOfStart = (s: Site) => [s, s.partner ?? s].every((p) => distance(p, city.start) >= g.minDistFromStart);
  const plazas = plazaSpots(city).filter(clearOfStart);
  const sites: Record<ObjectiveDef['type'], Site[]> = {
    hackServer: serverSpots(city).filter(clearOfStart),
    connectServers: serverPairs(city).filter(clearOfStart),
    encryptionKey: plazas,
    stealSecrets: plazas,
  };

  // Every type appears maxPerType times in the pool; draw without replacement. A rare map has no front long enough for Connect servers.
  const pool = TYPES.filter((t) => sites[t].length > 0).flatMap((t) => Array<ObjectiveDef['type']>(g.maxPerType).fill(t));
  const count = Math.min(city.between(g.count.min, g.count.max), pool.length);
  const types = city.shuffled(pool).slice(0, count);
  // Guarantee the required types: swap in a random slot not already holding a required type.
  for (const req of g.required) {
    if (types.includes(req)) continue;
    const free = types.map((_, i) => i).filter((i) => !g.required.includes(types[i]));
    types[free[city.between(0, free.length - 1)]] = req;
  }

  // The first objective is close to the start. There may be no plaza that close, so it goes to the first type with a site in reach.
  const inReach = (s: Point) => distance(s, city.start) <= g.firstObjectiveMaxDist;
  const first = types.findIndex((t) => sites[t].some(inReach));
  if (first > 0) [types[0], types[first]] = [types[first], types[0]];

  const placed: Point[] = [];
  const clearOfOthers = (s: Site) => [s, s.partner ?? s].every((p) => placed.every((o) => distance(p, o) >= g.minSpacing));
  const chosen: { type: ObjectiveDef['type']; site: Site }[] = [];
  types.forEach((type, i) => {
    const clear = sites[type].filter(clearOfOthers);
    // A crowded map can run out of room for Connect servers: better one objective fewer than two on top of each other.
    if (clear.length === 0) return;
    const close = i === 0 ? clear.filter(inReach) : [];
    const site = pickSite(close.length > 0 ? close : clear, city);
    placed.push(site, site.partner ?? site);
    chosen.push({ type, site });
  });

  const seen: Partial<Record<ObjectiveDef['type'], number>> = {};
  return chosen.map(({ type, site }) => {
    const total = chosen.filter((c) => c.type === type).length;
    const n = (seen[type] = (seen[type] ?? 0) + 1);
    return { id: `${type}${n}`, type, name: total > 1 ? `${g.names[type]} ${n}` : g.names[type], ...site };
  });
}

/** A random site. Connect servers gaps get an even chance: short ones would win on numbers alone, since more of them fit on a front. */
function pickSite(sites: Site[], city: City): Site {
  const gapOf = (s: Site) => (s.partner ? distance(s, s.partner) : 0);
  const gaps = [...new Set(sites.map(gapOf))];
  const gap = gaps[city.between(0, gaps.length - 1)];
  const same = sites.filter((s) => gapOf(s) === gap);
  return same[city.between(0, same.length - 1)];
}
