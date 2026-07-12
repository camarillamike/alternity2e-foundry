const s = (id, name, ability, type, behavior = '') => ({ id, name, ability, type, behavior, page: 56 });
export const skills = [
  s('academics','Academics',['intelligence'],'technical','cascades'), s('acrobatics','Acrobatics',['agility'],'environmental'),
  s('armor-training','Armor Training',['strength','intelligence'],'defensive','enabler'), s('athletics','Athletics',['strength'],'environmental'),
  s('awareness','Awareness',['focus'],'environmental'), s('coercion','Coercion',['personality'],'social'),
  s('computer','Computer',['intelligence'],'technical'), s('culture','Culture',['personality'],'social','cascades'),
  s('deception','Deception',['personality'],'social'), s('dodge','Dodge',['agility'],'defensive','enabler passive'),
  s('driving','Driving',['agility'],'environmental'), s('empathy','Empathy',['focus','personality'],'social'),
  s('endurance','Endurance',['vitality'],'defensive','passive'), s('energy-weapon','Energy Weapon',['agility','focus'],'attack','specializes'),
  s('engineering','Engineering',['intelligence'],'technical','cascades'), s('extreme-sports','Extreme Sports',['agility','vitality'],'environmental'),
  s('firearm','Firearm',['agility','focus'],'attack','specializes'), s('hand-to-hand','Hand to Hand',['strength','agility'],'attack','specializes'),
  s('heavy-weapon','Heavy Weapon',['strength','intelligence'],'attack','specializes'), s('influence','Influence',['personality'],'social'),
  s('mechanics','Mechanics',['intelligence'],'technical','cascades'), s('medicine','Medicine',['intelligence'],'technical','cascades'),
  s('melee','Melee',['strength','agility'],'attack','specializes'), s('misdirection','Misdirection',['personality'],'social'),
  s('performance','Performance',['personality'],'social','cascades'), s('piloting','Piloting',['agility','intelligence'],'environmental'),
  s('primitive-weapon','Primitive Weapon',['agility','focus'],'attack','specializes'), s('profession','Profession',['any'],'technical'),
  s('resilience','Resilience',['vitality'],'defensive'), s('science','Science',['intelligence'],'technical','cascades'),
  s('security','Security',['agility','intelligence'],'environmental'), s('stealth','Stealth',['agility','focus'],'environmental'),
  s('survival','Survival',['vitality','focus'],'environmental'), s('willpower','Willpower',['focus'],'defensive','passive')
];
