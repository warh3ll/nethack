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
- [ ] HUD: remove the enemies counter; add credits and items-found counters once those exist (s10)
- [x] Compass pointing at the closest unfinished objective (s7)
- [x] Random objective placement per run, 3-5 objectives, max two of one type (s7). Positions are random in a 6000x6000 square around the start until the real map exists (then re-place them on it)
- [x] Objectives completable in any order (s7)

## 2. Run end

- [x] Extraction point revealed after the last objective; compass switches to it (s7). - [x] "log out" typing prompt, then 3-2-1 countdown, then win (s7). Leaving the point cancels both (open question in the design doc)
- [ ] Game-over on HP 0
- [x] Results screen: credits gained, items found, objectives completed, level reached (s7). Items show 0 until caches (section 4) exist

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
- [ ] Rare drops of permanent items from a separate find-only list; about 2.5% of caches (s4b)
- [ ] Cache-opening UI (s10)

## 5. Enemies

- [x] Goon miniboss: large, health bar, aggro radius, returns to guard, chases when damaged, shoots at the player, hunts forever once the dossier is taken (s6)
- [ ] Enemy difficulty scaling with the run clock (s6)
- [ ] New dangerous enemy types joining over time (designs TBD) (s6)
  - [x] Marksman: ranged swarm enemy, holds at 250 px and shoots; joins the shared spawn pool at 5% chance, +1% every 30 s (`SPAWNING.specialEnemies`)
  - [ ] Further types (TBD)

## 6. More objective types

- [x] Grab encryption key: Goon guards a dossier (s7). Walking onto the dossier takes the key; killing the Goon is optional, but taking the dossier makes him hunt the player until he's dead
- [x] Steal secrets: 2-4 destructible outposts that spawn drones, then a pick-up secrets object (s7). More outposts means slightly less hp each; drones spawn only while the player is near
- [x] Connect servers: grab a cable with E, attach it to a server 300-400 px away (cable max 600 px) by holding E for 2.5 s (damage resets), with a cable line drawn (s7). The second server is placed randomly around the first; the cable stays in hand once grabbed
- [ ] New hacking interaction - PIN code. The player needs to enter a pin code, four random digits from 0-9

## 7. Economy and meta

- [x] Credit chip drops from enemies with magnet pickup: Drone 1, Goon 5 (placeholders in `balance.ts`) (s6, s9)
- [ ] Credits persist across runs, kept on death, extraction bonus (s9)
- [ ] Save to localStorage, plus export/import save code (s9)
- [ ] Main menu scene (start run, shop, equipment) (s9)
- [ ] Shop with two placeholder items per slot (Head, Arms, Hands, Back, Legs, Feet, Deck, 4 small) (s4b)
- [ ] Equip/unequip UI and item stats applied at run start (s4b)
- [ ] Dash on Space from Feet items (s4)

## 8. Polish

- [ ] Real art and texture swap in `BootScene.ts` (s10)
- [ ] Audio (s10)
- [ ] Balance pass on `src/data/`
- [ ] itch.io HTML5 build and upload (CLAUDE.md)
- [x] GitHub Pages deploy on push to main, for playtesting (`.github/workflows/pages.yml`)

## Suggested order

1 (map, clock, compass) -> 2 (finishing a run) -> 7 (credits, menu, shop) -> 3 (slots, passives) -> 4 (caches) -> 5/6 (Goon and objective types) -> 8.
That gives a complete start-to-finish loop early, then fills in depth.
