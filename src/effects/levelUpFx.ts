import Phaser from 'phaser';

const COLOR = 0xffd23e;
const COLOR_CSS = '#ffd23e';

/** Yellow burst around the player on level-up: expanding rings, a screen glow, a player flash and a label. */
export function playLevelUpFx(scene: Phaser.Scene, target: Phaser.GameObjects.Image, level: number) {
  const { x, y } = target;

  for (let i = 0; i < 2; i++) {
    const ring = scene.add.circle(x, y, 20).setStrokeStyle(4 - i, COLOR).setDepth(20);
    scene.tweens.add({
      targets: ring,
      scale: 7 + i * 3,
      alpha: 0,
      duration: 550 + i * 200,
      delay: i * 90,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  const glow = scene.add.circle(x, y, 60, COLOR, 0.45).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, scale: 2.5, alpha: 0, duration: 600, onComplete: () => glow.destroy() });

  const cam = scene.cameras.main;
  const wash = scene.add
    .rectangle(0, 0, cam.width, cam.height, COLOR, 0.22)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(90);
  scene.tweens.add({ targets: wash, alpha: 0, duration: 450, onComplete: () => wash.destroy() });

  target.setTint(COLOR).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(350, () => target.clearTint());

  const label = scene.add
    .text(x, y - 30, `LEVEL ${level}`, { fontFamily: 'monospace', fontSize: '22px', color: COLOR_CSS, fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(21);
  scene.tweens.add({
    targets: label,
    y: y - 70,
    alpha: { from: 1, to: 0 },
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}
