import { MathHelper } from '../../../helpers/math-helper.mjs';

/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AffinityDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 0, min: -1, max: 4, integer: true, nullable: false }),
		};
	}

	_initialize(options = {}) {
		super._initialize(options);

		let current = this.base;
		Object.defineProperty(this, 'current', {
			configurable: false,
			enumerable: true,
			get() {
				return MathHelper.clamp(current, -1, 4);
			},
			set(newValue) {
				current = newValue;
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				current += 1;
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				current -= 1;
			},
		});
	}
}
