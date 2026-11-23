import { MathHelper } from '../../../helpers/math-helper.mjs';

/**
 * @property {number} base
 * @property {number} current
 */
export class AffinityDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ choices: [-1, 0, 1, 2, 3], initial: 0 }),
			current: new NumberField({
				choices: [-1, 0, 1, 2, 3],
				initial: () => () => {
					// returning a function here turns it into a "getter field"
					// if an actual getter is already defined the value is ignored
				},
				persisted: false,
			}),
		};
	}

	/**
	 * @type {{vulnerable: boolean, resistant: boolean, immune: boolean, absorb: boolean, override: number|null}}
	 */
	#data = {
		vulnerable: false,
		resistant: false,
		immune: false,
		absorb: false,
		override: null,
	};

	constructor(...args) {
		super(...args);
		this.#data = {
			vulnerable: this.base === -1,
			resistant: this.base === 1,
			immune: this.base === 2,
			absorb: this.base === 3,
			override: null,
		};
	}

	_configure(options) {
		['downgrade', 'vulnerability', 'vulnerable', 'vul', 'vu'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					this.#data.vulnerable = true;
				},
			});
		});

		['upgrade', 'resistance', 'resistant', 'res', 'rs'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					this.#data.resistant = true;
				},
			});
		});

		['immunity', 'immune', 'imm', 'im'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					this.#data.immune = true;
				},
			});
		});

		['absorption', 'absorb', 'abs', 'ab'].forEach((value) => {
			Object.defineProperty(this, value, {
				value: () => {
					this.#data.absorb = true;
				},
			});
		});
	}

	_initialize(options) {
		super._initialize(options);

		try {
			this.#data = {
				vulnerable: this._source.base === -1,
				resistant: this._source.base === 1,
				immune: this._source.base === 2,
				absorb: this._source.base === 3,
				override: null,
			};
		} catch (e) {
			if (e instanceof TypeError) {
				// private elements get initialized right after the super constructor returns.
				// because _initialize gets called during the super constructor invocation we have to work around this.
			} else {
				throw e;
			}
		}
	}

	get current() {
		if (this.#data.override != null) {
			return this.#data.override;
		}
		if (this.#data.absorb) {
			return 3;
		}
		if (this.#data.immune) {
			return 2;
		}
		if (this.#data.resistant && this.#data.vulnerable) {
			return 0;
		}
		if (this.#data.resistant) {
			return 1;
		}
		if (this.#data.vulnerable) {
			return -1;
		}
		return 0;
	}

	set current(value) {
		if (!Number.isInteger(value)) {
			return;
		}
		this.#data.override = MathHelper.clamp(value, -1, 3);
	}
}
