import {FU} from '../../../helpers/config.mjs';

export class BasicItemDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			isBehavior: new BooleanField(),
			weight: new SchemaField({ value: new NumberField() }),
			attributes: new SchemaField({
				primary: new SchemaField({ value: new StringField({ initial: 'dex', choices: Object.keys(FU.attributes) }) }),
				secondary: new SchemaField({ value: new StringField({ initial: 'ins', choices: Object.keys(FU.attributes) }) }),
			}),
			accuracy: new SchemaField({ value: new NumberField({ integer: true }) }),
			damage: new SchemaField({ value: new NumberField({ integer: true }) }),
			type: new SchemaField({ value: new StringField({ choices: Object.keys(FU.weaponTypes) }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			cost: new SchemaField({ value: new NumberField({ min: 0, integer: true }) }),
			quality: new SchemaField({ value: new StringField() }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}
}
