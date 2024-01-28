import {FU} from '../../../helpers/config.mjs';

/**
 * @typedef {"minor", "heavy", "massive"} ImprovisedDamageType
 */

/**
 * @property {boolean} hasImpDamage.value
 * @property {number} value
 * @property {ImprovisedDamageType} impType.value
 * @property {DamageType} type.value
 */
export class ImprovisedDamageDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, BooleanField, NumberField, StringField } = foundry.data.fields;
		return {
			hasImpDamage: new SchemaField({ value: new BooleanField() }),
			value: new NumberField(),
			impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
			type: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
		};
	}
}
