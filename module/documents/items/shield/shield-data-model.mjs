import {FU} from '../../../helpers/config.mjs';

export class ShieldDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ integer: true }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			isEquipped: new SchemaField({
				value: new BooleanField(),
				slot: new StringField(),
			}),
			def: new SchemaField({ value: new NumberField({ integer: true }) }),
			mdef: new SchemaField({ value: new NumberField({ integer: true }) }),
			init: new SchemaField({ value: new NumberField({ integer: true }) }),
			attributes: new SchemaField({
				primary: new SchemaField({ value: new StringField({ initial: 'ins', choices: Object.keys(FU.attributes) }) }),
				secondary: new SchemaField({ value: new StringField({ initial: 'mig', choices: Object.keys(FU.attributes) }) }),
			}),
			accuracy: new SchemaField({ value: new NumberField({ integer: true }) }),
			damage: new SchemaField({ value: new NumberField({ integer: true }) }),
			type: new SchemaField({ value: new StringField({ initial: 'melee', choices: Object.keys(FU.weaponTypes) }) }),
			category: new SchemaField({ value: new StringField({ initial: 'brawling', choices: Object.keys(FU.weaponCategories) }) }),
			hands: new SchemaField({ value: new StringField({ initial: 'one-handed', choices: Object.keys(FU.handedness) }) }),
			impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			isBehavior: new BooleanField(),
			weight: new SchemaField({ value: new NumberField({ initial: 1, integer: true }) }),
			isDualShield: new SchemaField({ value: new BooleanField() }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}
}
