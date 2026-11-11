## README

In this document I will detail cyberware designs. Their cost, stats, name, and if it can be found in data caches or not.

## UPGRADE SLOTS

All upgrades can be installed for a single player, they function like upgrades rather than items. A player can max out all the upgrades.

## BLUEPRINTS

Some upgrades can only be found as blueprints in caches (and in the future possibly other places). When a blueprint is found, that upgrade will be available to purchase from the Ripdoc in the main menu. It should not be visible at the Ripdoc beforehand, should come as a surprise to players.

Details/decisions: 2.5% of data caches hold a blueprint (`blueprintChance` in `CACHES`, balance.ts), taken out of the 25% upgrade share. A cache only offers a blueprint not found yet (in earlier runs or this one); once all are found, that share holds upgrades again. Like any cache it can be taken or discarded. Found blueprints are banked with the credits when the run ends by death or extraction, and lost on quit. The HUD counts them and the results screen lists them by name.

## BUILD INSTRUCTIONS

When you build these items, ask for any specifics ragarding implementation, anything that we decide you can put in the "Details/decisions" section of each upgrade. Then I can make an manual changes here if necessary.

## RIPDOC MENU

In the main menu, the "Ripdoc" menu item will lead the player to the upgrade screen. Here there is a list of augments the players can buy to the left, and a silhouette of a human on the right side. Where artwork of the upgrades the players have bought can be added. Art is yet to be produced so placeholders for now.

Details/decisions: buying takes two presses (BUY, then CONFIRM), since purchases can't be undone. Blueprint pieces carry a BLUEPRINT tag once found. Upgrades are stored by id in the save, so an id must never change; names can. Art for a single piece goes in as texture `cyberware-<id>` and is drawn on the silhouette at its slot.

## EXAMPLE/TEMPLATE

Name: [CYBERWARE NAME]
Slot: [SLOT]
Cost: [COST IN CREDITS]
Stats: [AFFECTED STATS]
SHOP/BLUEPRINT: [SHOP/BLUEPRINT]
Details/decisions: [placeholder]

## HEAD

Name: Optic Nerve HUD
Slot: Head
Cost: 300 credits
Stats: Gives a compass to the closest camera pole and ATM.
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `opticNerveHud`. A second compass needle (cyan; the objective needle is gold) points at the nearest camera pole or ATM that can still be used, labelled CAM or ATM with the distance. Poles drop out once the map is revealed, ATMs once they go offline. Hidden while the target is on screen, like the objective needle.

Name: Heightened Proximity Sensors
Slot: Head
Cost: 550 credits
Stats: Enemies move 20% slower while near you.
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `proximitySensors`. Radius 150 px, shown as a faint cyan ring around the player. Applies to every walking enemy, guards included.

Name: Depth Enhancement Bridge
Slot: Head
Cost: 1250 credits
Stats: Increased range by 20% for all weapons (not passive effects)
SHOP/BLUEPRINT: [BLUEPRINT]
Details/decisions: id `depthBridge`. Extends every targeting range of the active skills: gun range (Auto Pistol, Railgun, Scatter Gun), Virus infect range, Rootkit hijack range and Synaptic Overload's max range. Area sizes are unchanged (EMP Shock ring, blast radii, Virus spread), and so are minimum ranges.

## CHEST

Name: Exposed Soft Tissue Shielding
Slot: Chest
Cost: 450 credits
Stats: 5% damage reduction.
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `softTissueShielding`. All damage-reduction percentages add up (passives and cyberware). Firewall changes from flat 1/2/3 to 3/6/9%, so Firewall 3 + Soft Tissue + Carbon Fiber = 24%. The minimum damage per hit still applies.

Name: Auxilliary Discharge Plates
Slot: Chest
Cost: 900 credits
Stats: Enemies close to you will periodically be zapped by electricity for 5 damage and stunned for 2s. This can at most occur every 12 seconds. (Radius 100px)
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `dischargePlates`. Zaps every enemy within the radius at once, and only fires when at least one enemy is in range (that starts the 12 s cooldown). Flat damage, not boosted by damage bonuses. Stun-immune enemies take the damage but not the stun.

Name: Carbon Fiber Second Skin
Slot: Chest
Cost: 1500 credits
Stats: 10% damage reduction and a 25% chance to ricochet a ranged attack back towards the attacker.
SHOP/BLUEPRINT: [BLUEPRINT]
Details/decisions: id `carbonFiberSkin`. Its 10% adds to the other damage reduction. On a ricochet the player takes no damage, and the bullet turns around as the player's own bullet, at its original damage, aimed at the shooter (straight back if the shooter is dead). Only rolled for hits that would land, so not during invulnerability; a ricochet doesn't use up a Defensive Matrix charge.

## HANDS

Name: Magnetized
Slot: Hands
Cost: 400 credits
Stats: You can now gather credits from 30% further away.
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `magnetized`. Credit chips only.

## BACK

Name: Holographic Disruptors
Slot: Back
Cost: 600 credits
Stats: Enemies are more likely to miss you with ranged attacks.
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `holographicDisruptors`. Ranged enemies aim up to ±12° off at random. Shots at a Rootkit decoy are unaffected.

## LEGS

Name: Hydraulic Joints
Slot: Legs
Cost: 600 credits
Stats: Increase run speed by 8%
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `hydraulicJointsLegs`. Adds to the passives' move speed percentage in the same sum.

## FEET

Name: MagLev Soles
Slot: Feet
Cost: 850 credits
Stats: Dash distance increased by 30%
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `maglevSoles`. The dash takes the same time, so it is faster rather than longer; invulnerability timing is unchanged.

## ICU

(Short for Internal Cyberware Unit)

Name: Megathreading
Slot: ICU
Cost: 500 credits
Stats: Hacking speed increased by 10%
SHOP/BLUEPRINT: [SHOP]
Details/decisions: id `megathreading`. Speeds up every timed hack step: the server hack upload, the camera pole hold, the ATM decrypt hold and the Connect servers attach. Typing prompts and Smack (a tap count) depend on the player and are unchanged.

## TRINKETS
