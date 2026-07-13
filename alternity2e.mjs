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

Hooks.once("init", () => {
  console.log("Alternity 2e | Initializing private game system");
  CONFIG.Actor.documentClass = AlternityActor;
  CONFIG.Item.documentClass = AlternityItem;
  CONFIG.Combat.documentClass = AlternityCombat;
  for (const type of ["hero", "npc", "creature", "drone", "vehicle"]) CONFIG.Actor.dataModels[type] = AlternityActorData;
  for (const type of ["skill", "talent", "weapon", "armor", "tool", "gear", "upgrade", "species", "archetype", "condition"]) CONFIG.Item.dataModels[type] = AlternityItemData;
  CONFIG.Actor.trackableAttributes = { hero: { bar: [], value: ["heroPoints", "play.impulse"] } };
  const Sheets = foundry.applications.apps.DocumentSheetConfig;
  Sheets.registerSheet(foundry.documents.Actor, game.system.id, AlternityActorSheet, { types: ["hero", "npc", "creature", "drone", "vehicle"], makeDefault: true });
  Sheets.registerSheet(foundry.documents.Item, game.system.id, AlternityItemSheet, { makeDefault: true });
  registerSettings();
  registerRuntimeHooks();
  registerCombatHooks();
  Handlebars.registerHelper("a2eEq", (a, b) => String(a) === String(b));
  Handlebars.registerHelper("a2eAdd", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("a2eRange", (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
  game.alternity2e = { importStandaloneCharacter, exportStandaloneCharacter, installPrivateCatalogs, refreshCompendiums, refreshActorSources, migrateActorAmmunition, openCreationWizard: actor => new AlternityCreationWizard({ actor }).render(true) };
});

Hooks.once("ready", async () => {
  if (game.user.isGM && game.settings.get("alternity2e", "installPrivateCatalogs")) await installPrivateCatalogs();
  if (game.user.isGM) { const migrated = (await Promise.all(game.actors.map(actor => migrateActorAmmunition(actor)))).reduce((sum, count) => sum + count, 0); if (migrated) ui.notifications.info(`Updated ammunition profiles for ${migrated} existing weapon Items.`); }
});
