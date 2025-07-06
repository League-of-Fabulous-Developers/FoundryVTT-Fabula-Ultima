import { FUItemDataModel } from './item-data-model.mjs';

/**
 * @description Embeds a feature inside a data property
 */
export class EmbeddedFeatureDataModel extends FUItemDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			summary: new SchemaField({ value: new StringField() }),
			isFavored: new SchemaField({ value: new BooleanField() }),
		});
	}

	prepareDerivedData() {
		this.data?.prepareData();
	}

	/**
	 * For default item chat messages to pick up description.
	 * @return {*}
	 */
	get description() {
		return this.data.description;
	}
}
