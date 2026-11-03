# nethack
A fast-paced hacker slayer game: a cyberpunk survivors-like for the browser, built with [Phaser](https://phaser.io) and TypeScript.

## Play it locally
You need [Node.js](https://nodejs.org) 22 or newer (one-time install).

```bash
npm install     # first time only
npm run dev     # opens the game in your browser
```

While `npm run dev` runs, saving any file reloads the game instantly.

Controls: WASD or arrow keys to move. There is no manual attack: every weapon fires on its own, starting with the Auto-Pistol. Kills give XP; on a level-up, click an upgrade card or press 1-3. Esc or P pauses.

## Balancing
All tuning numbers live in two files, with no game logic in them:

- `src/data/balance.ts`: player stats, enemy types and their XP, spawn rate, max level and XP curve, skill slots
- `src/data/skills.ts`: skills (weapons and passives) and their per-level stats; ones marked `[PH]` are placeholders

## Builds
`npm run build` produces a `dist/` folder that can be uploaded to itch.io as an HTML5 game.
Every push and pull request also builds on GitHub: open the run under the **Actions** tab and download `nethack-web` at the bottom.

## Code layout
- `src/scenes/BootScene.ts`: creates placeholder graphics (swap in real art here)
- `src/scenes/GameScene.ts`: the run: spawning, collisions, HUD, game over
- `src/entities/`: player, enemies, bullets, weapons (enemies and bullets are pooled)
- `src/systems/Progression.ts`: XP, levels, owned skills, upgrade offers, passive stat re-summing
- `src/ui/LevelUpPicker.ts` and `src/effects/levelUpFx.ts`: the upgrade choice screen and the yellow level-up burst
