import { FU } from '../../../helpers/config.mjs';

/**
 * @property {boolean} enabled
 * @property {number} amount The base value which is generally added to the high roll
 * @property {String} onApply An expression which is evaluated during damage application.
 * @property {FUResourceType} type
 */
export class ResourceDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField, NumberField, StringField } = foundry.data.fields;
		return {
			enabled: new BooleanField(),
			amount: new NumberField({ initial: 0, integer: true, nullable: false }),
			onApply: new StringField({ blank: true }),
			type: new StringField({ initial: 'hp', choices: Object.keys(FU.resources), blank: true, nullable: false }),
		};
	}
}
