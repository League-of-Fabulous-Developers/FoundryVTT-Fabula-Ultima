/**
 * @param {number} number
 * @return {boolean}
 */
function isEven(number) {
	return number % 2 === 0;
}

/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 8, min: 6, max: 12, integer: true, nullable: false, validate: isEven }),
		};
	}

	constructor(data, options) {
		super(data, options);
		let current = this.base;
		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get: () => {
				return Math.clamp(2 * Math.floor(current / 2), 6, 12);
			},
			set: (newValue) => {
				if (Number.isNumeric(newValue)) {
					current = Number(newValue);
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
