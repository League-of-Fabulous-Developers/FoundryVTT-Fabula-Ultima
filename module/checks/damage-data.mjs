/**
 * @typedef DamageModifier
 * @property {string} label
 * @property {Boolean} enabled
 * @property {number} amount
 * @property {DamageType[]} types
 * @property {ResourceExpense} expense
 */

/**
 * @class DamageData
 * @property {Number} hr The high roll
 * @property {DamageType} type
 * @property {DamageModifier[]} modifiers
 * @property {String} extra An expression to evaluate to add extra damage
 * @property {Boolean} hrZero Whether to treat the high roll as zero.
 * @property {Boolean} base Whether to return the total damage without any modifiers.
 */
export class DamageData {
	/** @type DamageModifier[] **/
	#modifiers;

	constructor(data = {}) {
		// eslint-disable-next-line no-unused-vars
		const { modifierTotal, modifiers, ..._data } = data;
		Object.assign(this, _data);
		this.#modifiers = modifiers ?? [];
		if (!this.hrZero) {
			this.hrZero = false;
		}
		if (!this.hr) {
			this.hr = 0;
		}
	}

	/**
	 * @returns {DamageModifier[]}
	 */
	get rawModifiers() {
		return this.#modifiers;
	}

	/**
	 * @returns {DamageModifier[]}
	 * @remarks Returns only those modifiers that have been enabled.
	 */
	get modifiers() {
		return this.#modifiers.filter((m) => m.enabled && m.amount > 0);
	}

	/**
	 * @returns {Number} The sum of all bonus damage modifiers ({@linkcode modifiers})
	 */
	get modifierTotal() {
		if (this.base) {
			return 0;
		}
		return this.modifiers.reduce((agg, curr) => agg + curr.amount, 0);
	}

	/**
	 * @returns {Set<DamageType>}
	 */
	getAvailableTypes() {
		let available = new Set([this.type]);
		for (const modifier of this.#modifiers) {
			if (!modifier.enabled) {
				continue;
			}
			if (modifier.types) {
				modifier.types.forEach((type) => {
					available.add(type);
				});
			}
		}
		return available;
	}

	/**
	 * @returns {boolean}
	 */
	get customizable() {
		// If there's more than one available type
		const available = this.getAvailableTypes();
		if (available.size > 1) {
			return true;
		}
		// If at least one ot te modifiers has a cost
		if (this.#modifiers.some((m) => m.expense && m.expense.amount > 0)) {
			return true;
		}
		return false;
	}

	/**
	 * @returns {Number}
	 * @remarks Doesn't account for {@linkcode hrZero}
	 */
	get total() {
		if (this.hrZero) {
			return this.modifierTotal;
		}
		return this.modifierTotal + this.hr;
	}

	/**
	 * @param {String} label
	 * @param {Number} amount
	 * @param {DamageType[]} types
	 * @param {DamageModifier} data
	 */
	addModifier(label, amount, types = [], data = {}) {
		/** @type DamageModifier **/
		const modifier = {
			label: label,
			amount: amount,
			value: amount, // legacy
			types: types,
			enabled: true,
			...data,
		};
		this.#modifiers.push(modifier);
	}

	/**
	 * @param {DamageType} type
	 * @param {Number} amount
	 * @returns {DamageData}
	 */
	static construct(type, amount) {
		let data = new DamageData({
			type: type,
		});
		data.addModifier('FU.Amount', amount);
		return data;
	}
}
