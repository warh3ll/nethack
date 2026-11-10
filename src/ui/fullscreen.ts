import type Phaser from 'phaser';

/**
 * Browser fullscreen (hides the address bar). Android and desktop browsers support it; iPhone doesn't, so the buttons
 * are only shown where it works, and iPhone players use Add to Home Screen instead (index.html, manifest).
 * Has to be called from a tap or click (the browser refuses otherwise); `addButton` runs on pointerup, which counts.
 */
export function canFullscreen(scene: Phaser.Scene) {
  return scene.scale.fullscreen.available;
}

export function toggleFullscreen(scene: Phaser.Scene) {
  if (!canFullscreen(scene)) return;
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else scene.scale.startFullscreen();
}
