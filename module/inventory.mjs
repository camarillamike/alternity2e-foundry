export function duplicateGroups(items = []) {
  const groups = new Map();
  for (const item of items) {
    const sourceId = item.system?.sourceId; if (!sourceId) continue;
    const key = `${item.type}:${sourceId}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

export function calculateEncumbrance({ mass = 0, strength = 3, vitality = 3, tierReduction = 0 } = {}) {
  const capacity = 10 + 2 * Math.max(Number(strength) - 3, 0) + 2 * Math.max(Number(vitality) - 3, 0), ratio = capacity ? Number(mass) / capacity : 0;
  let tier = ratio <= 1 ? 0 : ratio <= 2 ? 1 : ratio <= 3 ? 2 : ratio <= 4 ? 3 : 4; tier = Math.max(0, tier - Math.max(0, Number(tierReduction || 0)));
  const labels = ["Unencumbered", "Heavy load", "Encumbered", "Severely encumbered", "Overloaded - powerlifting required"];
  return { mass: Number(mass), capacity, ratio, tier, label: labels[tier], speedPenalty: tier === 1 || tier === 2 ? -5 : tier === 3 ? -10 : tier >= 4 ? -Infinity : 0, checkSteps: tier === 2 ? -1 : tier >= 3 ? -2 : 0, overloaded: tier >= 4 };
}

export async function consolidateActorItems(actor) {
  if (!actor?.isOwner) throw new Error("You do not have permission to consolidate this Actor's Items.");
  const groups = duplicateGroups([...actor.items]), updates = [], deletions = [];
  for (const group of groups) {
    const [keeper, ...duplicates] = group, unique = ["skill", "talent", "species", "archetype", "condition"].includes(keeper.type);
    const quantity = unique ? 1 : Math.max(...group.map(item => Math.max(1, Number(item.system.quantity || 1))));
    updates.push({ _id: keeper.id, "system.quantity": quantity }); deletions.push(...duplicates.map(item => item.id));
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates); if (deletions.length) await actor.deleteEmbeddedDocuments("Item", deletions);
  return { groups: groups.length, removed: deletions.length };
}
