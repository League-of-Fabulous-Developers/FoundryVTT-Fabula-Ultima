/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AffinityDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 0, min: -1, max: 4, integer: true, nullable: false }),
			current: new NumberField({ initial: 0, min: -1, max: 4, integer: true, nullable: false }),
			bonus: new NumberField({ initial: 0, min: -5, max: 5, integer: true, nullable: false }),
		};
	}
}
