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
			current: new NumberField({ initial: (source) => source.base, min: minimumValue, max: maximumValue, integer: true, nullable: false, persisted: false }),
		};
	}

	_configure(options) {
		// will get set during _initialize
		let current = undefined;

		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get: () => {
				return MathHelper.clamp(2 * Math.floor(current / 2), 6, 12);
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
