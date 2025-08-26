import { FU } from '../../../helpers/config.mjs';

/**
 * @property {"hp", "mp", "ip", "fp", "exp", "zenit"} resource The resource type
 * @property {Number} amount The resource cost
 * @property {boolean} perTarget Is the cost static or per target
 */
export class ActionCostDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField, BooleanField } = foundry.data.fields;
		return {
			resource: new StringField({ initial: 'mp', choices: Object.keys(FU.resources), required: true }),
			amount: new NumberField({ initial: 0, integer: true, nullable: false }),
			perTarget: new BooleanField({ initial: false }),
		};
	}
}
