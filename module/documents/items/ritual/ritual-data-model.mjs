import {FU} from '../../../helpers/config.mjs';

export class RitualDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new SchemaField({
				accuracy: new SchemaField({ value: new BooleanField() }),
				damage: new SchemaField({ value: new BooleanField() }),
				hrZero: new SchemaField({ value: new BooleanField() }),
			}),
			attributes: new SchemaField({
				primary: new SchemaField({ value: new StringField({ initial: 'dex', choices: Object.keys(FU.attributes) }) }),
				secondary: new SchemaField({ value: new StringField({ initial: 'ins', choices: Object.keys(FU.attributes) }) }),
			}),
			accuracy: new SchemaField({ value: new NumberField({ integer: true }) }),
			damage: new SchemaField({
				hasDamage: new SchemaField({ value: new BooleanField() }),
				value: new NumberField({ integer: true }),
				type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			}),
			impdamage: new SchemaField({
				hasImpDamage: new SchemaField({ value: new BooleanField() }),
				value: new NumberField(),
				impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
				type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			}),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new SchemaField({
				current: new NumberField({ integer: true }),
				step: new NumberField({ initial: 1, integer: true }),
				max: new NumberField({ initial: 6, integer: true }),
			}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'medium', 'major', 'extreme'] }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: ['individual', 'small', 'large', 'huge'] }) }),
			mpCost: new SchemaField({ value: new NumberField({ integer: true }) }),
			dLevel: new SchemaField({ value: new NumberField({ integer: true }) }),
			clock: new SchemaField({ value: new NumberField({ integer: true }) }),
			source: new SchemaField({ value: new StringField() }),
			hasRoll: new SchemaField({ value: new BooleanField() }),
			rollInfo: new SchemaField({
				impdamage: new SchemaField({
					hasImpDamage: new SchemaField({ value: new BooleanField() }),
					impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
					type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
				}),
				attributes: new SchemaField({
					primary: new SchemaField({ value: new StringField({ initial: 'ins', choices: Object.keys(FU.attributes) }) }),
					secondary: new SchemaField({ value: new StringField({ initial: 'mig', choices: Object.keys(FU.attributes) }) }),
				}),
				accuracy: new SchemaField({ value: new NumberField() }),
			}),
		};
	}
}
