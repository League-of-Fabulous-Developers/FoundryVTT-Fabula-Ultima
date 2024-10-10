import { MathHelper } from '../../../helpers/math-helper.mjs';

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

	_initialize(options = {}) {
		super._initialize(options);
		let thiz = this;
		const { current } = options;
		let holder = {
			get current() {
				return current ?? thiz.base;
			},
			set current(value) {
				delete this.current;
				this.current = value;
			},
		};

		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get() {
				const value = 2 * Math.floor(holder.current / 2);
				return MathHelper.clamp(value, 6, 12);
			},
			set(newValue) {
				holder.current = newValue ?? holder.current;
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				holder.current += 2;
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				holder.current -= 2;
			},
		});
	}

	clone(data = {}, context = {}) {
		context.current = this.current;
		return super.clone(data, context);
	}
}
