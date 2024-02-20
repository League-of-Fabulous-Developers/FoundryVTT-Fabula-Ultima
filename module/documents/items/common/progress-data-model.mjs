/**
 * @property {string} name
 * @property {number} current
 * @property {number} step
 * @property {number} max
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField } = foundry.data.fields;
		return {
			name: new StringField({ initial: '' }),
			current: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			step: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			max: new NumberField({ initial: 6, min: 1, integer: true, nullable: false }),
		};
	}
}
