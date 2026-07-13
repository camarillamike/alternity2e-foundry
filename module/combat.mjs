import { stepFormula, rollDegree } from "./rules.mjs";
import { ACTION_COSTS, absoluteTick, positionFromTick, scheduleAfter, initialTick, initiativePriority, isReady, compareQueue, statusActionDelay, nextRelevantTick } from "./impulse-rules.mjs";

const flag = (document, key, fallback = null) => document.getFlag("alternity2e", key) ?? fallback;

export class AlternityCombat extends Combat {
  get impulse() { return Number(this.getFlag("alternity2e", "impulse") || 1); }
  get currentTick() { return absoluteTick(this.round || 1, this.impulse); }
  get readyCombatants() { return this.combatants.filter(combatant => this.isReady(combatant)).sort((a, b) => compareQueue(this.queueState(a), this.queueState(b))); }
  _sortCombatants(a, b) { return this.started ? compareQueue(this.queueState(a), this.queueState(b)) : super._sortCombatants(a, b); }
  queueState(combatant) { return { id: combatant.id, nextTick: Number(flag(combatant, "nextTick", Infinity)), sequence: Number(flag(combatant, "sequence", 0)), acted: Boolean(flag(combatant, "acted", false)) }; }
  combatantForActor(actor) { return this.combatants.find(entry => entry.actorId === actor?.id || entry.token?.actor?.id === actor?.id); }
  isReady(combatant) { return Boolean(combatant) && !combatant.defeated && !combatant.actor?.system?.derived?.incapacitated && isReady(flag(combatant, "nextTick", Infinity), this.currentTick); }
  async nextSequence() { const value = Number(this.getFlag("alternity2e", "sequenceCounter") || 0) + 1; await this.setFlag("alternity2e", "sequenceCounter", value); return value; }

  async startCombat() {
    const result = await super.startCombat();
    await this.update({ round: 1, turn: null, "flags.alternity2e.impulse": 1, "flags.alternity2e.sequenceCounter": 0 });
    await this.initializeSchedules(); await this.syncActors(); return result;
  }
  async endCombat() { await this.resolveSpecialAmmunition(); return super.endCombat(); }
  async resolveSpecialAmmunition() {
    const actors = [...new Map(this.combatants.filter(entry => entry.actor).map(entry => [entry.actor.id, entry.actor])).values()];
    for (const actor of actors) for (const weapon of actor.items.filter(item => item.type === "weapon" && item.system.ammo?.specialUsed)) {
      const roll = await new Roll("1d20").evaluate(), depleted = roll.total <= 10, type = weapon.system.ammo.specialType;
      await weapon.update({ "system.ammo.specialUsed": false, "system.ammo.specialAvailable": depleted ? false : weapon.system.ammo.specialAvailable, "system.ammo.specialType": depleted ? "normal" : type });
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<strong>${weapon.name} Special Ammunition</strong><br>${depleted ? "Supply depleted - reverting to normal ammunition." : "Special ammunition remains available."}` });
    }
  }
  async initializeSchedules() {
    const ordered = [...this.combatants].sort((a, b) => Number(flag(b, "initiativePriority", 0)) - Number(flag(a, "initiativePriority", 0)) || Number(a.actor?.system?.derived?.initiative?.target || 99) - Number(b.actor?.system?.derived?.initiative?.target || 99));
    const updates = ordered.map((combatant, index) => {
      const degree = flag(combatant, "initiativeDegree", "Unrolled");
      return { _id: combatant.id, "flags.alternity2e.nextTick": initialTick(degree), "flags.alternity2e.sequence": index + 1, "flags.alternity2e.acted": false, "flags.alternity2e.readied": false, "flags.alternity2e.pendingModifier": null, "flags.alternity2e.lastAction": "Awaiting first action" };
    });
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    await this.setFlag("alternity2e", "sequenceCounter", updates.length);
  }
  async rollInitiative(ids, { updateTurn = true, messageOptions = {} } = {}) {
    const requested = new Set(Array.isArray(ids) ? ids : [ids]), updates = [];
    for (const combatant of this.combatants.filter(entry => requested.has(entry.id))) {
      const actor = combatant.actor; if (!actor) continue;
      const target = actor.system.derived.initiative.target, steps = actor.system.derived.initiative.steps, roll = await new Roll(stepFormula(steps)).evaluate(), degree = rollDegree(roll.total, target), priority = initiativePriority(degree, roll.total);
      updates.push({ _id: combatant.id, initiative: priority, "flags.alternity2e.initiativeDegree": degree, "flags.alternity2e.initiativeRoll": roll.total, "flags.alternity2e.initiativePriority": priority, "flags.alternity2e.nextTick": initialTick(degree) });
      await roll.toMessage({ ...messageOptions, speaker: ChatMessage.getSpeaker({ actor }), flavor: `<strong>${actor.name} Initiative</strong><br>Target ${target}; ${steps >= 0 ? "+" : ""}${steps} steps<br><b>${degree}</b> - first action Impulse ${initialTick(degree)}` });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    await this.initializeSchedules(); return this;
  }
  async schedule(combatant, baseCost = 1, { label = "Action", kind = "action", ignoreModifier = false } = {}) {
    if (!combatant) return ui.notifications.warn("This Actor is not in the active encounter.");
    if (!this.isReady(combatant)) return ui.notifications.warn(`${combatant.name} is not ready to act in this impulse.`);
    const modifier = ignoreModifier ? null : flag(combatant, "pendingModifier", null), statuses = combatant.actor?.system?.play?.statuses || [], statusDelay = statusActionDelay(statuses, kind);
    const reactionDelay = flag(combatant, "readied", false) ? 1 : 0, cost = Math.max(1, Number(baseCost) + Number(modifier?.delay || 0) + statusDelay + reactionDelay), nextTick = scheduleAfter(this.currentTick, cost), sequence = await this.nextSequence();
    const update = { "flags.alternity2e.nextTick": nextTick, "flags.alternity2e.sequence": sequence, "flags.alternity2e.acted": true, "flags.alternity2e.readied": false, "flags.alternity2e.lastAction": `${label} (${cost} impulse${cost === 1 ? "" : "s"})`, "flags.alternity2e.pendingModifier": null };
    if (kind === "totalDefense") update["flags.alternity2e.defenseUntilTick"] = nextTick;
    if (modifier?.id === "evade") { update["flags.alternity2e.evadeUntilTick"] = nextTick; update["flags.alternity2e.evadePenalty"] = Number(modifier.defensePenalty || -1); }
    await combatant.update(update); ui.combat?.render(); return { cost, nextTick, ...positionFromTick(nextTick) };
  }
  async delayNextAction(combatant, amount = 1, label = "Reaction") {
    if (label === "Reaction" && combatant?.actor?.system?.play?.statuses?.includes("stun")) return ui.notifications.warn(`${combatant.name} cannot react while stunned.`);
    if (!combatant) return; const current = Math.max(this.currentTick, Number(flag(combatant, "nextTick", this.currentTick))), nextTick = current + Math.max(1, Number(amount)), sequence = await this.nextSequence();
    await combatant.update({ "flags.alternity2e.nextTick": nextTick, "flags.alternity2e.sequence": sequence, "flags.alternity2e.lastAction": `${label} (+${amount} impulse delay)` }); ui.combat?.render();
  }
  async readyAction(combatant) {
    if (!this.isReady(combatant)) return ui.notifications.warn(`${combatant?.name || "Combatant"} is not ready to act.`);
    const statuses = combatant.actor?.system?.play?.statuses || [], cost = 1 + statusActionDelay(statuses, "ready"), sequence = await this.nextSequence(); await combatant.update({ "flags.alternity2e.nextTick": this.currentTick + cost, "flags.alternity2e.sequence": sequence, "flags.alternity2e.acted": true, "flags.alternity2e.readied": true, "flags.alternity2e.lastAction": `Readied action (${cost} impulse${cost === 1 ? "" : "s"})` }); ui.combat?.render();
  }
  async setModifier(combatant, modifier) { if (!this.isReady(combatant)) return ui.notifications.warn(`${combatant?.name || "Combatant"} is not ready to act.`); await combatant.update({ "flags.alternity2e.pendingModifier": modifier }); ui.notifications.info(`${combatant.name}: ${modifier.label} selected for the next applicable action.`); }
  async markSurprised(combatant) { if (this.round > 1 || this.impulse > 1 || flag(combatant, "acted", false)) return ui.notifications.warn("Tactical surprise must be assigned before this combatant's first action."); await combatant.update({ initiative: 0, "flags.alternity2e.initiativeDegree": "Surprised", "flags.alternity2e.initiativeRoll": 0, "flags.alternity2e.initiativePriority": 0, "flags.alternity2e.nextTick": 2 }); await this.initializeSchedules(); ui.combat?.render(); }
  getModifier(actor, kind) { const combatant = this.combatantForActor(actor), modifier = combatant ? flag(combatant, "pendingModifier", null) : null; return modifier && (!modifier.kind || modifier.kind === kind) ? modifier : null; }
  targetDefenseModifier(actor) {
    const combatant = this.combatantForActor(actor); if (!combatant) return 0;
    let value = 0; if (Number(flag(combatant, "defenseUntilTick", 0)) > this.currentTick) value -= 2; if (Number(flag(combatant, "evadeUntilTick", 0)) > this.currentTick) value += Number(flag(combatant, "evadePenalty", -1)); return value;
  }
  async advanceImpulse({ skipEmpty = false } = {}) {
    const oldImpulse = this.impulse; if (oldImpulse === 8) await this.processEndRound();
    let tick = this.currentTick + 1;
    if (skipEmpty) tick = nextRelevantTick(this.currentTick, this.combatants.map(c => Number(flag(c, "nextTick", Infinity))));
    const position = positionFromTick(tick); await this.update({ round: position.round, turn: null, "flags.alternity2e.impulse": position.impulse });
    if (position.impulse === 1) await this.processStartRound(); await this.syncActors(); ui.combat?.render(); return this;
  }
  async previousImpulse() { const position = positionFromTick(Math.max(1, this.currentTick - 1)); await this.update({ round: position.round, turn: null, "flags.alternity2e.impulse": position.impulse }); await this.syncActors(); ui.combat?.render(); }
  async processEndRound() {
    const passive = this.combatants.filter(c => c.actor?.system?.play?.statuses?.some(status => ["damage-over-time", "stun"].includes(status)));
    if (passive.length) await ChatMessage.create({ content: `<strong>End of Round ${this.round}</strong><br>Resolve end-of-round effects and passive resistance for: ${passive.map(c => c.name).join(", ")}.` });
  }
  async processStartRound() {
    const dot = this.combatants.filter(c => c.actor?.system?.play?.statuses?.includes("damage-over-time"));
    if (dot.length) await ChatMessage.create({ content: `<strong>Round ${this.round}, Impulse 1</strong><br>Damage over time now deals its listed wound box to: ${dot.map(c => c.name).join(", ")}.` });
  }
  async syncActors() { await Promise.all(this.combatants.filter(c => c.actor?.isOwner).map(c => c.actor.update({ "system.play.round": this.round || 1, "system.play.impulse": this.impulse }))); }
  async nextTurn() { return this.advanceImpulse(); }
  async previousTurn() { return this.previousImpulse(); }
}

function actionButton(label, cost, action, extra = "") { return `<button type="button" data-a2e-action="${action}" data-cost="${cost}" ${extra}>${label}</button>`; }

export function registerCombatHooks() {
  Hooks.once("ready", async () => {
    for (const combat of game.combats.filter(entry => entry.started && entry instanceof AlternityCombat)) if (combat.combatants.some(entry => entry.getFlag("alternity2e", "nextTick") == null)) { await combat.initializeSchedules(); await combat.syncActors(); ui.notifications.info(`Migrated the active encounter "${combat.name || combat.id}" to the Alternity absolute impulse scheduler.`); }
  });
  Hooks.on("renderCombatTracker", (app, html) => {
    const combat = game.combat; if (!combat || html.querySelector?.(".a2e-impulse-controls")) return;
    const root = html.querySelector?.(".combat-tracker-header") || html.querySelector?.(".combat-tracker"); if (!root) return;
    const controls = document.createElement("div"); controls.className = "a2e-impulse-controls";
    controls.innerHTML = `<button type="button" data-a2e-prev title="Previous impulse"><i class="fas fa-chevron-left"></i></button><strong>Round ${combat.round || 1} · Impulse ${combat.impulse}/8</strong><button type="button" data-a2e-next title="Next impulse"><i class="fas fa-chevron-right"></i></button><button type="button" data-a2e-skip title="Skip to next scheduled action"><i class="fas fa-forward-step"></i></button>`;
    controls.querySelector("[data-a2e-prev]").addEventListener("click", () => combat.previousImpulse()); controls.querySelector("[data-a2e-next]").addEventListener("click", () => combat.advanceImpulse()); controls.querySelector("[data-a2e-skip]").addEventListener("click", () => combat.advanceImpulse({ skipEmpty: true })); root.prepend(controls);
    for (const row of html.querySelectorAll?.("[data-combatant-id]") || []) {
      const c = combat.combatants.get(row.dataset.combatantId); if (!c) continue; const next = positionFromTick(Number(flag(c, "nextTick", 1))), ready = combat.isReady(c), readied = Boolean(flag(c, "readied", false));
      row.classList.toggle("a2e-ready", ready); row.dataset.a2eNext = readied ? `${ready ? "READIED" : "READYING"} R${next.round} I${next.impulse}` : `R${next.round} I${next.impulse}`;
      if (!(game.user.isGM || c.isOwner)) continue;
      const actions = document.createElement("div"); actions.className = "a2e-tracker-actions"; actions.innerHTML = `${actionButton("Wait", 1, "nothing")}${actionButton("Move", 2, "move")}${actionButton("Skill", 3, "skill")}${actionButton("Ready", 1, "ready")}${actionButton("React", 1, "reaction")}${game.user.isGM ? actionButton("Surprise", 0, "surprise") : ""}`;
      actions.addEventListener("click", event => { const button = event.target.closest("[data-a2e-action]"); if (!button) return; const action = button.dataset.a2eAction; if (action === "ready") combat.readyAction(c); else if (action === "reaction") combat.delayNextAction(c, 1, "Reaction"); else if (action === "surprise") combat.markSurprised(c); else combat.schedule(c, Number(button.dataset.cost), { label: button.textContent.trim(), kind: action }); }); row.append(actions);
    }
  });
}

export { ACTION_COSTS };
