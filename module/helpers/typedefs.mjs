import { FeatureDataModel } from '../documents/items/feature-data-model.mjs';

export class ClassFeatureDataModel extends FeatureDataModel {
	static get template() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a template');
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/feature-basic-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/feature/feature-basic-description.hbs';
	}

	static get translation() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a translation key');
	}
}
