import { abilities } from "../data/abilities.js";
import { skills } from "../data/skills.js";
import { species } from "../data/species.js";
import { archetypes } from "../data/archetypes.js";
import { talents } from "../data/talents.js";
import { gear, upgrades } from "../data/gear.js";

const VERSION = "0.1.0";
const html = value => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const base = (row, type) => ({ name: row.name, type, system: { sourceId: row.id, description: html(row.description || row.notes || ""), page: row.page || 0, metadata: row } });

export function catalogDocuments() {
  return [
    ...skills.map(row => ({ ...base(row, "skill"), system: { ...base(row, "skill").system, keyAbility: row.ability[0] === "any" ? "intelligence" : row.ability[0], category: row.type } })),
    ...talents.map(row => ({ ...base(row, "talent"), system: { ...base(row, "talent").system, constellation: row.constellation, parentId: row.parent || "", effects: row.effect ? [row.effect] : [], requirements: row.requires || [] } })),
    ...gear.map(row => ({ ...base(row, row.kind === "drone" ? "gear" : row.kind), system: { ...base(row, row.kind === "drone" ? "gear" : row.kind).system, techEra: row.techEra, itemClass: row.class, restriction: row.restriction, mass: row.mass || 0, weaponType: row.type || "", range: row.range || "", speed: row.speed || 0, damage: row.damage || "", damageType: row.damageType || "", special: row.special || [], move: row.move || 0, penalty: row.penalty || 0, physical: row.physical || 0, energy: row.energy || 0 } })),
    ...upgrades.map(row => ({ ...base(row, "upgrade"), system: { ...base(row, "upgrade").system, itemClass: row.classIncrease, effects: row.effect ? [row.effect] : [], requirements: row.requires ? [row.requires] : [] } })),
    ...species.map(row => ({ ...base(row, "species"), system: { ...base(row, "species").system, effects: row.effects || [], requirements: row.requirements || [] } })),
    ...archetypes.map(row => ({ ...base(row, "archetype"), system: { ...base(row, "archetype").system, effects: row.effects || [], metadata: row } }))
  ];
}

export async function installPrivateCatalogs() {
  if (!game.user.isGM || game.settings.get("alternity2e", "catalogVersion") === VERSION) return;
  const folder = game.folders.find(f => f.type === "Item" && f.name === "Alternity 2e Private Catalog") || await Folder.create({ name: "Alternity 2e Private Catalog", type: "Item" });
  const existing = new Map(game.items.filter(i => i.folder?.id === folder.id).map(i => [`${i.type}:${i.system.sourceId}`, i]));
  for (const source of catalogDocuments()) { const old = existing.get(`${source.type}:${source.system.sourceId}`); if (old) await old.update(source); else await Item.create({ ...source, folder: folder.id }); }
  await game.settings.set("alternity2e", "catalogVersion", VERSION);
  ui.notifications.info("Alternity 2e private catalogs installed or updated.");
}

export { abilities, skills, species, archetypes, talents, gear, upgrades };
