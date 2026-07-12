import {talentDescriptions} from './talent-descriptions.js';
const slug=name=>name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const records=[];
const add=(name,constellation,parent=null,{page=82,effect=null,requires=[]}={})=>{
 const id=slug(name);records.push({id,name,constellation,parent,entry:parent===null,requires:[...(parent?[{talent:parent}]:[]),...requires],effect,page});return id;
};
const tree=(root,branches,{page=82,rootEffect=null,rootRequires=[]}={})=>{
 const constellation=slug(root),rootId=add(root,constellation,null,{page,effect:rootEffect,requires:rootRequires});
 for(const branch of branches){const [name,children=[],options={}]=typeof branch==='string'?[branch]:branch;const parentId=add(name,constellation,rootId,{page,...options});for(const child of children)add(child,constellation,parentId,{page});}
};

tree('Alertness',[['Hit the Dirt'],['Keen Senses'],['Prepared Action',['Snapshot']],['Reactive Shout']],{page:83,rootEffect:{type:'initiativeStep',value:2}});
tree('Closer',[['Character Study',['Seductive']],['Chameleon',['Cultural Sponge']]],{page:83});
tree('Commander',[['Combat Leader',['Skills Coach','Inspiration to All']],['Flexible Tactics',['Rapid Reassessment']],['Taunt',['Group Taunt','Crucial Taunt']]],{page:84});
tree('Commando',[['Dash',['Serpentine'],{effect:{type:'speed',value:5}}],['Grenadier'],['Overwatch'],['Skirmisher'],['Silent Death'],['Trained Spotter']],{page:85});
tree('Dirty Fighting',[['Bum Rush'],['Distracting Blow',['Blinding Blow']],['Make ‘Em Hurt',['Make ‘Em Bleed']]],{page:85});
tree('Drone Expert',[['Overclocking'],['Rapid Scripting',['Conditional Logic']]],{page:86});
tree('Elusive',[['Combat Crouch'],['Evasive Footwork',['Instinctive Evasion']],['Lucky Miss']],{page:86});
tree('Gearhead',[['Built These Myself',['One of a Kind']],['Fast Work',['Hit It Again']],['Saboteur',['Improvised Trap']],['Street Mod']],{page:87});
tree('Gunner',[['Cover Destruction'],['Dakka Dakka'],['Forward Observer',['Shockwave','Blast Shaping']],['Suppressive Fire',['Unleash Hell']],['Strap It Down']],{page:88});
tree('Gunslinger',[['Disarming Shot'],['Double Tap'],['Dramatic Reload',['Free Reload']],['Dual Pistols',['Dual Targeting','Dual Deathdealer']],['Gun-Fu'],['Steady Hand',['Distance Shot','Deadeye Shot']]],{page:89});
tree('Inventor',[['The Best Teacher',['Not That One!']],['Miraculous Invention'],['Improvisation'],['Resourcefulness']],{page:89});
tree('Martial Arts, Grappling',[['Disarming Lock',['Submission Hold']],['Judo Throw',['Defensive Flip','Bodyslam']],['Takedown',['Ground and Pound']],['Tight Clinch']],{page:90});
tree('Martial Arts, Striking',[['Combo Strike',['Whirlwind Combo']],['Defensive Stance',['Roll With the Punch']],['Hands of Stone'],['Haymaker',['Knockout Blow']]],{page:91});
tree('Medic',[["Don’t You Quit on Me"],['First Responder',['Emergency Treatment']],["I’ve Seen Worse"],['Physician, Heal Thyself']],{page:92});
tree('Melee Expert',[['Lunge',['Overwhelming Lunge']],['Melee Combo',['Melee Whirlwind']],['Parry',['Riposte','Disarming Riposte']]],{page:92});
tree('Rugged',[['Extra-Rugged I',['Extra-Rugged II','Extra-Rugged III'],{effect:{type:'woundBoxes',rows:['moderate'],value:1}}],['Roll With It',['Take It on the Armor']],['Shake It Off',['Inured to Pain','Suck It Up']]],{page:93,rootEffect:{type:'woundBoxes',rows:['graze','light'],value:1}});
tree('Sniper',[['Controlled Breathing',['Precise Sniper','Deadeye Sniper']],['Extreme Range',['Thousand-Meter Stare']],['Low Observables',['Induce Panic']],['Sighting In']],{page:93});
tree('Spy',[['Access'],['Black Bag Specialist',['Safecracker']],['Brush Pass'],['Expert Tail'],['Vanish']],{page:94});
tree('Trooper',[['Controlled Burst',['Focused Bursts']],['Deadly Reply'],['Imposing Threat'],['Over the Top'],['Spray and Pray',['Covering Fire']],['Stopping Power',['Rock Steady']]],{page:95});
tree('Artificial Systems',[['Hardened Systems'],['Redundant Components',['Overdrive']],['Social Programming']],{page:96,rootRequires:[{species:'android'}]});
tree('Powerful Build',[['Big Hitter'],['Bulldozer',['Trample','Unstoppable']],['Oversized Weapons'],['Thick Hide']],{page:96,rootRequires:[{species:'briith'}]});
tree('Rapport',[['Branching Network'],['Propagating Network'],['Rapid Communion',['Euphoric Communion','Forceful Communion']]],{page:97,rootRequires:[{species:'nesh'}]});
tree('Limb Articulation',[['Ambiloader',['Dual Weapons','Triple Weapons']],['Feral Wrestler'],['Flurry of Blows',['Feral Flurry']],['Swift Quadruped',[],{effect:{type:'baseSpeedOverride',value:40}}]],{page:96,rootRequires:[{species:'xayon'}]});

const self='self-improvement';add('Self-Improvement',self,null,{page:97,requires:[{level:2}]});
for(const ability of ['strength','agility','vitality','intelligence','focus','personality'])add(`Improved ${ability[0].toUpperCase()+ability.slice(1)}`,self,'self-improvement',{page:97,requires:[{level:6}],effect:{type:'ability',ability,value:1}});

// Arrow grandchildren with their own mechanical effects.
for(const [id,effect] of Object.entries({
 'extra-rugged-ii':{type:'woundBoxes',rows:['serious'],value:1},
 'extra-rugged-iii':{type:'woundBoxes',rows:['critical'],value:1}
})) records.find(x=>x.id===id).effect=effect;

export const talents=records;
for(const talent of talents)talent.description=talentDescriptions[talent.id];
