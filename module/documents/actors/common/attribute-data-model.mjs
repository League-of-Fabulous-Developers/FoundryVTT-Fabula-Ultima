/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ choices: [6, 8, 10, 12], initial: 8 }),
			current: new NumberField({ choices: [6, 8, 10, 12], initial: (source) => source.base, persisted: false }),
		};
	}

	_configure(options) {
		// will get set during _initialize
		let current = undefined;

		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get: () => {
				return Math.clamp(2 * Math.floor(current / 2), 6, 12);
			},
			set: (newValue) => {
				if (Number.isInteger(newValue)) {
					current = newValue;
				}
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				current += 2;
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				current -= 2;
			},
		});
	}
}
