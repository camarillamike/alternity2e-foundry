# Alternity 2e - Private Foundry VTT System

> Private campaign repository. This package includes material derived from a lawfully owned rulebook and is not licensed for public redistribution.

This is a private-use Foundry VTT game system built alongside the standalone Alternity Hero Forge. It targets Foundry VTT 13+ and is verified structurally for Foundry 14.

## Install

1. Close the Foundry world.
2. Extract the `alternity2e` folder into `{Foundry user data}/Data/systems/`.
3. Confirm the final path is `Data/systems/alternity2e/system.json`.
4. Restart Foundry and create a world using **Alternity 2e (Private System)**.
5. As GM, enable **Install private Core Rulebook catalogs** in System Settings if you are authorized to use the bundled personal-use catalog.

### Foundry manifest installation

After this repository is made public, paste this URL into Foundry's **Install System** manifest field:

```text
https://raw.githubusercontent.com/camarillamike/alternity2e-foundry/main/system.json
```

While the repository is private, GitHub authentication prevents Foundry from downloading the manifest or release ZIP. The system remains installed after repository visibility is changed back to private, but automatic update checks will not work until the files are public again.

## Features

- Hero, NPC, creature, drone, and vehicle Actor types.
- Skill, talent, weapon, armor, tool, gear, upgrade, species, archetype, and condition Item types.
- Modern Foundry Actor and Item DataModels.
- Alternity wound bands, durability, armor reduction, escalation, incapacitation, and penalties.
- Skill and weapon chat rolls.
- Targeted damage buttons in chat.
- Round and impulse state, hero points, conditions, damage history, attacks, skills, talents, and equipment.
- Standalone character interchange through `game.alternity2e.importStandaloneCharacter(data)` and `game.alternity2e.exportStandaloneCharacter(actor)`.
- Visible Actor-sheet Import and Export buttons for desktop character JSON files.
- Working Play, Character, Items, and Notes tabs with Play selected on first open.
- Idempotent private catalog installation and updates.

## Character import

Open the browser developer console while logged in as a user allowed to create Actors, parse the exported standalone JSON, and call:

```js
await game.alternity2e.importStandaloneCharacter(characterData)
```

The Actor directory context menu provides **Export Alternity Character** for Hero Actors.

## Licensing boundary

The system implementation and the copied Core Rulebook-derived content are currently intended only for private use by people who lawfully possess the rulebook. Do not publish the ZIP or submit it to Foundry's package browser without confirming redistribution rights with the relevant rights holder.
