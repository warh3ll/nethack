# Game Design Document

Living document. Henrik owns it and edits freely; Claude reads it before building features and flags anything that drifts from it.

**Legend:** items marked **TBD** are undecided. Items marked _(in game)_ are already implemented as a prototype. Everything else is intent.

## 1. Pitch

A cyberpunk survivors-like for the browser. Each game is a **run** made of 3-5 objectives. You roam the map hunting for the next objective while auto-firing weapons at hordes of enemies, picking up upgrades from data caches along the way, and hacking ICE-protected servers under fire.

- **Working title:** Nethack
- **One-line hook:** Corpos are ruining the life and livelihoods of regular people, make sure they suffer.
- **Platform:** browser (HTML5), released on itch.io. Repo stays private.
- **Tech:** Phaser 4, TypeScript, Vite.

## 2. Design pillars

Rules to check every feature against. Edit these first.

1. Fun first – difficulty second - never unfair
2. Meaningful choices and fun combinations
3. Making suboptimal upgrade decisions should never be an instant fail - not about min/maxing

## 3. Core loop

1. Move around the map while weapons fire automatically at enemies _(in game: arena only)_.
2. Enemies spawn outside the screen and walk straight at the player; the spawn rate ramps up over the run _(in game)_.
3. Explore the map to find the current objective. TBD: how the player is guided (marker, compass, none).
4. Along the way, find data caches scattered randomly on the map and open them for passive upgrades, weapons or nethacking skills (section 5). Even permanent upgrades (very rare) or items.
5. Players gain XP by killing enemies, leveling up provides upgrade choices (3 to begin, could possibly be raised by some upgrade)
6. Complete the objective (often by hacking, section 8), then move on to the next one.
7. Finish all objectives to complete the run. Some objectives are timed, so a run clock is always visible.
8. Extract by inputing the extraction code snippet after the final objective
9. In the main menu, players can buy items that make their next runs more fun or more badass

**Decided:** for now XP comes from kills, and level-ups offer upgrade choices. Caches are an additional source (section 5).

## 4. Player

- One playable character in the prototype _(in game)_; more are TBD.
- Movement: direct control, dash can be gained via items
- Health with a brief invulnerability window after each hit, by default the player has a small health regen, this can be upgraded by passive skills and items.
- Auto-firing skills, more weapons or attacking skills can be gained through data caches or level up upgrades
- Pause with Escape or P _(in game)_.

## 4b. Items

- From the main menu, players should be able to purchase items that permanently increase stats. There are a few slots so not everything they find can be equipped. The slots are:
- Head, Arms, Hands, Back, Legs, Feet, Deck (basically the hacking tool), and four small item slots. Small items are various little trinkets that someone might have on them. Item list TBD.
- Items are bought with credits dropped from enemies, but can also be gained from objectives and a successful mission.

## 5. Skills and progression

- **Slots:** 10 total: 5 weapon/skill slots and 5 passive slots (these should be visualized in the UI). The two groups are separate: once all 5 weapon/skill slots are filled, level-ups only offer new passives or upgrades to weapons/skills the player already has (and vice versa). Data caches follow the same rules, except the player gets no choice.
- **Kinds:** weapons, passives, and skills
- **Where they come from:** data caches found randomly on the map. Caches should be rare, can also drop from enemies in rare cases.
- **Prototype roster:** 11 skills, 6 weapons and 5 passives (only the Auto-Pistol exists so far). The fifth passive is Health Regen. Nethacking skills use the weapon/skill slots; Henrik will clarify how they fit in the count later.
- Each skill has per-level stat rows, defined in data (`src/data/skills.ts`).
- Passive bonuses are always re-summed from scratch, never adjusted incrementally.
- One starting skill: Auto-Pistol _(in game)_.

### Skill list

| Skill       | Kind    | Idea                                                                 | Status  |
| ----------- | ------- | -------------------------------------------------------------------- | ------- |
| Auto-Pistol | weapon  | Fires at the nearest enemy; gains pierce and double shot with levels | in game |
| TBD         | weapon  |                                                                      |         |
| TBD         | weapon  |                                                                      |         |
| TBD         | weapon  |                                                                      |         |
| TBD         | weapon  |                                                                      |         |
| TBD         | weapon  |                                                                      |         |
| Health Regen | passive | Increases the player's passive health regeneration                  |         |
| TBD         | passive |                                                                      |         |
| TBD         | passive |                                                                      |         |
| TBD         | passive |                                                                      |         |
| TBD         | passive |                                                                      |         |

TBD: level cap per skill, evolutions/combinations, what happens when all slots are full and maxed.

## 6. Enemies

- Move straight at the player; no pathfinding, by design.
- Deal contact damage.
- **Drone:** basic swarm enemy _(in game)_.
- **Goon:** miniboss-like brute with more health and damage than normal mobs; guards a dossier in the Goon objective (section 7).
- TBD: further enemy types, elites, how enemy variety scales with time.
- Enemies can drop credit chips, tougher enemies will drop more credits

## 7. Run structure and objectives

- A run is one attempt made of **3-5 objectives**, completed in sequence. These are known and should be visible in the UI.
- The map is explored freely; the player must find where the next objective is, the map has a large hard boundary, and it should take some time to walk from edge to edge. **Decided (tentative):** one large map of about 10000x10000 px, to be tuned once we can feel the walk time. Objectives are placed inside it.
- Some objectives are **timed**. A **run clock is always visible in the UI**.
- **Objective types:** the three below are defined so far. Other candidates still to decide: boss fight, defend a point, retrieve an item, eliminate a target.
  1. **Hack server:** the player approaches a server. A progress bar fills while the player performs the hack (see section 8). During that time the player is forced to interact 2-3 times by typing an IP address, a password, a very short code snippet or similar, to simulate hacking. Physically smacking the server might also be required.
  2. **Goon:** a brute of some sort, kind of like a miniboss, guards a dossier containing an encryption key. The goon has more health and damage than normal mobs.
  3. **Brute-force:** the player attacks a location that has several layers or outposts. The outposts also spawn enemies when the player is close. Once all of them are down, the player can steal company secrets from within (this is an obejct the player should pick up) .
- **Lose:** HP reaches 0. TBD: what a failed timed objective does (instant loss, penalty, or skipped).
- **Win:** complete the final objective. TBD: run length target, difficulty ramp across objectives.
- The earlier "boss on a timer" idea is now just one possible objective type (TBD).

## 8. Hacking (ICE)

Some objectives require hacking the ICE protecting a server or objective.

- The player must **stay within a certain range** of the target while the hack runs. Leaving the range pauses it, deteriorates very slowly until the player comes back inside range
- A **percentage status bar** shows hack progress.
- The player will keep auto-shooting while hacking, so hacking happens under pressure from enemy hordes.
- **Input priority (decided):** the player can still move during a hack, but while a typing prompt is active, typing takes priority over movement keys. WASD letters go to the prompt, while the arrow keys keep moving the player.
- Hacking draws enemies near slightly faster, any damage to the player will halt progress by 0.2 seconds
- **Interaction prompts:** during a server hack the player is forced to interact 2-3 times: typing an IP address, a password, injecting a very short code snippet or similar, and possibly physically smacking the server (see Hack server in section 7). TBD: exact prompt list, and what failure costs (progress loss, damage, reset).
  - **IP address** - the player needs to type an IP address that appears over the objective, hacking progression is halted until it is complete - format is xxx.xxx.xxx.xxx (but with numbers)
  - **Password** A 6-12 character password appears that the player has to type, can contain A-Z, a-z, 0-9, and special characters (!?-$#@&1, though never more than two special characters)
  - **Smack** The players is prompted to spam space to physically hit the machine, it wriggles with each hit and requires 8-15 hits
  - **Inject** The player is prompted to type a short code snippet (2-4 words)
    - **Inject words** else, for, while, void, null, nil, int, char, bool, true, false, var, let, const, func, def, async, await, yield, try, catch, throw, break, eval, exec, main, self, this, new, enum, byte, bit, hex, json, yaml, regex, loop, array, hash, map, sort, stack, queue, heap, node, tree, hack, root, pwn, pwned, leet, 1337, vuln, xss, sqli, ddos, proxy, vpn, tor, port, shell, spoof, sniff, crack, brute, salt, token, admin, login, pass, key, rsa, aes, md5, sha, cron, worm, virus, bomb, patch, ghost, nmap, ACK, SYN, NAT, DNS, ICMP, TCP, UDP, HTTP, GET, POST, 404, 403, git, bash, zsh, sudo, chmod, grep, sed, awk, curl, wget, ssh, ping, kill, top, cat, echo, pipe, touch, mkdir, pwd, tar, diff, push, pull, fetch, merge, clone, stash, blame, fork, HEAD, init, tag, sync, mount

## 9. Meta progression

- Credits earned during a run is kept, even if dead
- Items can be bought from a store in the main menu
- More progression TBD

## 10. Setting, art and audio

- **Setting:** cyberpunk.
- **Art direction:** TBD. Placeholder shapes are generated in `BootScene.ts`; real assets will replace them under the same texture keys.
- **Audio:** TBD.
- **UI:** the HUD always shows the **run clock**. Also needed: current objective, hack progress bar (during hacks), HP, skill slots. Pause screen exists as a first version _(in game)_. TBD: cache-opening screen.

## 11. Scope

**Prototype (current target):** one character, one starting skill, 10 slots (5 weapon/skill, 5 passive), 11 skills (6 weapons, 5 passives), one enemy type growing to a few, a map to explore, data caches, a run clock, and a short run of objectives including at least one hacking objective.

**Out of scope for now:** TBD (e.g. multiple characters, multiplayer, mobile). Meta progression is in scope.

## 12. Technical constraints that shape design

- Hundreds of enemies on screen: object pooling is mandatory, and `maxEnemies` caps the swarm.
- All tuning numbers live in `src/data/` (`balance.ts`, `skills.ts`, `guns.ts`) so balancing needs no logic changes.
- The game must stay playable after every change.
- Always adhere to the design pillars in section 2.
- Ask Henrik if unsure during a build, propose options
- Always add decisions to this document
-

## 13. Open questions

- Map: fixed or generated per run? How objectives and caches are placed inside the 10000x10000 px map.
- Objective list and how they differ from each other.

### Added by Claude (please answer inline or strike out)

**Progression and skills**
- Section 5 says "Kinds: weapons, passives, and skills", but the skill table only has weapon and passive. What separates a "skill" from a weapon? Are nethacking skills active abilities (cooldown, button press) or auto-firing like weapons?
- Level-ups and caches share the same slot rules. Do caches draw from a rarer/stronger pool, or the same one?
- What happens when a level-up offers nothing useful (all slots full and maxed)? Heal, credits, reroll?
- Can the player pick "nothing" or reroll the 3 choices? (Relates to pillar 3.)

**Map and objectives**
- How is the player guided to the objective: marker, compass arrow, vague hint (distance only), or nothing? Does guidance differ per objective type?
- Map edge: plain invisible wall, or something diegetic (firewall, grid edge)? Is 10000x10000 px right? Walk time at current player speed will tell us; a target of roughly 60-90 s edge to edge is my suggestion.
- Are objective locations visible from the start, revealed one at a time, or only when the previous is done?
- What does failing a timed objective do: instant loss, penalty (time, credits, harder next objective), or skipped?
- Run length target (minutes) and how many objectives for the prototype (3?). Does enemy difficulty scale with the run clock, with objective number, or both?
- Goon: does it stand guard at the dossier or hunt the player? "Move straight at the player" is a stated rule, but "guards" suggests otherwise (aggro radius?).
- Brute-force outposts: are they destructible structures with HP, or enemy spawners that go down when something is cleared? What do they shoot/spawn?

**Hacking**
- Arrow keys still move the player during a prompt, but WASD letters go to the prompt. What about the Smack prompt, which uses Space? (Space is not a movement key, so it should be fine, but worth confirming.)
- Is the prompt sequence random per hack, a fixed order, or chosen by server difficulty? Can the same prompt appear twice?
- Is typing case-sensitive and are typos forgiven (backspace, restart on mistake)? Non-US keyboard layouts (e.g. Swedish) make `!?-$#@&` awkward; do we keep those characters?
- What does "damage halts progress 0.2 s" do during a prompt: nothing, or does it interrupt the prompt?

**Economy and meta**
- Credits: auto-picked up (magnet radius) or walked over? Do they persist on death 100%, or is there a bonus for extracting?
- Does extraction have its own gameplay (timed typing under fire, a safe zone) or is it a final prompt? What does a successful run give beyond a death run?
- "Very rare permanent upgrades" from caches: are they permanent for the whole save, or just for the character? Where is that stored (browser localStorage is the only option on itch.io, so clearing site data would wipe it)?
- Equipment: are items fixed-stat purchases, or do they have tiers/rarities/random rolls? One of each slot purchasable once, or upgradable?
- Dash: which key, cooldown, and does it grant invulnerability?

**Scope and consistency**
- Meta progression is now in scope. Is the main-menu shop part of the prototype or a later milestone?
- Win/lose screens: what stats do we show (kills, credits, time, level)?
