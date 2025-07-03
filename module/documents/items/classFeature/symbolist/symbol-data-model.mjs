import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} description
 */
export class SymbolDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureSymbol';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/symbolist/feature-symbol-sheet.hbs';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}
}
