import { gear } from "../data/gear.js";
import { vehicles, starships } from "../data/craft.js";

const actorBase = (row, type) => ({
  name: row.name, type, system: {
    schemaVersion: 7, level: 1, heroPoints: 0,
    abilities: { strength: 3, agility: 3, vitality: 3, intelligence: 3, focus: 3, personality: 3 },
    wounds: { graze: 0, light: 0, moderate: 0, serious: 0, critical: 0, mortal: 0 },
    creature: {}, drone: {}, vehicle: {}, starship: {},
    identity: { notes: `<p>Core Rulebook p. ${row.page}</p>` }
  }
});

function droneActor(row) {
  const source = actorBase(row, "drone"), stats = row.stats || {};
  source.system.drone = { range: stats.range || "", durationRemaining: stats.duration || "", command: "", autonomous: false, components: [], availableCommands: stats.commands || "" };
  const armor = stats.defense?.match(/Armor\s+(\d+)\s+physical,\s*(\d+)\s+energy/i);
  source.system.creature = { level: "Drone (Mechanism)", senses: stats.senses || "", movement: stats.speed || "", armor: { physical: Number(armor?.[1] || 0), energy: Number(armor?.[2] || 0) }, specialAbilities: `${stats.defense || ""}; ${stats.attacks || ""}; ${stats.other || ""}` };
  source.system.identity.notes = `<p>${row.description || ""}</p><p><b>Durability:</b> ${stats.durability || ""}</p><p>Core Rulebook pp. 130–131.</p>`;
  return source;
}

function vehicleActor(row) {
  const source = actorBase(row, "vehicle");
  source.system.vehicle = { sourceId: row.id, techEra: row.techEra, speed: row.speed, capacity: row.capacity, operatorId: "", positionMode: "absolute", relativeRange: "near", controlState: "controlled", ramDamage: row.ramDamage, cover: row.cover, environment: "", armor: row.armor, durability: row.durability, features: row.features, rewardClass: row.rewardClass };
  source.system.identity.notes = `<p><b>Speed:</b> ${row.speed}</p><p><b>Capacity:</b> ${row.capacity}</p><p><b>Features:</b> ${row.features}</p><p>Core Rulebook p. ${row.page}.</p>`;
  return source;
}

function shipActor(row) {
  const source = actorBase(row, "starship");
  source.system.starship = { sourceId: row.id, techEra: row.techEra, hull: row.hull, drive: row.drive, modules: row.modules, features: row.features, resources: [], crewStations: [], notes: "Core rules treat ships as resources and sets. For occasional combat, use the vehicle rules; full ship combat and construction are in Shipyard." };
  source.system.identity.notes = `<p><b>Hull:</b> ${row.hull}</p><p><b>Drive:</b> ${row.drive}</p><p><b>Modules:</b> ${row.modules}</p><p><b>Features:</b> ${row.features}</p><p>Core Rulebook p. 283.</p>`;
  return source;
}

export function actorCatalogDocuments() {
  const drones = gear.filter(row => row.kind === "drone").map(droneActor);
  return [...drones, ...vehicles.map(vehicleActor), ...starships.map(shipActor)];
}

export async function refreshActorCompendiums() {
  if (!game.user.isGM) throw new Error("Only a GM can rebuild Actor compendiums.");
  const documents = actorCatalogDocuments(), groups = { drones: ["Drones", "drone"], vehicles: ["Vehicles", "vehicle"], starships: ["Core Sample Ships", "starship"] };
  for (const [name, [label, type]] of Object.entries(groups)) {
    const key = `world.a2e-${name}`; let pack = game.packs.get(key);
    if (!pack) pack = await CompendiumCollection.createCompendium({ type: "Actor", label: `Alternity 2e: ${label}`, name: `a2e-${name}`, package: "world" });
    await pack.configure({ locked: false, private: false });
    const existing = await pack.getDocuments(); if (existing.length) await Actor.deleteDocuments(existing.map(actor => actor.id), { pack: pack.collection });
    const sources = documents.filter(source => source.type === type); if (sources.length) await Actor.createDocuments(sources, { pack: pack.collection, keepId: false });
  }
  return Object.keys(groups).length;
}
