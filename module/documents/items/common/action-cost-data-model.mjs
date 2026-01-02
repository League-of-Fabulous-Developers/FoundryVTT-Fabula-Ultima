import { FU } from '../../../helpers/config.mjs';

/**
 * @typedef ResourceExpense
 * @property {FUResourceType} resource
 * @property {String|Number} amount If it's an expression, it will be a string.
 * @property {String[]} traits
 * @property {FUExpenseSource} source
 */

// TODO: Change to string across the board
/**
 * @property {FUResourceType} resource The resource type
 * @property {String} amount The resource cost
 * @property {boolean} perTarget Is the cost static or per target
 */
export class ActionCostDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, BooleanField } = foundry.data.fields;
		return {
			resource: new StringField({ initial: 'mp', blank: true, choices: Object.keys(FU.resources), required: true }),
			amount: new StringField({ initial: '', blank: true, nullable: false }),
			perTarget: new BooleanField({ initial: false }),
		};
	}
}
