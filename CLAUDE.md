# nethack

Cyberpunk survivors-like (auto-firing weapons, enemy swarms, XP and level-up choices, boss on a timer) for the browser. Phaser 4 + TypeScript + Vite. Earlier prototype was in Godot; this is the restart.

## Game design

`docs/GAME_DESIGN.md` is the source of truth for what the game is meant to be. Read it before building or changing a feature. If a request conflicts with it (or touches something marked TBD), say so and ask rather than silently deciding. Henrik edits it; Claude only suggests changes.

## Build plan

`docs/PLAN.md` is the checklist of main features. Read it before starting a feature. If a request overlaps an unticked item, mention it and suggest doing them together (Henrik decides). Tick items off in the same change that completes them, and add new items when scope grows. If a request drifts from the plan's suggested order, that's fine, just note it.

## Roles

- Henrik (game designer, director): game design, assets, balancing, items. Claude writes most of the code.
- Keep tuning numbers in `src/data/` (`balance.ts`, `skills.ts`) so Henrik can balance without touching logic. Never hard-code a balance value in game code.

## Architecture rules (carried over from the Godot version)

- Skills are data: per-level stat rows read via `getSkillStats(id, level)`.
- Passive stat bonuses are re-summed from scratch on every change, never adjusted incrementally.
- Object pooling from day one: enemies and bullets come from Phaser groups (`group.get()`), and are disabled, not destroyed.
- Enemies navigate with one shared flow field (walking distance from the player); no per-enemy pathfinding.
- Prototype scope: one character, one starting skill, 10 slots (5 active skill, 5 passive), 12 skills total (7 damage skills, 5 passives).

## Working style

- Always work on a new branch, never directly on main. Do not merge to main until Henrik says so (he does that once he's happy with the result). When he does say so, merge and also push main to origin. Then delete the merged branch locally and on origin (its commits stay in main's history).
- Small, runnable milestones: every change should leave the game playable.
- Playtest features that come from `docs/PLAN.md` (they are usually larger) before calling them done: run the dev server and drive the game in a real browser, and check that the feature actually shows up and works, not just that it typechecks. Say plainly what was and wasn't exercised.
- Textures are generated or loaded in `src/scenes/BootScene.ts`; swapping in new art there under the same texture keys is enough.
- Item designs are detailed in `docs/ITEMS.md`, always check this when handling skills or other player, enemy, world interaction since equipped items may affect them.
- Always ask the director (multi-choice) for anything that needs clarification

## Commands

- `npm run dev`: dev server with hot reload
- `npm run build`: typecheck + production build into `dist/` (uploadable to itch.io as HTML5)
- `npm run typecheck`

## Release

Repo is public for now (needed for free GitHub Pages); may go private later if Henrik upgrades GitHub, at which point Pages playtests would need a paid plan or itch.io. Eventual release on itch.io. GitHub Pages (`.github/workflows/pages.yml`) is only for playtest builds.
