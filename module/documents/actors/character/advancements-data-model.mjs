/**
 * @typedef AdvancementReference
 * @property {String} id
 * @property {Boolean} locked
 */

/**
 * @typedef AdvancementSkillReference
 * @property {String} id
 * @property {Number} value The current skill level.
 * @property {Number} max
 */

/**
 * @typedef AdvancementCollectionReference
 * @property {String[]} ids
 * @property {Number} required The minimum amount required.
 */

/**
 * @desc Represents a single level advancement for a player character.
 * @property {AdvancementReference} class The class item.
 * @property {AdvancementSkillReference} skill The skill item.
 * @property {Record<String, AdvancementReference>} entries
 * @property {AdvancementReference} entries.heroic Optional heroic advancement.
 * @property {AdvancementReference} entries.spell Optional spell advancement.
 * @property {AdvancementCollectionReference} entries.extraSpells Optional spell advancement.
 */
export class AdvancementDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, ObjectField } = foundry.data.fields;
		return {
			class: new SchemaField({
				id: new StringField({ blank: true }),
				locked: new BooleanField({}),
			}),
			skill: new SchemaField({
				id: new StringField({ blank: true }),
				value: new NumberField({ initial: 1 }),
				max: new NumberField({ initial: 1 }),
			}),
			entries: new ObjectField({}),
		};
	}

	static migrateData(source) {
		if (source.spell) {
			source.entries.spell = {
				id: source.spell.id,
				locked: source.spell.locked,
			};
			delete source.spell;
		}
		return super.migrateData(source);
	}
}
