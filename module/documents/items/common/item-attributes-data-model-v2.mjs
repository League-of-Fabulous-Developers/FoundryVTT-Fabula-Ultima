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

	static migrateData(source) {
		source = super.migrateData(source);
		migrateAttributes(source);
		return source;
	}
}

function migrateAttributes(source) {
	if (typeof source.primary === 'object' && 'value' in source.primary) {
		source.primary = source.primary.value ?? 'dex';
	}
	if (typeof source.secondary === 'object' && 'value' in source.secondary) {
		source.secondary = source.secondary.value ?? 'ins';
	}
}
