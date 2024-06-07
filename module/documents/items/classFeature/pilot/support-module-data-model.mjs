import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

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

	static getAdditionalData(model) {
		return {
			vehicle: model.actor?.system.vehicle.vehicle,
			active: model.actor?.system.vehicle.supports.includes(model.item) ?? false,
		};
	}

	transferEffects() {
		return this.actor.system.vehicle.embarked && this.actor.system.vehicle.supports.includes(this.item);
	}
}
