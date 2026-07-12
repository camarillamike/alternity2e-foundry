export function registerSettings() {
  game.settings.register("alternity2e", "installPrivateCatalogs", { name: "Install private Core Rulebook catalogs", hint: "Creates private world folders and source Items from the bundled personal-use catalog.", scope: "world", config: true, type: Boolean, default: false });
  game.settings.register("alternity2e", "lethality", { name: "Lethality", scope: "world", config: true, type: String, choices: { low: "Low", standard: "Standard", high: "High" }, default: "standard" });
  game.settings.register("alternity2e", "catalogVersion", { scope: "world", config: false, type: String, default: "" });
}
