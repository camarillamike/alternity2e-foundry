import { AlternityActorData, AlternityItemData } from "./module/data-models.mjs";
import { AlternityActor, AlternityItem } from "./module/documents.mjs";
import { AlternityActorSheet, AlternityItemSheet } from "./module/sheets.mjs";
import { registerSettings } from "./module/settings.mjs";
import { installPrivateCatalogs, refreshCompendiums, refreshActorSources } from "./module/catalogs.mjs";
import { importStandaloneCharacter, exportStandaloneCharacter } from "./module/interchange.mjs";
import { registerRuntimeHooks } from "./module/hooks.mjs";
import { AlternityCombat, registerCombatHooks } from "./module/combat.mjs";
import { AlternityCreationWizard } from "./module/wizard.mjs";
import { migrateActorAmmunition } from "./module/ammunition.mjs";
import { migrateWorldV5 } from "./module/migrations.mjs";
import { AlternityCompendiumBrowser } from "./module/compendium-browser.mjs";
import { AlternityGMDashboard } from "./module/gm-dashboard.mjs";
import { refreshActorCompendiums } from "./module/craft-catalogs.mjs";

Hooks.once("init", () => {
  console.log("Alternity 2e | Initializing private game system");
  CONFIG.Actor.documentClass = AlternityActor;
  CONFIG.Item.documentClass = AlternityItem;
  CONFIG.Combat.documentClass = AlternityCombat;
  for (const type of ["hero", "npc", "creature", "drone", "vehicle", "starship"]) CONFIG.Actor.dataModels[type] = AlternityActorData;
  for (const type of ["skill", "talent", "weapon", "armor", "tool", "gear", "upgrade", "species", "archetype", "condition", "reference"]) CONFIG.Item.dataModels[type] = AlternityItemData;
  CONFIG.Actor.trackableAttributes = Object.fromEntries(["hero", "npc", "creature", "drone", "vehicle", "starship"].map(type => [type, { bar: [], value: ["heroPoints", "play.impulse", "wounds.mortal"] }]));
  const Sheets = foundry.applications.apps.DocumentSheetConfig;
  Sheets.registerSheet(foundry.documents.Actor, game.system.id, AlternityActorSheet, { types: ["hero", "npc", "creature", "drone", "vehicle", "starship"], makeDefault: true });
  Sheets.registerSheet(foundry.documents.Item, game.system.id, AlternityItemSheet, { makeDefault: true });
  registerSettings();
  registerRuntimeHooks();
  registerCombatHooks();
  Handlebars.registerHelper("a2eEq", (a, b) => String(a) === String(b));
  Handlebars.registerHelper("a2eAdd", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("a2eRange", (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
  game.alternity2e = { importStandaloneCharacter, exportStandaloneCharacter, installPrivateCatalogs, refreshCompendiums, refreshActorCompendiums, refreshActorSources, migrateActorAmmunition, openCreationWizard: actor => new AlternityCreationWizard({ actor }).render(true), openCatalogBrowser: () => new AlternityCompendiumBrowser().render(true), openGMDashboard: () => new AlternityGMDashboard().render(true) };
});

Hooks.on("getSceneControlButtons", controls => { const group = Array.isArray(controls) ? controls.find(control => control.name === "tokens") : controls.tokens; if (!group) return; const tool = { name: "alternityCatalog", title: "Alternity Catalog Browser", icon: "fas fa-book-open", button: true, onChange: () => new AlternityCompendiumBrowser().render(true) }; if (Array.isArray(group.tools)) group.tools.push(tool); else group.tools.alternityCatalog = tool; });

Hooks.once("ready", async () => {
  if (game.user.isGM && game.settings.get("alternity2e", "installPrivateCatalogs")) await installPrivateCatalogs();
  if (game.user.isGM) { const migrated = await migrateWorldV5(); if (migrated) ui.notifications.info(`Migrated ${migrated} Alternity Actors to the v0.5 authority and tracker schema.`); }
  if (game.user.isGM) { const migrated = (await Promise.all(game.actors.map(actor => migrateActorAmmunition(actor)))).reduce((sum, count) => sum + count, 0); if (migrated) ui.notifications.info(`Updated ammunition profiles for ${migrated} existing weapon Items.`); }
});
