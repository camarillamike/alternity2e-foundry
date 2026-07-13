export function upgradeEligibleFor(item, upgrade) {
  const row = upgrade?.system?.metadata || upgrade, target = row.target || upgrade?.system?.metadata?.target;
  if (!item || !upgrade || target !== item.type || (item.system.upgrades || []).includes(upgrade.system?.sourceId || row.id)) return false;
  const req = row.requires || {};
  const melee = item.type === "weapon" && item.system.range === "Adjacent", gun = item.type === "weapon" && !melee && item.system.range !== "Thrown" && String(item.system.weaponType).toLowerCase() !== "grenade";
  if (req.melee && !melee) return false;
  if (req.gun && !gun) return false;
  if (req.rifle && String(item.system.weaponType).toLowerCase() !== "rifle") return false;
  if (req.notTwoHanded && (item.system.special || []).some(value => /two-handed/i.test(value))) return false;
  if (req.notAP && (item.system.special || []).some(value => /^AP\s/i.test(value))) return false;
  if (req.magazine && Number(item.system.ammo?.max || 0) < 1) return false;
  if (req.maximumWeaponTechEra && Number(item.system.techEra || 0) > req.maximumWeaponTechEra) return false;
  if (req.campaignTechEra && Number(item.parent?.system?.campaign?.techEra || globalThis.game?.settings?.get?.("alternity2e", "defaultTechEra") || 7) < req.campaignTechEra) return false;
  if (row.freeFeature) {
    const installed = (item.system.upgrades || []).filter(id => id.startsWith(`custom-${row.family}-`)).length;
    const allowance = row.family === "gun" && (String(item.system.weaponType).toLowerCase() === "rifle" || item.system.category === "Heavy Weapons and Grenades") ? 2 : 1;
    if (installed >= allowance) return false;
  }
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
  if (effect.replaceSpecial) { const index = special.findIndex(value => value === effect.replaceSpecial); if (index >= 0) special.splice(index, 1); if (effect.addSpecial && !special.includes(effect.addSpecial)) special.push(effect.addSpecial); }
  if (effect.magazineMultiplier) { const oldMax = Number(item.system.ammo?.max || 0), nextMax = Math.ceil(oldMax * Number(effect.magazineMultiplier)); update["system.ammo.max"] = nextMax; update["system.ammo.value"] = Math.min(nextMax, Number(item.system.ammo?.value || 0) + nextMax - oldMax); }
  if (effect.underbarrelLauncher) special.push("Under-barrel grenade launcher: Mag 1, Reload 2");
  if (effect.aimRangeSteps) effects.push({ type: "aimRangeSteps", value: Number(effect.aimRangeSteps), source: upgrade.system.sourceId });
  if (effect.laserSight) effects.push({ type: "laserSight", value: 1, source: upgrade.system.sourceId });
  if (effect.situational) effects.push({ type: "situational", context: effect.situational, value: Number(effect.steps || effect.coercionSteps || effect.armorPenetration || 0), source: upgrade.system.sourceId });
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
