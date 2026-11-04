# nethack

Cyberpunk survivors-like (auto-firing weapons, enemy swarms, XP and level-up choices, boss on a timer) for the browser. Phaser 4 + TypeScript + Vite. Earlier prototype was in Godot; this is the restart.

## Game design
`docs/GAME_DESIGN.md` is the source of truth for what the game is meant to be. Read it before building or changing a feature. If a request conflicts with it (or touches something marked TBD), say so and ask rather than silently deciding. Henrik edits it; Claude only suggests changes.

## Build plan
`docs/PLAN.md` is the checklist of main features. Read it before starting a feature. If a request overlaps an unticked item, mention it and suggest doing them together (Henrik decides). Tick items off in the same change that completes them, and add new items when scope grows. If a request drifts from the plan's suggested order, that's fine, just note it.

## Roles
- Henrik: game design, assets, balancing. Claude writes most of the code.
- Keep tuning numbers in `src/data/` (`balance.ts`, `skills.ts`) so Henrik can balance without touching logic. Never hard-code a balance value in game code.

## Architecture rules (carried over from the Godot version)
- Skills are data: per-level stat rows read via `getSkillStats(id, level)`.
- Passive stat bonuses are re-summed from scratch on every change, never adjusted incrementally.
- Object pooling from day one: enemies and bullets come from Phaser groups (`group.get()`), and are disabled, not destroyed.
- Enemies move straight at the player; no pathfinding by design.
- Prototype scope: one character, one starting skill, 10 slots (5 active skill, 5 passive), 11 skills total (6 damage skills, 5 passives).

## Working style
- Small, runnable milestones: every change should leave the game playable.
- Placeholder art is generated in `src/scenes/BootScene.ts`; real assets load there under the same texture keys.

## Commands
- `npm run dev`: dev server with hot reload
- `npm run build`: typecheck + production build into `dist/` (uploadable to itch.io as HTML5)
- `npm run typecheck`

## Release
Repo stays private. Eventual release on itch.io. GitHub Pages (`.github/workflows/pages.yml`) is only for playtest builds.
