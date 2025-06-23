import { FeatureDataModel } from '../feature-data-model.mjs';

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

/**
 * Subclass of {@link ClassFeatureDataModel} that provides an additional callback for dice rolling or other advanced interaction.
 */
export class RollableClassFeatureDataModel extends ClassFeatureDataModel {
	/**
	 * Callback for when the user clicks on the item icon in the character sheet.
	 * @param {RollableClassFeatureDataModel} model the model
	 * @param {FUItem} item the item the model is part of
	 * @param {boolean} shiftClick if the button was shift-clicked
	 */
	static roll(model, item, shiftClick) {
		throw new Error('Subclasses of RollableClassFeatureDataModel must override the roll() function');
	}
}
