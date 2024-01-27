export class ZeroPowerDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new SchemaField({
				current: new NumberField({ integer: true }),
				step: new NumberField({ min: 1, integer: true }),
				max: new NumberField({ initial: 6, integer: true }),
			}),
			zeroTrigger: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			zeroEffect: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
