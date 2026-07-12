import { catalogDocuments } from "./catalogs.mjs";

export async function importStandaloneCharacter(character) {
  if (!game.user.can("ACTOR_CREATE")) throw new Error("You do not have permission to create Actors.");
  const actor = await Actor.create({ name: character.identity?.name || "Imported Hero", type: "hero", system: {
    schemaVersion: 1, level: character.level || 1, heroPoints: character.heroPoints ?? 1, abilities: character.abilities, wounds: character.wounds,
    speciesId: character.species || "human", archetypeId: character.archetype || "", mandatedTalentId: character.mandatedTalent || "", campaign: character.campaign,
    identity: { player: character.identity?.player || "", concept: character.identity?.concept || "", background: character.identity?.background || "", goals: character.identity?.goals || "", connections: character.identity?.connections || "", notes: character.identity?.notes || "" },
    play: character.play || { round: 1, impulse: 1, statuses: [], damageLog: [], lastDamage: null }, migrationHistory: character.migrationHistory || []
  }});
  const sources = catalogDocuments(), wanted = new Set([...(character.talents || []).map(id => `talent:${id}`), ...(character.gear || []).map(id => `gear:${id}`), ...(character.gear || []).map(id => `weapon:${id}`), ...(character.gear || []).map(id => `armor:${id}`), ...(character.gear || []).map(id => `tool:${id}`)]);
  const items = sources.filter(x => wanted.has(`${x.type}:${x.system.sourceId}`));
  for (const [id, state] of Object.entries(character.skills || {})) { const source = sources.find(x => x.type === "skill" && x.system.sourceId === id); if (source) items.push(foundry.utils.mergeObject(source, { system: { ranks: state.ranks || 0, keyAbility: state.keyAbility || source.system.keyAbility } }, { inplace: false })); }
  await actor.createEmbeddedDocuments("Item", items); return actor;
}

export function exportStandaloneCharacter(actor) {
  const byType = type => actor.items.filter(i => i.type === type);
  return { schemaVersion: 4, appVersion: "foundry-0.1.0", rulesVersion: "alternity-core-2018", id: actor.id, identity: { name: actor.name, ...actor.system.identity }, campaign: actor.system.campaign, level: actor.system.level, heroPoints: actor.system.heroPoints, abilities: actor.system.abilities, species: actor.system.speciesId, archetype: actor.system.archetypeId, mandatedTalent: actor.system.mandatedTalentId, talents: byType("talent").map(i => i.system.sourceId), skills: Object.fromEntries(byType("skill").map(i => [i.system.sourceId, { ranks: i.system.ranks, keyAbility: i.system.keyAbility, specialties: [] }])), gear: actor.items.filter(i => ["weapon", "armor", "tool", "gear"].includes(i.type)).map(i => i.system.sourceId), gearUpgrades: {}, gearCustomizations: {}, customGear: [], wounds: actor.system.wounds, play: actor.system.play, advancement: [], overrides: [], migrationHistory: actor.system.migrationHistory };
}
