import {CharacterMigrations} from './character-migrations.mjs';
import {AffinitiesDataModel} from '../common/affinities-data-model.mjs';
import {AttributesDataModel} from '../common/attributes-data-model.mjs';
import {BonusesDataModel} from '../common/bonuses-data-model.mjs';
import {BondDataModel} from '../common/bond-data-model.mjs';

/**
 * @property {number} level.value
 * @property {number} resources.hp.min
 * @property {number} resources.hp.max
 * @property {number} resources.hp.value
 * @property {number} resources.hp.bonus
 * @property {number} resources.mp.min
 * @property {number} resources.mp.max
 * @property {number} resources.mp.value
 * @property {number} resources.mp.bonus
 * @property {string} resources.rp1.name
 * @property {number} resources.rp1.value
 * @property {string} resources.rp2.name
 * @property {number} resources.rp2.value
 * @property {string} resources.rp2.name
 * @property {number} resources.rp2.value
 * @property {number} resources.zenit.value
 * @property {number} resources.ip.min
 * @property {number} resources.ip.max
 * @property {number} resources.ip.value
 * @property {number} resources.ip.bonus
 * @property {Object} resources.fp
 * @property {number} resources.fp.value
 * @property {BondDataModel[]} resources.bonds
 * @property {number} resources.exp.value
 * @property {string} resources.identity.value
 * @property {string} resources.pronous.value
 * @property {string} resources.theme.value
 * @property {string} resources.origin.value
 * @property {AffinitiesDataModel} affinities
 * @property {AttributesDataModel} attributes
 * @property {number} derived.init.value
 * @property {number} derived.init.bonus
 * @property {number} derived.def.value
 * @property {number} derived.def.bonus
 * @property {number} derived.mdef.value
 * @property {number} derived.mdef.bonus
 * @property {BonusesDataModel} bonuses
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, StringField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return {
			level: new SchemaField({ value: new NumberField({ initial: 5, min: 5, max: 60, integer: true, nullable: false }) }),
			resources: new SchemaField({
				hp: new SchemaField({
					min: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					max: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				mp: new SchemaField({
					min: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					max: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					value: new NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				rp1: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				rp2: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				rp3: new SchemaField({
					name: new StringField({ initial: '' }),
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				ip: new SchemaField({
					min: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
					value: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
				}),
				fp: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
				bonds: new ArrayField(new EmbeddedDataField(BondDataModel, {})),
				exp: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
				identity: new SchemaField({ name: new StringField() }),
				pronouns: new SchemaField({ name: new StringField() }),
				theme: new SchemaField({ name: new StringField() }),
				origin: new SchemaField({ name: new StringField() }),
			}),
			affinities: new EmbeddedDataField(AffinitiesDataModel, {}),
			attributes: new EmbeddedDataField(AttributesDataModel, {}),
			derived: new SchemaField({
				init: new SchemaField({
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
				}),
				def: new SchemaField({
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
				}),
				mdef: new SchemaField({
					value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
					bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
				}),
			}),
			bonuses: new EmbeddedDataField(BonusesDataModel, {}),
		};
	}

	static migrateData(source) {
		CharacterMigrations.run(source);

		return source;
	}
}
