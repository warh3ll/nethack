# Build Plan

Checklist of the main features, derived from `GAME_DESIGN.md` (which wins if the two disagree). Tick items off as they land; reorder freely. Each item should leave the game playable. This is a menu, not a schedule: pick whatever sounds fun next.

Legend: `[x]` done, `[ ]` to do. Section numbers refer to the design doc.

## Already in game
- [x] Player movement, health, invulnerability window, pause (s4)
- [x] Enemy swarm (Drone) with pooling and ramping spawn rate (s6)
- [x] Auto-Pistol and Virus damage skills (s5)
- [x] XP from kills and level-up picker (s5)
- [x] Hack server objective with prompts: IP, password, smack, inject, PIN (s7, s8)
- [x] Objective panel and objective marker (s7)
- [x] Skill bar (s5)

## 1. Run foundation
- [ ] Large bounded map (~10000x10000) with a visible boundary wall; tune walk time to 60-90 s edge to edge (s7)
- [ ] Camera and background so movement across the map is readable
- [ ] Run clock in the HUD (elapsed time only) (s7)
- [x] Compass pointing at the closest unfinished objective (s7)
- [ ] Random objective placement per run, 3-5 objectives, max two of one type (s7)
- [x] Objectives completable in any order (replace the fixed order in `RUN_OBJECTIVES`) (s7)

## 2. Run end
- [x] Extraction point revealed after the last objective; compass switches to it (s7). - [x] "log out" typing prompt, then 3-2-1 countdown, then win (s7). Leaving the point cancels both (open question in the design doc)
- [ ] Game-over on HP 0
- [ ] Results screen: credits gained, items found, objectives completed, level reached (s7)

## 3. Skills and level-ups
- [ ] Uncapped player level with a gently rising XP curve (s5)
- [ ] 5 active + 5 passive slots with separate offer rules (s5)
- [ ] Passive stat system, re-summed from scratch on every change (CLAUDE.md rules)
- [ ] Health Regen passive plus the other 4 passives (s5)
- [ ] Remaining 4 damage skills (designs TBD with Henrik) (s5)
- [ ] One reroll per level-up, and skip (s5)
- [ ] Fallback choice when nothing is useful: heal 30% or credits (s5)
- [ ] Level cap and upgrade rows for every skill (s5)

## 4. Data caches
- [ ] Caches scattered randomly on the map, rare (s3, s5)
- [ ] Opening a cache grants a skill/passive using the slot rules, no choice (s5)
- [ ] Rare cache/enemy drops of permanent items (s4b)
- [ ] Cache-opening UI (s10)

## 5. Enemies
- [ ] Goon miniboss: large, health bar, aggro radius, returns to guard, chases when damaged (s6)
- [ ] Enemy difficulty scaling with the run clock (s6)
- [ ] New dangerous enemy types joining over time (designs TBD) (s6)

## 6. More objective types
- [ ] Encryption Key: Goon guards a dossier (s7)
- [ ] Brute-force: 2-5 destructible outposts that spawn drones, then a pick-up secrets object (s7)
- [ ] Fourth objective type for variety (see open questions)

## 7. Economy and meta
- [ ] Credit chip drops from enemies with magnet pickup (s6, s9)
- [ ] Credits persist across runs, kept on death, extraction bonus (s9)
- [ ] Save to localStorage, plus export/import save code (s9)
- [ ] Main menu scene (start run, shop, equipment) (s9)
- [ ] Shop with two placeholder items per slot (Head, Arms, Hands, Back, Legs, Feet, Deck, 4 small) (s4b)
- [ ] Equip/unequip UI and item stats applied at run start (s4b)
- [ ] Dash on Shift from Feet items (s4)

## 8. Polish
- [ ] Real art and texture swap in `BootScene.ts` (s10)
- [ ] Audio (s10)
- [ ] Balance pass on `src/data/`
- [ ] itch.io HTML5 build and upload (CLAUDE.md)

## Suggested order
1 (map, clock, compass) -> 2 (finishing a run) -> 7 (credits, menu, shop) -> 3 (slots, passives) -> 4 (caches) -> 5/6 (Goon and objective types) -> 8.
That gives a complete start-to-finish loop early, then fills in depth.
