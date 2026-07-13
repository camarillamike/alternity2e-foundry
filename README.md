# Alternity 2e - Private Foundry VTT System

> Private campaign repository. This package includes material derived from a lawfully owned rulebook and is not licensed for public redistribution.

Version 0.4.0 adds complete tactical ammunition handling:

- Loaded ammunition is always tracked; ordinary reserves can be abstract or limited through a world setting.
- Unlisted modern magazines and power cells default to 10 attacks, while explicit capacities and description-sourced exceptions are retained.
- Normal fire, burst, and full auto consume 1, 3, and 10 rounds respectively.
- Reload traits use their listed impulse cost; revolvers and shotguns load one round per action, with revolver speed-loader support.
- Grenade and Z-missile launchers track capacity, reserves, and selected payload; thrown grenades and one-shot weapons are consumed.
- Armor-piercing, hollow-point, incendiary, and Deto-Max ammunition apply their mechanical changes and roll for depletion when combat ends.
- Existing embedded weapons migrate to the new profile without discarding an already-tracked loaded count.

Version 0.3.1 added inventory integrity and full encumbrance handling to the rulebook action scheduler:

- Compendium drops use one capture-phase handler and cannot multiply after sheet rerenders.
- Repeated source Items increase quantity; unique skills and talents cannot duplicate.
- **Consolidate duplicate Items** repairs Actors affected by the prior drop bug.
- Weapons appear in both Attacks and Items and can be equipped, edited, or removed from either workflow.
- Carried mass, encumbrance capacity, load categories, Speed reductions, relevant skill penalties, armor movement/check penalties, Armor Training, and Baromorph load reduction are derived automatically.
- Only one armor suit contributes resistance, alongside natural armor and legitimate bonus-resistance equipment.
- Wound boxes render horizontally in compact severity rows.

Version 0.3.0 replaced the prototype impulse counter with a rulebook action scheduler:

- Absolute impulse timing preserves actions across round boundaries (for example, Impulse 7 plus a 3-impulse action becomes next round, Impulse 2).
- Initiative success levels schedule first actions correctly; failures begin in Impulse 2.
- First-action priority and later first-in/first-out sequencing are retained.
- Standard action costs, readying, reactions, weapon Speed, reloads, total defense, dazed/slowed/stun delays, and common modifiers are integrated into the Actor sheet and Combat Tracker.
- End-of-round and start-of-round reminders cover passive resistance, timed effects, and damage over time.

The broader Foundry workflow also includes:

- Full hero sheet with Play, Character, Items, Advancement, and Notes views.
- Desktop Hero Forge JSON import/export.
- Optional eight-step guided creator; manual editing and imports remain available.
- Nine categorized world compendiums generated from the shared authoritative catalog.
- Eight-impulse Combat Tracker integration with per-action speed scheduling.
- Drag/drop Items, source refresh, level advancement, ammunition/reload tracking, conditions, armor penetration, wound escalation, recovery, and targeted chat damage.

After upgrading an existing world, a GM can use **Items → Rebuild compendiums** on a hero. Use **Refresh character Items** to update embedded source material while retaining ranks, quantities, equipped state, upgrades, and ammunition.

This is a private-use Foundry VTT game system built alongside the standalone Alternity Hero Forge. It targets Foundry VTT 13+ and is verified structurally for Foundry 14.

## Install

1. Close the Foundry world.
2. Extract the `alternity2e` folder into `{Foundry user data}/Data/systems/`.
3. Confirm the final path is `Data/systems/alternity2e/system.json`.
4. Restart Foundry and create a world using **Alternity 2e (Private System)**.
5. As GM, leave **Install Core Rulebook compendiums** enabled if you are authorized to use the bundled personal-use catalog.

### Foundry manifest installation

After this repository is made public, paste this URL into Foundry's **Install System** manifest field:

```text
https://raw.githubusercontent.com/camarillamike/alternity2e-foundry/main/system.json
```

While the repository is private, GitHub authentication prevents Foundry from downloading the manifest or release ZIP. The installed system remains available after changing the repository back to private, but automatic update checks require the files to be public.

## Features

- Hero, NPC, creature, drone, and vehicle Actor types.
- Skill, talent, weapon, armor, tool, gear, upgrade, species, archetype, and condition Item types.
- Modern Foundry Actor and Item DataModels.
- Alternity wound bands, durability, armor reduction, escalation, incapacitation, and penalties.
- Skill and weapon chat rolls.
- Targeted damage buttons in chat.
- Round and impulse state, hero points, conditions, damage history, attacks, skills, talents, and equipment.
- Standalone character interchange through `game.alternity2e.importStandaloneCharacter(data)` and `game.alternity2e.exportStandaloneCharacter(actor)`.
- Idempotent categorized compendium installation and source updates.

## Character import

Open the browser developer console while logged in as a user allowed to create Actors, parse the exported standalone JSON, and call:

```js
await game.alternity2e.importStandaloneCharacter(characterData)
```

The Actor directory context menu provides **Export Alternity Character** for Hero Actors.

## Licensing boundary

The system implementation and the copied Core Rulebook-derived content are currently intended only for private use by people who lawfully possess the rulebook. Do not publish the ZIP or submit it to Foundry's package browser without confirming redistribution rights with the relevant rights holder.
