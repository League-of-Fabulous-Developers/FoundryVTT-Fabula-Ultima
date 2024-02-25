export class ClassFeatureDataModel extends foundry.abstract.DataModel {
	/**
	 * Template to be embedded in the class feature sheet.
	 * Receives the complete Application data as context.
	 * @return string
	 */
	static get template() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a template');
	}

	/**
	 * Template to be embedded in the actor sheet.
	 * Receives the class feature document and {@link getAdditionalData} as context.
	 * @return string
	 */
	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/feature-basic-preview.hbs';
	}

	/**
	 * @return string
	 */
	static get translation() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a translation key');
	}

	/**
	 * @param model an instance of the model
	 * @return {any} arbitrary additional data that will be accessible to the template during rendering (at `additionalData`)
	 */
	static getAdditionalData(model) {
		return undefined;
	}

	/**
	 * @return {TabsConfiguration[]}
	 */
	static getTabConfigurations() {
		return [];
	}

	/**
	 * @param {jQuery} html
	 * @param {FUItem} item
	 */
	static activateListeners(html, item) {}

	/**
	 * Adjust update formdata before the update call. Most useful to fix up Foundry array handling.
	 * @param data relevant subset of formdata submitted
	 * @return cleaned up data
	 */
	static processUpdateData(data) {
		return data;
	}

	prepareBaseData() {}

	prepareDerivedData() {}
}

export class RollableClassFeatureDataModel extends ClassFeatureDataModel {
	/**
	 * @param {RollableClassFeatureDataModel} model an instance of the RollableClassFeatureDataModel
	 * @param {FUItem} item the item the model is part of
	 */
	static roll(model, item) {
		ui.notifications.error('Subclasses of RollableClassFeatureDataModel must override the roll() function');
		throw new Error('Subclasses of RollableClassFeatureDataModel must override the roll() function');
	}
}
