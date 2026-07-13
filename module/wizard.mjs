import { abilities, skills, species, archetypes, talents, gear } from "./catalogs.mjs";
import { importStandaloneCharacter } from "./interchange.mjs";
import { pointBuyCosts } from "../data/abilities.js";

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
    this.element.querySelectorAll("[data-wizard-adjust]").forEach(button => button.addEventListener("click", () => { const input = this.element.querySelector(`[name="${button.dataset.field}"]`), min = Number(input.min || 0), max = Number(input.max || 10); input.value = Math.clamp(Number(input.value || 0) + Number(button.dataset.delta || 0), min, max); input.dispatchEvent(new Event("change", { bubbles: true })); }));
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
    const abilityState = Object.fromEntries(abilities.map(row => [row.id, Number(values[`ability.${row.id}`] || 3)])), pointBuy = Object.values(abilityState).reduce((sum, score) => sum + Number(pointBuyCosts[score] ?? 999), 0), budget = Number(values.pointBuy || 12);
    if (pointBuy > budget) errors.push(`Ability point-buy exceeds the ${budget}-point budget by ${pointBuy - budget}.`);
    const selectedSpecies = species.find(row => row.id === values.species);
    for (const requirement of selectedSpecies?.requirements || []) { const actual = abilityState[requirement.ability], valid = requirement.op === ">=" ? actual >= requirement.value : actual <= requirement.value; if (!valid) errors.push(`${selectedSpecies.name} requires ${requirement.ability} ${requirement.op} ${requirement.value}.`); }
    if (ranks !== 35) errors.push(`Spend exactly 35 starting skill ranks (currently ${ranks}).`);
    for (const category of ["attack", "defensive", "technical", "social", "environmental"]) if (!skills.some(row => row.type === category && skillState[row.id].ranks >= 4)) errors.push(`Choose a rank-4 ${category} skill.`);
    if (selectedTalents.length !== 3) errors.push(`Choose exactly 3 starting talents (currently ${selectedTalents.length}).`);
    if (archetype?.id !== "freeform" && !archetype?.mandatedTalents.includes(values.mandatedTalent)) errors.push("Choose a mandated entry talent allowed by the archetype.");
    if (values.mandatedTalent && !selectedTalents.includes(values.mandatedTalent)) errors.push("The mandated talent must also be checked among selected talents.");
    const discretionary = archetype?.id === "freeform" ? selectedTalents : selectedTalents.filter(id => id !== values.mandatedTalent), constellations = discretionary.map(id => talents.find(row => row.id === id)?.constellation);
    if (new Set(constellations).size !== constellations.length) errors.push(archetype?.id === "freeform" ? "Choose starting talents from three different constellations." : "Choose the two discretionary talents from different constellations.");
    const gearRows = selectedGear.map(id => gear.find(row => row.id === id)).filter(Boolean), restrictionRank = { G: 0, R: 1, M: 2, X: 3 }, maximumRestriction = restrictionRank[values.restriction || "R"];
    if (gearRows.length !== 6 || !gearRows.some(row => row.kind === "weapon") || !gearRows.some(row => row.kind === "armor") || !gearRows.some(row => ["tool", "drone"].includes(row.kind))) errors.push("Quick-pick gear requires six items including at least one weapon, one armor, and one tool or drone.");
    for (const row of gearRows) { if (row.techEra > Number(values.techEra || 7)) errors.push(`${row.name} exceeds campaign TE ${values.techEra}.`); if (restrictionRank[row.restriction || "G"] > maximumRestriction) errors.push(`${row.name} exceeds the campaign restriction level.`); }
    if (errors.length) return ui.notifications.error(errors.join(" "));
    const character = { schemaVersion: 4, identity: { name: values.name, player: values.player || "", concept: values.concept || "", background: "", goals: "", connections: "", notes: "" }, campaign: { name: values.campaign || "", techEra: Number(values.techEra || 7), pointBuy: Number(values.pointBuy || 12), restriction: values.restriction || "R" }, level: 1, heroPoints: 1,
      abilities: abilityState, species: values.species || "human", archetype: values.archetype, mandatedTalent: values.mandatedTalent || "", talents: selectedTalents, skills: skillState, gear: selectedGear,
      wounds: { graze: 0, light: 0, moderate: 0, serious: 0, critical: 0, mortal: 0 }, play: { round: 1, impulse: 1, statuses: [], damageLog: [], lastDamage: null }, migrationHistory: [] };
    const actor = await importStandaloneCharacter(character, { actor: this.actor }); await actor.sheet.render(true); await this.close();
  }
  async #import() {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json";
    input.addEventListener("change", async () => { try { const data = JSON.parse(await input.files[0].text()); const actor = await importStandaloneCharacter(data, { actor: this.actor }); await actor.sheet.render(true); await this.close(); } catch (error) { ui.notifications.error(`Import failed: ${error.message}`); } }, { once: true }); input.click();
  }
}
