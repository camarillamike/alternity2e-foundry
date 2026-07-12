const f = foundry.data.fields;
const int = (initial = 0, min = 0) => new f.NumberField({ required: true, nullable: false, integer: true, initial, min });
const text = (initial = "") => new f.StringField({ required: true, nullable: false, initial });

const abilities = () => new f.SchemaField(Object.fromEntries(["strength", "agility", "vitality", "intelligence", "focus", "personality"].map(id => [id, int(3, 0)])));
const wounds = () => new f.SchemaField(Object.fromEntries(["graze", "light", "moderate", "serious", "critical", "mortal"].map(id => [id, int(0, 0)])));

export class AlternityActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: int(1, 1), level: int(1, 1), heroPoints: int(1, 0), abilities: abilities(), wounds: wounds(),
      speciesId: text("human"), archetypeId: text(), mandatedTalentId: text(),
      campaign: new f.SchemaField({ techEra: int(7, 1), pointBuy: int(12, 0), restriction: text("R") }),
      identity: new f.SchemaField({ player: text(), concept: text(), background: new f.HTMLField(), goals: new f.HTMLField(), connections: new f.HTMLField(), notes: new f.HTMLField() }),
      play: new f.SchemaField({ round: int(1, 1), impulse: int(1, 1), statuses: new f.ArrayField(text()), damageLog: new f.ArrayField(new f.ObjectField()), lastDamage: new f.ObjectField({ nullable: true, initial: null }) }),
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
      weaponType: text(), range: text(), speed: int(0, 0), damage: text(), damageType: text(), special: new f.ArrayField(text()), ammo: new f.SchemaField({ value: int(0, 0), max: int(0, 0) }),
      move: int(0, -100), penalty: int(0, -100), physical: int(0, 0), energy: int(0, 0),
      effects: new f.ArrayField(new f.ObjectField()), requirements: new f.ArrayField(new f.ObjectField()), upgrades: new f.ArrayField(text()), metadata: new f.ObjectField()
    };
  }
}
