/**
 * @property {boolean} value
 * @property {string} slot
 */
export class IsEquippedDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, BooleanField } = foundry.data.fields;
		return {
			value: new BooleanField(),
			slot: new StringField(),
		};
	}
}
