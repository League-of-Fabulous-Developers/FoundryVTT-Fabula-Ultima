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
				return MathHelper.clamp(holder.current, -1, 4);
			},
			set(newValue) {
				holder.current = newValue ?? holder.current;
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				if (holder.current < FU.affValue.resistance) {
					holder.current += 1;
				}
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				if (holder.current <= FU.affValue.resistance) {
					holder.current -= 1;
				}
			},
		});
	}

	clone(data = {}, context = {}) {
		context.current = this.current;
		return super.clone(data, context);
	}
}
