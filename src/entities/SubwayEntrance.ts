import Phaser from 'phaser';
import { LIGHTING } from '../data/balance';
import { addGlow, lit } from '../systems/Lighting';

/** Under the player and the enemies, over the ground and the props. */
const DEPTH = -2;

/**
 * A subway station entrance: stairs going down under a sign. There is one on the start plaza and one on the exit
 * plaza (the exit one is where the run ends, see ExtractionPoint). Only looks; nothing collides with it.
 */
export function createSubwayEntrance(scene: Phaser.Scene, x: number, y: number) {
  lit(scene.add.image(x, y, 'subway').setDepth(DEPTH));
  addGlow(scene, x, y - 30, LIGHTING.subway);
}
