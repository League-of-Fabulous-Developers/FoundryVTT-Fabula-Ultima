import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {boolean} complex
 * @property {string} description
 */
export class SupportModuleDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { BooleanField, HTMLField } = foundry.data.fields;
		return {
			complex: new BooleanField(),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/pilot/support-module-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/pilot/support-module-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureSupportModule';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			vehicle: model.actor?.system.vehicle.vehicle,
			active: model.actor?.system.vehicle.supports.includes(model.item) ?? false,
		};
	}

	transferEffects() {
		return this.actor.system.vehicle.embarked && this.actor.system.vehicle.supports.includes(this.item);
	}
}
