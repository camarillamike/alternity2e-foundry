import { damageSeverity, durability, applyWound, woundPenalty, parseDamage, skillTarget, stepFormula, rollDegree } from "./rules.mjs";
import { species, archetypes, gear } from "./catalogs.mjs";
import { calculateEncumbrance } from "./inventory.mjs";
import { specialAmmoEffect } from "./ammunition.mjs";
import { advanceChallenge, advanceMortality, coverSteps, newMortality, rangeAttackSteps } from "./trackers.mjs";
import { canApplyDamage, canAwardResources, controlsActor, requireAuthority } from "./authority.mjs";

const PRIMITIVE_RANGED = new Set(["bolas", "javelin", "sling", "bow", "crossbow"]);
const HEAVY_TYPES = new Set(["firearm", "grenade", "guided", "indirect"]);
const PENDING_DISPLACERS = new Map();
export function weaponSkillId(item) {
  const sourceId = item?.system?.sourceId || "", type = item?.system?.weaponType || "", range = item?.system?.range || "", special = item?.system?.special || [];
  if (range === "Adjacent") return type === "brawl" ? "hand-to-hand" : "melee";
  if (range === "Thrown" || special.some(value => /^Throwable$/i.test(value)) || PRIMITIVE_RANGED.has(sourceId)) return "primitive-weapon";
  if (HEAVY_TYPES.has(type)) return "heavy-weapon";
  return item?.system?.damageType === "energy" ? "energy-weapon" : "firearm";
}

export class AlternityActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system, items = this.items.contents;
    const talentBoxes = {};
    for (const item of items.filter(i => i.type === "talent")) for (const effect of item.system.effects || []) if (effect.type === "woundBoxes") for (const row of effect.rows || []) talentBoxes[row] = (talentBoxes[row] || 0) + Number(effect.value || 0);
    const effectiveVitality = s.abilities.vitality + this.ruleEffects.filter(effect => effect.type === "ability" && effect.ability === "vitality" || effect.type === "effectiveVitality" && effect.purpose === "durability").reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    const load = this.encumbranceState;
    s.derived = {
      durability: durability(effectiveVitality, talentBoxes), woundPenalty: Math.min(0, woundPenalty(s.wounds) + this._effectTotal("woundPenaltyReduction")), incapacitated: s.wounds.mortal > 0 || s.play.statuses.includes("incapacitated") || s.play.statuses.includes("dead"),
      initiative: { target: 20 - s.abilities.agility - s.abilities.focus, steps: this._effectTotal("initiativeStep") },
      armor: this.armorResistance, speed: this.currentSpeed, mass: load.mass, load
    };
  }
  get ruleEffects() { return [...(species.find(row => row.id === this.system.speciesId)?.effects || []), ...(archetypes.find(row => row.id === this.system.archetypeId)?.effects || []), ...Array.from(this.items).filter(item => item.type === "talent" || item.system.equipped).flatMap(item => item.system.effects || [])]; }
  _effectTotal(type) { return this.ruleEffects.filter(effect => effect.type === type).reduce((sum, effect) => sum + Number(effect.value || 0), 0); }
  effectiveAbility(id) { return Number(this.system.abilities[id] || 0) + this.ruleEffects.filter(effect => effect.type === "ability" && effect.ability === id).reduce((sum, effect) => sum + Number(effect.value || 0), 0); }
  get equippedArmor() { return this.items.filter(item => item.type === "armor" && item.system.equipped); }
  get armorSuit() { return this.equippedArmor.find(item => !(item.system.special || []).some(value => /^(screen|cover|deflect|bonus resistance)/i.test(value))); }
  get armorBonuses() { return this.equippedArmor.filter(item => (item.system.special || []).some(value => /^bonus resistance/i.test(value))); }
  defenseDeviceModifier({ melee = false, primitive = false, damageType = "physical" } = {}) { let cover = 0, deflect = 0; for (const item of this.equippedArmor) for (const quality of item.system.special || []) { const coverMatch = quality.match(/^Cover\s+(\d+)\s*(limited|all)?/i); if (coverMatch && (coverMatch[2]?.toLowerCase() !== "limited" || melee || primitive)) cover = Math.min(cover, -Number(coverMatch[1])); const deflectMatch = quality.match(/^Deflect\s+(\d+)(?:\s+physical\s*\/\s*(\d+)\s+energy)?/i); if (deflectMatch) deflect += -(damageType === "energy" && deflectMatch[2] ? Number(deflectMatch[2]) : Number(deflectMatch[1])); } return { cover, deflect }; }
  get armorResistance() { const sources = [this.armorSuit, ...this.armorBonuses].filter(Boolean), natural = this.ruleEffects.filter(e => e.type === "armor"), resistance = type => sources.reduce((n, i) => n + Math.max(0, Number(i.system[type] || 0) - Number(i.system.metadata?.ablative?.[type] || 0)), 0) + natural.reduce((n, e) => n + Number(e[type] || 0), 0); return { physical: resistance("physical"), energy: resistance("energy") }; }
  get armorPenalties() { const armor = this.armorSuit, ranks = Number(this.getSkill("armor-training")?.system.ranks || 0), moveReduction = ranks >= 8 ? 6 : ranks >= 5 ? 4 : ranks >= 2 ? 2 : 0, checkReduction = ranks >= 7 ? 3 : ranks >= 4 ? 2 : ranks >= 1 ? 1 : 0; return { move: Math.min(0, Number(armor?.system.move || 0) + moveReduction), check: Math.min(0, Number(armor?.system.penalty || 0) + checkReduction) }; }
  get forceShield() { return this.equippedArmor.find(item => item.system.sourceId === "force-shield"); }
  get displacerUnit() { return this.equippedArmor.find(item => item.system.sourceId === "displacer-unit"); }
  get displacerUsed() { return PENDING_DISPLACERS.get(this.uuid) === Number(this.system.play.scene || 1) || Boolean(this.displacerUnit?.system.metadata?.sceneUsed); }
  async markDisplacerUsed() { const item = this.displacerUnit; if (!item || this.displacerUsed) return false; PENDING_DISPLACERS.set(this.uuid, Number(this.system.play.scene || 1)); if (game.user.isGM || this.isOwner) { const metadata = foundry.utils.deepClone(item.system.metadata || {}); metadata.sceneUsed = true; await item.update({ "system.metadata": metadata }); } else game.socket.emit("system.alternity2e", { type: "deviceUse", actorUuid: this.uuid, itemId: item.id, device: "displacer-unit" }); return true; }
  get encumbranceState() {
    const mass = this.items.reduce((sum, item) => sum + Number(item.system.mass || 0) * Math.max(0, Number(item.system.quantity ?? 1)), 0), poweredStrength = { exoskeleton: 9, "raider-battlesuit": 10, "assault-battlesuit": 11, "hussar-warsuit": 11 }[this.armorSuit?.system.sourceId] || 0;
    return calculateEncumbrance({ mass, strength: Math.max(this.effectiveAbility("strength"), poweredStrength), vitality: this.effectiveAbility("vitality"), tierReduction: this._effectTotal("encumbranceTierReduction") });
  }
  get currentSpeed() { const statuses = this.system.play.statuses, load = this.encumbranceState; if (this.system.wounds.mortal || statuses.includes("incapacitated") || load.overloaded) return 0; if (statuses.includes("prone")) return 2; const base = Number(this.ruleEffects.filter(e => e.type === "baseSpeedOverride").at(-1)?.value ?? 20) + this._effectTotal("speed"), adjusted = Math.max(0, base + this.armorPenalties.move + load.speedPenalty); return statuses.some(x => ["blinded", "impaired", "slowed"].includes(x)) ? Math.max(2, adjusted / 2) : adjusted; }
  get statusSteps() { const statuses = this.system.play.statuses; return statuses.includes("impaired") ? -2 : statuses.includes("weakened") || statuses.includes("grappled") ? -1 : 0; }
  getSkill(id) { return this.items.find(i => i.type === "skill" && i.system.sourceId === id); }
  async rollSkill(itemOrId, { steps = 0, label } = {}) {
    const item = typeof itemOrId === "string" ? this.getSkill(itemOrId) : itemOrId, ability = this.system.abilities[item?.system.keyAbility] || 0, ranks = item?.system.ranks || 0;
    const categorySteps = this.ruleEffects.filter(effect => effect.type === "categoryStep" && effect.category === item?.system.category && ranks > 0).reduce((sum, effect) => sum + Number(effect.value || 0), 0), directSteps = this.ruleEffects.filter(effect => effect.type === "checkStep" && effect.skill === item?.system.sourceId).reduce((sum, effect) => sum + Number(effect.value || 0), 0), encumbranceSteps = ["attack", "defensive", "environmental"].includes(item?.system.category) ? this.encumbranceState.checkSteps : 0;
    const toolSteps = this.items.filter(tool => tool.type === "tool" && tool.system.equipped).flatMap(tool => tool.system.effects || []).filter(effect => effect.type === "toolStep" && (!effect.skill || effect.skill === item?.system.sourceId)).reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    const target = skillTarget(ability, ranks), finalSteps = Number(steps) + categorySteps + directSteps + toolSteps + encumbranceSteps + this.armorPenalties.check + this.system.derived.woundPenalty + this.statusSteps, die = await new Roll(stepFormula(finalSteps)).evaluate();
    const degree = rollDegree(die.total, target);
    const rollMode = this.type === "hero" ? undefined : game.settings.get("alternity2e", "npcRollMode");
    await die.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), rollMode, flavor: `<strong>${label || item?.name || "Skill Check"}</strong><br>Target ${target}; ${finalSteps >= 0 ? "+" : ""}${finalSteps} steps<br><b>${degree}</b>` });
    await this.update({ "system.play.lastCheck": { date: new Date().toISOString(), skillId: item?.system.sourceId || "", label: label || item?.name || "Skill Check", total: die.total, target, steps: finalSteps, degree, combat: Boolean(game.combat?.started), heroImproved: false } });
    if (this.system.play.statuses.includes("off-balance")) await this.update({ "system.play.statuses": this.system.play.statuses.filter(status => status !== "off-balance") });
    return { total: die.total, target, steps: finalSteps, degree };
  }
  async rollFixedTarget(target, { steps = 0, label = "NPC Check" } = {}) { const die = await new Roll(stepFormula(steps)).evaluate(), degree = rollDegree(die.total, Number(target)); await die.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), rollMode: game.settings.get("alternity2e", "npcRollMode"), flavor: `<strong>${label}</strong><br>Target ${target}; ${steps >= 0 ? "+" : ""}${steps} steps<br><b>${degree}</b>` }); return { total: die.total, target, steps, degree }; }
  async rollWeapon(item, { spreadFollowup = false, fixedTargetToken = null, skipCosts = false } = {}) {
    if (item.system.ammo.max > 0 && item.system.ammo.value < 1) return ui.notifications.warn(`${item.name} is empty. Reload it before attacking.`);
    const combat = game.combat?.started ? game.combat : null, combatant = combat?.combatantForActor?.(this);
    if (combat && !combat.canActNow(combatant)) return ui.notifications.warn(`${this.name} is not ready to attack in this impulse.`);
    const modifier = combat?.getModifier?.(this, "attack"), ammoCost = Math.max(1, Number(modifier?.ammoCost || 1)), ammo = item.system.ammo, payload = ammo.mode === "loadout" ? gear.find(row => row.id === ammo.payload) : null, attackDamage = payload?.damage || item.system.damage, attackDamageType = payload?.damageType || item.system.damageType, attackSpecial = [...(item.system.special || []), ...(payload?.special || [])], specialEffect = ammo.specialAvailable ? specialAmmoEffect(ammo.specialType, { sourceId: payload?.id || item.system.sourceId, weaponType: item.system.weaponType, damageType: attackDamageType, techEra: item.system.techEra }) : specialAmmoEffect("normal");
    if (ammo.mode === "loadout" && !payload) return ui.notifications.warn(`Choose a valid loaded payload for ${item.name}.`);
    if (ammo.specialType !== "normal" && (!ammo.specialAvailable || !specialEffect.valid)) return ui.notifications.warn(`${item.name} does not have a valid supply of that special ammunition.`);
    if (["burst", "fullauto"].includes(modifier?.id) && !item.system.special.some(value => /autofire/i.test(value))) return ui.notifications.warn(`${item.name} does not have Autofire.`);
    if (item.system.ammo.max > 0 && item.system.ammo.value < ammoCost) return ui.notifications.warn(`${item.name} needs ${ammoCost} rounds for ${modifier?.label || "that attack"}.`);
    if (modifier?.id === "fullauto") return this.rollFullAuto(item, modifier);
    const selectedTargets = [...game.user.targets];
    if (!spreadFollowup && attackSpecial.some(value => /^(Blast|Minor Blast|Area)\b/i.test(value))) return this.rollBlast(item, { modifier, ammoCost, attackDamage, attackDamageType, attackSpecial, specialEffect });
    if (!spreadFollowup && (item.system.special || []).some(value => /^Spread$/i.test(value)) && selectedTargets.length > 1) {
      if (selectedTargets.length !== 2) return ui.notifications.warn("Spread attacks exactly two targets.");
      const gridSize = Number(canvas.grid?.size || 100), gridDistance = Number(canvas.scene?.grid?.distance || 2), separation = Math.hypot(selectedTargets[0].center.x - selectedTargets[1].center.x, selectedTargets[0].center.y - selectedTargets[1].center.y) / gridSize * gridDistance;
      if (separation > 2) return ui.notifications.warn("Spread targets must be adjacent to each other.");
      const results = []; for (const token of selectedTargets) results.push(await this.rollWeapon(item, { spreadFollowup: true, fixedTargetToken: token, skipCosts: true }));
      await this.consumeAmmunition(item, ammoCost); await this.scheduleCombatAction(item.system.speed, { label: `${item.name} - Spread`, kind: "attack" }); return results;
    }
    const skillId = weaponSkillId(item), melee = item.system.range === "Adjacent";
    if (modifier?.id === "charge" && !melee) return ui.notifications.warn("Charge can only modify a hand-to-hand or melee attack.");
    const targetToken = fixedTargetToken || selectedTargets[0], target = targetToken?.actor, targetStatuses = target?.system.play.statuses || [];
    if (target?.displacerUnit) {
      if (!target.displacerUsed) {
        try { await target.markDisplacerUsed(); } catch (error) { console.warn("Alternity 2e could not persist Displacer Unit state", error); }
        if (!skipCosts) { await this.consumeAmmunition(item, ammoCost); await this.scheduleCombatAction(item.system.speed, { label: `${item.name} - displaced`, kind: "attack" }); }
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${target.name}'s Displacer Unit</strong> makes the first attack against it this scene automatically miss.` });
        return { degree: "Failure", displaced: true };
      }
    }
    let situational = this.system.play.statuses.includes("blinded") ? -5 : Number(modifier?.steps || 0);
    if (target?.displacerUnit && target.displacerUsed) situational -= 2;
    if (targetStatuses.includes("blinded")) situational += 2; if (targetStatuses.includes("distracted") || targetStatuses.includes("impaired")) situational += 1; if (targetStatuses.includes("prone")) situational += melee ? 1 : -1;
    const defense = target && combat?.targetDefenseModifier ? combat.targetDefenseModifier(target) : 0, primitive = skillId === "primitive-weapon", device = target?.defenseDeviceModifier?.({ melee, primitive, damageType: attackDamageType }) || { cover: 0, deflect: 0 };
    if ((item.system.special || []).some(value => /^Accurate$/i.test(value))) situational += 1;
    let measuredRange = null;
    if (!melee && targetToken && game.settings.get("alternity2e", "tacticalAutomation") !== "manual") {
      const attackerToken = canvas.tokens?.placeables?.find(token => token.actor?.id === this.id), gridSize = Number(canvas.grid?.size || 100), gridDistance = Number(canvas.scene?.grid?.distance || 2);
      if (attackerToken) measuredRange = Math.hypot(attackerToken.center.x - targetToken.center.x, attackerToken.center.y - targetToken.center.y) / gridSize * gridDistance;
      if (measuredRange != null && !["Thrown", "Adjacent"].includes(item.system.range)) { const range = rangeAttackSteps(measuredRange, item.system.range); if (!range.allowed) return ui.notifications.warn(`${targetToken.name} is beyond ${item.name}'s ${item.system.range} range.`); situational += range.steps + (modifier?.id === "burst" ? range.steps : 0); }
      const cover = coverSteps(Number(targetToken.document.getFlag("alternity2e", "cover") || 0), { soft: Boolean(targetToken.document.getFlag("alternity2e", "softCover")) });
      if (cover.total) return ui.notifications.warn(`${targetToken.name} has total cover and cannot be directly attacked.`);
      situational += Math.min(0, cover.steps, defense, device.cover) + device.deflect;
      situational += Number(targetToken.document.getFlag("alternity2e", "sizeSteps") || 0);
    } else situational += Math.min(0, defense, device.cover) + device.deflect;
    const check = await this.rollSkill(skillId, { label: item.name, steps: situational + item.system.effects.filter(e => e.type === "attackSteps").reduce((n, e) => n + Number(e.value || 0), 0) });
    if (!skipCosts) { await this.consumeAmmunition(item, ammoCost); await this.scheduleCombatAction(item.system.speed, { label: modifier?.label ? `${item.name} - ${modifier.label}` : item.name, kind: "attack" }); }
    if (check.degree === "Failure") return check;
    const parsed = parseDamage(attackDamage); if (!parsed) { if (payload) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${item.name}</strong> launches <strong>${payload.name}</strong>: ${payload.damage}. Resolve the payload's listed effect.` }); return check; }
    const brutal = (item.system.special || []).some(value => /^Brutal$/i.test(value)) && (measuredRange == null || measuredRange <= 20) ? 3 : 0, poweredMelee = melee ? ({ exoskeleton: 2, "raider-battlesuit": 3, "assault-battlesuit": 3, "hussar-warsuit": 3 }[this.armorSuit?.system.sourceId] || 0) : 0, itemDamage = item.system.effects.filter(e => e.type === "damage").reduce((n, e) => n + Number(e.value || 0), 0);
    const bonus = (check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus) + this._effectTotal("damage") + itemDamage + Number(specialEffect.damageBonus || 0) + brutal + poweredMelee, formula = `${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`, damage = await new Roll(formula).evaluate(), hits = (check.degree === "Stellar" ? 2 : 1) + Number(modifier?.extraWounds || 0);
    const ap = Number(attackSpecial.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0) + Number(specialEffect.armorPenetration || 0), specialNote = ammo.specialType !== "normal" ? ` · ${specialEffect.label}${specialEffect.trait ? ` (${specialEffect.trait})` : ""}` : "", payloadNote = payload ? ` · ${payload.name} (${payload.special.join(", ")})` : "";
    const conditions = [...attackSpecial.filter(value => /^(Bleed|Ignite|Irradiate|Stun)$/i.test(value)), ...(specialEffect.trait ? [specialEffect.trait] : [])];
    const nonlethal = attackSpecial.some(value => /^Nonlethal$/i.test(value));
    const naturalAttack = melee && item.system.weaponType === "brawl";
    await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Damage</strong><br>${check.degree} hit · ${attackDamageType}${hits > 1 ? ` · ${hits} wound boxes` : ""}${payloadNote}${specialNote}${brutal ? " · Brutal +3" : ""}<br><button data-alternity-damage="${damage.total}" data-damage-type="${attackDamageType}" data-wound-hits="${hits}" data-armor-penetration="${ap}" data-armor-bonus="${Number(specialEffect.armorBonus || 0)}" data-conditions="${conditions.join(",")}" data-nonlethal="${nonlethal}" data-natural-attack="${naturalAttack}" data-weapon-tech-era="${item.system.techEra}" data-attack-degree="${check.degree}">Apply ${damage.total} Damage to Target</button>` });
    return { ...check, damage: damage.total };
  }
  async rollBlast(item, { modifier, ammoCost, attackDamage, attackDamageType, attackSpecial, specialEffect }) {
    const intended = [...game.user.targets][0]; if (!intended) return ui.notifications.warn("Target a token at the intended blast origin, plus every token that may be in the blast area.");
    const blastText = attackSpecial.find(value => /^(Blast|Minor Blast|Area)\b/i.test(value)) || "", full = blastText.match(/^Blast\s+(\d+)\s*\((\d+)\)/i), minor = blastText.match(/^Minor Blast\s+(\d+)/i), areaMatch = blastText.match(/^Area\s+(\d+)/i), primaryRadius = Number(full?.[1] || 0), secondaryRadius = Number(full?.[2] || minor?.[1] || areaMatch?.[1] || 0), areaEffect = Boolean(areaMatch) || attackDamageType === "none";
    const skillId = item.system.range === "Thrown" ? "athletics" : "heavy-weapon", indirect = ["grenade", "indirect"].includes(item.system.weaponType), attackerToken = canvas.tokens?.placeables?.find(token => token.actor?.id === this.id), gridSize = Number(canvas.grid?.size || 100), gridDistance = Number(canvas.scene?.grid?.distance || 2);
    let steps = Number(modifier?.steps || 0); if (attackerToken && item.system.range !== "Thrown") { const distance = Math.hypot(attackerToken.center.x - intended.center.x, attackerToken.center.y - intended.center.y) / gridSize * gridDistance, range = rangeAttackSteps(distance, item.system.range); if (!range.allowed) return ui.notifications.warn("The intended blast origin is out of range."); steps += range.steps; }
    const check = await this.rollSkill(skillId, { label: `${item.name} blast origin`, steps }), scatterDistance = check.degree === "Failure" ? (await new Roll("2d4").evaluate()).total : indirect && check.degree === "Average" ? 2 : 0, direction = scatterDistance ? (await new Roll("1d12").evaluate()).total : 12, angle = (direction / 12 * Math.PI * 2) - Math.PI / 2, origin = { x: intended.center.x + Math.cos(angle) * scatterDistance / gridDistance * gridSize, y: intended.center.y + Math.sin(angle) * scatterDistance / gridDistance * gridSize };
    const primaryParsed = parseDamage(attackDamage), secondaryExpression = String(attackDamage).match(/\(([^)]+)\)/)?.[1] || String(item.system.description || "").match(/(?:deals|that deals)\s+(\d+d\d+(?:[+-]\d+)?)/i)?.[1] || "0", secondaryParsed = parseDamage(secondaryExpression), rollDamage = async parsed => parsed ? (await new Roll(`${parsed.dice}${parsed.averageBonus >= 0 ? "+" : ""}${parsed.averageBonus}`).evaluate()).total : 0, primaryDamage = await rollDamage(primaryParsed), secondaryDamage = await rollDamage(secondaryParsed);
    const ap = Number(attackSpecial.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0) + Number(specialEffect.armorPenetration || 0), conditions = [...attackSpecial.filter(value => /^(Bleed|Ignite|Irradiate|Stun)$/i.test(value)), ...(specialEffect.trait ? [specialEffect.trait] : [])], rows = [];
    for (const token of [...game.user.targets]) { const distance = Math.hypot(origin.x - token.center.x, origin.y - token.center.y) / gridSize * gridDistance; if (distance > Math.max(primaryRadius, secondaryRadius)) continue; const packet = encodeURIComponent(JSON.stringify({ actorUuid: token.actor.uuid, tokenId: token.id, distance, primaryRadius, secondaryRadius, primaryDamage, secondaryDamage, type: attackDamageType, armorPenetration: ap, armorBonus: Number(specialEffect.armorBonus || 0), conditions, nonlethal: attackSpecial.some(value => /^Nonlethal$/i.test(value)), weaponTechEra: Number(item.system.techEra || 0), areaEffect })); rows.push(`<li><strong>${token.name}</strong> at ${distance.toFixed(1)} m <button type="button" data-a2e-resolve-blast="${packet}">Resolve ${areaEffect ? "area resistance" : "Dodge reaction"}</button></li>`); }
    await this.consumeAmmunition(item, ammoCost); await this.scheduleCombatAction(item.system.speed, { label: `${item.name} blast`, kind: "attack" });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${item.name} blast</strong><p>${check.degree} origin roll; ${scatterDistance ? `scattered ${scatterDistance} m toward ${direction} o'clock` : "exactly on target"}. Primary ${primaryRadius || "—"} m / secondary ${secondaryRadius || "—"} m.</p><ul>${rows.join("") || "<li>No selected token is inside the resolved area.</li>"}</ul>` });
    return { check, scatterDistance, direction, primaryDamage, secondaryDamage };
  }
  async rollFullAuto(item, modifier) {
    const targets = [...game.user.targets]; if (!targets.length) return ui.notifications.warn("Target every token in the full-auto area before attacking.");
    const area = item.system.special.some(value => /Improved Autofire/i.test(value)) ? 10 : 6, gridSize = Number(canvas.grid?.size || 100), gridDistance = Number(canvas.scene?.grid?.distance || 2), xs = targets.map(token => token.center.x), ys = targets.map(token => token.center.y), width = (Math.max(...xs) - Math.min(...xs)) / gridSize * gridDistance, height = (Math.max(...ys) - Math.min(...ys)) / gridSize * gridDistance; if (width > area || height > area) return ui.notifications.warn(`${item.name}'s full-auto targets must fit within a ${area}-meter square.`);
    const skillId = weaponSkillId(item), parsed = parseDamage(item.system.damage), ammo = item.system.ammo, specialEffect = ammo.specialAvailable ? specialAmmoEffect(ammo.specialType, { sourceId: item.system.sourceId, weaponType: item.system.weaponType, damageType: item.system.damageType, techEra: item.system.techEra }) : specialAmmoEffect("normal"); if (!parsed) return;
    const results = [], attackerToken = canvas.tokens?.placeables?.find(token => token.actor?.id === this.id);
    for (const [index, token] of targets.entries()) {
      const target = token.actor, statuses = target?.system.play.statuses || [];
      if (target?.displacerUnit && !target.displacerUsed) { try { await target.markDisplacerUsed(); } catch (error) { console.warn("Alternity 2e could not persist Displacer Unit state", error); } results.push({ token, check: { degree: "Failure", displaced: true } }); await ChatMessage.create({ content: `<strong>${target.name}'s Displacer Unit</strong> makes this attack automatically miss.` }); continue; }
      let steps = -2 * (index + 1) + ((item.system.special || []).some(value => /^Accurate$/i.test(value)) ? 1 : 0) + item.system.effects.filter(effect => effect.type === "attackSteps").reduce((sum, effect) => sum + Number(effect.value || 0), 0);
      if (target?.displacerUnit) steps -= 2;
      if (statuses.includes("blinded")) steps += 2; if (statuses.includes("distracted") || statuses.includes("impaired")) steps += 1; if (statuses.includes("prone")) steps -= 1;
      const defense = game.combat?.targetDefenseModifier ? game.combat.targetDefenseModifier(target) : 0, device = target?.defenseDeviceModifier?.({ damageType: item.system.damageType }) || { cover: 0, deflect: 0 }, cover = coverSteps(Number(token.document.getFlag("alternity2e", "cover") || 0), { soft: Boolean(token.document.getFlag("alternity2e", "softCover")) });
      if (cover.total) { results.push({ token, check: { degree: "Failure", totalCover: true } }); continue; }
      steps += Math.min(0, defense, device.cover, cover.steps) + device.deflect + Number(token.document.getFlag("alternity2e", "sizeSteps") || 0);
      if (attackerToken && game.settings.get("alternity2e", "tacticalAutomation") !== "manual") { const distance = Math.hypot(attackerToken.center.x - token.center.x, attackerToken.center.y - token.center.y) / gridSize * gridDistance, range = rangeAttackSteps(distance, item.system.range); if (!range.allowed) { results.push({ token, check: { degree: "Failure", outOfRange: true } }); continue; } steps += range.steps; }
      const check = await this.rollSkill(skillId, { label: `${item.name} Full Auto - ${token.name}`, steps }); results.push({ token, check }); if (check.degree === "Failure") continue;
      const itemDamage = item.system.effects.filter(effect => effect.type === "damage").reduce((sum, effect) => sum + Number(effect.value || 0), 0), bonus = (check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus) + this._effectTotal("damage") + itemDamage + Number(specialEffect.damageBonus || 0), damage = await new Roll(`${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`).evaluate(), hits = check.degree === "Stellar" ? 2 : 1, ap = Number(item.system.special.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0) + Number(specialEffect.armorPenetration || 0), conditions = [...item.system.special.filter(value => /^(Bleed|Ignite|Irradiate|Stun)$/i.test(value)), ...(specialEffect.trait ? [specialEffect.trait] : [])], nonlethal = item.system.special.some(value => /^Nonlethal$/i.test(value));
      await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Full Auto Damage - ${token.name}</strong><br>${check.degree} hit · ${item.system.damageType}${ammo.specialType !== "normal" ? ` · ${specialEffect.label}` : ""}<br><button data-alternity-damage="${damage.total}" data-damage-type="${item.system.damageType}" data-wound-hits="${hits}" data-armor-penetration="${ap}" data-armor-bonus="${Number(specialEffect.armorBonus || 0)}" data-conditions="${conditions.join(",")}" data-nonlethal="${nonlethal}" data-weapon-tech-era="${item.system.techEra}" data-attack-degree="${check.degree}" data-target-token-id="${token.id}">Apply ${damage.total} Damage to ${token.name}</button>` });
    }
    await this.consumeAmmunition(item, 10); await this.scheduleCombatAction(item.system.speed, { label: `${item.name} - Full Auto`, kind: "attack" }); return results;
  }
  async consumeAmmunition(item, amount = 1) { const ammo = item.system.ammo; if (!ammo || ammo.mode === "none") return; const update = { "system.ammo.specialUsed": ammo.specialType !== "normal" && ammo.specialAvailable || ammo.specialUsed }; if (ammo.mode === "consumable" && item.system.quantity > 1) update["system.quantity"] = item.system.quantity - 1; else update["system.ammo.value"] = Math.max(0, ammo.value - amount); await item.update(update); }
  async applyDamage(raw, type = "physical", { woundHits = 1, armorPenetration = 0, armorBonus = 0, conditions = [], nonlethal = false, naturalAttack = false, weaponTechEra = 0, attackDegree = "Average" } = {}) {
    if (!requireAuthority(canApplyDamage(this), `Damage to ${this.name} must be approved by its owner or the GM.`)) return null;
    const before = foundry.utils.deepClone(this.system.wounds), suit = this.armorSuit; let coverageMiss = false;
    const poorCoverage = Number((suit?.system.special || []).find(value => /^Poor Coverage/i.test(value))?.match(/\d+/)?.[0] || 0);
    if (poorCoverage && ["physical", "energy"].includes(type)) { const coverageRoll = await new Roll("1d10").evaluate(); coverageMiss = coverageRoll.total <= poorCoverage; await coverageRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${this.name} Poor Coverage</strong><br>${coverageMiss ? "Attack bypasses armor." : "Armor covers the hit."}` }); }
    const apReduction = this.equippedArmor.flatMap(item => item.system.effects || []).filter(effect => effect.type === "reduceAP").reduce((sum, effect) => sum + Number(effect.value || 0), 0), effectiveAP = Math.max(0, Number(armorPenetration || 0) - apReduction);
    let listedResistance = coverageMiss ? 0 : ["physical", "energy"].includes(type) ? this.system.derived.armor[type] : 0;
    const armorTechEra = Number(suit?.system.techEra || 0), tough = (suit?.system.special || []).some(value => /^Tough$/i.test(value));
    if (naturalAttack && tough) listedResistance += 3;
    else if (weaponTechEra && armorTechEra && Number(weaponTechEra) > armorTechEra) listedResistance = Math.max(0, listedResistance - 3);
    else if (weaponTechEra && armorTechEra && Number(weaponTechEra) < armorTechEra && tough) listedResistance += 3;
    const effectiveArmorBonus = listedResistance > 0 ? Number(armorBonus || 0) : 0, resistance = Math.max(0, listedResistance + effectiveArmorBonus - effectiveAP), final = Math.max(0, Number(raw) - resistance), base = damageSeverity(final), wounds = foundry.utils.deepClone(this.system.wounds), applied = [];
    const shield = !coverageMiss && ["physical", "energy"].includes(type) ? this.forceShield : null, shieldMetadata = shield ? foundry.utils.deepClone(shield.system.metadata || {}) : null;
    const legacyShieldWounds = Number(shieldMetadata?.shieldWounds || 0), shieldTrack = Array.isArray(shieldMetadata?.shieldTrack) ? shieldMetadata.shieldTrack.slice(0, 4) : Array.from({ length: 4 }, (_, index) => index < legacyShieldWounds), shieldWasActive = shield && !shieldTrack.every(Boolean);
    let shieldAbsorbed = 0, shieldStopped = 0;
    const shieldTechAdjustment = weaponTechEra && Number(weaponTechEra) > Number(shield?.system.techEra || 8) ? -3 : 0, shieldFinal = Math.max(0, Number(raw) - Math.max(0, 5 + shieldTechAdjustment + Number(armorBonus || 0) - effectiveAP));
    for (let i = 0; i < woundHits; i++) {
      if (shieldWasActive && shieldFinal <= 0) { shieldStopped++; continue; }
      if (shieldWasActive) { const band = shieldFinal <= 6 ? 0 : shieldFinal <= 9 ? 1 : shieldFinal <= 12 ? 2 : 3, slot = shieldTrack.findIndex((marked, index) => index >= band && !marked); if (slot >= 0) { shieldTrack[slot] = true; shieldAbsorbed++; continue; } }
      applied.push(applyWound(wounds, this.system.derived.durability, base));
    }
    if (shield) { shieldMetadata.shieldTrack = shieldTrack; shieldMetadata.shieldWounds = shieldTrack.filter(Boolean).length; await shield.update({ "system.metadata": shieldMetadata }); }
    const entry = { id: foundry.utils.randomID(), date: new Date().toISOString(), raw: Number(raw), type, resistance, final, baseSeverity: base, applied: applied.map(x => x.severity).filter(Boolean), severity: applied.map(x => x.severity).filter(Boolean).join(", "), escalated: applied.some(x => x.escalated), woundHits, shieldAbsorbed, shieldStopped, coverageMiss, nonlethal, before, after: foundry.utils.deepClone(wounds) };
    const existingEffectIds = new Set(this.system.play.effects.map(effect => effect.id)), effects = [...this.system.play.effects];
    for (const condition of applied.length || !shieldWasActive ? conditions : []) {
      const lower = condition.toLowerCase(), status = ["bleed", "ignite", "irradiate"].includes(lower) ? "damage-over-time" : lower === "stun" ? "stun" : "";
      if (!status) continue;
      const initialSkill = lower === "bleed" ? "resilience" : lower === "ignite" ? "dodge" : "endurance", resist = await this.rollSkill(initialSkill, { label: `Resist ${condition}` }), degrees = ["Failure", "Average", "Excellent", "Stellar"], resisted = lower === "stun" ? degrees.indexOf(resist.degree) >= degrees.indexOf(attackDegree) : resist.degree !== "Failure";
      if (resisted) { await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong> resists ${condition}.` }); continue; }
      if (lower === "stun" && attackDegree === "Stellar") { const duration = await new Roll("1d10").evaluate(); effects.push({ id: foundry.utils.randomID(), status: "incapacitated", source: "Stun (Stellar)", durationType: "minutes", durationText: `${duration.total} minutes`, expiresTick: 0, resistMode: "none", resistSkill: "", required: 0, progress: 0, damageSeverity: "" }); continue; }
      const resistMode = lower === "bleed" || lower === "irradiate" ? "passive" : lower === "ignite" ? "active" : "none", resistSkill = lower === "ignite" ? "dodge" : "endurance", required = lower === "irradiate" ? 3 : 1;
      effects.push({ id: foundry.utils.randomID(), status, source: condition, durationType: status === "stun" ? "impulses" : "resist", expiresTick: status === "stun" ? Number(game.combat?.currentTick || 0) + 3 : 0, resistMode, resistSkill, required, progress: 0, damageSeverity: status === "damage-over-time" ? "light" : "" });
    }
    const recovery = nonlethal ? [...this.system.play.recovery, { id: foundry.utils.randomID(), type: "nonlethal", applied: entry.applied, created: entry.date }] : this.system.play.recovery;
    await this.update({ "system.wounds": wounds, "system.play.recovery": recovery, "system.play.effects": effects, "system.play.statuses": [...new Set([...this.system.play.statuses, ...effects.map(effect => effect.status), ...(nonlethal && entry.applied.includes("mortal") ? ["incapacitated"] : [])])], "system.play.lastDamage": entry, "system.play.damageLog": [entry, ...this.system.play.damageLog].slice(0, 50) });
    if (effects.some(effect => !existingEffectIds.has(effect.id) && effect.source === "Stun" && effect.status === "stun")) { const combatant = game.combat?.combatantForActor?.(this); if (combatant) { await combatant.unsetFlag("alternity2e", "evadeUntilTick"); await game.combat.delayNextAction(combatant, 3, "Stun"); } }
    if (suit && Number(raw) >= 10 && (suit.system.special || []).some(value => /^Ablative$/i.test(value)) && ["physical", "energy"].includes(type)) { const metadata = foundry.utils.deepClone(suit.system.metadata || {}); metadata.ablative ??= {}; metadata.ablative[type] = Number(metadata.ablative[type] || 0) + 1; await suit.update({ "system.metadata": metadata }); }
    if (!nonlethal && applied.some(result => result.severity === "mortal") && !this.system.play.mortality.active) await this.beginMortality();
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong>: ${raw} ${type} - ${resistance} armor = ${final}; <b>${entry.severity || "no injury"}</b>${shieldAbsorbed || shieldStopped ? `; Force Shield stopped ${shieldAbsorbed + shieldStopped} hit${shieldAbsorbed + shieldStopped === 1 ? "" : "s"} (${shieldTrack.filter(Boolean).length}/4 boxes)` : ""}${entry.escalated ? " (escalated)" : ""}.` });
    return entry;
  }
  async spendHeroPoint() { if (this.system.heroPoints > 0) await this.update({ "system.heroPoints": this.system.heroPoints - 1 }); }
  async useHeroPoint(effect, details = {}) {
    if (!controlsActor(this) || this.type !== "hero" && !game.user.isGM || this.system.heroPoints < 1) return ui.notifications.warn(`${this.name} has no Hero Points available to you.`);
    const log = [{ date: new Date().toISOString(), effect, details }, ...this.system.play.heroPointLog].slice(0, 50);
    if (effect === "improveCheck") {
      const check = this.system.play.lastCheck;
      if (!check || check.combat || check.heroImproved || check.degree === "Stellar") return ui.notifications.warn("Only the most recent non-combat check can be improved, and only once.");
      const degrees = ["Failure", "Average", "Excellent", "Stellar"], improved = degrees[Math.min(3, degrees.indexOf(check.degree) + 1)];
      await this.update({ "system.heroPoints": this.system.heroPoints - 1, "system.play.heroPointLog": log, "system.play.lastCheck": { ...check, degree: improved, heroImproved: true } });
      return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong> spends a Hero Point: ${check.label} improves from ${check.degree} to <b>${improved}</b>.` });
    }
    if (effect === "immediateAction") { const combatant = game.combat?.combatantForActor?.(this); if (!combatant) return ui.notifications.warn("An immediate Hero Point action requires an active encounter."); await combatant.setFlag("alternity2e", "heroAction", true); }
    if (["severeToLight", "lesserToGraze"].includes(effect)) { const changed = await this.heroDowngradeLastDamage(effect); if (!changed) return; }
    await this.update({ "system.heroPoints": this.system.heroPoints - 1, "system.play.heroPointLog": log });
    if (effect === "luckyBreak") await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong> spends a Hero Point and requests a lucky break. The GM determines the outcome.` });
  }
  async heroDowngradeLastDamage(mode) {
    const entry = this.system.play.lastDamage; if (!entry?.before || !entry?.applied?.length) { ui.notifications.warn("There is no recent damage packet to alter."); return false; }
    const wounds = foundry.utils.deepClone(entry.after), from = mode === "severeToLight" ? ["critical", "mortal"] : ["light", "moderate", "serious"], to = mode === "severeToLight" ? "light" : "graze"; let changed = 0;
    for (const row of entry.applied) if (from.includes(row) && wounds[row] > 0) { wounds[row]--; wounds[to]++; changed++; }
    if (!changed) { ui.notifications.warn("The last damage packet has no eligible wounds."); return false; }
    await this.update({ "system.wounds": wounds }); return true;
  }
  async awardHeroPoint(amount = 1, reason = "GM award") { if (!requireAuthority(canAwardResources(), "Only the GM can award Hero Points.")) return; const log = [{ date: new Date().toISOString(), effect: "award", amount, reason }, ...this.system.play.heroPointLog].slice(0, 50); await this.update({ "system.heroPoints": Math.max(0, this.system.heroPoints + Number(amount)), "system.play.heroPointLog": log }); }
  async beginMortality() { const lethality = game.settings.get("alternity2e", "lethality"), mortality = newMortality(lethality, Number(game.combat?.currentTick || 1)); await this.update({ "system.play.mortality": mortality, "system.play.statuses": [...new Set([...this.system.play.statuses, "incapacitated"])] }); if (lethality === "high") await this.rollMortality(); }
  async rollMortality({ medicineSuccesses = 0 } = {}) { const state = this.system.play.mortality; if (!state.active) return; const check = await this.rollSkill("resilience", { label: "Mortal Wound Resilience" }), next = advanceMortality(state, check.degree !== "Failure", Number(game.combat?.currentTick || 1)); next.successes = Math.min(3, Number(next.successes || 0) + Number(medicineSuccesses || 0)); if (next.successes >= 3) { next.active = false; next.stabilized = true; next.interval = "recovered"; } const statuses = next.dead ? [...new Set([...this.system.play.statuses, "dead"])] : next.active ? this.system.play.statuses : this.system.play.statuses.filter(status => status !== "incapacitated"); await this.update({ "system.play.mortality": next, "system.play.statuses": statuses }); if (!next.active && !next.dead) await this.recover("mortal"); }
  async stabilizeMortality(successes = 1) { const state = foundry.utils.deepClone(this.system.play.mortality); if (!state.active) return; const added = Math.clamp(Number(successes || 0), 0, 3); state.successes = Math.min(3, Number(state.successes || 0) + added); if (state.successes >= 3) { state.active = false; state.stabilized = true; state.interval = "stabilized"; } const statuses = state.active ? this.system.play.statuses : this.system.play.statuses.filter(status => status !== "incapacitated"); await this.update({ "system.play.mortality": state, "system.play.statuses": statuses }); await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong> receives ${added} Medicine stabilization success${added === 1 ? "" : "es"}${state.stabilized ? " and is stabilized" : ""}.` }); }
  async undoLastDamage() { if (!requireAuthority(game.user.isGM, "Only the GM can undo damage.")) return; const [entry, ...rest] = this.system.play.damageLog; if (!entry?.before) return; await this.update({ "system.wounds": entry.before, "system.play.damageLog": rest, "system.play.lastDamage": rest[0] || null }); }
  async advanceChallenge(id, degree) { const challenges = this.system.play.challenges.map(challenge => challenge.id === id ? advanceChallenge(challenge, degree) : challenge); await this.update({ "system.play.challenges": challenges }); }
  async recover(period) {
    const wounds = foundry.utils.deepClone(this.system.wounds), rows = ["graze", "light", "moderate", "serious", "critical", "mortal"];
    if (period === "scene") wounds.graze = 0; else if (period === "day") wounds.light = 0; else if (rows.includes(period) && wounds[period] > 0) {
      wounds[period]--; const index = rows.indexOf(period);
      for (let i = index - 1; i >= 0; i--) if (wounds[rows[i]] < this.system.derived.durability[rows[i]]) { wounds[rows[i]]++; break; }
    }
    await this.update({ "system.wounds": wounds });
  }
  async scheduleRecovery(row, { resting = true, careBonus = 0 } = {}) {
    const days = { moderate: 1, serious: 3, critical: 10 }[row]; if (!days || this.system.wounds[row] < 1) return;
    const recovery = [...this.system.play.recovery, { id: foundry.utils.randomID(), row, days: resting ? days : days * 2, resting, careBonus: Number(careBonus || 0), ready: false, created: new Date().toISOString() }]; await this.update({ "system.play.recovery": recovery });
  }
  async recoverNonlethal() { const records = this.system.play.recovery.filter(entry => entry.type === "nonlethal"); if (!records.length) return; const wounds = foundry.utils.deepClone(this.system.wounds), rows = ["graze", "light", "moderate", "serious", "critical", "mortal"]; for (const record of records) for (const row of record.applied || []) { const index = rows.indexOf(row); if (index > 0 && wounds[row] > 0) { wounds[row]--; const lower = rows[index - 1]; if (wounds[lower] < this.system.derived.durability[lower]) wounds[lower]++; } } await this.update({ "system.wounds": wounds, "system.play.recovery": this.system.play.recovery.filter(entry => entry.type !== "nonlethal"), "system.play.statuses": this.system.play.statuses.filter(status => status !== "incapacitated" || this.system.play.mortality.active) }); }
  async rollRecovery(id) { const record = this.system.play.recovery.find(entry => entry.id === id); if (!record) return; const check = await this.rollSkill("resilience", { label: `${record.row} wound recovery`, steps: Number(record.careBonus || 0) }); if (check.degree !== "Failure") await this.recover(record.row); await this.update({ "system.play.recovery": this.system.play.recovery.filter(entry => entry.id !== id) }); }
  async resistEffect(id, { passive = false } = {}) {
    const effect = this.system.play.effects.find(entry => entry.id === id); if (!effect || effect.resistMode === "none") return;
    const defenseBonus = game.combat?.resistanceModifier?.(this) || 0, fireProneBonus = /ignite|fire/i.test(effect.source || "") && this.system.play.statuses.includes("prone") ? 1 : 0, check = await this.rollSkill(effect.resistSkill || "resilience", { label: `Resist ${effect.source || effect.status}`, steps: defenseBonus + fireProneBonus }), value = check.degree === "Failure" ? 0 : 1, progress = Number(effect.progress || 0) + value, cleared = progress >= Number(effect.required || 1);
    const effects = cleared ? this.system.play.effects.filter(entry => entry.id !== id) : this.system.play.effects.map(entry => entry.id === id ? { ...entry, progress } : entry), statuses = this.system.play.statuses.filter(status => effects.some(entry => entry.status === status) || !this.system.play.effects.some(entry => entry.status === status));
    await this.update({ "system.play.effects": effects, "system.play.statuses": statuses });
    if (!passive && game.combat?.started) await this.scheduleCombatAction(1, { label: `Resist ${effect.source || effect.status}`, kind: "resist" });
  }
  async removeEffect(id) { if (!requireAuthority(game.user.isGM, "Only the GM can remove an imposed effect directly.")) return; const effects = this.system.play.effects.filter(entry => entry.id !== id), statuses = this.system.play.statuses.filter(status => effects.some(entry => entry.status === status) || !this.system.play.effects.some(entry => entry.status === status)); await this.update({ "system.play.effects": effects, "system.play.statuses": statuses }); }
  async advanceLevel() {
    if (!requireAuthority(game.user.isGM, "Only the GM can award a level.")) return;
    if (this.system.level >= 10) return ui.notifications.warn("Alternity heroes cannot advance beyond level 10.");
    const level = this.system.level + 1, advancement = [...this.system.advancement, { level, date: new Date().toISOString(), skillPoints: 5, talentChoices: 1 }];
    await this.update({ "system.level": level, "system.advancement": advancement, "system.build.locked": false, "system.build.advancementOpen": true, "system.build.skillPointsAvailable": Number(this.system.build.skillPointsAvailable || 0) + 5, "system.build.talentChoicesAvailable": Number(this.system.build.talentChoicesAvailable || 0) + 1, "system.build.retrainingAvailable": 2, "system.build.talentRetrainingAvailable": true });
    ui.notifications.info(`${this.name} advanced to level ${level}; spend 5 skill points and choose one talent.`);
  }
  async scheduleCombatAction(speed = 1, { label = "Action", kind = "action" } = {}) {
    const combat = game.combat, combatant = combat?.combatantForActor?.(this) || combat?.combatants.find(entry => entry.actorId === this.id);
    if (combat?.started && combatant && combat.schedule) return combat.schedule(combatant, Number(speed), { label, kind });
  }
}

export class AlternityItem extends Item {}
