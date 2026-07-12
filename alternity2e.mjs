import { AlternityActorData, AlternityItemData } from "./module/data-models.mjs";
import { AlternityActor, AlternityItem } from "./module/documents.mjs";
import { AlternityActorSheet, AlternityItemSheet } from "./module/sheets.mjs";
import { registerSettings } from "./module/settings.mjs";
import { installPrivateCatalogs } from "./module/catalogs.mjs";
import { importStandaloneCharacter, exportStandaloneCharacter } from "./module/interchange.mjs";
import { registerRuntimeHooks } from "./module/hooks.mjs";

Hooks.once("init", () => {
  console.log("Alternity 2e | Initializing private game system");
  CONFIG.Actor.documentClass = AlternityActor;
  CONFIG.Item.documentClass = AlternityItem;
  for (const type of ["hero", "npc", "creature", "drone", "vehicle"]) CONFIG.Actor.dataModels[type] = AlternityActorData;
  for (const type of ["skill", "talent", "weapon", "armor", "tool", "gear", "upgrade", "species", "archetype", "condition"]) CONFIG.Item.dataModels[type] = AlternityItemData;
  CONFIG.Actor.trackableAttributes = { hero: { bar: [], value: ["heroPoints", "play.impulse"] } };
  const Sheets = foundry.applications.apps.DocumentSheetConfig;
  Sheets.registerSheet(foundry.documents.Actor, game.system.id, AlternityActorSheet, { types: ["hero", "npc", "creature", "drone", "vehicle"], makeDefault: true });
  Sheets.registerSheet(foundry.documents.Item, game.system.id, AlternityItemSheet, { makeDefault: true });
  registerSettings();
  registerRuntimeHooks();
  game.alternity2e = { importStandaloneCharacter, exportStandaloneCharacter, installPrivateCatalogs };
});

Hooks.once("ready", async () => {
  if (game.user.isGM && game.settings.get("alternity2e", "installPrivateCatalogs")) await installPrivateCatalogs();
});
