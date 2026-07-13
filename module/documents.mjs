import { damageSeverity, durability, applyWound, woundPenalty, parseDamage, skillTarget, stepFormula, rollDegree } from "./rules.mjs";
import { species, archetypes } from "./catalogs.mjs";
import { calculateEncumbrance } from "./inventory.mjs";

export class AlternityActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system, items = this.items.contents;
    const talentBoxes = {};
    for (const item of items.filter(i => i.type === "talent")) for (const effect of item.system.effects || []) if (effect.type === "woundBoxes") for (const row of effect.rows || []) talentBoxes[row] = (talentBoxes[row] || 0) + Number(effect.value || 0);
    const effectiveVitality = s.abilities.vitality + this.ruleEffects.filter(effect => effect.type === "ability" && effect.ability === "vitality" || effect.type === "effectiveVitality" && effect.purpose === "durability").reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    const load = this.encumbranceState;
    s.derived = {
      durability: durability(effectiveVitality, talentBoxes), woundPenalty: woundPenalty(s.wounds), incapacitated: s.wounds.mortal > 0 || s.play.statuses.includes("incapacitated"),
      initiative: { target: 20 - s.abilities.agility - s.abilities.focus, steps: this._effectTotal("initiativeStep") },
      armor: this.armorResistance, speed: this.currentSpeed, mass: load.mass, load
    };
  }
  get ruleEffects() { return [...(species.find(row => row.id === this.system.speciesId)?.effects || []), ...(archetypes.find(row => row.id === this.system.archetypeId)?.effects || []), ...Array.from(this.items).flatMap(item => item.system.effects || [])]; }
  _effectTotal(type) { return this.ruleEffects.filter(effect => effect.type === type).reduce((sum, effect) => sum + Number(effect.value || 0), 0); }
  effectiveAbility(id) { return Number(this.system.abilities[id] || 0) + this.ruleEffects.filter(effect => effect.type === "ability" && effect.ability === id).reduce((sum, effect) => sum + Number(effect.value || 0), 0); }
  get equippedArmor() { return this.items.filter(item => item.type === "armor" && item.system.equipped); }
  get armorSuit() { return this.equippedArmor.find(item => !(item.system.special || []).some(value => /^(screen|cover|deflect|bonus resistance)/i.test(value))); }
  get armorBonuses() { return this.equippedArmor.filter(item => (item.system.special || []).some(value => /^bonus resistance/i.test(value))); }
  get armorResistance() { const sources = [this.armorSuit, ...this.armorBonuses].filter(Boolean), natural = this.ruleEffects.filter(e => e.type === "armor"); return { physical: sources.reduce((n, i) => n + Number(i.system.physical || 0), 0) + natural.reduce((n, e) => n + Number(e.physical || 0), 0), energy: sources.reduce((n, i) => n + Number(i.system.energy || 0), 0) + natural.reduce((n, e) => n + Number(e.energy || 0), 0) }; }
  get armorPenalties() { const armor = this.armorSuit, ranks = Number(this.getSkill("armor-training")?.system.ranks || 0), moveReduction = ranks >= 8 ? 6 : ranks >= 5 ? 4 : ranks >= 2 ? 2 : 0, checkReduction = ranks >= 7 ? 3 : ranks >= 4 ? 2 : ranks >= 1 ? 1 : 0; return { move: Math.min(0, Number(armor?.system.move || 0) + moveReduction), check: Math.min(0, Number(armor?.system.penalty || 0) + checkReduction) }; }
  get encumbranceState() {
    const mass = this.items.reduce((sum, item) => sum + Number(item.system.mass || 0) * Math.max(0, Number(item.system.quantity ?? 1)), 0);
    return calculateEncumbrance({ mass, strength: this.effectiveAbility("strength"), vitality: this.effectiveAbility("vitality"), tierReduction: this._effectTotal("encumbranceTierReduction") });
  }
  get currentSpeed() { const statuses = this.system.play.statuses, load = this.encumbranceState; if (this.system.wounds.mortal || statuses.includes("incapacitated") || load.overloaded) return 0; if (statuses.includes("prone")) return 2; const base = Number(this.ruleEffects.filter(e => e.type === "baseSpeedOverride").at(-1)?.value ?? 20) + this._effectTotal("speed"), adjusted = Math.max(0, base + this.armorPenalties.move + load.speedPenalty); return statuses.some(x => ["blinded", "impaired", "slowed"].includes(x)) ? Math.max(2, adjusted / 2) : adjusted; }
  get statusSteps() { const statuses = this.system.play.statuses; return statuses.includes("impaired") ? -2 : statuses.includes("weakened") || statuses.includes("grappled") ? -1 : 0; }
  getSkill(id) { return this.items.find(i => i.type === "skill" && i.system.sourceId === id); }
  async rollSkill(itemOrId, { steps = 0, label } = {}) {
    const item = typeof itemOrId === "string" ? this.getSkill(itemOrId) : itemOrId, ability = this.system.abilities[item?.system.keyAbility] || 0, ranks = item?.system.ranks || 0;
    const categorySteps = this.ruleEffects.filter(effect => effect.type === "categoryStep" && effect.category === item?.system.category && ranks > 0).reduce((sum, effect) => sum + Number(effect.value || 0), 0), directSteps = this.ruleEffects.filter(effect => effect.type === "checkStep" && effect.skill === item?.system.sourceId).reduce((sum, effect) => sum + Number(effect.value || 0), 0), encumbranceSteps = ["attack", "defensive", "environmental"].includes(item?.system.category) ? this.encumbranceState.checkSteps : 0;
    const target = skillTarget(ability, ranks), finalSteps = Number(steps) + categorySteps + directSteps + encumbranceSteps + this.armorPenalties.check + this.system.derived.woundPenalty + this.statusSteps, die = await new Roll(stepFormula(finalSteps)).evaluate();
    const degree = rollDegree(die.total, target);
    await die.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${label || item?.name || "Skill Check"}</strong><br>Target ${target}; ${finalSteps >= 0 ? "+" : ""}${finalSteps} steps<br><b>${degree}</b>` });
    if (this.system.play.statuses.includes("off-balance")) await this.update({ "system.play.statuses": this.system.play.statuses.filter(status => status !== "off-balance") });
    return { total: die.total, target, steps: finalSteps, degree };
  }
  async rollWeapon(item) {
    if (item.system.ammo.max > 0 && item.system.ammo.value < 1) return ui.notifications.warn(`${item.name} is empty. Reload it before attacking.`);
    const combat = game.combat?.started ? game.combat : null, combatant = combat?.combatantForActor?.(this);
    if (combat && !combat.isReady(combatant)) return ui.notifications.warn(`${this.name} is not ready to attack in this impulse.`);
    const modifier = combat?.getModifier?.(this, "attack"), ammoCost = Math.max(1, Number(modifier?.ammoCost || 1));
    if (["burst", "fullauto"].includes(modifier?.id) && !item.system.special.some(value => /autofire/i.test(value))) return ui.notifications.warn(`${item.name} does not have Autofire.`);
    if (item.system.ammo.max > 0 && item.system.ammo.value < ammoCost) return ui.notifications.warn(`${item.name} needs ${ammoCost} rounds for ${modifier?.label || "that attack"}.`);
    if (modifier?.id === "fullauto") return this.rollFullAuto(item, modifier);
    const skillId = item.system.range === "Adjacent" ? "melee" : item.system.damageType === "energy" ? "energy-weapon" : "firearm", melee = item.system.range === "Adjacent";
    const target = [...game.user.targets][0]?.actor, targetStatuses = target?.system.play.statuses || [];
    let situational = this.system.play.statuses.includes("blinded") ? -5 : Number(modifier?.steps || 0);
    if (targetStatuses.includes("blinded")) situational += 2; if (targetStatuses.includes("distracted") || targetStatuses.includes("impaired")) situational += 1; if (targetStatuses.includes("prone")) situational += melee ? 1 : -1;
    if (target && combat?.targetDefenseModifier) situational += combat.targetDefenseModifier(target);
    const check = await this.rollSkill(skillId, { label: item.name, steps: situational + item.system.effects.filter(e => e.type === "attackSteps").reduce((n, e) => n + Number(e.value || 0), 0) });
    if (item.system.ammo.max > 0) await item.update({ "system.ammo.value": Math.max(0, item.system.ammo.value - ammoCost) });
    await this.scheduleCombatAction(item.system.speed, { label: modifier?.label ? `${item.name} - ${modifier.label}` : item.name, kind: "attack" });
    if (check.degree === "Failure") return check;
    const parsed = parseDamage(item.system.damage); if (!parsed) return check;
    const bonus = (check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus) + this._effectTotal("damage"), formula = `${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`, damage = await new Roll(formula).evaluate(), hits = (check.degree === "Stellar" ? 2 : 1) + Number(modifier?.extraWounds || 0);
    const ap = Number(item.system.special.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0);
    await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Damage</strong><br>${check.degree} hit · ${item.system.damageType}${hits === 2 ? " · one additional wound" : ""}<br><button data-alternity-damage="${damage.total}" data-damage-type="${item.system.damageType}" data-wound-hits="${hits}" data-armor-penetration="${ap}">Apply ${damage.total} Damage to Target</button>` });
    return { ...check, damage: damage.total };
  }
  async rollFullAuto(item, modifier) {
    const targets = [...game.user.targets]; if (!targets.length) return ui.notifications.warn("Target every token in the full-auto area before attacking.");
    const skillId = item.system.damageType === "energy" ? "energy-weapon" : "firearm", parsed = parseDamage(item.system.damage); if (!parsed) return;
    const results = [];
    for (const [index, token] of targets.entries()) {
      const target = token.actor, statuses = target?.system.play.statuses || []; let steps = -2 * (index + 1);
      if (statuses.includes("blinded")) steps += 2; if (statuses.includes("distracted") || statuses.includes("impaired")) steps += 1; if (statuses.includes("prone")) steps -= 1; if (game.combat?.targetDefenseModifier) steps += game.combat.targetDefenseModifier(target);
      const check = await this.rollSkill(skillId, { label: `${item.name} Full Auto - ${token.name}`, steps }); results.push({ token, check }); if (check.degree === "Failure") continue;
      const bonus = (check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus) + this._effectTotal("damage"), damage = await new Roll(`${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`).evaluate(), hits = check.degree === "Stellar" ? 2 : 1, ap = Number(item.system.special.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0);
      await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Full Auto Damage - ${token.name}</strong><br>${check.degree} hit · ${item.system.damageType}<br><button data-alternity-damage="${damage.total}" data-damage-type="${item.system.damageType}" data-wound-hits="${hits}" data-armor-penetration="${ap}" data-target-token-id="${token.id}">Apply ${damage.total} Damage to ${token.name}</button>` });
    }
    await item.update({ "system.ammo.value": Math.max(0, item.system.ammo.value - 10) }); await this.scheduleCombatAction(item.system.speed, { label: `${item.name} - Full Auto`, kind: "attack" }); return results;
  }
  async applyDamage(raw, type = "physical", { woundHits = 1, armorPenetration = 0 } = {}) {
    const listedResistance = ["physical", "energy"].includes(type) ? this.system.derived.armor[type] : 0, resistance = Math.max(0, listedResistance - Number(armorPenetration || 0)), final = Math.max(0, Number(raw) - resistance), base = damageSeverity(final), wounds = foundry.utils.deepClone(this.system.wounds), applied = [];
    for (let i = 0; i < woundHits; i++) applied.push(applyWound(wounds, this.system.derived.durability, base));
    const entry = { date: new Date().toISOString(), raw: Number(raw), type, resistance, final, baseSeverity: base, severity: applied.map(x => x.severity).filter(Boolean).join(", "), escalated: applied.some(x => x.escalated), woundHits };
    await this.update({ "system.wounds": wounds, "system.play.lastDamage": entry, "system.play.damageLog": [entry, ...this.system.play.damageLog].slice(0, 20) });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong>: ${raw} ${type} - ${resistance} armor = ${final}; <b>${entry.severity || "no injury"}</b>${entry.escalated ? " (escalated)" : ""}.` });
    return entry;
  }
  async spendHeroPoint() { if (this.system.heroPoints > 0) await this.update({ "system.heroPoints": this.system.heroPoints - 1 }); }
  async recover(period) {
    const wounds = foundry.utils.deepClone(this.system.wounds), rows = ["graze", "light", "moderate", "serious", "critical", "mortal"];
    if (period === "scene") wounds.graze = 0; else if (period === "day") wounds.light = 0; else if (rows.includes(period) && wounds[period] > 0) {
      wounds[period]--; const index = rows.indexOf(period);
      for (let i = index - 1; i >= 0; i--) if (wounds[rows[i]] < this.system.derived.durability[rows[i]]) { wounds[rows[i]]++; break; }
    }
    await this.update({ "system.wounds": wounds });
  }
  async advanceLevel() {
    if (this.system.level >= 10) return ui.notifications.warn("Alternity heroes cannot advance beyond level 10.");
    const level = this.system.level + 1, advancement = [...this.system.advancement, { level, date: new Date().toISOString(), skillPoints: 5, talentChoices: 1 }];
    await this.update({ "system.level": level, "system.advancement": advancement });
    ui.notifications.info(`${this.name} advanced to level ${level}; spend 5 skill points and choose one talent.`);
  }
  async scheduleCombatAction(speed = 1, { label = "Action", kind = "action" } = {}) {
    const combat = game.combat, combatant = combat?.combatantForActor?.(this) || combat?.combatants.find(entry => entry.actorId === this.id);
    if (combat?.started && combatant && combat.schedule) return combat.schedule(combatant, Number(speed), { label, kind });
  }
}

export class AlternityItem extends Item {}
