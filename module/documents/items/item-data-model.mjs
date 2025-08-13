/**
 * @description Base data model for items in the system
 * @property {String} fuid
 * @property {String} source
 */
export class FUItemDataModel extends foundry.abstract.TypeDataModel {
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

	static migrateData(source) {
		if (source.source?.value) {
			source.source = source.source.value;
		}
		return source;
	}
}

/**
 * @description Standard data model for most items in the system
 */
export class FUStandardItemDataModel extends FUItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			description: new HTMLField(),
			summary: new SchemaField({ value: new StringField() }),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
		});
	}
}

/**
 * @description Data model for items that contain a subtype
 */
export class FUSubTypedItemDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			subtype: new SchemaField({ value: new StringField() }),
		});
	}
}
