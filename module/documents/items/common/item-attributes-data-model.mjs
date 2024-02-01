import {FU} from '../../../helpers/config.mjs';

/**
 * @property {"dex", "ins", "mig", "wlp"} primary.value
 * @property {"dex", "ins", "mig", "wlp"} secondary.value
 */
export class ItemAttributesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, StringField } = foundry.data.fields;
		return {
			primary: new SchemaField({ value: new StringField({ initial: 'dex', blank: true, choices: Object.keys(FU.attributes) }) }),
			secondary: new SchemaField({ value: new StringField({ initial: 'dex', blank: true, choices: Object.keys(FU.attributes) }) }),
		};
	}
}
