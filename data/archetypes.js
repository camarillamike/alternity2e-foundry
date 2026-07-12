const common = { mandatedSkills:{ attack:4, defensive:4, technical:4, social:4, environmental:4 }, discretionarySkillPoints:15 };
export const archetypes = [
 { id:'battler',name:'Battler',mandatedTalents:['gunner','melee-expert','rugged','trooper'],effects:[{type:'categoryStep',category:'defensive',value:1},{type:'effectiveVitality',purpose:'durability',value:1}],page:40,...common },
 { id:'expert',name:'Expert',mandatedTalents:['drone-expert','gearhead','gunner','medic'],effects:[{type:'initiativeStep',value:1},{type:'categoryStep',category:'technical',value:1}],page:41,...common },
 { id:'leader',name:'Leader',mandatedTalents:['alertness','closer','commander','gunslinger'],effects:[{type:'initiativeStep',value:1},{type:'categoryStep',category:'social',value:1}],page:42,...common },
 { id:'striker',name:'Striker',mandatedTalents:['commando','elusive','gunslinger','martial-arts-striking'],effects:[{type:'initiativeStep',value:2},{type:'damage',value:1}],page:43,...common },
 { id:'survivor',name:'Survivor',mandatedTalents:['alertness','commando','sniper','spy'],effects:[{type:'initiativeStep',value:1},{type:'categoryStep',category:'environmental',value:1}],page:44,...common },
 { id:'freeform',name:'Freeform',mandatedTalents:[],effects:[{type:'initiativeStep',value:1}],freeformBonus:true,page:44,...common }
];
