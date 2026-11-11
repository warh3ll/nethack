import Phaser from 'phaser';
import { createParallax } from '../entities/Parallax';
import { account } from '../systems/Account';
import { addButton } from '../ui/Button';
import { canFullscreen, toggleFullscreen } from '../ui/fullscreen';
import { SaveCodeDialog } from '../ui/SaveCodeDialog';

const CYAN = '#2ef2ff';
const GOLD = '#ffd23e';
const CONTENT_W = 360;
const BUTTON_H = 48;
const BUTTON_GAP = 12;
/** Space kept clear around the menu on small screens. */
const SCREEN_MARGIN = 16;

/** The title screen, where a run starts and the player returns to afterwards (GAME_DESIGN section 9). */
export class MenuScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private scrim!: Phaser.GameObjects.Rectangle;
  private creditsText!: Phaser.GameObjects.Text;
  private contentH = 0;
  private dialog: SaveCodeDialog | null = null;

  constructor() {
    super('menu');
  }

  create() {
    this.dialog = null;
    createParallax(this);
    this.scrim = this.add.rectangle(0, 0, 1, 1, 0x05060a, 0.6).setOrigin(0).setScrollFactor(0);
    this.root = this.add.container(0, 0).setScrollFactor(0);

    const title = this.add
      .text(CONTENT_W / 2, 0, 'NETHACK', { fontFamily: 'monospace', fontSize: '64px', fontStyle: 'bold', color: CYAN })
      .setOrigin(0.5, 0);
    const hook = this.add
      .text(CONTENT_W / 2, 84, 'Corpos are ruining the life and livelihoods of regular people, make sure they suffer.', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#c8f7ff',
        align: 'center',
        wordWrap: { width: CONTENT_W },
      })
      .setOrigin(0.5, 0);
    this.creditsText = this.add
      .text(CONTENT_W / 2, hook.y + hook.height + 24, '', { fontFamily: 'monospace', fontSize: '20px', color: GOLD })
      .setOrigin(0.5, 0);
    this.root.add([title, hook, this.creditsText]);
    this.showCredits();

    let y = this.creditsText.y + this.creditsText.height + 28;
    const button = (label: string, color: string, run?: () => void) => {
      addButton(this, this.root, { x: 0, y, width: CONTENT_W, height: BUTTON_H, label, color, run });
      y += BUTTON_H + BUTTON_GAP;
    };
    button('[ENTER] START RUN', CYAN, () => this.startRun());
    button('[R] RIPDOC', CYAN, () => this.openRipdoc());
    button('[C] SAVE CODE', GOLD, () => this.openSaveCode());
    // Only where the browser supports it (not on iPhone, which uses Add to Home Screen instead).
    if (canFullscreen(this)) button('[F] FULLSCREEN', CYAN, () => toggleFullscreen(this));
    this.contentH = y - BUTTON_GAP;

    // The keyboard reaches the game even while the player types in the dialog, so these all check for it.
    this.input.keyboard!.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard!.on('keydown-R', () => this.openRipdoc());
    this.input.keyboard!.on('keydown-C', () => this.openSaveCode());
    this.input.keyboard!.on('keydown-ESC', () => this.dialog?.close());
    this.input.keyboard!.on('keydown-F', () => {
      if (!this.dialog) toggleFullscreen(this);
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  private showCredits() {
    this.creditsText.setText(`credits ${account.credits}`);
  }

  private startRun() {
    if (!this.dialog) this.scene.start('game');
  }

  private openRipdoc() {
    if (!this.dialog) this.scene.start('ripdoc');
  }

  private openSaveCode() {
    if (this.dialog) return;
    this.dialog = new SaveCodeDialog(this, () => {
      this.dialog = null;
      this.showCredits();
    });
  }

  /** Centres the menu, shrinking it to fit small screens. */
  private layout() {
    const { width, height } = this.scale;
    this.scrim.setSize(width, height);
    const fit = Math.min(1, (width - SCREEN_MARGIN * 2) / CONTENT_W, (height - SCREEN_MARGIN * 2) / this.contentH);
    this.root.setScale(fit).setPosition((width - CONTENT_W * fit) / 2, (height - this.contentH * fit) / 2);
  }
}
