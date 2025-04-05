/**
 * @property {string} name A label
 * @property {number} current The current value
 * @property {number} step The step size (a multiplier for each increment/decrement)
 * @property {number} max The maximum value
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField } = foundry.data.fields;
		return {
			name: new StringField({ initial: 'Name' }),
			current: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			step: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
		};
	}

	generateProgressArray() {
		return Array.from({ length: this.max }, (_, i) => ({
			id: i + 1,
			checked: this.current === i + 1,
		})).reverse();
	}

	get progressArray() {
		return this.generateProgressArray();
	}
}
