import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { RipdocScene } from './scenes/RipdocScene';
import { LIGHTING } from './data/balance';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05060a',
  // Long-press on a phone would otherwise open the browser menu mid-run.
  disableContextMenu: true,
  // Fullscreen takes the whole page, not just the canvas, so HTML overlays like the save code dialog still show.
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', fullscreenTarget: document.documentElement },
  physics: { default: 'arcade', arcade: { debug: false } },
  render: { maxLights: LIGHTING.maxLights },
  scene: [BootScene, MenuScene, RipdocScene, GameScene],
});

// Dev builds only: lets a test script reach the running game (scenes, player) from the browser console.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
