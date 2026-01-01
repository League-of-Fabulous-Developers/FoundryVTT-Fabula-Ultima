import { FU } from '../../../helpers/config.mjs';

/**
 * @typedef ResourceExpense
 * @property {FUResourceType} resource
 * @property {Number} amount
 * @property {String[]} traits
 * @property {FUExpenseSource} source
 */

/**
 * @property {FUResourceType} resource The resource type
 * @property {Number} amount The resource cost
 * @property {boolean} perTarget Is the cost static or per target
 */
export class ActionCostDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField, BooleanField } = foundry.data.fields;
		return {
			resource: new StringField({ initial: 'mp', blank: true, choices: Object.keys(FU.resources), required: true }),
			amount: new NumberField({ initial: 0, integer: true, nullable: false }),
			perTarget: new BooleanField({ initial: false }),
		};
	}
}
