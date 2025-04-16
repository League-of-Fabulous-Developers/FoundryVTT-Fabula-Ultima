/**
 * @description Models the tracking of progress, whether that be clocks or resources.
 * @property {string} name A label, used for user-facing displays.
 * @property {number} current The current value
 * @property {number} step The step size (a multiplier for each increment/decrement)
 * @property {number} max The maximum value
 * @property {Boolean} enabled Whether this progress track should be used
 * @property {string} id Optionally, a unique identifier for internal lookups.
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField, BooleanField } = foundry.data.fields;
		return {
			name: new StringField({ nullable: true }),
			id: new StringField({ nullable: true }),
			current: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			step: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
			enabled: new BooleanField({ initial: false }),
		};
	}

	get isMinimum() {
		return this.current === 0;
	}

	get isMaximum() {
		return this.current === this.max;
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
