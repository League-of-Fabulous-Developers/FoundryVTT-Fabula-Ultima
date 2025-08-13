import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} description
 */
export class TherioformDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/mutant/therioform-sheet.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureTherioformLabel';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}
}
