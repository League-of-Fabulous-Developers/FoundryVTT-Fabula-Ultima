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
			base: new NumberField({ initial: 0, min: -1, max: 3, integer: true, nullable: false }),
		};
	}

	constructor(data, options) {
		super(data, options);
		const holder = {
			vulnerable: this.base === -1,
			resistant: this.base === 1,
			immune: this.base === 2,
			absorb: this.base === 3,
		};

		Object.defineProperty(this, 'current', {
			configurable: true,
			enumerable: true,
			get: () => {
				if (holder.absorb) {
					return 3;
				}
				if (holder.immune) {
					return 2;
				}
				if (holder.resistant && holder.vulnerable) {
					return 0;
				}
				if (holder.resistant) {
					return 1;
				}
				if (holder.vulnerable) {
					return -1;
				}
				return 0;
			},
			set: (newValue) => {
				delete this.current;
				let value = MathHelper.clamp(newValue, -1, 3);
				Object.defineProperty(this, 'current', {
					configurable: true,
					enumerable: true,
					get: () => value,
					set: (newValue) => {
						if (Number.isNumeric(newValue)) {
							value = MathHelper.clamp(Number(newValue), -1, 3);
						}
					},
				});
			},
		});

		Object.defineProperty(this, 'downgrade', {
			value: () => {
				holder.vulnerable = true;
			},
		});

		Object.defineProperty(this, 'upgrade', {
			value: () => {
				holder.resistant = true;
			},
		});

		['vulnerability', 'vulnerable', 'vul', 'vu'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					holder.vulnerable = true;
				},
			});
		});

		['resistance', 'resistant', 'res', 'rs'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					holder.resistant = true;
				},
			});
		});

		['immunity', 'immune', 'imm', 'im'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					holder.immune = true;
				},
			});
		});

		['absorption', 'absorb', 'abs', 'ab'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					holder.absorb = true;
				},
			});
		});
	}
}
