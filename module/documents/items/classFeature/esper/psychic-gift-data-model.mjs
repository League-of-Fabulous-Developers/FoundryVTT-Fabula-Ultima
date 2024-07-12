import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} trigger
 * @property {string} description
 */
export class PsychicGiftDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			trigger: new StringField(),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/esper/psychic-gift-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/esper/psychic-gift-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeaturePsychicGiftLabel';
	}
}
