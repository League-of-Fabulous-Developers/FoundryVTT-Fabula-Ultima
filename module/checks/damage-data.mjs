/**
 * @typedef ScalarModifier
 * @property {Boolean} enabled
 * @property {Number|String} amount
 */

/**
 * @typedef DamageModifier
 * @property {string} label
 * @property {Boolean} enabled
 * @property {number} amount
 * @property {DamageType[]} types
 * @property {String[]} traits
 * @property {ResourceExpense} expense
 */

import { FU } from '../helpers/config.mjs';

/**
 * @class DamageData
 * @property {Number} hr The high roll
 * @property {DamageType} type The selected damage type if there's multiple choices.
 * @property {DamageModifier[]} modifiers
 * @property {String} extra An expression to evaluate to add extra damage
 * @property {Boolean} hrZero Whether to treat the high roll as zero.
 * @property {Boolean} base Whether to return the total damage without any modifiers.
 * @property {Boolean} unlock Whether to unlock full modification of the damage.
 */
export class DamageData {
	static get baseDamageModifier() {
		return 'FU.BaseDamage';
	}

	/** @type DamageModifier[] **/
	_modifiers;
	/** @type Boolean **/
	#unlock;

	constructor(data = {}) {
		const { _modifiers, ..._data } = data;
		Object.assign(this, _data);
		this._modifiers = _modifiers ?? [];
		if (!this.hrZero) {
			this.hrZero = false;
		}
		if (!this.hr) {
			this.hr = 0;
		}
	}

	/**
	 * @param {DamageType|DamageType[]} types
	 * @param {number} baseDamage
	 * @returns {DamageData}
	 */
	static construct(types, baseDamage) {
		const data = new DamageData();
		types = Array.isArray(types) ? types : [types];
		data.addModifier(this.baseDamageModifier, baseDamage, types);
		data.type = types[0];
		return data;
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
		return this._modifiers.filter((m) => {
			return m.enabled && (m.amount > 0 || (m.traits && m.traits.length > 0));
		});
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
		if (this.#unlock) {
			return new Set(Object.keys(FU.damageTypes));
		}

		let available = new Set([this.type]);
		for (const modifier of this._modifiers) {
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
		// If it has been set to review
		if (this.#unlock) {
			return true;
		}
		// If there's more than one available type
		const available = this.getAvailableTypes();
		if (available.size > 1) {
			return true;
		}
		// If at least one ot te modifiers has a cost
		if (this._modifiers.some((m) => m.expense && m.expense.amount > 0)) {
			return true;
		}
		return false;
	}

	/**
	 * @returns {Number}
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
		this._modifiers.push(modifier);
	}

	/**
	 *
	 * @returns {DamageData}
	 */
	unlock() {
		this.#unlock = true;
		return this;
	}
}
