import { ImmunityDataModel } from './immunity-data-model.mjs';

/**
 * @property {boolean} slow
 * @property {boolean} dazed
 * @property {boolean} weak
 * @property {boolean} shaken
 * @property {boolean} enraged
 * @property {boolean} poisoned
 */
export class ImmunitiesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
			slow: new EmbeddedDataField(ImmunityDataModel, {}),
			dazed: new EmbeddedDataField(ImmunityDataModel, {}),
			weak: new EmbeddedDataField(ImmunityDataModel, {}),
			shaken: new EmbeddedDataField(ImmunityDataModel, {}),
			enraged: new EmbeddedDataField(ImmunityDataModel, {}),
			poisoned: new EmbeddedDataField(ImmunityDataModel, {}),
		};
	}
}
