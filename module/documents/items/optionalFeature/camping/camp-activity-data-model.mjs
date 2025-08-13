import { OptionalFeatureDataModel } from '../optional-feature-data-model.mjs';

/**
 * @extends projectfu.OptionalFeatureDataModel
 * @property {string} description
 */
export class CampActivityDataModel extends OptionalFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/optional/camp-activity/feature-camp-activity-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/optional/camp-activity/feature-camp-activity-preview.hbs';
	}

	static get translation() {
		return 'FU.OptionalFeatureCampActivity';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}
}
