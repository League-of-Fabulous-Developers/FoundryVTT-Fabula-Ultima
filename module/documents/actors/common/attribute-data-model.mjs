import { MathHelper } from '../../../helpers/math-helper.mjs';

/**
 * @param {number} number
 * @return {boolean}
 */
function isEven(number) {
	return number % 2 === 0;
}

const minimumValue = 6;
const maximumValue = 12;

/**
 * @property {number} base
 * @property {number} current
 * @property {boolean} unlimit
 * @property {number} abnormal
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, BooleanField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 8, min: minimumValue, max: maximumValue, integer: true, nullable: false, validate: isEven }),
			unlimit: new BooleanField({ initial: false, nullable: false })
		};
	}

	constructor(data, options) {
		super(data, options);

		// Set the initial current to start off the base value
		this._current = this.base;
		// Set the initial abnormal die size to d20 (Neo-Human)
		this._abnormal = 20;

		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get: () => {
				return MathHelper.clamp(2 * Math.floor(this._current / 2), 6, 12);
			},
			set: (newValue) => {
				if (Number.isNumeric(newValue)) {
					this._current = Number(newValue);
				}
			},
		});

		Object.defineProperty(this, 'abnormal', {
			configurable: false,
			enumerable: true,
			get: () => {
				return 2 * Math.floor(this._current / 2)
			},
			set: (newValue) => {
				if (Number.isNumeric(newValue) && MathHelper.clamp(newValue, minimumValue, maximumValue) != Number(newValue)) {
					this._abnormal = Number(newValue)
				}
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				const newValue = this.current + 2;
				if (newValue <= maximumValue) {
					this.current = newValue;
				}
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				const newValue = this.current - 2;
				if (newValue >= minimumValue) {
					this.current = newValue;
				}
			},
		});
	}
}
