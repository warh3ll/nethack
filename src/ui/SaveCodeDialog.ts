import type Phaser from 'phaser';
import { account } from '../systems/Account';
import { decodeSaveCode } from '../systems/Save';

/**
 * Export and import of the save code (GAME_DESIGN section 9).
 * Plain HTML, styled in index.html: Phaser has no text input, and window.prompt is blocked in the iframe itch.io uses.
 */
export class SaveCodeDialog {
  private root = document.createElement('div');
  private exportBox: HTMLTextAreaElement;
  private importBox: HTMLTextAreaElement;
  private status: HTMLElement;
  private importButton: HTMLButtonElement;
  /** True once a valid code has been shown for confirmation, since importing replaces the current save. */
  private confirming = false;

  constructor(
    private scene: Phaser.Scene,
    private onClose: () => void,
  ) {
    // Once a run has been played Phaser swallows WASD, the arrows and space page-wide, which would eat them in the text box.
    scene.input.keyboard!.disableGlobalCapture();

    this.root.className = 'save-dialog';
    this.root.innerHTML = `
      <div class="panel">
        <h2>SAVE CODE</h2>
        <label for="save-export">Your save. Keep this code somewhere safe as a backup.</label>
        <textarea id="save-export" readonly spellcheck="false"></textarea>
        <div class="row"><button data-action="copy">COPY</button></div>
        <label for="save-import">Restore a save. This replaces your current save.</label>
        <textarea id="save-import" spellcheck="false" placeholder="paste a save code"></textarea>
        <div class="row"><button data-action="import">IMPORT</button></div>
        <div class="status" role="status"></div>
        <div class="row"><button data-action="close">CLOSE</button></div>
      </div>`;
    this.exportBox = this.root.querySelector('#save-export')!;
    this.importBox = this.root.querySelector('#save-import')!;
    this.status = this.root.querySelector('.status')!;
    this.importButton = this.root.querySelector('[data-action="import"]')!;
    this.exportBox.value = account.exportCode();

    this.on('copy', () => void this.copy());
    this.on('import', () => this.import());
    this.on('close', () => this.close());
    this.importBox.addEventListener('input', () => this.setConfirming(false));
    document.body.append(this.root);
  }

  close() {
    this.root.remove();
    this.scene.input.keyboard!.enableGlobalCapture();
    this.onClose();
  }

  private on(action: string, run: () => void) {
    this.root.querySelector(`[data-action="${action}"]`)!.addEventListener('click', run);
  }

  private say(message: string, good: boolean) {
    this.status.textContent = message;
    this.status.classList.toggle('good', good);
  }

  private async copy() {
    try {
      await navigator.clipboard.writeText(this.exportBox.value);
      this.say('Copied.', true);
    } catch {
      // The clipboard can be off limits inside an iframe.
      this.exportBox.select();
      this.say('Could not copy. Select the code and copy it by hand.', false);
    }
  }

  private setConfirming(confirming: boolean) {
    this.confirming = confirming;
    this.importButton.textContent = confirming ? 'REPLACE' : 'IMPORT';
    if (!confirming) this.say('', false);
  }

  private import() {
    const save = decodeSaveCode(this.importBox.value);
    if (!save) {
      this.say('That code is not valid. Nothing was changed.', false);
      return;
    }
    if (!this.confirming) {
      this.setConfirming(true);
      this.say(`Replace your ${account.credits} credits with ${save.credits} credits?`, false);
      return;
    }
    account.importCode(this.importBox.value);
    this.setConfirming(false);
    this.importBox.value = '';
    this.exportBox.value = account.exportCode();
    this.say(`Save restored: ${account.credits} credits.`, true);
  }
}
