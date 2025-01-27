import { FU } from '../../../helpers/config.mjs';

/**
 * @property {boolean} hasDamage
 * @property {boolean} hrZero
 * @property {number} value
 * @property {DamageType} type
 */
export class DamageDataModelV2 extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField, NumberField, StringField } = foundry.data.fields;
		return {
			hasDamage: new BooleanField(),
			hrZero: new BooleanField(),
			value: new NumberField({ initial: 0, integer: true, nullable: false }),
			type: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes), blank: true, nullable: false }),
		};
	}
}
