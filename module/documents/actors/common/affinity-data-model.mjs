import { MathHelper } from '../../../helpers/math-helper.mjs';
import { FU } from '../../../helpers/config.mjs';

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

		let current = options.current ?? this.base;
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
				if (current < FU.affValue.resistance) {
					current += 1;
				}
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				if (current <= FU.affValue.resistance) {
					current -= 1;
				}
			},
		});
	}

	clone(data = {}, context = {}) {
		context.current = this.current;
		return super.clone(data, context);
	}
}
