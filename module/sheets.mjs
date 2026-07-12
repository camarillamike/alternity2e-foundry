import { archetypes, species, talents, catalogDocuments, refreshActorSources, refreshCompendiums } from "./catalogs.mjs";
import { AlternityCreationWizard } from "./wizard.mjs";

const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class AlternityActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["alternity2e", "actor-sheet"], position: { width: 1100, height: 820 }, form: { closeOnSubmit: false },
    actions: {
      rollSkill: AlternityActorSheet.#rollSkill, rollWeapon: AlternityActorSheet.#rollWeapon, applyDamage: AlternityActorSheet.#applyDamage,
      heroUp: AlternityActorSheet.#heroUp, heroDown: AlternityActorSheet.#heroDown, nextImpulse: AlternityActorSheet.#nextImpulse,
      toggleWound: AlternityActorSheet.#toggleWound, toggleStatus: AlternityActorSheet.#toggleStatus, exportCharacter: AlternityActorSheet.#exportCharacter,
      importCharacter: AlternityActorSheet.#importCharacter, adjustAbility: AlternityActorSheet.#adjustAbility, adjustRank: AlternityActorSheet.#adjustRank,
      toggleEquip: AlternityActorSheet.#toggleEquip, editItem: AlternityActorSheet.#editItem, deleteItem: AlternityActorSheet.#deleteItem,
      reload: AlternityActorSheet.#reload, recover: AlternityActorSheet.#recover, newScene: AlternityActorSheet.#newScene, advanceLevel: AlternityActorSheet.#advanceLevel,
      refreshSources: AlternityActorSheet.#refreshSources, rebuildCompendiums: AlternityActorSheet.#rebuildCompendiums, creationWizard: AlternityActorSheet.#creationWizard
    }
  };
  static PARTS = { main: { template: "systems/alternity2e/templates/actor-sheet.hbs" } };
  tabGroups = { primary: "play" };
  async _prepareContext(options) {
    const context = await super._prepareContext(options), actor = this.actor, s = actor.system;
    const skillItems = actor.items.filter(i => i.type === "skill").sort((a, b) => a.system.category.localeCompare(b.system.category) || a.name.localeCompare(b.name));
    const archetype = archetypes.find(row => row.id === s.archetypeId);
    return foundry.utils.mergeObject(context, {
      actor, system: s, editable: this.isEditable, isGM: game.user.isGM, rankCap: Math.min(4 + s.level, 10), speciesOptions: species, archetypeOptions: archetypes,
      mandatedOptions: talents.filter(row => row.entry && (archetype?.id === "freeform" || archetype?.mandatedTalents.includes(row.id))),
      abilities: Object.entries(s.abilities).map(([id, value]) => ({ id, label: game.i18n.localize(`A2E.Ability.${id}`), value })),
      wounds: [["mortal", "16+", "Mortal wound (cannot act)"], ["critical", "13–15", "Critical wound (–3 die steps)"], ["serious", "10–12", "Serious wound (–2 die steps)"], ["moderate", "7–9", "Moderate wound (–1 die step)"], ["light", "4–6", "Light wound (no effect)"], ["graze", "1–3", "Graze (no effect)"]].map(([id, range, label]) => ({ id, range, label, current: s.wounds[id], boxes: Array.from({ length: s.derived.durability[id] }, (_, index) => ({ index, marked: index < s.wounds[id] })) })),
      skillGroups: Object.entries(skillItems.reduce((all, item) => ((all[item.system.category] ??= []).push({ item, target: 20 - s.abilities[item.system.keyAbility] - item.system.ranks, steps: s.derived.woundPenalty + actor.statusSteps }), all), {})).map(([name, rows]) => ({ name, rows })),
      attacks: actor.items.filter(i => i.type === "weapon"), talents: actor.items.filter(i => i.type === "talent"),
      equipmentGroups: Object.entries(actor.items.filter(i => ["armor", "tool", "gear", "upgrade"].includes(i.type)).reduce((all, item) => ((all[item.system.category || item.type] ??= []).push(item), all), {})).map(([name, items]) => ({ name, items })),
      statuses: Object.entries({ blinded: "Blinded", dazed: "Dazed", distracted: "Distracted", grappled: "Grappled", impaired: "Impaired", prone: "Prone", slowed: "Slowed", weakened: "Weakened", incapacitated: "Incapacitated" }).map(([id, label]) => ({ id, label, active: s.play.statuses.includes(id) }))
    }, { inplace: false });
  }
  static async #rollSkill(event, target) { await this.actor.rollSkill(this.actor.items.get(target.dataset.itemId)); }
  static async #rollWeapon(event, target) { await this.actor.rollWeapon(this.actor.items.get(target.dataset.itemId)); }
  static async #applyDamage() { const form = this.element.querySelector(".damage-form"); await this.actor.applyDamage(Number(form.querySelector("[name=damage]").value), form.querySelector("[name=damageType]").value); }
  static async #heroUp() { await this.actor.update({ "system.heroPoints": this.actor.system.heroPoints + 1 }); }
  static async #heroDown() { await this.actor.spendHeroPoint(); }
  static async #nextImpulse() { if (game.combat?.started && game.combat.advanceImpulse) await game.combat.advanceImpulse(); else { let impulse = this.actor.system.play.impulse + 1, round = this.actor.system.play.round; if (impulse > 8) { impulse = 1; round++; } await this.actor.update({ "system.play.impulse": impulse, "system.play.round": round }); } }
  static async #toggleWound(event, target) { const row = target.dataset.row, index = Number(target.dataset.index), current = this.actor.system.wounds[row]; await this.actor.update({ [`system.wounds.${row}`]: current === index + 1 ? index : index + 1 }); }
  static async #toggleStatus(event, target) { const id = target.dataset.status, values = [...this.actor.system.play.statuses], next = values.includes(id) ? values.filter(x => x !== id) : [...values, id]; await this.actor.update({ "system.play.statuses": next }); }
  static async #adjustAbility(event, target) { const id = target.dataset.ability, value = Math.clamp(this.actor.system.abilities[id] + Number(target.dataset.delta), 0, 10); await this.actor.update({ [`system.abilities.${id}`]: value }); }
  static async #adjustRank(event, target) { const item = this.actor.items.get(target.dataset.itemId), cap = Math.min(4 + this.actor.system.level, 10); await item.update({ "system.ranks": Math.clamp(item.system.ranks + Number(target.dataset.delta), 0, cap) }); }
  static async #toggleEquip(event, target) { const item = this.actor.items.get(target.dataset.itemId); await item.update({ "system.equipped": !item.system.equipped }); }
  static async #editItem(event, target) { this.actor.items.get(target.dataset.itemId)?.sheet.render(true); }
  static async #deleteItem(event, target) { await this.actor.deleteEmbeddedDocuments("Item", [target.dataset.itemId]); }
  static async #reload(event, target) { const item = this.actor.items.get(target.dataset.itemId); await item.update({ "system.ammo.value": item.system.ammo.max }); await this.actor.scheduleCombatAction(Number(target.dataset.speed || 1)); }
  static async #recover(event, target) { await this.actor.recover(target.dataset.period); }
  static async #newScene() { await this.actor.recover("scene"); await this.actor.update({ "system.play.round": 1, "system.play.impulse": 1, "system.play.statuses": [] }); }
  static async #advanceLevel() { await this.actor.advanceLevel(); }
  static async #refreshSources() { const count = await refreshActorSources(this.actor); ui.notifications.info(`Refreshed ${count} character Items from authoritative catalogs.`); }
  static async #rebuildCompendiums() { const count = await refreshCompendiums(); await game.settings.set("alternity2e", "catalogVersion", game.system.version); ui.notifications.info(`Rebuilt ${count} Alternity compendiums.`); }
  static async #creationWizard() { new AlternityCreationWizard({ actor: this.actor }).render(true); }
  static async #exportCharacter() { const data = game.alternity2e.exportStandaloneCharacter(this.actor); foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", `${this.actor.name}.alternity.json`); }
  static async #importCharacter() { const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json"; input.addEventListener("change", async () => { try { const file = input.files?.[0]; if (!file) return; const data = JSON.parse(await file.text()); await game.alternity2e.importStandaloneCharacter(data, { actor: this.actor }); ui.notifications.info(`Imported ${data.identity?.name || file.name}.`); this.render({ force: true }); } catch (error) { ui.notifications.error(`Character import failed: ${error.message}`); } }, { once: true }); input.click(); }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const activate = id => { this.tabGroups.primary = id; this.element.querySelectorAll('[data-group="primary"][data-tab]').forEach(element => element.classList.toggle("active", element.dataset.tab === id)); };
    this.element.querySelectorAll('nav[data-group="primary"] [data-tab]').forEach(tab => tab.addEventListener("click", event => { event.preventDefault(); activate(tab.dataset.tab); })); activate(this.tabGroups.primary || "play");
    this.element.querySelector("[name='system.mandatedTalentId']")?.addEventListener("change", event => this.#changeMandated(event.target.value));
    this.element.addEventListener("dragover", event => event.preventDefault()); this.element.addEventListener("drop", event => this.#dropItem(event));
  }
  async #changeMandated(sourceId) {
    const old = this.actor.system.mandatedTalentId, archetype = archetypes.find(row => row.id === this.actor.system.archetypeId), roots = new Set(archetype?.mandatedTalents || []);
    const deletions = this.actor.items.filter(item => item.type === "talent" && roots.has(item.system.sourceId) && item.system.sourceId !== sourceId).map(item => item.id);
    if (deletions.length) await this.actor.deleteEmbeddedDocuments("Item", deletions);
    if (sourceId && !this.actor.items.some(item => item.type === "talent" && item.system.sourceId === sourceId)) { const source = catalogDocuments().find(item => item.type === "talent" && item.system.sourceId === sourceId); if (source) await this.actor.createEmbeddedDocuments("Item", [source]); }
    await this.actor.update({ "system.mandatedTalentId": sourceId });
  }
  async #dropItem(event) { try { const data = TextEditor.getDragEventData(event); if (data.type !== "Item") return; const item = await Item.implementation.fromDropData(data); if (!item || item.parent?.id === this.actor.id) return; await this.actor.createEmbeddedDocuments("Item", [item.toObject()]); } catch (error) { console.error(error); ui.notifications.error("That Item could not be added to the character."); } }
}

export class AlternityItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = { classes: ["alternity2e", "item-sheet"], position: { width: 600, height: 650 }, form: { closeOnSubmit: false } };
  static PARTS = { main: { template: "systems/alternity2e/templates/item-sheet.hbs" } };
  async _prepareContext(options) { const context = await super._prepareContext(options); return foundry.utils.mergeObject(context, { item: this.item, system: this.item.system, editable: this.isEditable }, { inplace: false }); }
}
