import { CAMPAIGN_PRESETS, applyCampaignPreset } from "./campaign-presets.mjs";
import { refreshCompendiums } from "./catalogs.mjs";
import { refreshActorCompendiums } from "./craft-catalogs.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class AlternityGMDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "alternity-gm-dashboard", classes: ["alternity2e", "gm-dashboard"], position: { width: 720, height: 620 }, window: { title: "Alternity 2e GM Configuration" } };
  static PARTS = { main: { template: "systems/alternity2e/templates/gm-dashboard.hbs" } };
  async _prepareContext(options) { const context = await super._prepareContext(options); return foundry.utils.mergeObject(context, { presets: Object.entries(CAMPAIGN_PRESETS).map(([id, preset]) => ({ id, ...preset, active: game.settings.get("alternity2e", "activeCampaignPreset") === id })), settings: { lethality: game.settings.get("alternity2e", "lethality"), ammunition: game.settings.get("alternity2e", "ammunitionTracking"), tactical: game.settings.get("alternity2e", "tacticalAutomation"), situational: game.settings.get("alternity2e", "situationalAutomation") } }, { inplace: false }); }
  async _onRender(context, options) { await super._onRender(context, options); this.element.querySelectorAll("[data-apply-preset]").forEach(button => button.addEventListener("click", async () => { const preset = await applyCampaignPreset(button.dataset.applyPreset); ui.notifications.info(`Applied ${preset.label} campaign preset.`); this.render({ force: true }); })); this.element.querySelector("[data-rebuild-all]")?.addEventListener("click", async () => { const items = await refreshCompendiums(), actors = await refreshActorCompendiums(); await game.settings.set("alternity2e", "catalogVersion", game.system.version); ui.notifications.info(`Rebuilt ${items} Item and ${actors} Actor compendiums.`); }); }
}
