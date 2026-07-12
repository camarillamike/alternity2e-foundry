import { damageSeverity, durability, applyWound, woundPenalty, parseDamage, skillTarget, stepFormula, rollDegree } from "./rules.mjs";

export class AlternityActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system, items = this.items.contents;
    const talentBoxes = {};
    for (const item of items.filter(i => i.type === "talent")) for (const effect of item.system.effects || []) if (effect.type === "woundBoxes") for (const row of effect.rows || []) talentBoxes[row] = (talentBoxes[row] || 0) + Number(effect.value || 0);
    s.derived = {
      durability: durability(s.abilities.vitality, talentBoxes), woundPenalty: woundPenalty(s.wounds), incapacitated: s.wounds.mortal > 0 || s.play.statuses.includes("incapacitated"),
      initiative: { target: 20 - s.abilities.agility - s.abilities.focus, steps: this.#effects("initiativeStep") },
      armor: this.armorResistance, speed: this.currentSpeed, mass: items.reduce((n, i) => n + Number(i.system.mass || 0) * Number(i.system.quantity || 1), 0)
    };
  }
  #effects(type) { return this.items.reduce((n, item) => n + (item.system.effects || []).filter(e => e.type === type).reduce((m, e) => m + Number(e.value || 0), 0), 0); }
  get armorResistance() { const armor = this.items.filter(i => i.type === "armor" && i.system.equipped); return { physical: armor.reduce((n, i) => n + Number(i.system.physical || 0), 0), energy: armor.reduce((n, i) => n + Number(i.system.energy || 0), 0) }; }
  get currentSpeed() { const statuses = this.system.play.statuses; if (this.system.wounds.mortal || statuses.includes("incapacitated")) return 0; if (statuses.includes("prone")) return 2; return statuses.some(x => ["blinded", "impaired", "slowed"].includes(x)) ? 10 : 20; }
  getSkill(id) { return this.items.find(i => i.type === "skill" && i.system.sourceId === id); }
  async rollSkill(itemOrId, { steps = 0, label } = {}) {
    const item = typeof itemOrId === "string" ? this.getSkill(itemOrId) : itemOrId, ability = this.system.abilities[item?.system.keyAbility] || 0, ranks = item?.system.ranks || 0;
    const target = skillTarget(ability, ranks), finalSteps = Number(steps) + this.system.derived.woundPenalty, die = await new Roll(stepFormula(finalSteps)).evaluate();
    const degree = rollDegree(die.total, target);
    await die.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${label || item?.name || "Skill Check"}</strong><br>Target ${target}; ${finalSteps >= 0 ? "+" : ""}${finalSteps} steps<br><b>${degree}</b>` });
    return { total: die.total, target, steps: finalSteps, degree };
  }
  async rollWeapon(item) {
    const skillId = item.system.range === "Adjacent" ? "melee" : item.system.damageType === "energy" ? "energy-weapon" : "firearm";
    const check = await this.rollSkill(skillId, { label: item.name, steps: item.system.effects.filter(e => e.type === "attackSteps").reduce((n, e) => n + Number(e.value || 0), 0) });
    if (check.degree === "Failure") return check;
    const parsed = parseDamage(item.system.damage); if (!parsed) return check;
    const bonus = check.degree === "Average" ? parsed.averageBonus : parsed.excellentBonus, formula = `${parsed.dice}${bonus >= 0 ? "+" : ""}${bonus}`, damage = await new Roll(formula).evaluate(), hits = check.degree === "Stellar" ? 2 : 1;
    await damage.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `<strong>${item.name} Damage</strong><br>${check.degree} hit · ${item.system.damageType}${hits === 2 ? " · one additional wound" : ""}<br><button data-alternity-damage="${damage.total}" data-damage-type="${item.system.damageType}" data-wound-hits="${hits}">Apply ${damage.total} Damage to Target</button>` });
    return { ...check, damage: damage.total };
  }
  async applyDamage(raw, type = "physical", { woundHits = 1 } = {}) {
    const resistance = ["physical", "energy"].includes(type) ? this.system.derived.armor[type] : 0, final = Math.max(0, Number(raw) - resistance), base = damageSeverity(final), wounds = foundry.utils.deepClone(this.system.wounds), applied = [];
    for (let i = 0; i < woundHits; i++) applied.push(applyWound(wounds, this.system.derived.durability, base));
    const entry = { date: new Date().toISOString(), raw: Number(raw), type, resistance, final, baseSeverity: base, severity: applied.map(x => x.severity).filter(Boolean).join(", "), escalated: applied.some(x => x.escalated), woundHits };
    await this.update({ "system.wounds": wounds, "system.play.lastDamage": entry, "system.play.damageLog": [entry, ...this.system.play.damageLog].slice(0, 20) });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<strong>${this.name}</strong>: ${raw} ${type} - ${resistance} armor = ${final}; <b>${entry.severity || "no injury"}</b>${entry.escalated ? " (escalated)" : ""}.` });
    return entry;
  }
  async spendHeroPoint() { if (this.system.heroPoints > 0) await this.update({ "system.heroPoints": this.system.heroPoints - 1 }); }
}

export class AlternityItem extends Item {}
