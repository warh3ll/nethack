import Phaser from 'phaser';
import { MAP, PARALLAX } from '../data/balance';

/**
 * Far-away city backdrop behind the map. The city hides it, so it only shows past the wall.
 * Each layer is pinned to the screen (scrollFactor 0) and slid by hand: it is drawn a bit larger
 * than the screen, and the spare margin is used as travel room. The camera's position on the map
 * (-1 at one edge, +1 at the other) picks how far into that margin the layer sits, so a layer can
 * never run out of picture. Layers with a larger `depth` in balance.ts move more (they're nearer).
 */
export function createParallax(scene: Phaser.Scene) {
  const images = PARALLAX.layers.map((layer, i) => {
    const tex = scene.textures.get(layer.key);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST); // keep the pixel art crisp when scaled up
    return scene.add.image(0, 0, layer.key).setScrollFactor(0).setDepth(-1000 + i);
  });

  const place = () => {
    const cam = scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    // Cover the screen, plus spare room to slide in.
    const scale = Math.max(w / 576, h / 324) * PARALLAX.overscan;
    const half = MAP.size / 2;
    const nx = Phaser.Math.Clamp((cam.scrollX + w / 2) / half, -1, 1);
    const ny = Phaser.Math.Clamp((cam.scrollY + h / 2) / half, -1, 1);

    images.forEach((img, i) => {
      const { depth } = PARALLAX.layers[i];
      const marginX = (576 * scale - w) / 2;
      const marginY = (324 * scale - h) / 2;
      // Moving right on the map slides the layer left (it's far away, so it lags behind).
      img.setScale(scale).setPosition(w / 2 - nx * marginX * depth, h / 2 - ny * marginY * depth * PARALLAX.verticalShare);
    });
  };

  place();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, place);
  scene.events.once('shutdown', () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, place));
}
