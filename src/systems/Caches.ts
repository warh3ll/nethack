import { CACHES } from '../data/balance';
import { CELL, type City, type Point } from './City';
import { distance, pickApart, tileSpots } from './CitySpots';

/** Picks the cache positions of one run: anywhere off the road, away from the start, the objectives and each other. */
export function pickCachePositions(city: City, objectives: Point[]): Point[] {
  const count = city.between(CACHES.count.min, CACHES.count.max);
  const spots = tileSpots(city, [CELL.sidewalk, CELL.plaza, CELL.alley]).filter(
    (s) => distance(s, city.start) >= CACHES.minDistFromStart && objectives.every((o) => distance(s, o) >= CACHES.objectiveSpacing),
  );
  const placed: Point[] = [];
  for (let i = 0; i < count; i++) placed.push(pickApart(spots, placed, CACHES.minSpacing, city));
  return placed;
}
