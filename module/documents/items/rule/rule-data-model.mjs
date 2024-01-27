export class RuleDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			isBehavior: new BooleanField(),
			weight: new SchemaField({ value: new NumberField({ initial: 1, integer: true }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new SchemaField({
				current: new NumberField({ initial: 0, integer: true }),
				step: new NumberField({ initial: 1, integer: true }),
				max: new NumberField({ initial: 6, integer: true }),
			}),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
