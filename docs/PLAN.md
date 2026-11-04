# Build Plan

Checklist of the main features, derived from `GAME_DESIGN.md` (which wins if the two disagree). Tick items off as they land; reorder freely. Each item should leave the game playable. This is a menu, not a schedule: pick whatever sounds fun next.

Legend: `[x]` done, `[ ]` to do. Section numbers refer to the design doc.

## Already in game

- [x] Player movement, health, invulnerability window, pause (s4)
- [x] Enemy swarm (Drone) with pooling and ramping spawn rate (s6)
- [x] Auto-Pistol, Virus and Railgun damage skills (s5)
- [x] XP from kills and level-up picker (s5)
- [x] Hack server objective with prompts: IP, password, smack, inject, PIN (s7, s8)
- [x] Objective panel and objective marker (s7)
- [x] Skill bar, split into 5 active + 5 passive slots (s5)
- [x] Large bounded map (10000x10000) with visible wall, camera follow and background grid (s7)
- [x] Compass to the closest unfinished objective; objectives in any order (s7)
- [x] Random per-run objectives, 3-5, max two of a type, at least one hack, one near the start (s7)
- [x] All four objective types: Hack server, Grab encryption key (Goon), Steal secrets (outposts), Connect servers (s7)
- [x] Extraction point, "log out" prompt, countdown, win (s7)
- [x] Game over on HP 0, results screen on win and death (s7)
- [x] Goon miniboss and Marksman ranged enemy with a shared, time-scaled spawn pool (s6)
- [x] Credit chip drops with magnet pickup (s6, s9)
- [x] Passive stat system, re-summed from scratch, with four placeholder passives (`[PH]` in `skills.ts`) (s5)
- [x] Fallback level-up choice (heal) when nothing is useful (s5)
- [x] GitHub Pages playtest deploy (`.github/workflows/pages.yml`)

## Work packages (suggested next)

Roughly in the order I'd do them. Each is a few sessions' worth at most and leaves the game playable.

### A. HUD and run polish (small, do first)
- [x] Run clock shown as its own HUD element (it's currently in the one-line text with `lv`, `kills`, `credits`, `enemies`) (s7, s10)
- [x] Remove the enemies counter; credits counter stays; items-found counter once caches exist (s10)
- [x] Extraction bonus credits on win (15, placeholder in `balance.ts`) added to the run's credits (s9)
- [x] Verify the 3-5 objective rule, the extraction-cancel rule and the results screen against the design doc in one playtest pass

### B. Skills and level-up rules (the biggest gap in the core loop)
- [ ] Separate offer rules for active vs passive slots: when one group is full, only offer upgrades there plus the other group (s5)
- [x] One reroll per level-up, and skip (s5)
- [ ] Fallback choice gets the second option: credits instead of heal (amount TBD) (s5)
- [ ] Replace the `[PH]` passives with the real 5, including Health Regen and a base slow player regen (s4, s5)
- [ ] Remaining damage skills: 6 are planned, 3 exist (Auto-Pistol, Virus, Railgun) plus the `[PH] Scatter Gun`. Designs TBD with Henrik, so this is a design session first (s5)
- [ ] Per-skill level cap and upgrade rows for every skill (s5)
- [ ] Uncapped player level with a gently rising XP curve: check the curve in `balance.ts` holds up past level 20 (s5)

### C. Data caches
- [ ] Caches scattered randomly on the map, rare; compass/marker does not point to them (s3, s5)
- [ ] Opening a cache grants a skill/passive using the slot rules, no choice (s5)
- [ ] Cache-opening UI and the items-found counter (s10)
- [ ] Rare find-only items, about 2.5% of caches. Needs the item system from D first, so a placeholder item list is fine (s4b)
- [ ] Optional: rare cache drop from enemies (s5)

### D. Meta loop: save, menu, shop, items (turns it into a game you return to)
Best done together, in this order:
- [ ] Credits persist across runs (kept on death) (s9)
- [ ] Save to localStorage, plus export/import save code (s9)
- [ ] Main menu scene: start run, shop, equipment (s9)
- [ ] Item data file in `src/data/` (slots, stats, price) with two placeholder items per slot: Head, Arms, Hands, Back, Legs, Feet, Deck, 4 small (s4b)
- [ ] Shop (buy) and equipment (equip/unequip/swap) UI (s4b)
- [ ] Item stats applied at run start through the same re-sum as passives
- [ ] Dash on Shift from Feet items (the design doc says Shift; the old plan said Space) (s4)

### E. Enemies and difficulty
- [ ] Enemy difficulty scaling with the run clock beyond the Marksman chance: hp, damage, spawn rate (s6)
- [ ] More enemy types joining over time (designs TBD): a fast one, a tank, an elite? Needs a design session (s6)
- [ ] Decide whether difficulty also scales with objectives completed (open question in s7)

### F. More objective types (optional, after the above)
Candidates from the design doc: boss fight, defend a point, retrieve an item, eliminate a target. None are decided, so pick one and write it into the design doc first (s7).

### G. Polish and release
- [ ] Balance pass on `src/data/` once B, C and D exist (Henrik)
- [ ] Real art and texture swap in `BootScene.ts`, boundary wall textures (s10)
- [ ] Audio (s10)
- [ ] Playtest build review with outside testers via GitHub Pages
- [ ] itch.io HTML5 build and upload (CLAUDE.md)

## Suggested order

A (quick HUD cleanup) -> B (skill rules, so level-ups feel right) -> D (menu, shop and items, which gives the run a purpose) -> C (caches, which need B's slot rules and D's items) -> E (enemies, once there are builds to challenge) -> G, with F slotted in whenever more variety is wanted.

Why this order: the run itself already works end to end, so the missing pieces are depth within a run (B, C, E) and a reason to start another one (D). B comes before C because caches reuse the slot rules, and D before the item part of C because find-only items need the item list.
