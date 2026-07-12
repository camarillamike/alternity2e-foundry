const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class AlternityActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["alternity2e", "actor-sheet"], position: { width: 980, height: 760 },
    form: { closeOnSubmit: false },
    actions: {
      rollSkill: AlternityActorSheet.#rollSkill, rollWeapon: AlternityActorSheet.#rollWeapon, applyDamage: AlternityActorSheet.#applyDamage,
      heroUp: AlternityActorSheet.#heroUp, heroDown: AlternityActorSheet.#heroDown, nextImpulse: AlternityActorSheet.#nextImpulse,
      toggleWound: AlternityActorSheet.#toggleWound, toggleStatus: AlternityActorSheet.#toggleStatus, exportCharacter: AlternityActorSheet.#exportCharacter
    }
  };
  static PARTS = { main: { template: "systems/alternity2e/templates/actor-sheet.hbs" } };
  async _prepareContext(options) {
    const context = await super._prepareContext(options), actor = this.actor, s = actor.system;
    return foundry.utils.mergeObject(context, {
      actor, system: s, editable: this.isEditable,
      abilities: Object.entries(s.abilities).map(([id, value]) => ({ id, label: game.i18n.localize(`A2E.Ability.${id}`), value })),
      wounds: [
        ["mortal", "16+", "Mortal - cannot act"], ["critical", "13-15", "Critical -3 steps"], ["serious", "10-12", "Serious -2 steps"],
        ["moderate", "7-9", "Moderate -1 step"], ["light", "4-6", "Light"], ["graze", "1-3", "Graze"]
      ].map(([id, range, label]) => ({ id, range, label, current: s.wounds[id], boxes: Array.from({ length: s.derived.durability[id] }, (_, index) => ({ index, marked: index < s.wounds[id] })) })),
      skills: actor.items.filter(i => i.type === "skill").map(i => ({ item: i, target: 20 - s.abilities[i.system.keyAbility] - i.system.ranks, steps: s.derived.woundPenalty })),
      attacks: actor.items.filter(i => i.type === "weapon" && i.system.equipped), talents: actor.items.filter(i => i.type === "talent"), equipment: actor.items.filter(i => ["armor", "tool", "gear"].includes(i.type)),
      statuses: Object.entries({ blinded: "Blinded", dazed: "Dazed", distracted: "Distracted", grappled: "Grappled", impaired: "Impaired", prone: "Prone", slowed: "Slowed", weakened: "Weakened", incapacitated: "Incapacitated" }).map(([id, label]) => ({ id, label, active: s.play.statuses.includes(id) }))
    }, { inplace: false });
  }
  static async #rollSkill(event, target) { const item = this.actor.items.get(target.dataset.itemId); await this.actor.rollSkill(item); }
  static async #rollWeapon(event, target) { await this.actor.rollWeapon(this.actor.items.get(target.dataset.itemId)); }
  static async #applyDamage() { const form = this.element.querySelector(".damage-form"), value = Number(form.querySelector("[name=damage]").value), type = form.querySelector("[name=damageType]").value; await this.actor.applyDamage(value, type); }
  static async #heroUp() { await this.actor.update({ "system.heroPoints": this.actor.system.heroPoints + 1 }); }
  static async #heroDown() { await this.actor.spendHeroPoint(); }
  static async #nextImpulse() { let impulse = this.actor.system.play.impulse + 1, round = this.actor.system.play.round; if (impulse > 8) { impulse = 1; round++; } await this.actor.update({ "system.play.impulse": impulse, "system.play.round": round }); }
  static async #toggleWound(event, target) { const row = target.dataset.row, index = Number(target.dataset.index), current = this.actor.system.wounds[row]; await this.actor.update({ [`system.wounds.${row}`]: current === index + 1 ? index : index + 1 }); }
  static async #toggleStatus(event, target) { const id = target.dataset.status, values = [...this.actor.system.play.statuses], next = values.includes(id) ? values.filter(x => x !== id) : [...values, id]; await this.actor.update({ "system.play.statuses": next }); }
  static async #exportCharacter() { const data = game.alternity2e.exportStandaloneCharacter(this.actor); foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", `${this.actor.name}.alternity.json`); }
}

export class AlternityItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = { classes: ["alternity2e", "item-sheet"], position: { width: 600, height: 650 }, form: { closeOnSubmit: false } };
  static PARTS = { main: { template: "systems/alternity2e/templates/item-sheet.hbs" } };
  async _prepareContext(options) { const context = await super._prepareContext(options); return foundry.utils.mergeObject(context, { item: this.item, system: this.item.system, editable: this.isEditable }, { inplace: false }); }
}
