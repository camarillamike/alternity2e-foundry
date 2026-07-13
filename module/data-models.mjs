const f = foundry.data.fields;
const int = (initial = 0, min = 0) => new f.NumberField({ required: true, nullable: false, integer: true, initial, min });
const text = (initial = "") => new f.StringField({ required: true, nullable: false, initial });

const abilities = () => new f.SchemaField(Object.fromEntries(["strength", "agility", "vitality", "intelligence", "focus", "personality"].map(id => [id, int(3, 0)])));
const wounds = () => new f.SchemaField(Object.fromEntries(["graze", "light", "moderate", "serious", "critical", "mortal"].map(id => [id, int(0, 0)])));

export class AlternityActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: int(7, 1), level: int(1, 1), heroPoints: int(1, 0), abilities: abilities(), wounds: wounds(),
      speciesId: text("human"), archetypeId: text(), mandatedTalentId: text(),
      campaign: new f.SchemaField({ techEra: int(7, 1), pointBuy: int(12, 0), restriction: text("R") }),
      identity: new f.SchemaField({ player: text(), concept: text(), background: new f.HTMLField(), goals: new f.HTMLField(), connections: new f.HTMLField(), notes: new f.HTMLField() }),
      build: new f.SchemaField({ locked: new f.BooleanField({ initial: true }), advancementOpen: new f.BooleanField({ initial: false }), skillPointsAvailable: int(0, 0), talentChoicesAvailable: int(0, 0), retrainingAvailable: int(0, 0), talentRetrainingAvailable: new f.BooleanField({ initial: false }) }),
      play: new f.SchemaField({
        scene: int(1, 1), round: int(1, 1), impulse: int(1, 1), statuses: new f.ArrayField(text()), effects: new f.ArrayField(new f.ObjectField()),
        damageLog: new f.ArrayField(new f.ObjectField()), lastDamage: new f.ObjectField({ nullable: true, initial: null }), lastCheck: new f.ObjectField({ nullable: true, initial: null }),
        heroPointLog: new f.ArrayField(new f.ObjectField()), challenges: new f.ArrayField(new f.ObjectField()),
        mortality: new f.SchemaField({ active: new f.BooleanField({ initial: false }), dead: new f.BooleanField({ initial: false }), lethality: text("standard"), successes: int(0, 0), failures: int(0, 0), strikes: int(0, 0), interval: text(), nextTick: int(0, 0), stabilized: new f.BooleanField({ initial: false }) }),
        recovery: new f.ArrayField(new f.ObjectField()), assistedModifier: new f.ObjectField({ nullable: true, initial: null })
      }),
      npc: new f.SchemaField({ role: text("extra"), attitude: text("indifferent"), initiativeGroup: text(), motive: new f.HTMLField(), tactics: new f.HTMLField(), privateNotes: new f.HTMLField(), keySkill: text(), keyTarget: int(14, 0), secondaryTarget: int(16, 0) }),
      creature: new f.SchemaField({ level: text("ordinary"), habitat: text(), senses: text(), movement: text(), armor: new f.ObjectField(), behavior: new f.HTMLField(), specialAbilities: new f.HTMLField(), loot: new f.HTMLField() }),
      drone: new f.SchemaField({ controllerId: text(), command: text(), range: text(), durationRemaining: text(), autonomous: new f.BooleanField({ initial: false }), overclock: new f.BooleanField({ initial: false }), components: new f.ArrayField(new f.ObjectField()), availableCommands: text() }),
      vehicle: new f.SchemaField({ sourceId: text(), techEra: int(0, 0), operatorId: text(), positionMode: text("absolute"), relativeRange: text("near"), controlState: text("controlled"), autopilot: new f.BooleanField({ initial: false }), speed: text(), capacity: text(), ramDamage: text(), cover: text(), environment: text(), armor: new f.ObjectField(), durability: new f.ArrayField(new f.ObjectField()), features: text(), rewardClass: text() }),
      starship: new f.SchemaField({ sourceId: text(), techEra: int(0, 0), hull: text(), drive: text(), modules: text(), features: text(), resources: new f.ArrayField(new f.ObjectField()), crewStations: new f.ArrayField(new f.ObjectField()), notes: new f.HTMLField() }),
      advancement: new f.ArrayField(new f.ObjectField()),
      migrationHistory: new f.ArrayField(new f.ObjectField())
    };
  }
}

export class AlternityItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      sourceId: text(), description: new f.HTMLField(), page: int(0, 0), quantity: int(1, 0), equipped: new f.BooleanField({ initial: true }),
      ranks: int(0, 0), keyAbility: text(), category: text(), constellation: text(), parentId: text(),
      techEra: int(0, 0), itemClass: int(0, 0), restriction: text("G"), mass: new f.NumberField({ initial: 0, min: 0 }),
      weaponType: text(), range: text(), speed: int(0, 0), damage: text(), damageType: text(), special: new f.ArrayField(text()), ammo: new f.SchemaField({ profileVersion: int(0, 0), value: int(0, 0), max: int(0, 0), mode: text("none"), reloadCost: int(0, 0), reloadAmount: int(0, 0), reserve: int(0, 0), reserveUnit: text("rounds"), resourceId: text(), payload: text(), specialType: text("normal"), specialAvailable: new f.BooleanField({ initial: false }), specialUsed: new f.BooleanField({ initial: false }), speedLoader: new f.BooleanField({ initial: false }) }),
      move: int(0, -100), penalty: int(0, -100), physical: int(0, 0), energy: int(0, 0),
      effects: new f.ArrayField(new f.ObjectField()), requirements: new f.ArrayField(new f.ObjectField()), upgrades: new f.ArrayField(text()), featureStates: new f.ObjectField(), metadata: new f.ObjectField()
    };
  }
}
