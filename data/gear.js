import {gearDescriptions} from './gear-descriptions.js';
const weapon=(id,name,techEra,itemClass,type,range,speed,damage,damageType,special=[],mass=0,restriction='G')=>({id,name,kind:'weapon',category:'weapon',techEra,class:itemClass,restriction,type,range,speed,damage,damageType,special,mass,page:107});
const armor=(id,name,techEra,itemClass,move,penalty,physical,energy,special=[],mass=0,restriction='G')=>({id,name,kind:'armor',techEra,class:itemClass,restriction,move,penalty,physical,energy,special,mass,page:118});
const tool=(id,name,techEra,itemClass,keySkill,mass=0,restriction='G')=>({id,name,kind:'tool',techEra,class:itemClass,restriction,keySkill,mass,page:124});
const drone=(id,name,techEra,itemClass,restriction,stats,description,massText='—')=>({id,name,kind:'drone',category:'Drones',techEra,class:itemClass,restriction,stats,description,massText,mass:Number.parseFloat(massText)||0,page:130});

export const gear=[
 // Melee and hand-to-hand, pp. 107-108.
 weapon('club','Club',1,1,'blunt','Adjacent',3,'1d4+0/3','physical',['Nonlethal','+1 damage if two-handed'],2),
 weapon('spear','Spear',1,1,'bladed','Adjacent',3,'1d6+1/5','physical',['Two-Handed','Throwable'],3),
 weapon('knife','Knife',2,1,'bladed','Adjacent',3,'1d4+1/4','physical',[],0.5),
 weapon('short-sword','Short Sword',2,2,'bladed','Adjacent',3,'1d6+1/5','physical',[],1),
 weapon('polearm','Polearm',3,1,'bladed','Adjacent',4,'1d6+1/5','physical',['Two-Handed','AP 1'],4),
 weapon('long-sword','Long Sword',3,2,'bladed','Adjacent',3,'1d6+1/5','physical',['+1 damage if two-handed'],2),
 weapon('mace','Mace',3,1,'blunt','Adjacent',4,'1d6+0/4','physical',['+1 damage if two-handed'],2),
 weapon('bayonet','Bayonet',4,1,'bladed','Adjacent',4,'1d6+1/5','physical',['Two-Handed'],1),
 weapon('combat-knife','Combat Knife',5,1,'bladed','Adjacent',3,'1d6+1/5','physical',[],0.5),
 weapon('tactical-baton','Tactical Baton',5,1,'blunt','Adjacent',3,'1d4+0/4','physical',['Nonlethal'],1),
 weapon('stun-gun','Stun Gun',6,2,'powered','Adjacent',3,'1d6+0/2','energy',['Stun','Nonlethal'],0.5),
 weapon('shock-glove','Shock Glove',7,2,'brawl','Adjacent',4,'1d6+2/3','energy',['Stun','Nonlethal'],1),
 weapon('vibroblade','Vibroblade',7,2,'bladed','Adjacent',3,'1d6+1/5','physical',['AP 2','+1 damage if two-handed'],3),
 weapon('chainsaw-bayonet','Chainsaw Bayonet',7,2,'powered','Adjacent',4,'1d6+2/7','physical',['Bleed','Two-Handed'],2),
 weapon('forcespike-bayonet','Forcespike Bayonet',8,2,'powered','Adjacent',3,'1d6+2/7','physical',['AP 1','Two-Handed'],0.5),
 weapon('diskos','Diskos',8,3,'powered','Adjacent',4,'1d8+3/9','physical',['AP 3','Two-Handed'],2),
 weapon('power-gauntlet','Power Gauntlet',8,3,'brawl','Adjacent',3,'1d8+1/5','physical',['+1 step when grappling'],4),
 weapon('force-hammer','Force Hammer',8,3,'powered','Adjacent',4,'1d8+2/7','physical',['Minor Blast 3 except wielder','Two-Handed'],7),
 weapon('nega-glaive','Nega-Glaive',9,3,'powered','Adjacent',4,'1d12+3/9','energy',['Irradiate','Two-Handed'],5),
 weapon('star-sword','Star Sword',9,4,'powered','Adjacent',3,'1d10+3/9','energy',['+1 damage if two-handed'],1.5),
 // Primitive ranged, p. 108.
 weapon('bolas','Bolas',1,1,'bolas','Close',4,'1d4+0/3','physical'), weapon('javelin','Javelin',1,1,'javelin','Medium',3,'1d6+1/4','physical',[],1),
 weapon('sling','Sling',1,1,'sling','Long',4,'1d4+0/4','physical',['Reload 1']), weapon('bow','Bow',2,2,'bow','Long',3,'1d6+0/3','physical',['Reload 1']),
 weapon('crossbow','Crossbow',3,2,'bow','Long',3,'1d6+0/4','physical',['Reload 3','AP 3']),
 // Firearms, p. 109.
 weapon('flintlock-musket','Musket, Flintlock',4,3,'rifle','Medium',4,'1d10+0/4','physical',['Reload 5'],5),
 weapon('flintlock-pistol','Pistol, Flintlock',4,2,'pistol','Close',4,'1d8+0/4','physical',['Reload 3'],2),
 weapon('revolver','Revolver',5,2,'pistol','Medium',3,'1d6+1/6','physical',['Mag 6'],1),
 weapon('bolt-action-rifle','Rifle, Bolt-action',5,3,'rifle','Very Long',4,'1d8+2/6','physical',['Mag 5']),
 weapon('shotgun','Shotgun',5,2,'assault','Medium',4,'1d8+0/5','physical',['Mag 5','Brutal'],2.5),
 weapon('light-pistol','Pistol, Light',6,2,'pistol','Medium',3,'1d6+1/5','physical',[],1),
 weapon('heavy-pistol','Pistol, Heavy',6,2,'pistol','Medium',4,'1d8+1/6','physical',[],1),
 weapon('assault-rifle','Rifle, Assault',6,3,'rifle','Very Long',3,'1d8+2/8','physical',['Mag 30','Autofire'],3.5,'R'),
 weapon('sniper-rifle','Rifle, Sniper',6,3,'rifle','Very Long',4,'1d8+2/9','physical',['Accurate'],5),
 weapon('smg','SMG',6,3,'assault','Long',3,'1d6+1/5','physical',['Mag 20','Autofire'],2.5,'R'),
 weapon('flechette-pistol','Flechette Pistol',7,2,'pistol','Close',3,'1d6+1/5','physical',['Brutal'],1.5),
 weapon('flechette-gun','Flechette Gun',7,3,'assault','Medium',3,'1d6+1/5','physical',['Mag 30','Autofire','Brutal'],2.5,'R'),
 weapon('razor-pistol','Razor Pistol',8,2,'pistol','Long',3,'1d10+0/4','physical',['Bleed','Mag 20'],1),
 // Energy weapons, p. 109.
 weapon('taser','Taser',6,2,'pistol','Close',3,'1d4+0/1','energy',['Reload 2','Nonlethal','Stun'],1),
 weapon('laser-pistol','Laser Pistol',7,2,'pistol','Long',3,'1d6+0/6','energy',['Accurate'],1),
 weapon('laser-rifle','Laser Rifle',7,3,'rifle','Very Long',4,'1d6+1/8','energy',['Accurate','Mag 20'],3),
 weapon('sonic-bore','Sonic Bore',7,2,'assault','Close',4,'1d8+0/5','energy',['Spread','Stun'],4),
 weapon('plasma-pistol','Plasma Pistol',8,2,'pistol','Medium',3,'2d4/2d8','energy',[],1.5),
 weapon('plasma-rifle','Plasma Rifle',8,3,'rifle','Very Long',4,'2d6/2d12','energy',[],3.5,'R'),
 weapon('phase-pistol','Phase Pistol',9,2,'pistol','Medium',3,'1d6+2/7','energy',['Accurate','Ignite'],0.5),
 weapon('phase-rifle','Phase Rifle',9,3,'rifle','Extreme',3,'1d6+4/9','energy',['Accurate','Ignite','Mag 20'],2),
 weapon('disintegrator','Disintegrator',9,4,'assault','Long',3,'1d10+0/6','energy',['AP 3','Irradiate'],2,'X'),
 // Heavy weapons and grenades, p. 110.
 weapon('light-mg','Light MG',5,4,'firearm','Very Long',4,'1d8+2/7','physical',['Improved Autofire','Mag 100'],7,'M'),
 weapon('flamethrower','Flamethrower',5,4,'energy','Close',4,'2d8 (1d8)','energy',['Blast 2 (4)','Ignite','Mag 5'],20,'M'),
 weapon('frag-grenade','Grenade, Frag',5,1,'grenade','Thrown',4,'2d6 (1d8)','physical',['Blast 4 (8)'],0.5,'M'),
 weapon('smoke-grenade','Grenade, Smoke',5,1,'grenade','Thrown',4,'Smoke area','none',['Area 4 m'],0.5),
 weapon('grenade-launcher','Grenade Launcher',6,3,'indirect','Long',4,'By grenade','varies',['Ammo Loadout'],5,'R'),
 weapon('concussion-grenade','Grenade, Concussion',6,1,'grenade','Thrown',4,'1d8+4 (0)','energy',['Blast 3 (6)'],0.5,'R'),
 weapon('antitank-rocket','Rocket, Antitank',6,3,'guided','Very Long',5,'1d10+1/6','energy',['AP 3','Minor Blast 2','Reload 3'],7,'M'),
 weapon('gauss-rifle','Gauss Rifle',7,4,'firearm','Very Long',3,'1d6+4/8','physical',['Improved Autofire','Mag 100'],8,'M'),
 weapon('emp-grenade','Grenade, EMP',7,1,'grenade','Thrown',4,'2d8 (1d10)','energy',['Blast 4 (8)','EMP'],0.5),
 weapon('thermal-grenade','Grenade, Thermal',7,1,'grenade','Thrown',4,'1d8+6 (2)','energy',['Blast 3 (6)','Ignite'],0.5,'R'),
 weapon('laser-minigun','Laser Minigun',7,4,'energy','Extreme',3,'1d6+3/7','energy',['Accurate','Improved Autofire','Mag 50'],7,'X'),
 weapon('rail-rifle','Rail Rifle',7,3,'firearm','Extreme',5,'1d8+4/8','physical',['AP 3','Mag 20'],15,'R'),
 weapon('z-missile-launcher','Z-Missile Launcher',7,4,'indirect','Very Long',3,'By grenade','varies',['Ammo Loadout','Mag 10'],4,'M'),
 weapon('neutron-cannon','Neutron Cannon',8,4,'energy','Long',5,'2d6/2d10','energy',['AP 6','Mag 20'],6,'M'),
 weapon('swarm-grenade','Grenade, Swarm',8,2,'grenade','Thrown',4,'2d8 (1d10)','physical',['Blast 5 (10)'],0.5,'R'),
 weapon('plasma-hurler','Plasma Hurler',8,4,'indirect','Very Long',4,'1d8+7 (3)','energy',['Blast 3 (6)','Reload 1'],7,'X'),
 weapon('razor-gun','Razor Gun',8,3,'firearm','Extreme',4,'1d10+2/6','physical',['Bleed','Improved Autofire','Mag 50'],4,'M'),
 weapon('matter-beam','Matter Beam',9,4,'energy','Very Long',4,'2d6/2d12','energy',['AP 6','Mag 20'],5,'R'),
 weapon('gravity-render','Gravity Render',9,4,'indirect','Extreme',3,'1d6+5/10','energy',['Improved Autofire','Mag 50'],6,'X'),
 weapon('null-grenade','Grenade, Null',9,2,'grenade','Thrown',4,'2d10 (2d10)','energy',['Blast 5 (10)','Irradiate'],0.5,'M'),
 weapon('shock-rifle','Shock Rifle',9,3,'energy','Extreme',4,'1d10+3/7','energy',['Accurate','Minor Blast 2'],5),
 // Armor and defensive gear, p. 118.
 armor('hide-armor','Hide Armor',1,2,-2,-1,2,0,[],8), armor('bronze-cuirass','Bronze Cuirass',2,4,-6,-2,4,0,['Tough'],30),
 armor('shield','Shield',2,1,-2,-1,0,0,['Cover 2 limited'],8), armor('chain-mail','Chain Mail',3,3,-6,-3,4,0,[],25), armor('plate-mail','Plate Mail',3,4,-6,-2,6,1,['Tough'],30),
 armor('breastplate','Breastplate',4,3,-4,-2,4,0,['Poor Coverage 3'],10), armor('flak-jacket','Flak Jacket',5,2,-2,-1,2,0,['Poor Coverage 4'],5),
 armor('police-vest','Police Vest',6,2,0,0,3,0,['Poor Coverage 4'],3), armor('riot-shield','Riot Shield',6,2,0,-1,0,0,['Cover 2 limited'],5),
 armor('tactical-armor','Tactical Armor',6,3,-4,-2,5,1,['Poor Coverage 3'],15,'R'), armor('carbon-fiber-plate','Carbon Fiber Plate',7,3,-4,-2,6,3,['Ablative','Tough'],12),
 armor('decelerator-belt','Decelerator Belt',7,4,0,0,3,1,['Bonus Resistance','Screen'],2,'X'), armor('duraweb-coat','DuraWeb Coat',7,2,0,0,1,3,[],2),
 armor('exoskeleton','Exoskeleton',7,4,-2,-3,5,4,['Powered','Tough'],80,'R'), armor('hardmesh-uniform','Hardmesh Uniform',7,2,0,0,2,2,[],2),
 armor('polymer-mail','Polymer Mail',7,2,-4,-2,4,2,[],8), armor('stealthsuit','Stealthsuit',7,4,0,0,3,3,['Life Support'],15,'M'),
 armor('vacuum-armor','Vacuum Armor',7,3,-4,-2,4,3,['Life Support','Tough'],30), armor('assault-battlesuit','Battlesuit, Assault',8,5,-4,-3,9,9,['Life Support','Powered','Tough'],200,'M'),
 armor('raider-battlesuit','Battlesuit, Raider',8,4,-2,-3,7,7,['Life Support','Powered','Tough'],120,'M'), armor('force-shield','Force Shield',8,3,0,0,0,0,['Screen','Armor 5; 4 wound boxes']),
 armor('grav-deflector','Grav Deflector',8,2,0,0,0,0,['Deflect 2 physical / 1 energy','Screen'],2), armor('isihlangu','Isihlangu',8,3,0,0,0,0,['Cover 3 all','Screen'],1),
 armor('nanoweave-suit','Nanoweave Suit',8,2,0,0,3,3,[],3), armor('adamant-mesh','Adamant Mesh',9,2,0,0,4,4,['Tough'],2),
 armor('aegis-field','Aegis Field',9,3,0,0,2,3,['Bonus Resistance','Screen'],1), armor('displacer-unit','Displacer Unit',9,2,0,0,0,0,['Screen']),
 armor('hussar-warsuit','Warsuit, Hussar',9,4,-4,-2,10,10,['Life Support','Powered','Tough'],100,'M'),
 // Tools and professional kits, p. 124.
 ...[
  ['bolt-cutters','Bolt Cutters',5,1,'mechanics'],['concealed-holster','Concealed Holster',5,1,'firearm'],['flare-pistol','Flare Pistol',5,1,'survival'],['medical-kit','Medical Kit',5,2,'medicine'],['padlock','Padlock',5,1,'security'],['portable-generator','Portable Generator',5,2,'mechanics'],['survival-knife','Survival Knife',5,1,'survival'],['walkie-talkie','Walkie-Talkie',5,1,'mechanics'],['comm-headset','Comm Headset',6,1,'computer'],['laptop','Computer, Laptop',6,3,'computer'],['starlight-goggles','Goggles, Starlight',6,3,'awareness'],['synthetic-rope','Rope, Synthetic',6,1,'athletics'],['satellite-comm-kit','Satellite Comm Kit',6,4,'computer'],['acetylene-torch','Torch, Acetylene',6,2,'mechanics'],['trauma-kit','Trauma Kit',6,2,'medicine'],['analgesic-spray','Analgesic Spray',7,1,'medicine'],['antirad','Antirad',7,2,'medicine'],['magnetic-boots','Boots, Magnetic',7,1,'engineering'],['comm-link','Comm Link',7,1,'computer'],['portable-fabricator','Portable Fabricator',7,3,'mechanics'],['grapnel-gun','Grapnel Gun',7,2,'extreme-sports'],['loader-harness','Loader Harness',7,4,'mechanics'],['med-pack','Med Pack',7,3,'medicine'],['power-unit','Power Unit',7,3,'mechanics'],['sonic-viewer','Sonic Viewer',7,3,'security',0,'R'],['vacuum-collar','Vacuum Collar',7,1,'mechanics'],['virtual-tablet','Virtual Tablet',7,2,'computer'],['analyzer','Analyzer',8,2,'science'],['automed-sled','Automed Sled',8,4,'medicine',0,'R'],['comm-patch','Comm Patch',8,1,'computer'],['sentry-gun','Sentry Gun',8,4,'security',0,'M'],['thruster-belt','Thruster Belt',8,3,'extreme-sports'],['wound-gel','Wound Gel',8,1,'medicine'],['caduceus-ray','Caduceus Ray',9,3,'medicine'],['excursion-field','Excursion Field',9,1,'survival'],['mass-negater','Mass Negater',9,2,'mechanics'],['resurrection-pod','Resurrection Pod',9,5,'medicine',0,'X']
 ].map(args=>tool(...args)),
 // Drone stat blocks, pp. 130-131.
 drone('helicopter-drone','Helicopter Drone',6,2,'G',{range:'5 km',duration:'1 hr',senses:'Video, audio',speed:'Fly 40 m',commands:'Observe, Patrol',defense:'Small (-1 step to attack)',durability:'1+ damage: destroyed',attacks:'None'},'A small aerial observation drone with video and audio sensors.'),
 drone('wheeled-drone','Wheeled Drone',6,2,'G',{range:'2 km',duration:'4 hr',senses:'Video, audio',speed:'20 m',commands:'Observe, Patrol, Fetch',defense:'Small (-1 step to attack)',durability:'1+ damage: destroyed',attacks:'None',other:'Manipulator arms have effective Strength 1.'},'A small wheeled observation and fetch drone with manipulator arms.'),
 drone('police-swat-drone','Police SWAT Drone',6,3,'R',{range:'2 km',duration:'4 hr',senses:'Video, audio, chemical sniffer',speed:'15 m',commands:'Observe, Patrol, Fetch, Attack, Communicate',defense:'Armor 2 physical, 1 energy',durability:'1-3 cosmetic; 4-6 weapons/video out; 7+ destroyed',attacks:'Taser: 5 impulses, Close, Attack 15/20/25, 1d4+0/1 energy, Nonlethal, Stun',other:'Manipulator arms have effective Strength 1.'},'A police tactical drone equipped with a taser, sensors, communication, and manipulator arms.'),
 drone('aerial-predator','Aerial Predator',7,3,'M',{range:'10 km',duration:'2 hr',senses:'Video, low-light, thermal, audio',speed:'Fly 40 m',commands:'Observe, Patrol, Attack, Track, Evade',defense:'Armor 2 physical, 1 energy',durability:'1-3 cosmetic; 4-6 weapons/video out; 7+ destroyed',attacks:'Laser: 4 impulses, Long, Attack 14/19/24, 1d6+0/6 energy, Accurate'},'An armed aerial patrol and pursuit drone with multispectrum sensors.'),
 drone('station-security-drone','Station Security Drone',7,3,'R',{range:'2 km',duration:'4 hr',senses:'Video, audio, 2-meter x-ray',speed:'20 m',commands:'Observe, Patrol, Attack, Communicate, Track',defense:'Armor 3 physical, 1 energy',durability:'1-3 lights/sirens; 4-6 sonic beam out; 7-9 shocker/comms out; 10+ destroyed',attacks:'Sonic beam: 4 impulses, Close, 2 targets, Attack 14/19/24, 1d8+0/5 energy, Spread, Stun. Shocker: 5 impulses, Melee, Attack 14/19/24, 1d6+2/3 energy, Nonlethal, Stun'},'A station patrol drone equipped with a sonic beam, contact shocker, communication, and x-ray sensing.'),
 drone('spy-drone','Spy Drone',7,4,'M',{range:'15 km',duration:'4 hr',senses:'Video, low-light, thermal, audio',speed:'Fly 40 m; whisper mode 20 m with Stealth 13/18/23',commands:'Observe, Patrol, Attack, Communicate, Track, Evade, Link',defense:'Small (-1 step to attack); armor 2 physical, 1 energy',durability:'1-3 cosmetic; 4-6 weapons/video out; 7+ destroyed',attacks:'Flechettes: 4 impulses, Medium autofire, Attack 13/18/23, 1d6+1/5 physical, Brutal',other:'Internal ammunition supports one autofire attack.'},'A stealthy armed aerial surveillance drone with one internal flechette autofire loadout.')
];

const upgrade=(id,name,target,classIncrease,{consumable=false,te=0,requires={},effect={}}={})=>({id,name,target,classIncrease,consumable,te,requires,effect,page:target==='weapon'?219:220});
export const upgrades=[
 upgrade('ammo-armor-piercing','Ammo, Armor Piercing','weapon',2,{consumable:true,effect:{ap:3}}),
 upgrade('ammo-hollow-point','Ammo, Hollow Point','weapon',1,{consumable:true,requires:{damageType:'physical',firearm:true},effect:{addSpecial:'Bleed',armoredTargetResistance:3}}),
 upgrade('ammo-incendiary','Ammo, Incendiary','weapon',3,{consumable:true,te:7,effect:{addSpecial:'Ignite'}}),
 upgrade('deto-max','Deto-Max','weapon',3,{consumable:true,requires:{grenadeOrRocket:true},effect:{blastRadius:2,damageBonus:1}}),
 upgrade('good-balance','Good Balance','weapon',1,{requires:{speed:[4,5]},effect:{speed:-1}}),
 upgrade('high-accuracy','High Accuracy','weapon',1,{requires:{notSpecial:'Accurate'},effect:{attackSteps:1}}),
 upgrade('high-power','High Power','weapon',1,{effect:{damageBonus:1}}),
 upgrade('holographic-sight','Holographic Sight','weapon',1,{effect:{rangeSteps:1,aimSteps:1}}),
 upgrade('stealthed','Stealthed','weapon',1,{requires:{types:['pistol','bladed']},effect:{searchSteps:-3}}),
 upgrade('environment-capable','Environment-Capable','armor',1,{effect:{addSpecial:'Life Support'}}),
 upgrade('extra-toughness','Extra Toughness','armor',1,{effect:{addSpecial:'Tough'}}),
 upgrade('hardened','Hardened','armor',1,{requires:{resistance:true},effect:{reduceAP:3}}),
 upgrade('high-capacity','High Capacity','armor',1,{te:7,requires:{coverOrDeflect:true},effect:{coverOrDeflect:1}}),
 upgrade('insulated','Insulated','armor',1,{requires:{resistance:true},effect:{energy:1}}),
 upgrade('light','Light','armor',1,{requires:{penalty:true},effect:{move:2,penalty:1}}),
 upgrade('reinforced','Reinforced','armor',1,{requires:{resistance:true},effect:{physical:1}}),
 upgrade('wound-amelioration','Wound Amelioration','armor',1,{te:7,requires:{poweredOrLifeSupport:true},effect:{ignoreBleed:true,woundPenalty:1}}),
 upgrade('fast','Fast','tool',1,{effect:{laterCheckImpulses:-1}}), upgrade('high-quality','High Quality','tool',1,{effect:{skillSteps:1}}),
 upgrade('automated','Automated','tool',2,{effect:{automated:true,unguidedSteps:-1}}), upgrade('superior-quality','Superior Quality','tool',2,{effect:{skillSteps:2}})
];

export const specialQualityRules={
 Accurate:'+1 step bonus to attacks.', AP:'Reduce the target armor resistance by the listed value.', Autofire:'Supports burst (3 rounds) and full-auto (10 rounds) actions.',
 'Improved Autofire':'Can use autofire against up to five targets within 10 meters of one another.', Blast:'Damages creatures in the listed primary and secondary radii.',
 'Minor Blast':'Normal damage to the primary target plus the described secondary-area damage.', Bleed:'Target resists with Resilience or begins bleeding damage over time.',
 Brutal:'+3 damage when the target is within Close range.', Ignite:'Target resists with Dodge or begins taking fire damage over time.',
 Irradiate:'Target resists with Endurance or begins taking radiation damage over time.', Mag:'Listed ammunition/charge capacity; burst uses 3 and full auto uses 10.',
 Nonlethal:'Defeats by unconsciousness; wounds reduce one severity after the scene.', Reload:'Listed impulses must be spent before the weapon can fire again.',
 Spread:'May attack two adjacent targets at the same time.', Stun:'Opposed attack success vs. Endurance; failure stuns for 3 impulses.',
 'Two-Handed':'Requires two hands or similar appendages to wield.', 'Ammo Loadout':'Damage and effects are supplied by the loaded grenade or missile warhead.'
};

const summaries={
 'ammo-armor-piercing':'Gain AP 3, or increase existing AP by 3.', 'ammo-hollow-point':'Gain Bleed; armored targets add 3 resistance.', 'ammo-incendiary':'Gain Ignite; TE 7+.',
 'deto-max':'+2 m blast radius and +1 damage for grenades or rockets.', 'good-balance':'Reduce Speed 4 or 5 by 1.', 'high-accuracy':'+1 attack step; unavailable to Accurate weapons.',
 'high-power':'+1 to every damage roll.', 'holographic-sight':'Increase range one category; aiming grants +2 steps instead of +1.', 'stealthed':'-3 steps to attempts to find this knife or pistol.',
 'environment-capable':'Gain Life Support.', 'extra-toughness':'Gain Tough.', 'hardened':'Reduce incoming AP by 3, minimum 0.', 'high-capacity':'Increase cover or deflect by 1 step.',
 'insulated':'+1 energy resistance.', 'light':'Reduce move penalty by 2 m and physical-skill penalty by 1 step.', 'reinforced':'+1 physical resistance.',
 'wound-amelioration':'Ignore Bleed and reduce wound penalties by 1 step.', 'fast':'After the first skill-challenge check, later checks require 1 fewer impulse.',
 'high-quality':'+1 step on checks using the tool.', 'automated':'Can operate independently at a -1 step penalty.', 'superior-quality':'+2 steps on checks using the tool.'
};
for(const up of upgrades)up.summary=summaries[up.id];
const primitive=new Set(['bolas','javelin','sling','bow','crossbow']);
const firearms=new Set(['flintlock-musket','flintlock-pistol','revolver','bolt-action-rifle','shotgun','light-pistol','heavy-pistol','assault-rifle','sniper-rifle','smg','flechette-pistol','flechette-gun','razor-pistol']);
const energy=new Set(['taser','laser-pistol','laser-rifle','sonic-bore','plasma-pistol','plasma-rifle','phase-pistol','phase-rifle','disintegrator']);
const heavy=new Set(['light-mg','flamethrower','frag-grenade','smoke-grenade','grenade-launcher','concussion-grenade','antitank-rocket','gauss-rifle','emp-grenade','thermal-grenade','laser-minigun','rail-rifle','z-missile-launcher','neutron-cannon','swarm-grenade','plasma-hurler','razor-gun','matter-beam','gravity-render','null-grenade','shock-rifle']);
for(const item of gear){if(item.kind==='weapon')item.category=primitive.has(item.id)?'Primitive Ranged Weapons':firearms.has(item.id)?'Firearms':energy.has(item.id)?'Energy Weapons':heavy.has(item.id)?'Heavy Weapons and Grenades':'Melee and Hand-to-Hand Weapons';else if(item.kind!=='drone')item.category=item.kind==='armor'?'Armor and Defensive Gear':'Tools and Professional Kits';}
for(const item of gear){const source=gearDescriptions[item.id];if(!source)continue;item.description=source.description;item.massText=source.massText||'—';const parsed=Number.parseFloat(source.massText);item.mass=Number.isFinite(parsed)?parsed:0;}
