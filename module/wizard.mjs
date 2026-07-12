import { abilities, skills, species, archetypes, talents, gear } from "./catalogs.mjs";
import { importStandaloneCharacter } from "./interchange.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AlternityCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "alternity-creation-wizard", classes: ["alternity2e", "creation-wizard"], position: { width: 900, height: 760 }, window: { title: "Alternity Hero Creation" } };
  static PARTS = { main: { template: "systems/alternity2e/templates/creation-wizard.hbs" } };
  constructor({ actor = null } = {}, options = {}) { super(options); this.actor = actor; this.step = 0; }
  async _prepareContext(options) {
    const context = await super._prepareContext(options), s = this.actor?.system;
    return foundry.utils.mergeObject(context, {
      actor: this.actor, steps: ["Campaign", "Identity", "Abilities", "Origin", "Skills", "Talents", "Gear", "Review"], currentStep: this.step,
      abilities: abilities.map(row => ({ ...row, value: s?.abilities?.[row.id] ?? 3 })), species, archetypes,
      skillGroups: Object.entries(skills.reduce((all, row) => ((all[row.type] ??= []).push(row), all), {})).map(([name, rows]) => ({ name, rows })),
      talentRoots: talents.filter(row => row.entry), gearGroups: Object.entries(gear.reduce((all, row) => ((all[row.category || row.kind] ??= []).push(row), all), {})).map(([name, rows]) => ({ name, rows })),
      selectedSpecies: s?.speciesId || "human", selectedArchetype: s?.archetypeId || "", selectedMandated: s?.mandatedTalentId || ""
    }, { inplace: false });
  }
  async _onRender(context, options) {
    await super._onRender(context, options); this.#showStep();
    this.element.querySelector("[data-wizard-back]")?.addEventListener("click", () => { this.step = Math.max(0, this.step - 1); this.#showStep(); });
    this.element.querySelector("[data-wizard-next]")?.addEventListener("click", () => { this.step = Math.min(7, this.step + 1); this.#showStep(); });
    this.element.querySelector("[data-wizard-finish]")?.addEventListener("click", () => this.#finish());
    this.element.querySelector("[data-wizard-import]")?.addEventListener("click", () => this.#import());
  }
  #showStep() {
    this.element.querySelectorAll("[data-wizard-step]").forEach(node => node.hidden = Number(node.dataset.wizardStep) !== this.step);
    this.element.querySelectorAll("[data-step-label]").forEach((node, index) => node.classList.toggle("active", index === this.step));
    const back = this.element.querySelector("[data-wizard-back]"), next = this.element.querySelector("[data-wizard-next]"), finish = this.element.querySelector("[data-wizard-finish]");
    if (back) back.disabled = this.step === 0; if (next) next.hidden = this.step === 7; if (finish) finish.hidden = this.step !== 7;
  }
  #values() { return Object.fromEntries(new FormData(this.element.querySelector("form")).entries()); }
  async #finish() {
    const values = this.#values(), selectedTalents = [...this.element.querySelectorAll("[name=talents]:checked")].map(x => x.value), selectedGear = [...this.element.querySelectorAll("[name=gear]:checked")].map(x => x.value);
    const skillState = Object.fromEntries(skills.map(row => [row.id, { ranks: Number(values[`skill.${row.id}`] || 0), keyAbility: row.ability[0] === "any" ? "intelligence" : row.ability[0], specialties: [] }]));
    const ranks = Object.values(skillState).reduce((sum, state) => sum + state.ranks, 0), archetype = archetypes.find(row => row.id === values.archetype);
    const errors = [];
    if (!String(values.name || "").trim()) errors.push("Enter a character name.");
    if (!archetype) errors.push("Choose an archetype.");
    if (ranks !== 35) errors.push(`Spend exactly 35 starting skill ranks (currently ${ranks}).`);
    for (const category of ["attack", "defensive", "technical", "social", "environmental"]) if (!skills.some(row => row.type === category && skillState[row.id].ranks >= 4)) errors.push(`Choose a rank-4 ${category} skill.`);
    if (selectedTalents.length !== 3) errors.push(`Choose exactly 3 starting talents (currently ${selectedTalents.length}).`);
    if (archetype?.id !== "freeform" && !archetype?.mandatedTalents.includes(values.mandatedTalent)) errors.push("Choose a mandated entry talent allowed by the archetype.");
    if (values.mandatedTalent && !selectedTalents.includes(values.mandatedTalent)) errors.push("The mandated talent must also be checked among selected talents.");
    if (errors.length) return ui.notifications.error(errors.join(" "));
    const character = { schemaVersion: 4, identity: { name: values.name, player: values.player || "", concept: values.concept || "", background: "", goals: "", connections: "", notes: "" }, campaign: { name: values.campaign || "", techEra: Number(values.techEra || 7), pointBuy: Number(values.pointBuy || 12), restriction: values.restriction || "R" }, level: 1, heroPoints: 1,
      abilities: Object.fromEntries(abilities.map(row => [row.id, Number(values[`ability.${row.id}`] || 3)])), species: values.species || "human", archetype: values.archetype, mandatedTalent: values.mandatedTalent || "", talents: selectedTalents, skills: skillState, gear: selectedGear,
      wounds: { graze: 0, light: 0, moderate: 0, serious: 0, critical: 0, mortal: 0 }, play: { round: 1, impulse: 1, statuses: [], damageLog: [], lastDamage: null }, migrationHistory: [] };
    const actor = await importStandaloneCharacter(character, { actor: this.actor }); await actor.sheet.render(true); await this.close();
  }
  async #import() {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json";
    input.addEventListener("change", async () => { try { const data = JSON.parse(await input.files[0].text()); const actor = await importStandaloneCharacter(data, { actor: this.actor }); await actor.sheet.render(true); await this.close(); } catch (error) { ui.notifications.error(`Import failed: ${error.message}`); } }, { once: true }); input.click();
  }
}
