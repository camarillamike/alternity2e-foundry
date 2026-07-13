export function registerRuntimeHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll?.("[data-alternity-damage]").forEach(button => button.addEventListener("click", async () => {
      const fixedTarget = button.dataset.targetTokenId ? canvas.tokens?.get(button.dataset.targetTokenId) : null, targets = fixedTarget ? [fixedTarget] : [...game.user.targets]; if (!targets.length) return ui.notifications.warn("Target at least one token first.");
      for (const token of targets) if (token.actor?.applyDamage) await token.actor.applyDamage(Number(button.dataset.alternityDamage), button.dataset.damageType, { woundHits: Number(button.dataset.woundHits || 1), armorPenetration: Number(button.dataset.armorPenetration || 0), armorBonus: Number(button.dataset.armorBonus || 0) });
    }));
  });
  Hooks.on("getActorDirectoryEntryContext", (html, options) => options.push({
    name: "Export Alternity Character", icon: '<i class="fas fa-file-export"></i>', condition: li => game.actors.get(li.dataset.entryId)?.type === "hero",
    callback: li => { const actor = game.actors.get(li.dataset.entryId), data = game.alternity2e.exportStandaloneCharacter(actor); foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", `${actor.name}.alternity.json`); }
  }));
  Hooks.on("getActorDirectoryHeaderButtons", (app, buttons) => buttons.unshift({ label: "Create Hero", class: "a2e-create-hero", icon: "fas fa-list-check", onclick: () => game.alternity2e.openCreationWizard() }));
}
