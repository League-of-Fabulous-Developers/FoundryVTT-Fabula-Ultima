/**
 * @property {number} current
 * @property {number} step
 * @property {number} max
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			current: new NumberField({ initial: 0, integer: true , nullable: false}),
			step: new NumberField({ initial: 1, integer: true , nullable: false}),
			max: new NumberField({ initial: 6, integer: true , nullable: false}),
		};
	}
}
