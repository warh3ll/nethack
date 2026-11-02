# Game Design Document

Living document. Henrik owns it and edits freely; Claude reads it before building features and flags anything that drifts from it.

**Legend:** items marked **TBD** are undecided. Items marked *(in game)* are already implemented as a prototype. Everything else is intent.

## 1. Pitch
A cyberpunk survivors-like for the browser. Each game is a **run** made of 3-5 objectives. You roam the map hunting for the next objective while auto-firing weapons at hordes of enemies, picking up upgrades from data caches along the way, and hacking ICE-protected servers under fire.

- **Working title:** TBD
- **One-line hook:** TBD
- **Platform:** browser (HTML5), released on itch.io. Repo stays private.
- **Tech:** Phaser 4, TypeScript, Vite.

## 2. Design pillars
Rules to check every feature against. Edit these first.

1. TBD (e.g. "Always be moving: positioning is the main skill")
2. TBD (e.g. "Every level-up is a meaningful choice")
3. TBD (e.g. "Readable chaos: the screen is full but never unfair")

## 3. Core loop
1. Move around the map while weapons fire automatically at enemies *(in game: arena only)*.
2. Enemies spawn outside the screen and walk straight at the player; the spawn rate ramps up over the run *(in game)*.
3. Explore the map to find the current objective. TBD: how the player is guided (marker, compass, none).
4. Along the way, find data caches scattered randomly on the map and open them for passive upgrades, weapons or nethacking skills (section 5).
5. Complete the objective (often by hacking, section 8), then move on to the next one.
6. Finish all objectives to complete the run. Some objectives are timed, so a run clock is always visible.

TBD: whether kills still drop XP and trigger level-ups, or whether caches are the only source of upgrades (see open questions).

## 4. Player
- One playable character in the prototype *(in game)*; more are TBD.
- Movement: direct control, no dash yet *(in game)*. TBD: dash or other movement ability.
- Health with a brief invulnerability window after each hit *(in game)*. TBD: regeneration or healing sources.
- **Primary gun:** aimed and fired by the player with the mouse *(in game: rifle)*. This sits alongside the auto-firing skills, so aiming is an active layer on top of the auto-fire.
- Pause with Escape or P *(in game)*.

## 5. Skills and progression
- **Slots:** 5 skill slots.
- **Kinds:** weapons, passives, and **nethacking skills** (new; abilities related to hacking and the net). TBD: do nethacking skills share the 5 slots or have their own?
- **Where they come from:** data caches found randomly on the map. TBD: cache rarity, whether the player picks from a few options or gets a random one, whether caches are guarded.
- **Prototype roster:** 10 skills, 6 weapons and 4 passives (only the Auto-Pistol exists so far). TBD: where nethacking skills fit in that count.
- Each skill has per-level stat rows, defined in data (`src/data/skills.ts`).
- Passive bonuses are always re-summed from scratch, never adjusted incrementally.
- One starting skill: Auto-Pistol *(in game)*.

### Skill list
| Skill | Kind | Idea | Status |
|---|---|---|---|
| Auto-Pistol | weapon | Fires at the nearest enemy; gains pierce and double shot with levels | in game |
| TBD | weapon | | |
| TBD | weapon | | |
| TBD | weapon | | |
| TBD | weapon | | |
| TBD | weapon | | |
| TBD | passive | | |
| TBD | passive | | |
| TBD | passive | | |
| TBD | passive | | |

TBD: level cap per skill, evolutions/combinations, what happens when all slots are full and maxed.

## 6. Enemies
- Move straight at the player; no pathfinding, by design.
- Deal contact damage.
- **Drone:** basic swarm enemy *(in game)*.
- TBD: further enemy types, elites, how enemy variety scales with time.

## 7. Run structure and objectives
- A run is one attempt made of **3-5 objectives**, completed in sequence.
- The map is explored freely; the player must find where the next objective is.
- Some objectives are **timed**. A **run clock is always visible in the UI**.
- **Objective types:** TBD, to be specified later. Known so far: hacking ICE-protected servers or objectives (section 8). Candidates to decide: boss fight, defend a point, retrieve an item, eliminate a target.
- **Lose:** HP reaches 0. TBD: what a failed timed objective does (instant loss, penalty, or skipped).
- **Win:** complete the final objective. TBD: run length target, difficulty ramp across objectives.
- The earlier "boss on a timer" idea is now just one possible objective type (TBD).

## 8. Hacking (ICE)
Some objectives require hacking the ICE protecting a server or objective.

- The player must **stay within a certain range** of the target while the hack runs. Leaving the range pauses or breaks it. TBD: which one, and the range size.
- A **percentage status bar** shows hack progress.
- The player **can shoot while hacking**, so hacking happens under pressure from enemy hordes.
- **Interaction prompts:** at points during the hack the player may have to type something or react with a key press to continue. TBD: prompt types (typed words/commands, timed key presses), what failure costs (progress loss, damage, reset), and how often prompts appear.
- TBD: hack duration, whether enemies are drawn toward or spawn extra during a hack, and how nethacking skills affect hacks (faster, wider range, fewer prompts).

## 9. Meta progression
TBD. Out of prototype scope. Candidates: unlockable characters/skills, persistent upgrades, currency from runs.

## 10. Setting, art and audio
- **Setting:** cyberpunk.
- **Art direction:** TBD. Placeholder shapes are generated in `BootScene.ts`; real assets will replace them under the same texture keys.
- **Audio:** TBD.
- **UI:** the HUD always shows the **run clock**. Also needed: current objective, hack progress bar (during hacks), HP, skill slots. Pause screen exists as a first version *(in game)*. TBD: cache-opening screen.

## 11. Scope
**Prototype (current target):** one character, one starting skill, 5 slots, 10 skills (6 weapons, 4 passives), one enemy type growing to a few, a map to explore, data caches, a run clock, and a short run of objectives including at least one hacking objective.

**Out of scope for now:** TBD (e.g. multiple characters, meta progression, multiplayer, mobile).

## 12. Technical constraints that shape design
- Hundreds of enemies on screen: object pooling is mandatory, and `maxEnemies` caps the swarm.
- All tuning numbers live in `src/data/` (`balance.ts`, `skills.ts`, `guns.ts`) so balancing needs no logic changes.
- The game must stay playable after every change.

## 13. Open questions
- Do kills still give XP and level-ups, or are data caches the only source of upgrades?
- Map: one big scrolling map, or generated per run? Size, and how objectives and caches are placed.
- Do nethacking skills use the 5 skill slots?
- Objective list and how they differ from each other.
