const feature = (id, name, family, description, requires = {}, effect = {}) => ({
  id, name, target: "weapon", family, classIncrease: 0, freeFeature: true, page: family === "melee" ? 107 : 110,
  description, summary: description, requires, effect
});

export const weaponCustomizations = [
  feature("custom-melee-concealable", "Custom Feature: Concealable", "melee", "One-handed weapons grant +2 steps on Misdirection checks to conceal them; two-handed weapons grant +1 step.", { melee: true }, { situational: "conceal", oneHandedSteps: 2, twoHandedSteps: 1 }),
  feature("custom-melee-intimidating", "Custom Feature: Intimidating", "melee", "Gain +1 step on Coercion checks while brandishing the weapon and threatening violence.", { melee: true }, { situational: "brandish", coercionSteps: 1 }),
  feature("custom-melee-throwable", "Custom Feature: Throwable", "melee", "A one-handed melee weapon can be thrown at an enemy within Close range (up to 20 m).", { melee: true, notTwoHanded: true }, { addSpecial: "Throwable" }),
  feature("custom-melee-high-penetration", "Custom Feature: High-Penetration", "melee", "The weapon gains AP 1. This cannot be combined with a weapon that already has AP.", { melee: true, notAP: true }, { addSpecial: "AP 1" }),
  feature("custom-melee-electro-pulse", "Custom Feature: Electro-Pulse", "melee", "TE 7+. When switched on, the weapon has Stun against robots, drones, and other construct enemies. Switching it takes 1 impulse.", { melee: true, campaignTechEra: 7 }, { toggle: "electroPulse", addSpecialWhenActive: "Stun vs constructs" }),
  feature("custom-melee-energy-emitter", "Custom Feature: Energy Emitter", "melee", "TE 8+. An otherwise TE 5-or-earlier weapon can deal energy instead of physical damage. Switching it takes 1 impulse.", { melee: true, campaignTechEra: 8, maximumWeaponTechEra: 5 }, { toggle: "energyEmitter", damageTypeWhenActive: "energy" }),
  feature("custom-melee-returning", "Custom Feature: Returning", "melee", "TE 8+. Replaces Throwable on a TE 5-or-earlier melee weapon. It can be thrown even if two-handed and returns during the final impulse of the attack action.", { melee: true, campaignTechEra: 8, maximumWeaponTechEra: 5 }, { replaceSpecial: "Throwable", addSpecial: "Returning" }),
  feature("custom-melee-field-disruption", "Custom Feature: Field Disruption", "melee", "TE 9+. Gain AP 1 against enemies whose armor shields against energy attacks.", { melee: true, campaignTechEra: 9 }, { situational: "energyShield", armorPenetration: 1 }),
  feature("custom-gun-concealable", "Custom Feature: Concealable", "gun", "Gain +1 step on Misdirection checks to avoid the gun drawing attention.", { gun: true }, { situational: "conceal", steps: 1 }),
  feature("custom-gun-high-capacity", "Custom Feature: High Capacity", "gun", "Increase the gun's magazine rating by 50 percent.", { gun: true, magazine: true }, { magazineMultiplier: 1.5 }),
  feature("custom-gun-intimidating", "Custom Feature: Intimidating", "gun", "Gain +1 step on Coercion checks while brandishing the gun.", { gun: true }, { situational: "brandish", coercionSteps: 1 }),
  feature("custom-gun-magnification-scope", "Custom Feature: Magnification Scope", "gun", "When aiming, reduce the range penalty by one step.", { gun: true }, { aimRangeSteps: 1 }),
  feature("custom-gun-silencer", "Custom Feature: Silencer", "gun", "TE 5+. Enemies take a -2 step penalty to identify the source of a shot unless it is obvious.", { gun: true, campaignTechEra: 5 }, { situational: "identifyShot", observerSteps: -2 }),
  feature("custom-gun-biometric-lock", "Custom Feature: Biometric Lock", "gun", "TE 6+. Only the owner can fire the gun. Cracking it with Security takes 1 hour/1 minute/3 impulses on Average/Excellent/Stellar success.", { gun: true, campaignTechEra: 6 }, { biometricLock: true }),
  feature("custom-gun-grenade-launcher", "Custom Feature: Grenade Launcher", "gun", "TE 6+, rifles only. Add an under-barrel grenade launcher with capacity 1 and Reload 2.", { rifle: true, campaignTechEra: 6 }, { underbarrelLauncher: true }),
  feature("custom-gun-laser-sight", "Custom Feature: Laser Sight", "gun", "TE 6+. Gain +1 step against targets at Close range unless they are actively dodging.", { gun: true, campaignTechEra: 6 }, { laserSight: true })
];
