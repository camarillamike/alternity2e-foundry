const CAPACITY_OVERRIDES = Object.freeze({ "grenade-launcher": 5, "plasma-rifle": 20, "shock-rifle": 20, "shock-glove": 10, "stun-gun": 10 });
const INITIAL_RESERVES = Object.freeze({ "grenade-launcher": 5, "antitank-rocket": 4 });
const NO_DEFAULT_AMMO_TYPES = new Set(["bolas", "javelin", "grenade"]);

export function weaponAmmoProfile(row = {}) {
  if (row.kind !== "weapon") return emptyAmmo();
  const special = row.special || [], text = special.join(" "), explicitMagazine = Number(text.match(/\bMag\s+(\d+)/i)?.[1] || 0), reloadCost = Number(text.match(/\bReload\s+(\d+)/i)?.[1] || 0), loadout = special.some(value => /^Ammo Loadout$/i.test(value)), thrownConsumable = row.type === "grenade";
  let mode = "none", max = 0, amount = 0, cost = 0, reserveUnit = "rounds";
  if (thrownConsumable) { mode = "consumable"; max = 1; amount = 0; reserveUnit = "grenades"; }
  else if (reloadCost) { mode = "single"; max = 1; amount = 1; cost = reloadCost; }
  else if (loadout) { mode = "loadout"; max = explicitMagazine || CAPACITY_OVERRIDES[row.id] || 1; amount = max; cost = 1; reserveUnit = "warheads"; }
  else if (explicitMagazine || CAPACITY_OVERRIDES[row.id]) { mode = ["revolver", "shotgun"].includes(row.id) ? "partial" : "magazine"; max = explicitMagazine || CAPACITY_OVERRIDES[row.id]; amount = mode === "partial" ? 1 : max; cost = 1; reserveUnit = mode === "magazine" ? "magazines" : "rounds"; }
  else if (row.range && row.range !== "Adjacent" && Number(row.techEra || 0) >= 5 && !NO_DEFAULT_AMMO_TYPES.has(row.type)) { mode = "magazine"; max = 10; amount = 10; cost = 1; reserveUnit = "magazines"; }
  return { profileVersion: 1, value: max, max, mode, reloadCost: cost, reloadAmount: amount, reserve: INITIAL_RESERVES[row.id] || 0, reserveUnit, payload: loadout ? "frag-grenade" : "", specialType: "normal", specialAvailable: false, specialUsed: false, speedLoader: false };
}

export function emptyAmmo() { return { profileVersion: 1, value: 0, max: 0, mode: "none", reloadCost: 0, reloadAmount: 0, reserve: 0, reserveUnit: "rounds", payload: "", specialType: "normal", specialAvailable: false, specialUsed: false, speedLoader: false }; }
export function ammoConsumption(mode = "normal") { return mode === "burst" ? 3 : mode === "fullauto" ? 10 : 1; }

export function reloadPlan(ammo, { limited = false } = {}) {
  if (!ammo || ["none", "consumable"].includes(ammo.mode) || ammo.value >= ammo.max) return { allowed: false, reason: "not-needed" };
  let amount = Number(ammo.reloadAmount || 1); if (ammo.mode === "partial" && ammo.speedLoader) amount = ammo.max;
  amount = Math.min(amount, ammo.max - ammo.value);
  if (limited && ammo.reserve < 1) return { allowed: false, reason: "no-reserve" };
  if (limited && ["partial", "single", "loadout"].includes(ammo.mode)) amount = Math.min(amount, ammo.reserve);
  const reserveCost = limited ? (ammo.mode === "magazine" ? 1 : amount) : 0;
  return { allowed: amount > 0, amount, cost: Number(ammo.reloadCost || 1), reserveCost, nextValue: ammo.value + amount, nextReserve: Math.max(0, ammo.reserve - reserveCost) };
}

export function specialAmmoEffect(type, weapon = {}) {
  const firearm = weapon.damageType === "physical" && ["pistol", "rifle", "assault", "firearm"].includes(weapon.weaponType || weapon.type), explosive = /grenade|rocket/i.test(weapon.sourceId || weapon.id || "");
  if (type === "armorPiercing") return { valid: true, armorPenetration: 3, label: "Armor Piercing" };
  if (type === "hollowPoint") return { valid: firearm, armorBonus: 3, addStatus: "damage-over-time", trait: "Bleed", label: "Hollow Point" };
  if (type === "incendiary") return { valid: Number(weapon.techEra || 0) >= 7, trait: "Ignite", label: "Incendiary" };
  if (type === "detoMax") return { valid: explosive, damageBonus: 1, blastRadius: 2, label: "Deto-Max" };
  return { valid: true, label: "Normal" };
}

export async function migrateActorAmmunition(actor) {
  if (!actor?.isOwner) return 0; const updates = [];
  for (const item of actor.items.filter(entry => entry.type === "weapon" && Number(entry.system.ammo?.profileVersion || 0) < 1)) {
    const profile = weaponAmmoProfile({ ...(item.system.metadata || {}), id: item.system.sourceId, kind: "weapon", type: item.system.weaponType, range: item.system.range, techEra: item.system.techEra, special: item.system.special, damageType: item.system.damageType }), old = item.system.ammo || {};
    if (Number(old.max || 0) > 0) profile.value = Math.min(profile.max, Number(old.value || 0)); updates.push({ _id: item.id, "system.ammo": profile });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates); return updates.length;
}
