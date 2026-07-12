const req = (ability, op, value) => ({ ability, op, value });
export const species = [
 { id:'human', name:'Human', requirements:[], effects:[], notes:'Baseline character.', page:26 },
 { id:'elaphromorph', name:'Elaphromorph', requirements:[req('agility','>=',4),req('strength','<=',3)], effects:[{type:'checkStep',skill:'acrobatics',value:2,when:'low gravity'}], notes:'Zero-G adapted human.', page:27 },
 { id:'baromorph', name:'Baromorph', requirements:[req('strength','>=',4),req('agility','<=',3)], effects:[{type:'encumbranceTierReduction',value:1}], notes:'High-G adapted human.', page:27 },
 { id:'android', name:'Android', requirements:[req('vitality','>=',4),req('personality','<=',4)], effects:[{type:'reprogrammableTechnicalPoints',value:4},{type:'talentAccess',constellation:'artificial-systems'}], notes:'Artificial being; includes special damage and recovery rules.', page:29 },
 { id:'briith', name:'Briith', requirements:[req('strength','>=',4),req('agility','<=',4),req('intelligence','<=',5)], effects:[{type:'armor',physical:1,energy:0},{type:'talentAccess',constellation:'powerful-build'}], notes:'Strong, tough, and adapted to high gravity.', page:31 },
 { id:'nesh', name:'Nesh', requirements:[req('focus','>=',4),req('strength','<=',4)], effects:[{type:'prohibitSkill',skill:'deception'},{type:'talentAccess',constellation:'rapport'}], notes:'Telepathic rapport and species-specific social rules.', page:34 },
 { id:'xayon', name:'Xayon', requirements:[req('agility','>=',4),req('focus','<=',4)], effects:[{type:'checkStep',skill:'acrobatics',value:1},{type:'talentAccess',constellation:'limb-articulation'}], notes:'Flexible-limbed hybrid with ranged-perception limitations.', page:35 }
];
