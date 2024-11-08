/**
 * @property {boolean} base
 */
export class ImmunityDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField } = foundry.data.fields;
		return {
			base: new BooleanField({ initial: false }),
		};
	}
}
