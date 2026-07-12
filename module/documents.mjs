import { damageSeverity, durability, applyWound, woundPenalty, parseDamage, skillTarget, stepFormula, rollDegree } from "./rules.mjs";
import { species, archetypes } from "./catalogs.mjs";

export class AlternityActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system, items = this.items.contents;
    const talentBoxes = {};
    for (const item of items.filter(i => i.type === "talent")) for (const effect of item.system.effects || []) if (effect.type === "woundBoxes") for (const row of effect.rows || []) talentBoxes[row] = (talentBoxes[row] || 0) + Number(effect.value || 0);
    const effectiveVitality = s.abilities.vitality + this.ruleEffects.filter(effect => effect.type === "ability" && effect.ability === "vitality" || effect.type === "effectiveVitality" && effect.purpose === "durability").reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    s.derived = {
      durability: durability(effectiveVitality, talentBoxes), woundPenalty: woundPenalty(s.wounds), incapacitated: s.wounds.mortal > 0 || s.play.statuses.includes("incapacitated"),
      initiative: { target: 20 - s.abilities.agility - s.abilities.focus, steps: this.#effects("initiativeStep") },
      armor: this.armorResistance, speed: this.currentSpeed, mass: items.reduce((n, i) => n + Number(i.system.mass || 0) * Number(i.system.quantity || 1), 0)
    };
  }
  get ruleEffects() { return [...(species.find(row => row.id === this.system.speciesId)?.effects || []), ...(archetypes.find(row => row.id === this.system.archetypeId)?.effects || []), ...this.items.flatMap(item => item.system.effects || [])]; }
  #effects(type) { return this.ruleEffects.filter(effect => effect.type === type).reduce((sum, effect) => sum + Number(effect.value || 0), 0); }
  get armorResistance() { const armor = this.items.filter(i => i.type === "armor" && i.system.equipped), natural = this.ruleEffects.filter(e => e.type === "armor"); return { physical: armor.reduce((n, i) => n + Number(i.system.physical || 0), 0) + natural.reduce((n, e) => n + Number(e.physical || 0), 0), energy: armor.reduce((n, i) => n + Number(i.system.energy || 0), 0) + natural.reduce((n, e) => n + Number(e.energy || 0), 0) }; }
  get currentSpeed() { const statuses = this.system.play.statuses; if (this.system.wounds.mortal || statuses.includes("incapacitated")) return 0; if (statuses.includes("prone")) return 2; const base = Number(this.ruleEffects.filter(e => e.type === "baseSpeedOverride").at(-1)?.value ?? 20) + this.#effects("speed"); return statuses.some(x => ["blinded", "impaired", "slowed"].includes(x)) ? Math.max(2, base / 2) : base; }
  get statusSteps() { const statuses = this.system.play.statuses; return statuses.includes("impaired") ? -2 : statuses.includes("weakened") || statuses.includes("distracted") ? -1 : 0; }
  getSkill(id) { return this.items.find(i => i.type === "skill" && i.system.sourceId === id); }
  async rollSkill(itemOrId, { steps = 0, label } = {}) {
    const item = typeof itemOrId === "string" ? this.getSkill(itemOrId) : itemOrId, ability = this.system.abilities[item?.system.keyAbility] || 0, ranks = item?.system.ranks || 0;
    const categorySteps = this.ruleEffects.filter(effect => effect.type === "categoryStep" && effect.category === item?.system.category && ranks > 0).reduce((sum, effect) => sum + Number(effect.value || 0), 0), directSteps = this.ruleEffects.filter(effect => effect.type === "checkStep" && effect.skill === item?.system.sourceId).reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    const target = skillTarget(ability, ranks), finalSteps = Number(steps) + categorySteps + directSteps + this.system.derived.woundPenalty + this.statusSteps, die = await new Roll(stepFormula(finalSteps)).evaluate();
    const degree = rollDegree(die.total, target);
    await die.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${label || item?.name || "Skill Check"}</strong><br>Target ${target}; ${finalSteps >= 0 ? "+" : ""}${finalSteps} steps<br><b>${degree}</b>` });
    return { total: die.total, target, steps: finalSteps, degree };
  }
  async rollWeapon(item) {
    if (item.system.ammo.max > 0 && item.system.ammo.value < 1) return ui.notifications.warn(`${item.name} is empty. Reload it before attacking.`);
    const skillId = item.system.range === "Adjacent" ? "melee" : item.system.damageType === "energy" ? "energy-weapon" : "firearm";
    const check = await this.rollSkill(skillId, { label: item.name, steps: item.system.effects.filter(e => e.type === "attackSteps").reduce((n, e) => n + Number(e.value || 0), 0) });
    if (check.degree === "Failure") return check;
    const parsed = parseDamage(item.system.damage); if (!parsed) return check;
    const bonus = (check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus) + this.#effects("damage"), formula = `${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`, damage = await new Roll(formula).evaluate(), hits = check.degree === "Stellar" ? 2 : 1;
    if (item.system.ammo.max > 0) await item.update({ "system.ammo.value": Math.max(0, item.system.ammo.value - 1) });
    const ap = Number(item.system.special.find(value => /^AP\s+\d+/i.test(value))?.match(/\d+/)?.[0] || 0);
    await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Damage</strong><br>${check.degree} hit · ${item.system.damageType}${hits === 2 ? " · one additional wound" : ""}<br><button data-alternity-damage="${damage.total}" data-damage-type="${item.system.damageType}" data-wound-hits="${hits}" data-armor-penetration="${ap}">Apply ${damage.total} Damage to Target</button>` });
    await this.scheduleCombatAction(item.system.speed);
    return { ...check, damage: damage.total };
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
  async scheduleCombatAction(speed = 1) {
    const combat = game.combat, combatant = combat?.combatants.find(entry => entry.actorId === this.id);
    if (combat?.started && combatant && combat.schedule) await combat.schedule(combatant, speed);
  }
}

export class AlternityItem extends Item {}
