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

	constructor(data, { vulnerable, resistant, immune, absorb, ...options }) {
		super(data, options);
		const holder = {
			vulnerable: vulnerable || this.base === -1,
			resistant: resistant || this.base === 1,
			immune: immune || this.base === 2,
			absorb: absorb || this.base === 3,
		};

		Object.defineProperty(this, 'current', {
			configurable: false,
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
				if (typeof newValue === 'number') {
					if (newValue === 3) {
						holder.absorb = true;
					}
					if (newValue === 2) {
						holder.immune = true;
					}
					if (newValue > this.base) {
						holder.resistant = true;
					}
					if (newValue < this.base) {
						holder.vulnerable = true;
					}
				}
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

		Object.defineProperty(this, 'vulnerable', {
			value: () => {
				holder.vulnerable = true;
			},
		});

		Object.defineProperty(this, 'resistant', {
			value: () => {
				holder.resistant = true;
			},
		});

		Object.defineProperty(this, 'immune', {
			value: () => {
				holder.immune = true;
			},
		});

		Object.defineProperty(this, 'absorb', {
			value: () => {
				holder.absorb = true;
			},
		});

		Object.defineProperty(this, 'clone', {
			value: (data = {}, context = {}) => {
				context.vulnerable = holder.vulnerable;
				context.resistant = holder.resistant;
				context.immune = holder.immune;
				context.absorb = holder.absorb;
				return super.clone(data, context);
			},
		});
	}
}
