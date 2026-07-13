import { weaponAmmoProfile } from "./ammunition.mjs";

export const ACTOR_SCHEMA_VERSION = 6;

export async function migrateActorV5(actor) {
  if (!actor || Number(actor.system.schemaVersion || 1) >= ACTOR_SCHEMA_VERSION) return 0;
  const isHero = actor.type === "hero", lockDefault = game.settings.get("alternity2e", "buildLockDefault");
  const update = {
    "system.schemaVersion": ACTOR_SCHEMA_VERSION,
    "system.build.locked": isHero ? Boolean(lockDefault) : true,
    "system.build.advancementOpen": false,
    "system.build.skillPointsAvailable": 0,
    "system.build.talentChoicesAvailable": 0
    , "system.build.retrainingAvailable": 0, "system.build.talentRetrainingAvailable": false,
    "system.play.scene": Number(actor.system.play?.scene || 1)
  };
  await actor.update(update);
  return 1;
}

export async function migrateWorldV5() {
  if (!game.user.isGM) return 0;
  let count = 0;
  for (const actor of game.actors) count += await migrateActorV5(actor);
  return count;
}

export function exportItemState(item) {
  return {
    sourceId: item.system.sourceId,
    type: item.type,
    name: item.name,
    quantity: Number(item.system.quantity ?? 1),
    equipped: Boolean(item.system.equipped),
    upgrades: [...(item.system.upgrades || [])],
    ammo: foundry.utils.deepClone(item.system.ammo || weaponAmmoProfile({})),
    custom: item.system.sourceId ? null : item.toObject()
  };
}
