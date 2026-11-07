import Phaser from 'phaser';
import { LIGHTING } from '../data/balance';

export type Glow = { radius: number; color: number; intensity: number };

/** Turns the scene's lights on and sets the ambient light. Call once, before anything is lit. */
export function enableLighting(scene: Phaser.Scene) {
  if (!LIGHTING.enabled) return;
  scene.lights.enable().setAmbientColor(LIGHTING.ambient);
}

/** Opts a game object into the lights. Does nothing while lighting is off. */
export function lit<T extends { setLighting(enable: boolean): T }>(object: T): T {
  return LIGHTING.enabled ? object.setLighting(true) : object;
}

/** Puts a light in the world (null while lighting is off). Phaser only draws the closest `maxLights` that are on screen. */
export function addGlow(scene: Phaser.Scene, x: number, y: number, glow: Glow) {
  if (!LIGHTING.enabled) return null;
  return scene.lights.addLight(x, y, glow.radius, glow.color, glow.intensity, glow.radius * LIGHTING.height);
}

/** Changes a light to another look (and hides it for null, e.g. a destroyed factory). */
export function setGlow(light: Phaser.GameObjects.Light | null, glow: Glow | null) {
  if (!light) return;
  light.setVisible(glow !== null);
  if (glow) light.setRadius(glow.radius).setColor(glow.color).setIntensity(glow.intensity).setZ(glow.radius * LIGHTING.height);
}
