export class TreasureDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ min: 0, integer: true }) }),
			quantity: new SchemaField({ value: new NumberField({ min: 1, integer: true }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
