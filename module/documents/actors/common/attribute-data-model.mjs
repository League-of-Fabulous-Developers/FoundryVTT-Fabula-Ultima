/**
 * @param {number} number
 * @return {boolean}
 */
function isEven(number) {
	return number % 2 === 0;
}

/**
 * @property {number} base
 * @property {number} current
 * @property {number} bonus
 */
export class AttributeDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField } = foundry.data.fields;
		return {
			base: new NumberField({ initial: 8, min: 6, max: 12, integer: true, nullable: false, validate: isEven }),
			current: new NumberField({ initial: 8, min: 6, max: 12, integer: true, nullable: false, validate: isEven }),
			bonus: new NumberField({ initial: 0, min: -6, max: 6, integer: true, nullable: false, validate: isEven }),
		};
	}
}
