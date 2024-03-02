import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} domains
 * @property {string} merge
 * @property {string} dismiss
 */
export class ArcanumDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			domains: new StringField(),
			merge: new HTMLField(),
			dismiss: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/arcanist/feature-arcanum-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/arcanist/feature-arcanum-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureArcanum';
	}
}
