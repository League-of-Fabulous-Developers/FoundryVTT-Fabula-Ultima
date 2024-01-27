export class AccessoryDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ min: 0, integer: true }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			isEquipped: new SchemaField({
				value: new BooleanField(),
				slot: new StringField(),
			}),
			def: new SchemaField({ value: new NumberField({ integer: true }) }),
			mdef: new SchemaField({ value: new NumberField({ integer: true }) }),
			init: new SchemaField({ value: new NumberField({ integer: true }) }),
			isBehavior: new BooleanField(),
			weight: new SchemaField({ value: new NumberField() }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}
}
