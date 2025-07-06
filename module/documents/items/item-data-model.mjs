/**
 * @description Base data model for items in the system
 */
export class FUBaseItemDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			source: new StringField(),
		};
	}

	/**
	 * @returns {FUPartialTemplate[]}
	 */
	get attributePartials() {
		return [];
	}
}

/**
 * @description Standard data model for most items in the system
 */
export class FUItemDataModel extends FUBaseItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			subtype: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			summary: new SchemaField({ value: new StringField() }),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
		});
	}
}
