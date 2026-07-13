export function ammoPools(actor) {
  return actor.items.filter(item => item.type === "gear" && item.system.metadata?.ammoPool).map(item => ({ id: item.id, name: item.name, quantity: Number(item.system.quantity || 0), unit: item.system.metadata.ammoPool.unit || "rounds" }));
}

export function linkedAmmoPool(actor, weapon) { return weapon?.system?.ammo?.resourceId ? actor.items.get(weapon.system.ammo.resourceId) : null; }

export async function createAmmoPool(actor, { name = "Shared ammunition", quantity = 0, unit = "rounds" } = {}) {
  const [item] = await actor.createEmbeddedDocuments("Item", [{ name, type: "gear", system: { sourceId: "", category: "Ammunition Resources", quantity: Math.max(0, Number(quantity)), mass: 0, equipped: true, description: "User-managed shared ammunition resource.", metadata: { ammoPool: { unit } } } }]); return item;
}

export async function consumeAmmoPool(pool, amount) {
  if (!pool) return false; const quantity = Number(pool.system.quantity || 0); if (quantity < amount) return false;
  await pool.update({ "system.quantity": quantity - amount }); return true;
}
