export function registerSettings() {
  game.settings.register("alternity2e", "installPrivateCatalogs", { name: "Install Core Rulebook compendiums", hint: "Builds categorized world compendiums from the bundled personal-use rulebook catalog when the world opens.", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register("alternity2e", "lethality", { name: "Lethality", scope: "world", config: true, type: String, choices: { low: "Low", standard: "Standard", high: "High" }, default: "standard" });
  game.settings.register("alternity2e", "ammunitionTracking", { name: "Ordinary ammunition reserves", hint: "Loaded ammunition is always tracked. Abstract reserves allow ordinary reloads whenever ammunition is reasonably available; Limited reserves also track spare magazines, cells, shells, and warheads.", scope: "world", config: true, type: String, choices: { abstract: "Abstract reserves (recommended)", limited: "Limited reserves" }, default: "abstract" });
  game.settings.register("alternity2e", "catalogVersion", { scope: "world", config: false, type: String, default: "" });
}
