import {AttributeDataModel} from './attribute-data-model.mjs';

/**
 * @property {AttributeDataModel} dex
 * @property {AttributeDataModel} ins
 * @property {AttributeDataModel} mig
 * @property {AttributeDataModel} wlp
 */
export class AttributesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
			dex: new EmbeddedDataField(AttributeDataModel, {}),
			ins: new EmbeddedDataField(AttributeDataModel, {}),
			mig: new EmbeddedDataField(AttributeDataModel, {}),
			wlp: new EmbeddedDataField(AttributeDataModel, {}),
		};
	}
}
