import { abilities } from "../data/abilities.js";
import { skills } from "../data/skills.js";
import { species } from "../data/species.js";
import { archetypes } from "../data/archetypes.js";
import { talents } from "../data/talents.js";
import { gear, upgrades } from "../data/gear.js";

const VERSION = "0.2.3";
const html = value => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const base = (row, type) => ({ name: row.name, type, system: { sourceId: row.id, description: html(row.description || row.notes || ""), page: row.page || 0, metadata: row } });
const conditions = [
  ["blinded", "Blinded", "Cannot see. Enemies gain +2 steps to attack you; Speed is halved; your melee attacks take -5 steps unless already holding the target; ranged attacks require Awareness to locate the target and take -5 steps.", 162],
  ["damage-over-time", "Damage Over Time", "At the start of each round, suffer one wound box of the specified type until the listed active/passive resistance or treatment ends the effect.", 162],
  ["dazed", "Dazed", "Every action, including an active resist action, requires one additional impulse.", 163], ["dead", "Dead", "Fall prone and take no actions.", 163],
  ["distracted", "Distracted", "Enemies gain a +1 step bonus on attacks against you.", 163], ["grappled", "Grappled", "Cannot move away from the grappler and take a -1 step penalty on checks except attacks against the grappler or attempts to break free.", 163],
  ["incapacitated", "Incapacitated", "Fall prone and cannot act.", 163], ["impaired", "Impaired", "Take a -2 step penalty on all skill checks, halve Speed, and count as distracted.", 163],
  ["insane", "Insane", "Roll d10 when acting to determine behavior, then attempt a 0-impulse Willpower check to end the effect.", 163], ["off-balance", "Off-Balance", "Take a -2 step penalty on the next skill check you make.", 163],
  ["prone", "Prone", "Speed is 2 m. Melee attackers gain +1 step; ranged attackers take -1 step. Stand using reposition.", 164], ["slowed", "Slowed", "Halve Speed; actions other than active resist require one additional impulse.", 164],
  ["stun", "Stun", "Delay the next action by the listed impulses, cannot react, and stop dodging.", 164], ["weakened", "Weakened", "Take a -1 step penalty on all skill checks.", 164]
].map(([id, name, description, page]) => ({ id, name, description, page }));

export function catalogDocuments() {
  return [
    ...skills.map(row => ({ ...base(row, "skill"), system: { ...base(row, "skill").system, keyAbility: row.ability[0] === "any" ? "intelligence" : row.ability[0], category: row.type } })),
    ...talents.map(row => ({ ...base(row, "talent"), system: { ...base(row, "talent").system, constellation: row.constellation, parentId: row.parent || "", effects: row.effect ? [row.effect] : [], requirements: row.requires || [] } })),
    ...gear.map(row => { const magazine = Number((row.special || []).join(" ").match(/Mag\s+(\d+)/i)?.[1] || 0); return ({ ...base(row, row.kind === "drone" ? "gear" : row.kind), system: { ...base(row, row.kind === "drone" ? "gear" : row.kind).system, techEra: row.techEra, itemClass: row.class, restriction: row.restriction, mass: row.mass || 0, weaponType: row.type || "", range: row.range || "", speed: row.speed || 0, damage: row.damage || "", damageType: row.damageType || "", special: row.special || [], ammo: { value: magazine, max: magazine }, move: row.move || 0, penalty: row.penalty || 0, physical: row.physical || 0, energy: row.energy || 0 } }); }),
    ...upgrades.map(row => ({ ...base(row, "upgrade"), system: { ...base(row, "upgrade").system, itemClass: row.classIncrease, effects: row.effect ? [row.effect] : [], requirements: row.requires ? [row.requires] : [] } })),
    ...species.map(row => ({ ...base(row, "species"), system: { ...base(row, "species").system, effects: row.effects || [], requirements: row.requirements || [] } })),
    ...archetypes.map(row => ({ ...base(row, "archetype"), system: { ...base(row, "archetype").system, effects: row.effects || [], metadata: row } })),
    ...conditions.map(row => base(row, "condition"))
  ];
}

export async function installPrivateCatalogs() {
  if (!game.user.isGM || game.settings.get("alternity2e", "catalogVersion") === VERSION) return;
  await refreshCompendiums();
  await game.settings.set("alternity2e", "catalogVersion", VERSION);
  ui.notifications.info("Alternity 2e compendiums installed or updated from the bundled rulebook data.");
}

const PACKS = {
  species: ["Species", ["species"]], archetypes: ["Archetypes", ["archetype"]], skills: ["Skills", ["skill"]],
  talents: ["Talent Constellations", ["talent"]], weapons: ["Weapons", ["weapon"]], armor: ["Armor", ["armor"]],
  tools: ["Tools and Equipment", ["tool", "gear"]], upgrades: ["Gear Upgrades and Ammunition", ["upgrade"]], conditions: ["Conditions", ["condition"]]
};

export async function refreshCompendiums() {
  if (!game.user.isGM) throw new Error("Only a GM can rebuild system compendiums.");
  const documents = catalogDocuments();
  for (const [name, [label, types]] of Object.entries(PACKS)) {
    const key = `world.a2e-${name}`;
    let pack = game.packs.get(key);
    if (!pack) pack = await CompendiumCollection.createCompendium({ type: "Item", label: `Alternity 2e: ${label}`, name: `a2e-${name}`, package: "world" });
    await pack.configure({ locked: false, private: false });
    const existing = await pack.getDocuments();
    if (existing.length) await Item.deleteDocuments(existing.map(item => item.id), { pack: pack.collection });
    const sources = documents.filter(source => types.includes(source.type));
    if (sources.length) await Item.createDocuments(sources, { pack: pack.collection, keepId: false });
  }
  return Object.keys(PACKS).length;
}

export async function refreshActorSources(actor) {
  if (!actor?.isOwner) throw new Error("You do not have permission to refresh this Actor.");
  const sources = new Map(catalogDocuments().map(source => [`${source.type}:${source.system.sourceId}`, source]));
  const updates = [];
  for (const item of actor.items) {
    const source = sources.get(`${item.type}:${item.system.sourceId}`);
    if (!source) continue;
    const state = { ranks: item.system.ranks, keyAbility: item.system.keyAbility, quantity: item.system.quantity, equipped: item.system.equipped, upgrades: item.system.upgrades, ammo: item.system.ammo };
    updates.push(foundry.utils.mergeObject(source, { _id: item.id, system: state }, { inplace: false, recursive: true }));
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

export { abilities, skills, species, archetypes, talents, gear, upgrades, conditions };
