import { applyOrRequestDamage, approveDamageButton, damagePacket, registerAuthoritySocket, resolveBlastButton } from "./requests.mjs";

export function registerRuntimeHooks() {
  Hooks.once("ready", registerAuthoritySocket);
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll?.("[data-alternity-damage]").forEach(button => button.addEventListener("click", async () => {
      const fixedTarget = button.dataset.targetTokenId ? canvas.tokens?.get(button.dataset.targetTokenId) : null, targets = fixedTarget ? [fixedTarget] : [...game.user.targets]; if (!targets.length) return ui.notifications.warn("Target at least one token first.");
      for (const token of targets) if (token.actor?.applyDamage) await applyOrRequestDamage(token.actor, damagePacket(button));
    }));
    html.querySelectorAll?.("[data-a2e-approve-damage]").forEach(button => button.addEventListener("click", () => approveDamageButton(button)));
    html.querySelectorAll?.("[data-a2e-resolve-blast]").forEach(button => button.addEventListener("click", () => resolveBlastButton(button)));
    html.querySelectorAll?.("[data-a2e-deny-damage]").forEach(button => button.addEventListener("click", () => { button.closest(".a2e-damage-request")?.remove(); }));
  });
  Hooks.on("getActorDirectoryEntryContext", (html, options) => options.push({
    name: "Export Alternity Character", icon: '<i class="fas fa-file-export"></i>', condition: li => game.actors.get(li.dataset.entryId)?.type === "hero",
    callback: li => { const actor = game.actors.get(li.dataset.entryId), data = game.alternity2e.exportStandaloneCharacter(actor); foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", `${actor.name}.alternity.json`); }
  }));
  Hooks.on("getActorDirectoryHeaderButtons", (app, buttons) => { if (game.user.can("ACTOR_CREATE")) buttons.unshift({ label: "Create Hero", class: "a2e-create-hero", icon: "fas fa-list-check", onclick: () => game.alternity2e.openCreationWizard() }); if (game.user.isGM) { buttons.unshift({ label: "Milestone", class: "a2e-milestone", icon: "fas fa-star", onclick: async () => { for (const actor of game.actors.filter(entry => entry.type === "hero")) await actor.awardHeroPoint(1, "Adventure milestone"); ui.notifications.info("Awarded one Hero Point to every hero."); } }); buttons.unshift({ label: "New Adventure", class: "a2e-new-adventure", icon: "fas fa-flag", onclick: async () => { const value = game.settings.get("alternity2e", "heroicMode") === "high" ? 5 : 1; for (const actor of game.actors.filter(entry => entry.type === "hero")) await actor.update({ "system.heroPoints": value, "system.play.heroPointLog": [{ date: new Date().toISOString(), effect: "adventureStart", amount: value }, ...actor.system.play.heroPointLog] }); ui.notifications.info(`Reset hero pools to ${value} for the new adventure.`); } }); } });
  Hooks.on("renderTokenHUD", (app, html, data) => {
    if (!game.user.isGM) return; const token = canvas.tokens?.get(data._id || data.id); if (!token || html.querySelector?.(".a2e-token-tactics")) return;
    const controls = document.createElement("div"); controls.className = "a2e-token-tactics"; controls.innerHTML = `<label>Cover <select data-a2e-cover>${[0,25,50,75,90,100].map(value => `<option value="${value}" ${Number(token.document.getFlag("alternity2e", "cover") || 0) === value ? "selected" : ""}>${value}%</option>`).join("")}</select></label><label><input type="checkbox" data-a2e-soft-cover ${token.document.getFlag("alternity2e", "softCover") ? "checked" : ""}> Soft</label><label>Size <select data-a2e-size>${[[2,"Huge"],[1,"Large"],[0,"Average"],[-1,"Small"],[-2,"Tiny"]].map(([value,label]) => `<option value="${value}" ${Number(token.document.getFlag("alternity2e", "sizeSteps") || 0) === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>`;
    controls.querySelector("[data-a2e-cover]").addEventListener("change", event => token.document.setFlag("alternity2e", "cover", Number(event.target.value))); controls.querySelector("[data-a2e-soft-cover]").addEventListener("change", event => token.document.setFlag("alternity2e", "softCover", event.target.checked)); controls.querySelector("[data-a2e-size]").addEventListener("change", event => token.document.setFlag("alternity2e", "sizeSteps", Number(event.target.value))); html.append(controls);
  });
}
