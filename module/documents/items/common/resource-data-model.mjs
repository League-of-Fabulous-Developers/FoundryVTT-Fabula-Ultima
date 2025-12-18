import { FU } from '../../../helpers/config.mjs';

/**
 * @property {boolean} enabled
 * @property {String} amount An expression or value.
 * @property {FUResourceType} type
 */
export class ResourceDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField, StringField } = foundry.data.fields;
		return {
			enabled: new BooleanField(),
			amount: new StringField({ initial: 0, integer: true, nullable: false }),
			type: new StringField({ initial: 'hp', choices: Object.keys(FU.resources), blank: true, nullable: false }),
		};
	}
}
