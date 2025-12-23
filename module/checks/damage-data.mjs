/**
 * @typedef BonusDamage
 * @property {string} label
 * @property {number} value
 */

/**
 * @typedef DamageChangeData
 * @property {String} key
 * @property {Boolean} enabled
 * @property {DamageType[]} types
 * @property {String} modifier
 * @property {ResourceExpense} expense
 */

/**
 * @class DamageData
 * @property {Number} hr The high roll
 * @property {DamageType} type
 * @property {BonusDamage[]} modifiers
 * @property {String} extra An expression to evaluate to add extra damage
 * @property {Boolean} hrZero Whether to treat the high roll as zero.
 * @property {Boolean} base Whether to return the total damage without any modifiers.
 * @property {DamageChangeData[]} changes
 */
export class DamageData {
	constructor(data = {}) {
		// eslint-disable-next-line no-unused-vars
		const { modifierTotal, modifiers, ..._data } = data;
		Object.assign(this, _data);
		this.modifiers = modifiers ?? [];
		if (!this.hrZero) {
			this.hrZero = false;
		}
		if (!this.hr) {
			this.hr = 0;
		}
		if (this.changes === undefined) {
			this.changes = [];
		}
	}

	static construct(type, amount) {
		let data = new DamageData({
			type: type,
		});
		data.addModifier('FU.Amount', amount);
		return data;
	}

	/**
	 * @returns {boolean}
	 */
	get hasChanges() {
		return this.changes.length > 0;
	}

	/**
	 * @returns {Number} The sum of all bonus damage modifiers ({@linkcode modifiers})
	 */
	get modifierTotal() {
		if (this.base) {
			return 0;
		}
		return this.modifiers.reduce((agg, curr) => agg + curr.value, 0);
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
	 * @param {Number} value
	 */
	addModifier(label, value) {
		this.modifiers.push({ label: label, value: value });
	}

	/**
	 * @param {DamageChangeData} data
	 */
	addChange(data) {
		this.changes.push(data);
	}
}
