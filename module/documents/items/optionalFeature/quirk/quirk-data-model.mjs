import { OptionalFeatureDataModel } from '../optional-feature-data-model.mjs';

/**
 * @extends OptionalFeatureDataModel
 * @property {string} description
 */
export class QuirkDataModel extends OptionalFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/optional/quirk/feature-quirk-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/optional/quirk/feature-quirk-preview.hbs';
	}

	static get translation() {
		return 'FU.Quirk';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}
}
