# nethack
A fast-paced hacker slayer game: a cyberpunk survivors-like for the browser, built with [Phaser](https://phaser.io) and TypeScript.

## Play it locally
You need [Node.js](https://nodejs.org) 22 or newer (one-time install).

```bash
npm install     # first time only
npm run dev     # opens the game in your browser
```

While `npm run dev` runs, saving any file reloads the game instantly.

Controls: WASD or arrow keys to move. Weapons fire on their own.

## Balancing
All tuning numbers live in two files, with no game logic in them:

- `src/data/balance.ts`: player stats, enemy types, spawn rate
- `src/data/skills.ts`: skills and their per-level stats

## Builds
`npm run build` produces a `dist/` folder that can be uploaded to itch.io as an HTML5 game.
Every push and pull request also builds on GitHub: open the run under the **Actions** tab and download `nethack-web` at the bottom.

## Code layout
- `src/scenes/BootScene.ts`: creates placeholder graphics (swap in real art here)
- `src/scenes/GameScene.ts`: the run: spawning, collisions, HUD, game over
- `src/entities/`: player, enemies, bullets, weapons (enemies and bullets are pooled)
