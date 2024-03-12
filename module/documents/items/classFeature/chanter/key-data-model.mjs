import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU } from '../../../../helpers/config.mjs';

const recoveryOptions = {
	hp: 'FU.HealthPoints',
	mp: 'FU.MindPoints',
};

const statuses = {
	slow: 'FU.Slow',
	dazed: 'FU.Dazed',
	weak: 'FU.Weak',
	shaken: 'FU.Shaken',
	enraged: 'FU.Enraged',
	poisoned: 'FU.Poisoned',
};

/**
 * @extends ClassFeatureDataModel
 * @property {DamageType} type
 * @property {"slow","dazed","weak","shaken","enraged","poisoned"} status
 * @property {Attribute} attribute
 * @property {"hp","mp"} recovery
 */
export class KeyDataModel extends ClassFeatureDataModel {
	static get recoveryOptions() {
		return recoveryOptions;
	}

	static get statuses() {
		return statuses;
	}

	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			type: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes) }),
			status: new StringField({ initial: 'slow', choices: Object.keys(statuses) }),
			attribute: new StringField({ initial: 'dex', choices: Object.keys(FU.attributeAbbreviations) }),
			recovery: new StringField({ initial: 'hp', choices: Object.keys(recoveryOptions) }),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureKey';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-key-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/chanter/feature-key-preview.hbs';
	}

	static getAdditionalData(model) {
		return {
			types: FU.damageTypes,
			statuses: KeyDataModel.statuses,
			attributes: FU.attributes,
			attributeAbbreviations: FU.attributeAbbreviations,
			recoveryOptions: KeyDataModel.recoveryOptions,
		};
	}
}
