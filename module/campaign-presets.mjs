export const CAMPAIGN_PRESETS = {
  gritty: { label: "Gritty / survival", lethality: "high", ammunitionTracking: "limited", damageAuthority: "request", inventoryAuthority: "gm", buildLockDefault: true, heroicMode: "standard", tacticalAutomation: "automatic", situationalAutomation: "prompt" },
  core: { label: "Core balanced", lethality: "standard", ammunitionTracking: "abstract", damageAuthority: "owner", inventoryAuthority: "owner", buildLockDefault: true, heroicMode: "standard", tacticalAutomation: "assisted", situationalAutomation: "prompt" },
  cinematic: { label: "Cinematic heroes", lethality: "low", ammunitionTracking: "abstract", damageAuthority: "owner", inventoryAuthority: "owner", buildLockDefault: false, heroicMode: "high", tacticalAutomation: "assisted", situationalAutomation: "automatic" },
  manual: { label: "Manual tabletop", lethality: "standard", ammunitionTracking: "abstract", damageAuthority: "request", inventoryAuthority: "owner", buildLockDefault: true, heroicMode: "standard", tacticalAutomation: "manual", situationalAutomation: "manual" }
};

export async function applyCampaignPreset(id) {
  if (!game.user.isGM) throw new Error("Only a GM can apply a campaign preset.");
  const preset = CAMPAIGN_PRESETS[id]; if (!preset) throw new Error("Unknown campaign preset.");
  for (const [key, value] of Object.entries(preset)) if (key !== "label") await game.settings.set("alternity2e", key, value);
  await game.settings.set("alternity2e", "activeCampaignPreset", id); return preset;
}
