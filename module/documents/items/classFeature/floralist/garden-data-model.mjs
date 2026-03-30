import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

/**
 * @extends projectfu.ClassFeatureDataModel
 */
export class GardenDataModel extends ClassFeatureDataModel {
	static get template() {
		return 'systems/projectfu/templates/feature/floralist/garden-sheet.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureGarden';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/floralist/garden-preview.hbs';
	}

	static getAdditionalData(model) {
		return {
			isCharacter: model.actor?.type === 'character',
			active: model.actor?.system?.floralist?.garden === model.item,
		};
	}
}
