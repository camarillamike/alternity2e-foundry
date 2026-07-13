import { archetypes, species, talents, catalogDocuments, refreshActorSources, refreshCompendiums } from "./catalogs.mjs";
import { AlternityCreationWizard } from "./wizard.mjs";
import { positionFromTick } from "./impulse-rules.mjs";
import { consolidateActorItems } from "./inventory.mjs";
import { reloadPlan, specialAmmoEffect } from "./ammunition.mjs";

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
      refreshSources: AlternityActorSheet.#refreshSources, rebuildCompendiums: AlternityActorSheet.#rebuildCompendiums, creationWizard: AlternityActorSheet.#creationWizard,
      scheduleAction: AlternityActorSheet.#scheduleAction, setCombatModifier: AlternityActorSheet.#setCombatModifier, react: AlternityActorSheet.#react,
      consolidateItems: AlternityActorSheet.#consolidateItems, adjustQuantity: AlternityActorSheet.#adjustQuantity, adjustReserve: AlternityActorSheet.#adjustReserve,
      toggleSpeedLoader: AlternityActorSheet.#toggleSpeedLoader, toggleSpecialSupply: AlternityActorSheet.#toggleSpecialSupply
    }
  };
  static PARTS = { main: { template: "systems/alternity2e/templates/actor-sheet.hbs" } };
  tabGroups = { primary: "play" };
  async _prepareContext(options) {
    const context = await super._prepareContext(options), actor = this.actor, s = actor.system;
    if (!s.derived?.durability) actor.prepareDerivedData();
    if (!s.derived?.durability) throw new Error(`Alternity 2e could not prepare derived statistics for ${actor.name}. Check the console for the earlier prepareDerivedData error.`);
    const skillItems = actor.items.filter(i => i.type === "skill").sort((a, b) => a.system.category.localeCompare(b.system.category) || a.name.localeCompare(b.name));
    const archetype = archetypes.find(row => row.id === s.archetypeId);
    const combat = game.combat?.started ? game.combat : null, combatant = combat?.combatantForActor?.(actor), nextPosition = combatant ? positionFromTick(Number(combatant.getFlag("alternity2e", "nextTick") || 1)) : null;
    return foundry.utils.mergeObject(context, {
      actor, system: s, editable: this.isEditable, isGM: game.user.isGM, rankCap: Math.min(4 + s.level, 10), speciesOptions: species, archetypeOptions: archetypes, load: s.derived.load, limitedAmmo: game.settings.get("alternity2e", "ammunitionTracking") === "limited",
      combatState: combatant ? { active: true, ready: combat.isReady(combatant), readied: Boolean(combatant.getFlag("alternity2e", "readied")), nextRound: nextPosition.round, nextImpulse: nextPosition.impulse, lastAction: combatant.getFlag("alternity2e", "lastAction") || "None", modifier: combatant.getFlag("alternity2e", "pendingModifier") } : { active: false },
      mandatedOptions: talents.filter(row => row.entry && (archetype?.id === "freeform" || archetype?.mandatedTalents.includes(row.id))),
      abilities: Object.entries(s.abilities).map(([id, value]) => ({ id, label: game.i18n.localize(`A2E.Ability.${id}`), value })),
      wounds: [["mortal", "16+", "Mortal wound (cannot act)"], ["critical", "13–15", "Critical wound (–3 die steps)"], ["serious", "10–12", "Serious wound (–2 die steps)"], ["moderate", "7–9", "Moderate wound (–1 die step)"], ["light", "4–6", "Light wound (no effect)"], ["graze", "1–3", "Graze (no effect)"]].map(([id, range, label]) => ({ id, range, label, current: s.wounds[id], boxes: Array.from({ length: s.derived.durability[id] }, (_, index) => ({ index, marked: index < s.wounds[id] })) })),
      skillGroups: Object.entries(skillItems.reduce((all, item) => ((all[item.system.category] ??= []).push({ item, target: 20 - s.abilities[item.system.keyAbility] - item.system.ranks, steps: s.derived.woundPenalty + actor.statusSteps }), all), {})).map(([name, rows]) => ({ name, rows })),
      attacks: actor.items.filter(i => i.type === "weapon"), talents: actor.items.filter(i => i.type === "talent"),
      equipmentGroups: Object.entries(actor.items.filter(i => ["weapon", "armor", "tool", "gear", "upgrade"].includes(i.type)).reduce((all, item) => ((all[item.system.category || item.type] ??= []).push(item), all), {})).map(([name, items]) => ({ name, items })),
      statuses: Object.entries({ blinded: "Blinded", dazed: "Dazed", distracted: "Distracted", grappled: "Grappled", impaired: "Impaired", prone: "Prone", slowed: "Slowed", weakened: "Weakened", incapacitated: "Incapacitated", insane: "Insane", "off-balance": "Off-Balance", stun: "Stunned", "damage-over-time": "Damage Over Time" }).map(([id, label]) => ({ id, label, active: s.play.statuses.includes(id) }))
    }, { inplace: false });
  }
  static async #rollSkill(event, target) { const combat = game.combat?.started ? game.combat : null, combatant = combat?.combatantForActor?.(this.actor); if (combat && !combat.isReady(combatant)) return ui.notifications.warn(`${this.actor.name} is not ready to act in this impulse.`); const modifier = combat?.getModifier?.(this.actor, "skill"); await this.actor.rollSkill(this.actor.items.get(target.dataset.itemId), { steps: Number(modifier?.steps || 0) }); if (combat) await this.actor.scheduleCombatAction(3, { label: modifier?.label || "Use a skill or tool", kind: "skill" }); }
  static async #rollWeapon(event, target) { await this.actor.rollWeapon(this.actor.items.get(target.dataset.itemId)); }
  static async #applyDamage() { const form = this.element.querySelector(".damage-form"); await this.actor.applyDamage(Number(form.querySelector("[name=damage]").value), form.querySelector("[name=damageType]").value); }
  static async #heroUp() { await this.actor.update({ "system.heroPoints": this.actor.system.heroPoints + 1 }); }
  static async #heroDown() { await this.actor.spendHeroPoint(); }
  static async #nextImpulse() { if (game.combat?.started && game.combat.advanceImpulse) await game.combat.advanceImpulse(); else { let impulse = this.actor.system.play.impulse + 1, round = this.actor.system.play.round; if (impulse > 8) { impulse = 1; round++; } await this.actor.update({ "system.play.impulse": impulse, "system.play.round": round }); } }
  static async #toggleWound(event, target) { const row = target.dataset.row, index = Number(target.dataset.index), current = this.actor.system.wounds[row]; await this.actor.update({ [`system.wounds.${row}`]: current === index + 1 ? index : index + 1 }); }
  static async #toggleStatus(event, target) { const id = target.dataset.status, values = [...this.actor.system.play.statuses], adding = !values.includes(id), next = adding ? [...values, id] : values.filter(x => x !== id); await this.actor.update({ "system.play.statuses": next }); if (adding && id === "stun" && game.combat?.started) { const combatant = game.combat.combatantForActor?.(this.actor); if (combatant) await game.combat.delayNextAction(combatant, 3, "Stun"); } }
  static async #adjustAbility(event, target) { const id = target.dataset.ability, value = Math.clamp(this.actor.system.abilities[id] + Number(target.dataset.delta), 0, 10); await this.actor.update({ [`system.abilities.${id}`]: value }); }
  static async #adjustRank(event, target) { const item = this.actor.items.get(target.dataset.itemId), cap = Math.min(4 + this.actor.system.level, 10); await item.update({ "system.ranks": Math.clamp(item.system.ranks + Number(target.dataset.delta), 0, cap) }); }
  static async #toggleEquip(event, target) { const item = this.actor.items.get(target.dataset.itemId), equipping = !item.system.equipped; if (equipping && item.type === "armor" && !(item.system.special || []).some(value => /^(screen|cover|deflect|bonus resistance)/i.test(value))) { const others = this.actor.items.filter(entry => entry.id !== item.id && entry.type === "armor" && entry.system.equipped && !(entry.system.special || []).some(value => /^(screen|cover|deflect|bonus resistance)/i.test(value))).map(entry => ({ _id: entry.id, "system.equipped": false })); if (others.length) await this.actor.updateEmbeddedDocuments("Item", others); } await item.update({ "system.equipped": equipping }); }
  static async #editItem(event, target) { this.actor.items.get(target.dataset.itemId)?.sheet.render(true); }
  static async #deleteItem(event, target) { await this.actor.deleteEmbeddedDocuments("Item", [target.dataset.itemId]); }
  static async #adjustQuantity(event, target) { const item = this.actor.items.get(target.dataset.itemId); if (!item) return; await item.update({ "system.quantity": Math.max(1, Number(item.system.quantity || 1) + Number(target.dataset.delta || 0)) }); }
  static async #adjustReserve(event, target) { const item = this.actor.items.get(target.dataset.itemId); if (!item) return; await item.update({ "system.ammo.reserve": Math.max(0, Number(item.system.ammo.reserve || 0) + Number(target.dataset.delta || 0)) }); }
  static async #toggleSpeedLoader(event, target) { const item = this.actor.items.get(target.dataset.itemId); if (item?.system.sourceId === "revolver") await item.update({ "system.ammo.speedLoader": !item.system.ammo.speedLoader }); }
  static async #toggleSpecialSupply(event, target) { const item = this.actor.items.get(target.dataset.itemId); if (!item) return; await item.update({ "system.ammo.specialAvailable": !item.system.ammo.specialAvailable, "system.ammo.specialType": item.system.ammo.specialAvailable ? "normal" : item.system.ammo.specialType }); }
  static async #consolidateItems() { const result = await consolidateActorItems(this.actor); ui.notifications.info(result.removed ? `Consolidated ${result.groups} duplicate groups and removed ${result.removed} duplicate Item records.` : "No duplicate source Items were found."); }
  static async #reload(event, target) { const item = this.actor.items.get(target.dataset.itemId), combat = game.combat?.started ? game.combat : null, forcedLimited = item.system.ammo.mode === "loadout" || /rocket/i.test(item.system.sourceId), limited = forcedLimited || game.settings.get("alternity2e", "ammunitionTracking") === "limited", plan = reloadPlan(item.system.ammo, { limited }); if (!plan.allowed) return ui.notifications.warn(plan.reason === "no-reserve" ? `${item.name} has no ${item.system.ammo.reserveUnit} remaining.` : `${item.name} does not need or cannot perform a reload.`); if (combat) { const result = await this.actor.scheduleCombatAction(plan.cost, { label: `Reload ${item.name}`, kind: "interact" }); if (!result) return; } await item.update({ "system.ammo.value": plan.nextValue, "system.ammo.reserve": plan.nextReserve }); }
  static async #scheduleAction(event, target) { const combat = game.combat, combatant = combat?.combatantForActor?.(this.actor); if (!combat?.started || !combatant) return ui.notifications.warn("Add this Actor to an active encounter first."); const kind = target.dataset.kind, cost = Number(target.dataset.cost || 1), label = target.dataset.label || target.textContent.trim(); if (kind === "ready") await combat.readyAction(combatant); else await combat.schedule(combatant, cost, { label, kind }); }
  static async #setCombatModifier(event, target) { const combat = game.combat, combatant = combat?.combatantForActor?.(this.actor); if (!combat?.started || !combatant) return ui.notifications.warn("Add this Actor to an active encounter first."); const definitions = { aim: { id: "aim", label: "Aim", kind: "attack", steps: 1, delay: 1 }, burst: { id: "burst", label: "Autofire burst", kind: "attack", delay: 1, ammoCost: 3, extraWounds: 1 }, fullauto: { id: "fullauto", label: "Full auto", kind: "attack", delay: 2, ammoCost: 10 }, charge: { id: "charge", label: "Charge", kind: "attack", delay: 1 }, evade: { id: "evade", label: "Evade", delay: 1, defensePenalty: -1 }, concentrate1: { id: "concentrate1", label: "Concentrate +1", kind: "skill", steps: 1, delay: 1 }, concentrate2: { id: "concentrate2", label: "Concentrate +2", kind: "skill", steps: 2, delay: 3 } }; const modifier = definitions[target.dataset.modifier]; if (modifier) await combat.setModifier(combatant, modifier); }
  static async #react() { const combat = game.combat, combatant = combat?.combatantForActor?.(this.actor); if (!combat?.started || !combatant) return ui.notifications.warn("Add this Actor to an active encounter first."); await combat.delayNextAction(combatant, 1, "Reaction"); }
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
    this.element.querySelectorAll("[data-ammo-type]").forEach(select => select.addEventListener("change", async event => { const item = this.actor.items.get(event.target.dataset.itemId), effect = specialAmmoEffect(event.target.value, { sourceId: item.system.sourceId, weaponType: item.system.weaponType, damageType: item.system.damageType, techEra: item.system.techEra }); if (!effect.valid) { ui.notifications.warn(`${effect.label} is not eligible for ${item.name}.`); event.target.value = item.system.ammo.specialType; return; } await item.update({ "system.ammo.specialType": event.target.value }); }));
    this.element.querySelectorAll("[data-ammo-payload]").forEach(input => { const listId = `a2e-payloads-${this.actor.id}`; if (!this.element.querySelector(`#${listId}`)) { const list = document.createElement("datalist"); list.id = listId; list.innerHTML = [["frag-grenade", "Frag"], ["smoke-grenade", "Smoke"], ["concussion-grenade", "Concussion"], ["emp-grenade", "EMP"], ["thermal-grenade", "Thermal"], ["swarm-grenade", "Swarm"], ["null-grenade", "Null"]].map(([value, label]) => `<option value="${value}">${label}</option>`).join(""); this.element.append(list); } input.setAttribute("list", listId); input.addEventListener("change", event => this.actor.items.get(event.target.dataset.itemId)?.update({ "system.ammo.payload": event.target.value })); });
    this._dropController?.abort(); this._dropController = new AbortController(); const dropOptions = { capture: true, signal: this._dropController.signal };
    this.element.addEventListener("dragover", event => event.preventDefault(), dropOptions); this.element.addEventListener("drop", event => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); this.#dropItem(event); }, dropOptions);
  }
  async #changeMandated(sourceId) {
    const old = this.actor.system.mandatedTalentId, archetype = archetypes.find(row => row.id === this.actor.system.archetypeId), roots = new Set(archetype?.mandatedTalents || []);
    const deletions = this.actor.items.filter(item => item.type === "talent" && roots.has(item.system.sourceId) && item.system.sourceId !== sourceId).map(item => item.id);
    if (deletions.length) await this.actor.deleteEmbeddedDocuments("Item", deletions);
    if (sourceId && !this.actor.items.some(item => item.type === "talent" && item.system.sourceId === sourceId)) { const source = catalogDocuments().find(item => item.type === "talent" && item.system.sourceId === sourceId); if (source) await this.actor.createEmbeddedDocuments("Item", [source]); }
    await this.actor.update({ "system.mandatedTalentId": sourceId });
  }
  async #dropItem(event) { try {
    const data = TextEditor.getDragEventData(event); if (data.type !== "Item") return; const item = await Item.implementation.fromDropData(data); if (!item || item.parent?.id === this.actor.id) return;
    const sourceId = item.system.sourceId, existing = sourceId ? this.actor.items.find(entry => entry.type === item.type && entry.system.sourceId === sourceId) : null;
    if (existing) { if (["skill", "talent", "species", "archetype", "condition"].includes(item.type)) return ui.notifications.info(`${item.name} is already on ${this.actor.name}.`); const update = { "system.quantity": Number(existing.system.quantity || 1) + Math.max(1, Number(item.system.quantity || 1)) }; if (existing.system.ammo?.mode === "consumable") update["system.ammo.value"] = 1; await existing.update(update); return ui.notifications.info(`Increased ${item.name} quantity instead of creating a duplicate record.`); }
    const source = item.toObject(); delete source._id;
    if (item.type === "armor" && this.actor.armorSuit && !(item.system.special || []).some(value => /^bonus resistance/i.test(value))) { source.system.equipped = false; ui.notifications.warn(`${item.name} was added stowed because ${this.actor.armorSuit.name} is already worn.`); }
    await this.actor.createEmbeddedDocuments("Item", [source]);
  } catch (error) { console.error(error); ui.notifications.error("That Item could not be added to the character."); } }
}

export class AlternityItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = { classes: ["alternity2e", "item-sheet"], position: { width: 600, height: 650 }, form: { closeOnSubmit: false } };
  static PARTS = { main: { template: "systems/alternity2e/templates/item-sheet.hbs" } };
  async _prepareContext(options) { const context = await super._prepareContext(options); return foundry.utils.mergeObject(context, { item: this.item, system: this.item.system, editable: this.isEditable }, { inplace: false }); }
}
