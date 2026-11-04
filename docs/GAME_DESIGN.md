# Game Design Document

Living document. Henrik owns it and edits freely; Claude reads it before building features and flags anything that drifts from it.

**Legend:** items marked **TBD** are undecided. Items marked _(in game)_ are already implemented as a prototype. Everything else is intent.

## 1. Pitch

A cyberpunk survivors-like for the browser. Each game is a **run** made of 3-5 objectives. You roam the map hunting for objectives while auto-firing skills at hordes of enemies, picking up upgrades from data caches along the way, and hacking ICE-protected servers under fire.

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

1. Move around the map while skills fire automatically at enemies _(in game: arena only)_.
2. Enemies spawn outside the screen and walk straight at the player; the spawn rate ramps up over the run _(in game)_.
3. Explore the map to find the objectives. A compass always points to the closest unfinished objective (section 7).
4. Along the way, find data caches scattered randomly on the map and open them for passive upgrades or damage skills (player can choose to not take the skill). Even permanent upgrades (very rare) or items.
5. Players gain XP by killing enemies, leveling up provides upgrade choices (3 to begin, could possibly be raised by some upgrade). Player level has no cap.
6. Complete the objectives (often by hacking, section 8). They can be done in any order.
7. Finish all objectives to unlock extraction. The run clock is always visible.
8. Extract: walk to the extraction point (the player's own 127.0.0.1 address) and type "log out" there.
9. In the main menu, players can buy items that make their next runs more fun or more badass.

**Decided:** XP comes from kills, and level-ups offer upgrade choices. Caches are an additional source (section 5).

## 4. Player

- One playable character in the prototype _(in game)_; more are TBD.
- Movement: direct control. Dash is gained via "feet" items (not yet added); key is **Shift**.
- Health with a brief invulnerability window after each hit, by default the player has a small health regen, this can be upgraded by passive skills and items.
- Auto-firing skills can be gained through data caches or level up upgrades.
- Pause with Escape or P _(in game)_.

## 4b. Items

- From the main menu, players can purchase items that permanently increase stats. There are a few slots so not everything they find can be equipped. The slots are:
- Head, Arms, Hands, Back, Legs, Feet, Deck (basically the hacking tool), and four small item slots. Small items are various little trinkets that someone might have on them. Item list TBD.
- Items are bought with credits dropped from enemies, but can also be gained from objectives and a successful mission.
- **Decided:** items are unique, fixed-stat, one-time buy/find. No tiers, rarities, random rolls or upgrading. One of each item.
- **Decided:** items (bought, or found via very rare cache drops) belong to the account and are equipped in the main menu.
- The Feet slot holds the dash item(s).
- **Find-only items (decided):** a separate list of items that can't be bought, only found. Rare: about **2.5% of caches** contain one.

## 5. Skills and progression

- **Slots:** 10 total: 5 active skill slots (damage and nethacking skills) and 5 passive slots (these should be visualized in the UI). The two groups are separate: once all 5 active slots are filled, level-ups only offer new passives or upgrades to skills the player already has (and vice versa). Data caches follow the same rules, except the player gets no choice. Level-ups and caches draw from the same pool.
- **Kinds (decided):** there are only **skills**: damage skills (e.g. Auto-Pistol, Virus), nethacking skills, and passive skills (which increase stats). "Weapon" is no longer a separate kind.
- **Where they come from:** data caches found randomly on the map. Caches should be rare, can also drop from enemies in rare cases.
- **Prototype roster:** 11 skills, 6 damage skills and 5 passives. In game so far: all 6 damage skills (Auto-Pistol, Virus, Railgun, Scatter Gun, Synaptic Overload, EMP Shock) and all 5 passives (Firewall, Healing Nanites, Exoskeleton, OverClock, Black ICE).
- Each skill has per-level stat rows, defined in data (`src/data/skills.ts`).
- Passive bonuses are always re-summed from scratch, never adjusted incrementally.
- One starting skill: Auto-Pistol _(in game)_.
- **Nothing useful to offer (decided):** when a level-up has nothing useful (all slots full and skills maxed), the player chooses between a heal (30% of max HP) or credits (amount TBD until the economy is set).
- **XP curve (decided):** steady pace, with the XP needed per level increasing slightly each level. No level cap. Numbers in `balance.ts`.
- **Nethacking skills:** not in the prototype roster. The 11 skills are damage skills and passives only.
- **Reroll and skip (decided):** one reroll of the 3 choices per level-up. The player may also skip, but then gets no reward for that level-up.

### Skill list

| Skill             | Kind    | Idea                                                                                                                                                                                                                                                                                             | Status  |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Auto-Pistol       | damage  | Fires at the nearest enemy; gains pierce and double shot with levels                                                                                                                                                                                                                             | in game |
| Virus             | damage  | Hacking weapon. Infects an enemy within 400 range for slow damage over time; when an infected enemy dies it spreads to another enemy within 200 range. Strong against dense swarms. Levels raise the damage over time and slightly raise infection range; levels 4-5 spread to up to two enemies | in game |
| Railgun           | damage  | Fires superfast shots with a 3 second cooldown between each, pierces enemies along the way, targets the highest HP enemy within its long range, cannot shoot enemies within 75px                                                                                                                 | in game |
| Scatter Gun | damage | Short-range spread of pellets at the nearest enemy; more pellets and pierce with levels | in game |
| Synaptic Overload | damage  | Picks a target between 50-150px away, while they are in that range, a hack is being uploaded over 1.5 seconds, if it finishes that enemy is killed and explodes, hurting all enemies around it, damage and area increase with every level, and hacking time decreases.                           | in game |
| EMP Shock | damage | "Lights out, chrome." Every few seconds a ring pulses out from the player, damaging and briefly stunning every enemy it reaches. Levels give a bigger radius and a longer stun (and a little more damage and a faster pulse) | in game |
| Firewall | passive | Flat damage reduction on every hit you take | in game |
| Healing Nanites | passive | Increases the player's passive health regeneration | in game |
| Exoskeleton | passive | Servo assisted legs, +5/10/15% move speed | in game |
| OverClock | passive | CPU upgrade, +3/6/9% damage for all damage skills | in game |
| Black ICE | passive | Your ICE retaliates against enemies whose touch hurts you | in game |

- **Passive rules (decided):** each passive has 3 levels and each level row is the passive's total bonus. Bonuses from all passives are added together and re-summed from scratch on every change.
  - **Firewall:** flat damage taken off every hit (-1/-2/-3). A hit never does less than 1 damage (`PLAYER.minDamageTaken`).
  - **Black ICE:** an enemy whose touch damages the player takes 4/8/12 damage back. Only touch damage triggers it (not bullets), and only when the hit actually lands, so it fires at most once per invulnerability window. Flat, not boosted by OverClock.

- **Synaptic Overload (decided):** the target is picked at random among enemies in the 50-150 px band around the player. If the target dies or leaves that band during the upload, the hack restarts on a new target. The explosion never hurts the player (a possible difficulty setting later). The Goon and outposts (anything with a health bar) are never targeted, since it kills outright. _(my call, change if you disagree)_

- **EMP Shock (decided):** a single ring that expands from the player to its radius; every enemy it reaches takes damage and is stunned (stops moving and shooting, shown with a cyan tint). The pulse waits until at least one enemy is in range, so it is never wasted on an empty screen. A stunned ranged enemy also holds its fire until the stun ends. A new stun never shortens a longer one already running. The pulse never hurts the player. Damage is boosted by OverClock. Outposts are immune to the stun (they still take the damage). Boss-type enemies such as the Goon are stunned for half as long (`stunMultiplier` per enemy in `balance.ts`). The ring has no targeting: anything within its radius is hit. _(numbers are placeholders for Henrik's balancing)_

TBD: level cap per skill (the player's own level is uncapped), evolutions/combinations.

## 6. Enemies

- Move straight at the player; no pathfinding, by design.
- Deal contact damage.
- **Drone:** basic swarm enemy _(in game)_.
- **Goon:** miniboss-like brute with more health and damage than normal mobs; guards a dossier in the Grab encryption key objective (section 7). Larger than other enemies, with a small health bar above him. Somewhat faster than a Drone, but clearly slower than the player. Once he is chasing he **shoots bullets towards the player** at intervals (the first shot comes one cooldown after the chase starts); his bullets hurt the player and are not blocked by other enemies. If the player takes the dossier while he is alive, he hunts the player regardless of distance until he is dead. Has an **aggro radius**: he stands guard until the player enters it, and returns to guarding if the player gets too far away. If the player shoots or damages him he chases regardless of distance.
- **Marksman:** ranged swarm enemy _(in game)_. Walks toward the player only until it is within 250 px, then stops and shoots bullets that hurt the player. Has slightly less HP and damage than a Drone.
- **Spawn pool (decided):** all swarm enemies share one spawn pool. Each spawn rolls once, so a Marksman spawning means no Drone spawns in its place. Harder enemies have a chance that grows with the run clock. Marksman: 5% at the start, +1% every 30 seconds. Numbers live in `balance.ts` (`SPAWNING.specialEnemies`).
- **Difficulty over time (decided):** more dangerous enemy types join as the run clock advances, using the spawn pool above. Only the Marksman is defined so far.
- TBD: further enemy types, elites.
- Enemies can drop credit chips, tougher enemies will drop more credits. Credits are picked up automatically within a magnet radius. **Values (decided):** Drone 1 credit, Goon 5 credits. To be refined later; they live in `balance.ts`.

## 7. Run structure and objectives

- A run is one attempt made of **3-5 objectives**, drawn at random per run; the same objective type can occur at most twice. They are known and visible in the UI, and can be completed in **any order** (for now). All of them can be found from the start; none are locked behind another. There has to be at least one hacking objective, since it's kind of the point of the game.
- The map is explored freely; the player must find where the objectives are. A **compass** always points to the closest unfinished objective. The extraction point is **revealed only once the final objective is done**; the compass then points to it.
- **Map (decided, tentative):** one large map of about 10000x10000 px, to be tuned once we can feel the walk time. Target is roughly 60-90 s edge to edge at normal player speed. The edge is a **visible wall**; textures to make it clearer come later.
- A **run clock is always visible in the UI**. For now it only shows elapsed time and has no gameplay function (enemy difficulty scaling is the one planned use, section 6).
- **Extraction (decided):** at the extraction point the player types "log out". When finished, a 3-2-1 countdown plays and then the run completes. **Leaving the extraction radius cancels the attempt** (typing and countdown reset); the player can move freely inside it and retry after re-entering. Taking damage does not cancel it.
- **Timed objectives (decided):** dropped. They conflict with pillar 1. Objectives are not timed.
- **Objective types:** the four below are defined so far. Other candidates still to decide: boss fight, defend a point, retrieve an item, eliminate a target.
  1. **Hack server:** the player approaches a server. A progress bar fills while the player performs the hack (see section 8). During that time the player is forced to interact 2-3 times by typing an IP address, a password, a very short code snippet or similar, to simulate hacking. Physically smacking the server might also be required.
  2. **Grab encryption key:** A Goon guards a dossier containing an encryption key (see Goon in section 6) _(in game)_. **Decided:** the player takes the key by walking onto the dossier; killing the Goon is not required, so luring him away works. If he is still alive when the dossier is taken, he hunts the player regardless of distance until he is dead.
  3. **Steal secrets:** the player attacks a location with **2-4 outposts** (destructible structures). The more outposts, the less HP each has, but not by much. The outposts also spawn normal drones when the player is close (they do not shoot, for now). Once all of them are down, the player can steal company secrets from within (an object the player picks up).
  4. **Connect servers (decided):** the player connects two servers with a cable. Press **E** at the first server to grab the cable, then walk to another server **300-400px** away. A line (ideally a physical, cable-like one) is drawn between the player and the server the cable is attached to. At the second server, **hold E for 2.5 seconds** to attach it. **Any damage taken resets the attach action.**
- **Lose:** HP reaches 0.
- **Win:** complete all objectives and extract.
- **Win/lose screen (decided):** credits gained, items found, objectives completed, and the level reached.
- **Enemy difficulty** scales with the run clock (section 6). TBD: whether it also scales with number of objectives completed.
- The earlier "boss on a timer" idea is now just one possible objective type (TBD).

## 8. Hacking (ICE)

Some objectives require hacking the ICE protecting a server or objective.

- The player must **stay within a certain range** of the target while the hack runs. Leaving the range pauses it, deteriorates very slowly until the player comes back inside range
- A **percentage status bar** shows hack progress.
- The player will keep auto-shooting while hacking, so hacking happens under pressure from enemy hordes.
- **Input priority (decided):** the player can still move during a hack, but while a typing prompt is active, typing takes priority over movement keys. WASD letters go to the prompt, while the arrow keys keep moving the player. E (Smack) is fine as-is: E is the general interact key, and is not a movement key.
- Hacking draws enemies near slightly faster. Any damage to the player will halt progress by 0.2 seconds. This does not interrupt an active prompt and does not add prompts; it only makes the hack take longer.
- **Interaction prompts:** during a server hack the player is forced to interact 2-3 times. **Each prompt type appears at most once per server.** When each appears is random over the duration of the hack, within a min/max spacing (values in `balance.ts`). **Mistyping (decided):** no penalty, the player just retypes. Typing is case-sensitive for Inject words.
  - **IP address** - the player needs to type an IP address that appears over the objective, hacking progression is halted until it is complete - format is xxx.xxx.xxx.xxx (but with numbers)
  - **Password** The player is prompted to type a password using the following structure [adjective-noun] (including the dash). Chosen over symbol-heavy passwords so it works on non-US keyboards.
  - **Smack** The players is prompted to spam E (the interact key) to physically hit the machine, it wriggles with each hit and requires 8-15 hits
  - **Inject** The player is prompted to type a short code snippet (2-4 words)
    - **Inject words** else, for, while, void, null, nil, int, char, bool, true, false, var, let, const, func, def, async, await, yield, try, catch, throw, break, eval, exec, main, self, this, new, enum, byte, bit, hex, json, yaml, regex, loop, array, hash, map, sort, stack, queue, heap, node, tree, hack, root, pwn, pwned, leet, 1337, vuln, xss, sqli, ddos, proxy, vpn, tor, port, shell, spoof, sniff, crack, brute, salt, token, admin, login, pass, key, rsa, aes, md5, sha, cron, worm, virus, bomb, patch, ghost, nmap, ACK, SYN, NAT, DNS, ICMP, TCP, UDP, HTTP, GET, POST, 404, 403, git, bash, zsh, sudo, chmod, grep, sed, awk, curl, wget, ssh, ping, kill, top, cat, echo, pipe, touch, mkdir, pwd, tar, diff, push, pull, fetch, merge, clone, stash, blame, fork, HEAD, init, tag, sync, mount
  - **PIN** The player needs to enter a pin code, four random digits from 0-9

## 9. Meta progression

- Credits are picked up in a run (magnet radius) and spent in the main-menu store.
- **Credits on death (decided):** credits collected are kept in full even if the player dies. A successful extraction only adds an end-of-run credit bonus on top.
- **Extraction bonus (decided):** a successful extraction gives an end-of-run credit bonus.
- **Save code (decided):** the menu offers export/import of a save code, as a backup against wiped localStorage.
- Items can be bought from a store in the main menu and equipped there (section 4b).
- Permanent upgrades are account-wide. Storage is browser localStorage (the only option on itch.io), so clearing site data wipes progress.
- More progression TBD

## 10. Setting, art and audio

- **Setting:** cyberpunk.
- **Art direction:** TBD. Textures are generated or loaded in `BootScene.ts`; new assets can replace them under the same texture keys.
- **Audio:** TBD.
- **UI:** the HUD always shows the **run clock**. Also needed: objective list, compass, hack progress bar (during hacks), HP, skill slots, and **credits and items found** counters (decided). The live enemy counter is removed. Pause screen exists as a first version _(in game)_. TBD: cache-opening screen.

## 11. Scope

**Prototype (current target):** one character, one starting skill, 10 slots (5 active skill, 5 passive), 11 skills (6 damage, 5 passives), one enemy type growing to a few, a map to explore, data caches, a run clock, a short run of objectives including at least one hacking objective, and a **main-menu shop with equippable items** so item functionality can be tested. The first shop version has **two items per slot** to test equip/unequip/swap.

**Out of scope for now:** TBD (e.g. multiple characters, multiplayer, mobile). Meta progression is in scope.

## 12. Technical constraints that shape design

- Hundreds of enemies on screen: object pooling is mandatory, and `maxEnemies` caps the swarm.
- All tuning numbers live in `src/data/` (`balance.ts`, `skills.ts`) so balancing needs no logic changes.
- The game must stay playable after every change.
- Always adhere to the design pillars in section 2.
- Ask Henrik if unsure during a build, propose options
- Always add decisions to this document

## 13. Open questions

Answer inline or strike out. Answered questions get folded into the sections above.

**Objectives and run**

- Does the compass show distance as well as direction? The answer reads "No, just distance", which is ambiguous: should it show only the distance (no arrow), or only the arrow (no distance)? Today it shows both. Keep as today.

**Economy and meta**

- Extraction bonus: how many credits? Fine to leave until the shop prices exist; It lives in `balance.ts` and you tune it. 15 credits for successful extraction for now.

## 14. Difficulty settings

- Under a future Options menu we should have a few things where players can customize their experience
  - One is a choice to freeze time completely while inputing hacks, for players who struggle to stay alive while typing
