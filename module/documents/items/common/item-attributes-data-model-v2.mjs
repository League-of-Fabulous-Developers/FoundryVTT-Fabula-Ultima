import { FU } from '../../../helpers/config.mjs';

/**
 * @property {"dex", "ins", "mig", "wlp"} primary
 * @property {"dex", "ins", "mig", "wlp"} secondary
 */
export class ItemAttributesDataModelV2 extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			primary: new StringField({ initial: 'dex', blank: true, choices: Object.keys(FU.attributes) }),
			secondary: new StringField({ initial: 'dex', blank: true, choices: Object.keys(FU.attributes) }),
		};
	}
}
