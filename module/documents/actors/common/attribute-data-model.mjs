import { MathHelper } from '../../../helpers/math-helper.mjs';

/**
 * @param {number} number
 * @return {boolean}
 */
function isEven(number) {
	return number % 2 === 0;
}

// TODO: Provide support for NeoHuman
const minimumValue = 6;
const maximumValue = 12;

/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 8, min: minimumValue, max: maximumValue, integer: true, nullable: false, validate: isEven }),
		};
	}

	constructor(data, options) {
		super(data, options);
		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get: () => {
				return MathHelper.clamp(2 * Math.floor(this.base / 2), 6, 12);
			},
			set: (newValue) => {
				if (Number.isNumeric(newValue)) {
					this.base = Number(newValue);
				}
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				const newBase = this.base + 2;
				if (newBase <= maximumValue) {
					this.base = newBase;
				}
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				const newBase = this.base - 2;
				if (newBase >= minimumValue) {
					this.base = newBase;
				}
			},
		});
	}
}
