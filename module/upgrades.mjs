export function upgradeEligibleFor(item, upgrade) {
  const row = upgrade?.system?.metadata || upgrade, target = row.target || upgrade?.system?.metadata?.target;
  if (!item || !upgrade || target !== item.type || (item.system.upgrades || []).includes(upgrade.system?.sourceId || row.id)) return false;
  const req = row.requires || {};
  if (req.speed && !req.speed.includes(Number(item.system.speed))) return false;
  if (req.types && !req.types.includes(String(item.system.weaponType).toLowerCase())) return false;
  if (req.notSpecial && (item.system.special || []).includes(req.notSpecial)) return false;
  if (req.damageType && item.system.damageType !== req.damageType) return false;
  if (req.firearm && !["pistol", "rifle", "assault", "firearm"].includes(String(item.system.weaponType).toLowerCase())) return false;
  if (req.grenadeOrRocket && !/grenade|rocket|missile/i.test(`${item.system.sourceId} ${item.system.weaponType}`)) return false;
  if (req.resistance && !(item.system.physical || item.system.energy)) return false;
  if (req.penalty && !(item.system.move < 0 || item.system.penalty < 0)) return false;
  if (req.coverOrDeflect && !(item.system.special || []).some(value => /cover|deflect/i.test(value))) return false;
  if (req.poweredOrLifeSupport && !(item.system.special || []).some(value => /powered|life support/i.test(value))) return false;
  return true;
}

export async function installUpgrade(item, upgrade) {
  if (!upgradeEligibleFor(item, upgrade)) throw new Error(`${upgrade?.name || "Upgrade"} is not eligible for ${item?.name || "that item"}.`);
  const row = upgrade.system.metadata, effect = row.effect || {}, special = [...(item.system.special || [])], effects = [...(item.system.effects || [])], update = {
    "system.upgrades": [...(item.system.upgrades || []), upgrade.system.sourceId],
    "system.itemClass": Number(item.system.itemClass || 0) + Number(row.classIncrease || upgrade.system.itemClass || 0)
  };
  if (effect.addSpecial && !special.includes(effect.addSpecial)) special.push(effect.addSpecial);
  if (effect.speed) update["system.speed"] = Math.max(1, Number(item.system.speed || 0) + Number(effect.speed));
  if (effect.move) update["system.move"] = Number(item.system.move || 0) + Number(effect.move);
  if (effect.penalty) update["system.penalty"] = Number(item.system.penalty || 0) + Number(effect.penalty);
  if (effect.physical) update["system.physical"] = Number(item.system.physical || 0) + Number(effect.physical);
  if (effect.energy) update["system.energy"] = Number(item.system.energy || 0) + Number(effect.energy);
  if (effect.damageBonus) effects.push({ type: "damage", value: Number(effect.damageBonus), source: upgrade.system.sourceId });
  if (effect.attackSteps) effects.push({ type: "attackSteps", value: Number(effect.attackSteps), source: upgrade.system.sourceId });
  if (effect.skillSteps) effects.push({ type: "toolStep", skill: item.system.metadata?.keySkill || "", value: Number(effect.skillSteps), source: upgrade.system.sourceId });
  if (effect.reduceAP) effects.push({ type: "reduceAP", value: Number(effect.reduceAP), source: upgrade.system.sourceId });
  if (effect.woundPenalty) effects.push({ type: "woundPenaltyReduction", value: Number(effect.woundPenalty), source: upgrade.system.sourceId });
  update["system.special"] = special; update["system.effects"] = effects;
  await item.update(update); return item;
}
