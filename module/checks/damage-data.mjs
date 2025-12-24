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
	constructor(data = {}) {
		// eslint-disable-next-line no-unused-vars
		const { modifierTotal, modifiers, ..._data } = data;
		Object.assign(this, _data);
		this._modifiers = modifiers ?? [];
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
		return this._modifiers;
	}

	/**
	 * @returns {DamageModifier[]}
	 * @remarks Returns only those modifiers that have been enabled.
	 */
	get modifiers() {
		return this._modifiers.filter((m) => m.enabled);
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
	 * @returns {boolean}
	 */
	get customizable() {
		return this.modifiers.length > 1;
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
	 */
	addModifier(label, amount, types = []) {
		/** @type DamageModifier **/
		const modifier = {
			label: label,
			amount: amount,
			value: amount, // legacy
			types: types,
			enabled: true,
			expense: undefined,
		};
		this._modifiers.push(modifier);
	}

	static construct(type, amount) {
		let data = new DamageData({
			type: type,
		});
		data.addModifier('FU.Amount', amount);
		return data;
	}
}
