export class AlternityCombat extends Combat {
  get impulse() { return Number(this.getFlag("alternity2e", "impulse") || 1); }
  async startCombat() {
    const result = await super.startCombat();
    await this.update({ round: 1, turn: null, "flags.alternity2e.impulse": 1 });
    await this.resetSchedules();
    return result;
  }
  async resetSchedules() {
    const updates = this.combatants.map(combatant => ({ _id: combatant.id, "flags.alternity2e.nextImpulse": 1, "flags.alternity2e.acted": false }));
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
  }
  async advanceImpulse() {
    let impulse = this.impulse + 1, round = Number(this.round || 1);
    if (impulse > 8) { impulse = 1; round += 1; await this.update({ round, turn: null, "flags.alternity2e.impulse": impulse }); await this.resetSchedules(); }
    else await this.update({ turn: null, "flags.alternity2e.impulse": impulse });
    await this.syncActors();
    return this;
  }
  async previousImpulse() {
    let impulse = this.impulse - 1, round = Number(this.round || 1);
    if (impulse < 1) { impulse = 8; round = Math.max(1, round - 1); }
    await this.update({ round, turn: null, "flags.alternity2e.impulse": impulse });
    await this.syncActors();
  }
  async schedule(combatant, speed = 1) {
    const next = Math.min(9, this.impulse + Math.max(1, Number(speed) || 1));
    await combatant.update({ "flags.alternity2e.nextImpulse": next, "flags.alternity2e.acted": true });
  }
  async syncActors() {
    const updates = this.combatants.filter(c => c.actor?.isOwner).map(c => c.actor.update({ "system.play.round": this.round || 1, "system.play.impulse": this.impulse }));
    await Promise.all(updates);
  }
  async nextTurn() { return this.advanceImpulse(); }
  async previousTurn() { return this.previousImpulse(); }
}

export function registerCombatHooks() {
  Hooks.on("renderCombatTracker", (app, html) => {
    const combat = game.combat;
    if (!combat || html.querySelector?.(".a2e-impulse-controls")) return;
    const root = html.querySelector?.(".combat-tracker-header") || html.querySelector?.(".combat-tracker");
    if (!root) return;
    const controls = document.createElement("div"); controls.className = "a2e-impulse-controls";
    controls.innerHTML = `<button type="button" data-a2e-prev title="Previous impulse"><i class="fas fa-chevron-left"></i></button><strong>Round ${combat.round || 1} · Impulse ${combat.impulse}/8</strong><button type="button" data-a2e-next title="Next impulse"><i class="fas fa-chevron-right"></i></button>`;
    controls.querySelector("[data-a2e-prev]").addEventListener("click", () => combat.previousImpulse());
    controls.querySelector("[data-a2e-next]").addEventListener("click", () => combat.advanceImpulse());
    root.prepend(controls);
    for (const row of html.querySelectorAll?.("[data-combatant-id]") || []) {
      const c = combat.combatants.get(row.dataset.combatantId), next = Number(c?.getFlag("alternity2e", "nextImpulse") || 1);
      row.classList.toggle("a2e-ready", next <= combat.impulse); row.dataset.a2eNext = next > 8 ? "Next round" : `I${next}`;
    }
  });
}
