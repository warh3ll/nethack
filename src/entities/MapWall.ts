import Phaser from 'phaser';
import { MAP } from '../data/balance';
import type { City } from '../systems/City';
import { createCityView } from './CityView';

const HALF = MAP.size / 2;

/** True if the point is on the playable map. The map is centred on the player's start at (0, 0). */
export function insideMap(x: number, y: number) {
  return Math.abs(x) <= HALF && Math.abs(y) <= HALF;
}

/**
 * Sets up the bounded map: physics bounds (things with collideWorldBounds stop there), the city
 * and the wall around it. The city ends at the wall, so what's past the wall is empty void.
 */
export function createMap(scene: Phaser.Scene, city: City) {
  const t = MAP.wallThickness;
  scene.physics.world.setBounds(-HALF, -HALF, MAP.size, MAP.size);
  createCityView(scene, city);

  // The wall stands just outside the bounds, so the player stops flush against it.
  const wall = (x: number, y: number, w: number, h: number) => scene.add.tileSprite(x, y, w, h, 'wall').setOrigin(0).setDepth(1);
  wall(-HALF - t, -HALF - t, MAP.size + t * 2, t);
  wall(-HALF - t, HALF, MAP.size + t * 2, t);
  wall(-HALF - t, -HALF, t, MAP.size);
  wall(HALF, -HALF, t, MAP.size);
  scene.add.graphics().setDepth(1).lineStyle(4, 0xff2e88).strokeRect(-HALF, -HALF, MAP.size, MAP.size);
}
