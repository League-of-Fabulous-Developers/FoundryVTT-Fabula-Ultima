import {FU} from '../../../helpers/config.mjs';

export class HeroicSkillDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			level: new SchemaField({
				value: new NumberField({ integer: true }),
				max: new NumberField({ initial: 10, integer: true }),
				min: new NumberField({ integer: true }),
			}),
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new SchemaField({
				accuracy: new SchemaField({ value: new BooleanField() }),
				damage: new SchemaField({ value: new BooleanField() }),
				hrZero: new SchemaField({ value: new BooleanField() }),
			}),
			attributes: new SchemaField({
				primary: new SchemaField({ value: new StringField({ initial: 'ins', choices: Object.keys(FU.attributes) }) }),
				secondary: new SchemaField({ value: new StringField({ initial: 'mig', choices: Object.keys(FU.attributes) }) }),
			}),
			accuracy: new SchemaField({ value: new NumberField() }),
			damage: new SchemaField({
				hasDamage: new SchemaField({ value: new BooleanField() }),
				value: new NumberField(),
				type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			}),
			impdamage: new SchemaField({
				hasImpDamage: new SchemaField({ value: new BooleanField() }),
				value: new NumberField(),
				impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
				type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			}),
			requirement: new SchemaField({ value: new StringField() }),
			benefits: new SchemaField({
				resources: new SchemaField({
					hp: new SchemaField({ value: new BooleanField() }),
					mp: new SchemaField({ value: new BooleanField() }),
					ip: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			source: new SchemaField({
				value: new StringField(),
			}),
		};
	}
}
