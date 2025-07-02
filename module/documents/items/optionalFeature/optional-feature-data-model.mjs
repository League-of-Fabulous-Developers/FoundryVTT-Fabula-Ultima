import { FeatureDataModel } from '../feature-data-model.mjs';

export class OptionalFeatureDataModel extends FeatureDataModel {
	static defineSchema() {
		return {};
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/optional/feature-basic-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/optional/feature-basic-description.hbs';
	}
}

/**
 * Subclass of {@link OptionalFeatureDataModel} that provides an additional callback for dice rolling or other advanced interaction.
 */
export class RollableOptionalFeatureDataModel extends OptionalFeatureDataModel {
	/**
	 * Callback for when the user clicks on the item icon in the character sheet.
	 * @param {RollableOptionalFeatureDataModel} model the model
	 * @param {FUItem} item the item the model is part of
	 * @param {boolean} shiftClick if the button was shift-clicked
	 */
	static roll(model, item, shiftClick) {
		throw new Error('Subclasses of RollableOptionalFeatureDataModel must override the roll() function');
	}
}
