# Game Design Document

Living document. Henrik owns it and edits freely; Claude reads it before building features and flags anything that drifts from it.

**Legend:** items marked **TBD** are undecided. Items marked _(in game)_ are already implemented as a prototype. Everything else is intent.

## 1a. Pitch

A cyberpunk survivors-like for the browser. Each game is a **run** made of 4-5 objectives. You roam the city hunting for objectives while auto-firing skills at hordes of enemies, picking up upgrades from data caches along the way, and hacking ICE-protected servers under fire.

- **Working title:** Nethack
- **One-line hook:** Corpos are ruining the life and livelihoods of regular people, make sure they suffer.
- **Platform:** browser (HTML5), released on itch.io. Repo stays private.
- **Tech:** Phaser 4, TypeScript, Vite.

## 1b. Story and goal of the game

The player's ultimate goal is to free the city from the big bad corporation (name tbd). In this megacity every district is being managed by one of the dominant megacorps. You're here to put an end to that. For every run, there's the liberation of a district at stake. Liberating enough districts belonging to a megacorp will let the player meet their inner echelon of leaders. Ultimately, there is a chance at liberating the entire city, but who will wait at the end when all the megacorps have been reduced to ash...?

## 2. Design pillars

Rules to check every feature against. Edit these first.

1. Fun first – difficulty second - never unfair
2. Meaningful choices and fun combinations
3. Making suboptimal upgrade decisions should never be an instant fail - not about min/maxing

## 3. Core loop

1. Move around the map while skills fire automatically at enemies
2. Enemies come out of spawn points around the city and head for the player along the streets; the spawn rate ramps up over the run
3. Explore the map to find the objectives. A compass always points to the closest unfinished objective. Somewhere out there are two camera poles; hacking either one gives a minimap.
4. Along the way, find data caches scattered randomly on the map and open them for skills and skill upgrades, money, or even items.
5. Players gain XP by killing enemies or destroying factories, leveling up provides upgrade choices (3 to begin, could possibly be raised by some upgrade). Player level has no cap.
6. Complete the objectives. They can be done in any order.
7. Finish all objectives to unlock the metro extraction. The run clock is always visible.
8. Extract: walk to the exit subway station (a different one from where the run started) and stay inside its ring for a 5 second countdown.
9. In the main menu, players can buy items that make their next runs more fun or more badass.

## 4. Player

- One playable character in the prototype, more are TBD.
- Movement: direct control.
- Dash: A small dash can be performed with **Space**, items may upgrade cooldown, dash distance. The player is unvulnerable for a short period after a dash. Default cooldown is 5 seconds.
- **Hit area (decided):** the player's collision circle has an 18 px radius and enemies are circles sized to their sprites; both are centred on the sprite. Numbers in `balance.ts`.
- Health with a brief invulnerability window after each hit, by default the player has a small health regen, this can be upgraded by passive skills and items.
- Auto-firing skills can be gained through data caches or level up upgrades.
- Pause with Escape or P

## 4b. Items

- From the main menu, players can purchase items that permanently increase stats. There are a few slots so not everything they find can be equipped. The slots are:
- Head, Chest, Hands, Back, Legs, Feet, Slicer (hacking tool), and four trinket slots. Item list TBD (Now in docs/ITEMS.md)
- Items are bought with credits dropped from enemies, but can also be gained from objectives and a successful mission.
- **Decided:** items are unique, fixed-stat, one-time buy/find. No tiers, rarities, random rolls or upgrading. One of each item.
- **Decided:** items (bought, or found via very rare cache drops) belong to the account and are equipped in the main menu.
- The Feet slot holds the dash item(s).
- **Find-only items (decided):** a separate list of items that can't be bought, only found. Rare: about **2.5% of caches** contain one.

## 5. Skills and progression

- **Slots:** 10 total: 5 active skill slots (damage and nethacking skills) and 5 passive slots (these should be visualized in the UI). The two groups are separate: once all 5 active slots are filled, level-ups only offer new passives or upgrades to skills the player already has (and vice versa). Data caches follow the same rules, except the player gets no choice. Level-ups and caches draw from the same pool.
- **Kinds (decided):** there are only **skills**: damage skills (e.g. Auto-Pistol, Virus), nethacking skills, and passive skills (which increase stats). "Weapon" is no longer a separate kind.
- **Where they come from:** data caches found randomly on the map. Caches should be rare, can also drop from enemies in rare cases.
- **Prototype roster:** 12 skills, 7 damage skills and 5 passives (raised from 11/6 when Rootkit was added). In game so far: all 7 damage skills (Auto-Pistol, Virus, Railgun, Scatter Gun, Synaptic Overload, EMP Shock, Rootkit) and all 5 passives (Firewall, Healing Nanites, Exoskeleton, OverClock, Defensive Matrix).
- Each skill has per-level stat rows, defined in data (`src/data/skills.ts`).
- Passive bonuses are always re-summed from scratch, never adjusted incrementally.
- One starting skill: Auto-Pistol _(in game)_.
- **Nothing useful to offer (decided):** when a level-up has nothing useful (all slots full and skills maxed), the player chooses between a heal (30% of max HP) or credits (amount TBD until the economy is set).
- **XP curve (decided):** each level needs **1.15x the XP of the previous one**, starting at 5 XP for level 2. No level cap; the steepening curve is what slows levelling late. Total XP to reach level 10 / 20 / 30 / 40 / 50 is about 84 / 441 / 1,886 / 7,731 / 31,377. Maxing every skill takes about 29 level-ups, so roughly level 30. Numbers in `balance.ts` (`xpForLevel2`, `xpGrowth`).
- **Reroll and skip (decided):** one reroll of the 3 choices per level-up. The player may also skip, but then gets no reward for that level-up.
- Both weapon skills and passive skills should only have 3 levels (currently weapons have 5, remove level 2 and 4.)

### Skill list

| Skill             | Kind    | Idea                                                                                                                                                                                                                                                                                                                  | Status  |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Auto-Pistol       | damage  | Fires at the nearest enemy; gains pierce and double shot with levels                                                                                                                                                                                                                                                  | in game |
| Virus             | damage  | Hacking weapon. Infects an enemy within 400 range for slow damage over time; when an infected enemy dies it spreads to another enemy within 200 range. Strong against dense swarms. Levels raise the damage over time and slightly raise infection range;                                                             | in game |
| Railgun           | damage  | Fires superfast shots with a 3 second cooldown between each, pierces enemies along the way, targets the highest HP enemy within its long range, cannot shoot enemies within 75px                                                                                                                                      | in game |
| Scatter Gun       | damage  | Short-range spread of pellets at the nearest enemy; more pellets and pierce with levels                                                                                                                                                                                                                               | in game |
| Synaptic Overload | damage  | Picks a target between 50-150px away, while they are in that range, a hack is being uploaded over 1.5 seconds, if it finishes that enemy is killed and explodes, hurting all enemies around it, damage and area increase with every level, and hacking time decreases.                                                | in game |
| EMP Shock         | damage  | "Lights out, chrome." Every few seconds a ring pulses out from the player, damaging and briefly stunning every enemy it reaches. Levels give a bigger radius and a longer stun (and a little more damage and a faster pulse)                                                                                          | in game |
| Rootkit           | damage  | "Turns an enemy against themselves." Every so often it hijacks a nearby enemy, which fights for the player for a few seconds and then explodes. A flash marks the hijack and a smoke plume rises from the enemy until it explodes. Levels give a longer hijack, harder hits and a bigger explosion, a faster cooldown | in game |
| Firewall          | passive | Flat damage reduction on every hit you take                                                                                                                                                                                                                                                                           | in game |
| Healing Nanites   | passive | Increases the player's passive health regeneration                                                                                                                                                                                                                                                                    | in game |
| Exoskeleton       | passive | Servo assisted legs, +5/10/15% move speed                                                                                                                                                                                                                                                                             | in game |
| OverClock         | passive | CPU upgrade, +3/6/9% damage for all damage skills                                                                                                                                                                                                                                                                     | in game |
| Defensive Matrix  | passive | A shield absorbs a hit and recharges, and enemies that touch you get spiked                                                                                                                                                                                                                                           | in game |

- **Passive rules (decided):** each passive has 3 levels and each level row is the passive's total bonus. Bonuses from all passives are added together and re-summed from scratch on every change.
  - **Firewall:** flat damage taken off every hit (-1/-2/-3). Unless the Defensive Matrix shield blocks it, a hit never does less than 1 damage (`PLAYER.minDamageTaken`).
  - **Defensive Matrix:** grants a shield that absorbs hits completely, from touch and bullets alike, taking 0 damage. It holds 1 hit at every level (`shieldHits`, which items can raise later) and gets a hit back every 5000/4000/3000 ms. Being hit while it recharges doesn't delay it. A blocked hit starts the normal invulnerability window, but it is not damage, so it doesn't halt a hack or reset a Connect servers attach. An enemy whose touch lands, blocked or not, also takes 4/8/12 damage back, shown as a spike. Only touch triggers that (not bullets), so it fires at most once per invulnerability window. Flat, not boosted by OverClock.

- **Synaptic Overload (decided):** the target is picked at random among enemies in the 50-150 px band around the player. If the target dies or leaves that band during the upload, the hack restarts on a new target. The explosion never hurts the player (a possible difficulty setting later). The Goon and outposts (anything with a health bar) are never targeted, since it kills outright. _(my call, change if you disagree)_

- **EMP Shock (decided):** a single ring that expands from the player to its radius; every enemy it reaches takes damage and is stunned (stops moving and shooting, shown with a cyan tint). The pulse waits until at least one enemy is in range, so it is never wasted on an empty screen. A stunned ranged enemy also holds its fire until the stun ends. A new stun never shortens a longer one already running. The pulse never hurts the player. Damage is boosted by OverClock. Outposts are immune to the stun (they still take the damage). Boss-type enemies such as the Goon are stunned for half as long (`stunMultiplier` per enemy in `balance.ts`). The ring has no targeting: anything within its radius is hit. _(numbers are placeholders for Henrik's balancing)_

- **Rootkit (decided):** a hijack picks a random enemy within range (never the Goon or outposts, anything with a health bar). The hijacked enemy turns reddish and stops hurting the player or being hit by the player's bullets. It chases the nearest other enemy and damages every enemy it touches (a tick every 0.3 s), then after its time runs out it dies and explodes, hurting everything around it. The next hijack starts one cooldown after the last hijacked enemy is gone, so at most one batch is active at a time. It never hurts the player. Damage is boosted by OverClock. A hijacked enemy is immune to stun. XP and kills from its hits and explosion go to the player. _(my call, change if you disagree; numbers are placeholders for Henrik's balancing)_

- **Skills and buildings (decided):** buildings stop bullets, from the player and from enemies alike, and guns only fire with a clear line to the target. Hacking skills (Virus, Synaptic Overload, Rootkit, EMP Shock) reach through walls. This is meant to be a real build choice: bullets churn through a crowded street, while hacking clears the way from cover or while preparing a change of direction.

TBD: level cap per skill (the player's own level is uncapped), evolutions/combinations.

## 6. Enemies

- **Movement (decided):** enemies follow one shared flow field, a map of walking distance from the player that every enemy reads. There is no per-enemy pathfinding, and with a clear line they head straight for the player (within 1200 px; further away they keep to the streets). Guards (the Goon) walk back to their post through the streets too. This replaces the earlier "no pathfinding" rule, which can't work with buildings. _(in game)_
- **Spawn points (decided):** enemies come from two kinds of spawn point instead of a ring around the player. **Factories** are a few large landmark buildings that can be destroyed, so stronger players can thin out the spawning. **Small exits** (hatches, loading bays, subway exits and the like) are set into ordinary buildings and can't be destroyed. Factories flash a colour a couple of seconds beforehand, then release a small group. Small exits flash too, but more briefly, so enemies never just appear and players can read where they are coming from. Areas with few spawn points are natural quiet zones. Which spawn points are active depends on fixed distances in the world, never on the size of the player's screen, so a small window gets the same swarm as an ultrawide. A wider screen still shows more of the street, and that advantage stays: it isn't something to nerf (pillar 1). _(numbers are placeholders for Henrik's balancing)_
  - **Active range (decided):** a small exit is active while the player is 500-1400 px away from it, a factory 300-2000 px. Nothing spawns right next to the player.
  - **Flash (decided):** every spawn point flashes before its enemy steps out, factories for longer than small exits.
  - **Quiet zones (decided):** the full spawn rate needs a few active spawn points nearby (factories count for more). With fewer, part of the spawns is skipped, so sparse parts of the city are calmer.
  - **How many (decided):** 6 factories per map and about 100 small exits. Factories are never near the start, never cut by an alley, and no servers stand in front of them. Small exits keep clear of objectives and caches.
  - **Stragglers (decided):** swarm enemies more than 2600 px from the player are quietly removed (no drop, no XP), so enemies left far behind can't use up the enemy cap. Guards, outposts and hijacked enemies stay.
- Deal contact damage.
- **Drone:** basic swarm enemy _(in game)_.
- **Goon:** miniboss-like brute with more health and damage than normal mobs; guards a dossier in the Grab encryption key objective (section 7). Larger than other enemies, with a small health bar above him. Somewhat faster than a Drone, but clearly slower than the player. Once he is chasing he **shoots bullets towards the player** at intervals (the first shot comes one cooldown after the chase starts); his bullets hurt the player and are not blocked by other enemies. If the player takes the dossier while he is alive, he hunts the player regardless of distance until he is dead. Has an **aggro radius**: he stands guard until the player enters it, and returns to guarding if the player gets too far away. If the player shoots or damages him he chases regardless of distance.
- **Marksman:** ranged swarm enemy _(in game)_. Walks toward the player only until it is within 350 px and can see the player past the buildings, then stops and shoots bullets that hurt the player. Has slightly less HP and damage than a Drone.
- **Spawn pool (decided):** all swarm enemies share one spawn pool. Each spawn rolls once, so a Marksman spawning means no Drone spawns in its place. Harder enemies have a chance that grows with the run clock. Marksman: 5% at the start, +1% every 30 seconds. Numbers live in `balance.ts` (`SPAWNING.specialEnemies`).
- **Difficulty over time (decided):** more dangerous enemy types join as the run clock advances, using the spawn pool above. Only the Marksman is defined so far.
- TBD: further enemy types, elites.
- Enemies can drop credit chips, tougher enemies will drop more credits. Credits are picked up automatically within a magnet radius. **Values (decided):** Drone 1 credit, Goon 5 credits. To be refined later; they live in `balance.ts`.

## 7. Run structure and objectives

- A run is one attempt made of **4-5 objectives**, drawn at random per run; the same objective type can occur at most twice (Destroy factories exactly once, see below). They are known and visible in the UI, and can be completed in **any order** (for now). All of them can be found from the start; none are locked behind another. There has to be at least one hacking objective, since it's kind of the point of the game.
- The map is explored freely; the player must find where the objectives are. A **compass** always points to the closest unfinished objective. The exit station's ring and countdown **open only once the final objective is done**; the compass and minimap then point to it. The station itself is a prop that is visible from the start **(decided)**, so the player can plan their route and may stumble on it early.
- **Map (decided, tentative):** one large map of about 10000x10000 px, to be tuned once we can feel the walk time. Target is roughly 60-90 s edge to edge at normal player speed. The edge is a **visible wall**; textures to make it clearer come later.
- **City (decided):** the map is a street-level city, randomly generated every run but always coherent. Wide avenues and streets divide it into rectangular blocks, each with a sidewalk and a building, or left open as a plaza. Streets always end on another street, so there are no dead ends. **Streets are wide**; alleys are rare, narrow cuts through a building that work as an escape and recuperation route. Buildings can't be entered. They are drawn as a flat roof with a south-facing front, and collision covers the whole drawn rectangle, so nothing can hide behind them.
- **Camera poles (decided):** a pole with a small computer wired into the city's surveillance cameras. There are **two per run**, each at a random sidewalk spot at least 2000 px from the start and **at least 4000 px from each other**, so one is never far off. Hacking either one does it, and the other then switches off. They are optional and not objectives: they aren't in the objective list, the compass ignores them, and players find them by exploring, like a data cache. A pole that hasn't been touched shows the hint "HACK TO REVEAL MAP" above it **(decided)**; the compass still ignores it. Each is a short three-step hack done within range of the pole:
  1. **Insert worm:** hold E for 2 seconds. Letting go, leaving range or taking damage restarts the hold.
  2. **Enter PIN:** four random digits, as in a server hack.
  3. **Type "reveal":** case-sensitive; a wrong key is just retyped.

  Walking away only pauses the hack, and the player continues from the same step on returning. Like a server hack, the world slows while typing and enemies spawn faster during the hack (section 8). When it is done, a **minimap** appears in the bottom right corner and stays until the run ends. It shows the whole map, with small dots for unfinished objectives, unopened caches and the exit station (only once it has opened), and the player as an arrow pointing the way they are moving. The minimap is never there from the start of a run, though a future item might change that.

- **ATMs (decided):** an optional find like a data cache, not an objective (no compass, not in the objective list). **4-6 per run**, each on the sidewalk against a building's south wall, at least 800 px from the start and 1500 px from each other, and clear of objectives, caches, poles and spawn doors. Each has a small faint gold ring (70 px radius).
  1. **Decrypt:** hold E inside the ring for 5 seconds. Letting go, leaving the ring or taking damage restarts it.
  2. **Channel:** once decrypted, the player earns **1 credit per second** for up to **20 seconds** (so 20 credits at most per ATM) just by staying in the ring. No key needs to be held.
  3. **Waves:** while channeling, three waves come out of the spawn point (door or factory) closest to the ATM and hunt the player until dead: **at 5 s a Drone and a Marksman, at 10 s two Heavies, at 15 s a Goon.** Damage doesn't stop the channel. _(numbers in `ATMS.waves`, for Henrik's balancing)_
  4. **Done:** leaving the ring while channeling, or running out the 20 seconds, switches that ATM off for the rest of the run. Credits earned until then are kept.
- A **run clock is always visible in the UI**. For now it only shows elapsed time and has no gameplay function (enemy difficulty scaling is the one planned use, section 6).
- **Extraction (decided):** the exit is a **subway station** on a different plaza from the start (a random plaza at least 3500 px from the start, or the farthest one if none is that far). There is no typing: once the last objective is done, the station's ring opens and **stepping into it starts a 5 second countdown**. The player must **stay inside the ring** for all of it; leaving cancels the countdown and it starts over on re-entering. Taking damage does not cancel it. The ring is small (100 px radius) so it takes a deliberate stand, often under fire.
- **Timed objectives (decided):** dropped. They conflict with pillar 1. Objectives are not timed.
- **Objective types:** the five below are defined so far (Steal secrets is switched off for now). Other candidates still to decide: boss fight, defend a point, retrieve an item, eliminate a target.
  1. **Hack server:** the player approaches a server. A progress bar fills while the player performs the hack (see section 8). During that time the player is forced to interact 2-3 times by typing an IP address, a password, a very short code snippet or similar, to simulate hacking. Physically smacking the server might also be required.
  2. **Grab encryption key:** A Goon guards a dossier containing an encryption key (see Goon in section 6) _(in game)_. **Decided:** the player takes the key by walking onto the dossier; killing the Goon is not required, so luring him away works. If he is still alive when the dossier is taken, he hunts the player regardless of distance until he is dead.
  3. **Steal secrets (switched off until further notice, decided):** the code stays in the game and can be brought back in `RUN_GENERATION.disabled`; Destroy factories took its place. The player attacks a location with **2-4 outposts** (destructible structures). The more outposts, the less HP each has, but not by much. The outposts also spawn normal drones when the player is close (they do not shoot, for now). Once all of them are down, the player can steal company secrets from within (an object the player picks up).
  4. **Connect servers (decided):** the player connects two servers with a cable. Press **E** at the first server to grab the cable, then walk to another server **500-800px** away. A line (ideally a physical, cable-like one) is drawn between the player and the server the cable is attached to. At the second server, **hold E for 2.5 seconds** to attach it. **Any damage taken resets the attach action.**
  5. **Destroy factories (decided):** every run has exactly one, and it counts towards the 4-5 objectives, so it is always required. The player has to destroy **2-3 factories** (picked at random per run), and **any** factories count, however the player gets to them. The objective list shows progress (e.g. 0/3). The compass points to the closest factory still standing. It has no spot of its own, since the factories (section 6) are already on the map, and it doesn't appear on the minimap **(decided)**, since any factory counts.
- **Servers stand against buildings (decided):** servers (Hack server and Connect servers) are placed next to a building, not out in the open street. The two servers in Connect servers stand along the same stretch of street, so the cable never crosses a building.
- **Placement in the city (decided):** where everything in a run stands.
  - **Start and extraction:** the player starts at a subway station in the middle of the start plaza. The extraction point is a second station on a different plaza (see Extraction above). Both show the same subway prop.
  - **Servers:** on the sidewalk directly in front of a building's south front, never on a front facing an alley (alleys are for escaping). Both Connect servers stand in front of the same building, 500-800 px apart.
  - **Grab encryption key and Steal secrets:** in the middle of a plaza (not the start plaza), since they need open ground and plazas have no buildings to put servers against.
  - **First objective:** one objective is always close to the start. There isn't always a plaza that close, so it is whichever type has a spot within reach.
  - **Spacing:** objectives keep their minimum distance from each other and from the start, Connect's second server included. If a map has no clear spot left, the run gets one objective fewer rather than two on top of each other. A map with no building front long enough simply gets no Connect servers.
  - **Data caches:** anywhere off the road (sidewalk, plaza or alley), kept at least 400 px from objectives so E and typing never mean two things at once.
  - **Camera poles:** on sidewalks, each at least 2000 px from the start and the two at least 4000 px apart.
  - **Map edge:** the ring road along the wall keeps everything away from the edge, so there are no separate edge margins.
  - **Seeds:** a seed (`?seed=` in the URL, shown on the pause screen) replays the whole run layout: streets, objectives, factories to destroy, the exit station, caches and the camera poles.
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
- **Leaving mid-run (decided):** credits are banked only when a run ends by death or extraction. Closing the game or letting a session time out forfeits that run's credits, so an idle session can't be used to grind.
- **Results screen (decided):** the player can reboot straight into a new run or return to the main menu.
- **Quit to menu (decided):** the pause screen can quit the run after a confirmation, forfeiting that run's credits.
- **Importing a save (decided):** a valid code asks for confirmation first, showing the current and new credit totals, since it replaces the current save.
- Items can be bought from a store in the main menu and equipped there (section 4b).
- Permanent upgrades are account-wide. Storage is browser localStorage (the only option on itch.io), so clearing site data wipes progress.
- More progression TBD

## 10. Setting, art and audio

- **Setting:** cyberpunk.
- **Art direction:** TBD. The city is shown at night _(in game, first iteration)_: a dim ambient colour over everything, with coloured lights that stand out (street lamps, servers, factories, camera poles, subway stations; a damaged factory turns red, a hacked server green). It must never get dark enough to hide enemies (pillar 1). Colour, radius and intensity of every light type, and the overall brightness, live in `balance.ts` (`LIGHTING`). The player and every enemy cast a still blob shadow (`SHADOWS`). Roofs have at most one antenna and one skylight each. Textures are generated or loaded in `BootScene.ts`; new assets can replace them under the same texture keys.
- **Audio:** TBD.
- **UI:** the HUD always shows the **run clock**. Also needed: objective list, compass, hack progress bar (during hacks), HP, skill slots, and **credits and items found** counters (decided). The minimap appears only after a camera pole is hacked (section 7). The live enemy counter is removed. Pause screen exists as a first version _(in game)_. TBD: cache-opening screen.

## 11. Scope

**Prototype (current target):** one character, one starting skill, 10 slots (5 active skill, 5 passive), 12 skills (7 damage, 5 passives), one enemy type growing to a few, a map to explore, data caches, a run clock, a short run of objectives including at least one hacking objective, and a **main-menu shop with equippable items** so item functionality can be tested. The first shop version has **two items per slot** to test equip/unequip/swap.

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

- Other objective candidates still open: boss fight, defend a point, retrieve an item, eliminate a target.
- Should difficulty also scale with objectives completed (section 7, TBD)?

**Balance**

- The game feels less crowded than before. Henrik's read is that it is the enemy spawning, not the halved hit circles. To tune in `balance.ts` (`SPAWNING`); needs a look at spawn rate, the enemy cap and the active ranges of spawn points (section 6).

- ATMs on the minimap (like caches)? They are not shown there yet.

**Art and feel**

- Real subway station art (the current prop is generated placeholder art in `BootScene.ts`).
- Lighting, next steps: lit windows and neon signs, lights on pickups, muzzle flashes, and tuning the darkness. How dark is too dark?
- Districts and real building art, which wait on the art.

**Economy and meta**

- Extraction bonus (decided): 15 credits for now, in `balance.ts` (`extractionBonus`); revisit once shop prices exist.

## 14. Difficulty settings

- Under a future Options menu we should have a few things where players can customize their experience
  - One is a choice to freeze time completely while inputing hacks, for players who struggle to stay alive while typing
