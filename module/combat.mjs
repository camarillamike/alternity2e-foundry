import { stepFormula, rollDegree } from "./rules.mjs";
import { ACTION_COSTS, absoluteTick, positionFromTick, scheduleAfter, initialTick, initiativePriority, isReady, compareQueue, statusActionDelay, nextRelevantTick } from "./impulse-rules.mjs";
import { canAdvanceWorldClock, controlsActor, requireAuthority } from "./authority.mjs";
import { effectExpired } from "./trackers.mjs";

const flag = (document, key, fallback = null) => document.getFlag("alternity2e", key) ?? fallback;

export class AlternityCombat extends Combat {
  get impulse() { return Number(this.getFlag("alternity2e", "impulse") || 1); }
  get currentTick() { return absoluteTick(this.round || 1, this.impulse); }
  get readyCombatants() { return this.combatants.filter(combatant => this.isReady(combatant)).sort((a, b) => compareQueue(this.queueState(a), this.queueState(b))); }
  _sortCombatants(a, b) { return this.started ? compareQueue(this.queueState(a), this.queueState(b)) : super._sortCombatants(a, b); }
  queueState(combatant) { return { id: combatant.id, nextTick: Number(flag(combatant, "nextTick", Infinity)), sequence: Number(flag(combatant, "sequence", 0)), acted: Boolean(flag(combatant, "acted", false)) }; }
  combatantForActor(actor) { return this.combatants.find(entry => entry.actorId === actor?.id || entry.token?.actor?.id === actor?.id); }
  isReady(combatant) { return Boolean(combatant) && !combatant.defeated && !combatant.actor?.system?.derived?.incapacitated && isReady(flag(combatant, "nextTick", Infinity), this.currentTick); }
  canActNow(combatant) { return this.isReady(combatant) || Boolean(flag(combatant, "heroAction", false)); }
  async nextSequence() { const value = Number(this.getFlag("alternity2e", "sequenceCounter") || 0) + 1; await this.setFlag("alternity2e", "sequenceCounter", value); return value; }
  async appendEncounterLog(type, combatant = null, details = {}) { const entry = { date: new Date().toISOString(), round: this.round || 1, impulse: this.impulse, tick: this.currentTick, type, combatantId: combatant?.id || "", actorId: combatant?.actorId || "", name: combatant?.name || "", ...details }, log = [...(this.getFlag("alternity2e", "encounterLog") || []), entry].slice(-500); await this.setFlag("alternity2e", "encounterLog", log); return entry; }
  exportEncounterLog() { if (!requireAuthority(game.user.isGM, "Only the GM can export the encounter log.")) return; const data = { system: "alternity2e", version: game.system.version, combatId: this.id, name: this.name, exported: new Date().toISOString(), round: this.round, impulse: this.impulse, entries: this.getFlag("alternity2e", "encounterLog") || [] }; foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", `${this.name || "alternity-encounter"}-log.json`); }

  async startCombat() {
    if (!requireAuthority(canAdvanceWorldClock(), "Only the GM can start the encounter clock.")) return this;
    const result = await super.startCombat();
    await this.update({ round: 1, turn: null, "flags.alternity2e.impulse": 1, "flags.alternity2e.sequenceCounter": 0, "flags.alternity2e.encounterLog": [] });
    await this.initializeSchedules(); await this.syncActors(); await this.appendEncounterLog("start", null, { combatants: this.combatants.size }); return result;
  }
  async endCombat() { if (!requireAuthority(canAdvanceWorldClock(), "Only the GM can end an encounter.")) return this; await this.resolveSpecialAmmunition(); await this.appendEncounterLog("end"); return super.endCombat(); }
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
    const requested = new Set(Array.isArray(ids) ? ids : [ids]), selected = this.combatants.filter(entry => requested.has(entry.id)), groups = new Map(), updates = [];
    for (const combatant of selected) { const group = combatant.actor?.type === "npc" ? combatant.actor.system.npc.initiativeGroup : ""; const key = group ? `npc:${group}` : `combatant:${combatant.id}`; if (!groups.has(key)) groups.set(key, group ? this.combatants.filter(entry => entry.actor?.type === "npc" && entry.actor.system.npc.initiativeGroup === group) : [combatant]); }
    for (const [key, members] of groups) {
      const actor = members[0]?.actor; if (!actor) continue;
      const target = actor.system.derived.initiative.target, steps = actor.system.derived.initiative.steps, roll = await new Roll(stepFormula(steps)).evaluate(), degree = rollDegree(roll.total, target), priority = initiativePriority(degree, roll.total);
      for (const combatant of members) updates.push({ _id: combatant.id, initiative: priority, "flags.alternity2e.initiativeDegree": degree, "flags.alternity2e.initiativeRoll": roll.total, "flags.alternity2e.initiativePriority": priority, "flags.alternity2e.nextTick": initialTick(degree) });
      const label = key.startsWith("npc:") ? `${actor.system.npc.initiativeGroup} group` : actor.name;
      await roll.toMessage({ ...messageOptions, rollMode: actor.type === "hero" ? messageOptions.rollMode : game.settings.get("alternity2e", "npcRollMode"), speaker: ChatMessage.getSpeaker({ actor }), flavor: `<strong>${label} Initiative</strong><br>Target ${target}; ${steps >= 0 ? "+" : ""}${steps} steps<br><b>${degree}</b> - first action Impulse ${initialTick(degree)}` });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    await this.initializeSchedules(); return this;
  }
  async schedule(combatant, baseCost = 1, { label = "Action", kind = "action", ignoreModifier = false } = {}) {
    if (!combatant) return ui.notifications.warn("This Actor is not in the active encounter.");
    if (!requireAuthority(controlsActor(combatant.actor), `You do not control ${combatant.name}.`)) return;
    const heroAction = Boolean(flag(combatant, "heroAction", false));
    if (!heroAction && !this.isReady(combatant)) return ui.notifications.warn(`${combatant.name} is not ready to act in this impulse.`);
    const pending = ignoreModifier ? null : flag(combatant, "pendingModifier", null), modifier = pending && (!pending.kind || pending.kind === kind) ? pending : null, statuses = combatant.actor?.system?.play?.statuses || [], statusDelay = statusActionDelay(statuses, kind);
    if (kind === "totalDefense" && modifier?.id === "evade") return ui.notifications.warn("Total Defense cannot be combined with Evade.");
    const reactionDelay = flag(combatant, "readied", false) ? 1 : 0, cost = heroAction ? 1 : Math.max(1, Number(baseCost) + Number(modifier?.delay || 0) + statusDelay + reactionDelay), nextTick = scheduleAfter(this.currentTick, cost), sequence = await this.nextSequence(), speed = Number(combatant.actor?.system?.derived?.speed || 0), movementAllowance = modifier?.id === "charge" ? speed / 2 : kind === "move" ? speed : ["attack", "skill", "reposition"].includes(kind) ? 2 : 0, actionText = `${heroAction ? "Hero Point: " : ""}${label} (${cost} impulse${cost === 1 ? "" : "s"}${movementAllowance ? `; move up to ${movementAllowance} m` : ""})`;
    const update = { "flags.alternity2e.nextTick": nextTick, "flags.alternity2e.sequence": sequence, "flags.alternity2e.acted": true, "flags.alternity2e.readied": false, "flags.alternity2e.readyTrigger": "", "flags.alternity2e.heroAction": false, "flags.alternity2e.lastAction": actionText, "flags.alternity2e.movementAllowance": movementAllowance, "flags.alternity2e.pendingModifier": modifier ? null : pending };
    if (kind === "totalDefense") update["flags.alternity2e.defenseUntilTick"] = nextTick;
    if (modifier?.id === "evade") { update["flags.alternity2e.evadeUntilTick"] = nextTick; update["flags.alternity2e.evadePenalty"] = Number(modifier.defensePenalty || -1); }
    await combatant.update(update); await this.appendEncounterLog("action", combatant, { label, kind, cost, nextTick, movementAllowance, modifier: modifier?.id || "", heroAction }); ui.combat?.render(); return { cost, nextTick, movementAllowance, ...positionFromTick(nextTick) };
  }
  async delayNextAction(combatant, amount = 1, label = "Reaction") {
    if (!requireAuthority(controlsActor(combatant?.actor), `You do not control ${combatant?.name || "that combatant"}.`)) return;
    if (label === "Reaction" && combatant?.actor?.system?.play?.statuses?.includes("stun")) return ui.notifications.warn(`${combatant.name} cannot react while stunned.`);
    if (!combatant) return; const current = Math.max(this.currentTick, Number(flag(combatant, "nextTick", this.currentTick))), nextTick = current + Math.max(1, Number(amount)), sequence = await this.nextSequence();
    await combatant.update({ "flags.alternity2e.nextTick": nextTick, "flags.alternity2e.sequence": sequence, "flags.alternity2e.lastAction": `${label} (+${amount} impulse delay)` }); await this.appendEncounterLog("delay", combatant, { label, amount, nextTick }); ui.combat?.render();
  }
  async readyAction(combatant, trigger = "Declared trigger") {
    if (!this.isReady(combatant)) return ui.notifications.warn(`${combatant?.name || "Combatant"} is not ready to act.`);
    const statuses = combatant.actor?.system?.play?.statuses || [], cost = 1 + statusActionDelay(statuses, "ready"), sequence = await this.nextSequence(); await combatant.update({ "flags.alternity2e.nextTick": this.currentTick + cost, "flags.alternity2e.sequence": sequence, "flags.alternity2e.acted": true, "flags.alternity2e.readied": true, "flags.alternity2e.readyTrigger": trigger, "flags.alternity2e.lastAction": `Readied: ${trigger} (${cost} impulse${cost === 1 ? "" : "s"})` }); await this.appendEncounterLog("ready", combatant, { trigger, cost }); ui.combat?.render();
  }
  async setModifier(combatant, modifier) { if (!requireAuthority(controlsActor(combatant?.actor), `You do not control ${combatant?.name || "that combatant"}.`)) return; if (!this.isReady(combatant)) return ui.notifications.warn(`${combatant?.name || "Combatant"} is not ready to act.`); if (modifier.id === "evade" && Number(flag(combatant, "defenseUntilTick", 0)) > this.currentTick) return ui.notifications.warn("Evade cannot be combined with Total Defense."); if (modifier.id === "evade") { const ranks = Number(combatant.actor?.getSkill?.("dodge")?.system.ranks || 0); modifier = { ...modifier, defensePenalty: ranks >= 10 ? -3 : ranks >= 5 ? -2 : -1 }; } await combatant.update({ "flags.alternity2e.pendingModifier": modifier }); ui.notifications.info(`${combatant.name}: ${modifier.label} selected for the next applicable action.`); }
  async markSurprised(combatant) { if (!requireAuthority(game.user.isGM, "Only the GM can assign tactical surprise.")) return; if (this.round > 1 || this.impulse > 1 || flag(combatant, "acted", false)) return ui.notifications.warn("Tactical surprise must be assigned before this combatant's first action."); await combatant.update({ initiative: 0, "flags.alternity2e.initiativeDegree": "Surprised", "flags.alternity2e.initiativeRoll": 0, "flags.alternity2e.initiativePriority": 0, "flags.alternity2e.nextTick": 2 }); await this.initializeSchedules(); ui.combat?.render(); }
  getModifier(actor, kind) { const combatant = this.combatantForActor(actor), modifier = combatant ? flag(combatant, "pendingModifier", null) : null; return modifier && (!modifier.kind || modifier.kind === kind) ? modifier : null; }
  targetDefenseState(actor) {
    const combatant = this.combatantForActor(actor); if (!combatant) return { totalDefense: 0, evade: 0 };
    return {
      totalDefense: Number(flag(combatant, "defenseUntilTick", 0)) > this.currentTick ? -2 : 0,
      evade: Number(flag(combatant, "evadeUntilTick", 0)) > this.currentTick ? Number(flag(combatant, "evadePenalty", -1)) : 0
    };
  }
  targetDefenseModifier(actor) { const state = this.targetDefenseState(actor); return Number(state?.totalDefense || 0) + Number(state?.evade || 0); }
  resistanceModifier(actor) { const combatant = this.combatantForActor(actor); return combatant && Number(flag(combatant, "defenseUntilTick", 0)) > this.currentTick ? 2 : 0; }
  async advanceImpulse({ skipEmpty = false } = {}) {
    if (!requireAuthority(canAdvanceWorldClock(), "Only the GM can advance the encounter clock.")) return this;
    const oldImpulse = this.impulse; if (oldImpulse === 8) await this.processEndRound();
    let tick = this.currentTick + 1;
    if (skipEmpty) tick = nextRelevantTick(this.currentTick, this.combatants.map(c => Number(flag(c, "nextTick", Infinity))));
    const position = positionFromTick(tick); await this.update({ round: position.round, turn: null, "flags.alternity2e.impulse": position.impulse }); await this.appendEncounterLog("clock", null, { toRound: position.round, toImpulse: position.impulse });
    if (position.impulse === 1) await this.processStartRound(); await this.processTimedEffects(tick); await this.syncActors(); ui.combat?.render(); return this;
  }
  async previousImpulse() { if (!requireAuthority(canAdvanceWorldClock(), "Only the GM can rewind the encounter clock.")) return this; const position = positionFromTick(Math.max(1, this.currentTick - 1)); await this.update({ round: position.round, turn: null, "flags.alternity2e.impulse": position.impulse }); await this.appendEncounterLog("rewind", null, { toRound: position.round, toImpulse: position.impulse }); await this.syncActors(); ui.combat?.render(); }
  async processEndRound() {
    const passive = this.combatants.filter(c => c.actor?.system?.play?.effects?.some(effect => effect.resistMode === "passive"));
    for (const combatant of passive) for (const effect of combatant.actor.system.play.effects.filter(entry => entry.resistMode === "passive")) await combatant.actor.resistEffect(effect.id, { passive: true });
    if (passive.length) await ChatMessage.create({ content: `<strong>End of Round ${this.round}</strong><br>Resolved passive resistance for: ${passive.map(c => c.name).join(", ")}.` });
  }
  async processStartRound() {
    const dot = this.combatants.filter(c => c.actor?.system?.play?.effects?.some(effect => effect.status === "damage-over-time"));
    const damage = { graze: 1, light: 4, moderate: 7, serious: 10, critical: 13, mortal: 16 };
    for (const combatant of dot) for (const effect of combatant.actor.system.play.effects.filter(entry => entry.status === "damage-over-time")) await combatant.actor.applyDamage(damage[effect.damageSeverity] || 4, "other");
    if (dot.length) await ChatMessage.create({ content: `<strong>Round ${this.round}, Impulse 1</strong><br>Resolved damage over time for: ${dot.map(c => c.name).join(", ")}.` });
  }
  async processTimedEffects(tick) { for (const combatant of this.combatants.filter(entry => entry.actor)) { const actor = combatant.actor, effects = actor.system.play.effects.filter(effect => !effectExpired(effect, tick)); if (effects.length !== actor.system.play.effects.length) { const removedStatuses = new Set(actor.system.play.effects.filter(effect => effectExpired(effect, tick)).map(effect => effect.status)), statuses = actor.system.play.statuses.filter(status => !removedStatuses.has(status) || effects.some(effect => effect.status === status)); await actor.update({ "system.play.effects": effects, "system.play.statuses": statuses }); } const mortality = actor.system.play.mortality; if (mortality.active && mortality.interval === "3 impulses" && Number(mortality.nextTick || 0) <= tick) await actor.rollMortality(); } }
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
    controls.innerHTML = `${game.user.isGM ? `<button type="button" data-a2e-prev title="Previous impulse"><i class="fas fa-chevron-left"></i></button>` : ""}<strong>Round ${combat.round || 1} · Impulse ${combat.impulse}/8</strong>${game.user.isGM ? `<button type="button" data-a2e-next title="Next impulse"><i class="fas fa-chevron-right"></i></button><button type="button" data-a2e-skip title="Skip to next scheduled action"><i class="fas fa-forward-step"></i></button><button type="button" data-a2e-export-log title="Export encounter log"><i class="fas fa-file-export"></i></button>` : ""}`;
    controls.querySelector("[data-a2e-prev]")?.addEventListener("click", () => combat.previousImpulse()); controls.querySelector("[data-a2e-next]")?.addEventListener("click", () => combat.advanceImpulse()); controls.querySelector("[data-a2e-skip]")?.addEventListener("click", () => combat.advanceImpulse({ skipEmpty: true })); controls.querySelector("[data-a2e-export-log]")?.addEventListener("click", () => combat.exportEncounterLog()); root.prepend(controls);
    for (const row of html.querySelectorAll?.("[data-combatant-id]") || []) {
      const c = combat.combatants.get(row.dataset.combatantId); if (!c) continue; const next = positionFromTick(Number(flag(c, "nextTick", 1))), ready = combat.isReady(c), readied = Boolean(flag(c, "readied", false));
      row.classList.toggle("a2e-ready", ready); row.dataset.a2eNext = readied ? `${ready ? "READIED" : "READYING"} R${next.round} I${next.impulse}: ${flag(c, "readyTrigger", "trigger")}` : `R${next.round} I${next.impulse}`;
      if (!(game.user.isGM || c.isOwner)) continue;
      const actions = document.createElement("div"); actions.className = "a2e-tracker-actions"; actions.innerHTML = `${actionButton("Wait", 1, "nothing")}${actionButton("Move", 2, "move")}${actionButton("Skill", 3, "skill")}${actionButton("Ready", 1, "ready")}${actionButton("React", 1, "reaction")}${game.user.isGM ? actionButton("Surprise", 0, "surprise") : ""}`;
      actions.addEventListener("click", event => { const button = event.target.closest("[data-a2e-action]"); if (!button) return; const action = button.dataset.a2eAction; if (action === "ready") combat.readyAction(c); else if (action === "reaction") combat.delayNextAction(c, 1, "Reaction"); else if (action === "surprise") combat.markSurprised(c); else combat.schedule(c, Number(button.dataset.cost), { label: button.textContent.trim(), kind: action }); }); row.append(actions);
    }
  });
}

export { ACTION_COSTS };
