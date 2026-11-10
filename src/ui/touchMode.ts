import type Phaser from 'phaser';

/**
 * Whether the player is playing by touch. Starts from what the device is (a phone or tablet), then follows the
 * last pointer used, so a laptop with a touch screen switches back as soon as the mouse is used.
 * Decides the touch-only UI: the hack prompt panel, raised hold bars, and labels without "[E]".
 */
let touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

export function isTouchMode() {
  return touch;
}

/** Call once per scene that should keep the mode up to date. */
export function watchTouchMode(scene: Phaser.Scene) {
  const onDown = (p: Phaser.Input.Pointer) => (touch = p.wasTouch);
  scene.input.on('pointerdown', onDown);
  scene.events.once('shutdown', () => scene.input.off('pointerdown', onDown));
}

/** Picks the label to show: keyboard text on desktop, touch text on touch screens. */
export function hint(keyboard: string, touchText: string) {
  return touch ? touchText : keyboard;
}

/** Extra height for hold progress bars on touch screens, so the thumb doesn't cover them. */
export function holdRaise(raise: number) {
  return touch ? raise : 0;
}
