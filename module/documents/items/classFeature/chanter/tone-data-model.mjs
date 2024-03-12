import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} description
 */
export class ToneDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureTone';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-tone-sheet.hbs';
	}

	static async getAdditionalData(model) {
		return {
			rollData: {
				key: {
					type: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyDamageType'),
					status: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyStatus'),
					attribute: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyAttribute'),
					recovery: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyRecovery'),
				},
				attribute: {
					dex: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeDex') }),
					ins: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeIns') }),
					mig: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeMig') }),
					wlp: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeWlp') }),
				},
			},
		};
	}
}
