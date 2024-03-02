/**
 * "Abstract" base class for `Class Feature` implementations.
 * These data models are not directly tied to an {@link FUItem}, instead they are a part of the {@link ClassFeatureTypeDataModel}
 * and the used implementation can be changed at runtime.
 *
 * In the {@link ClassFeatureTypeDataModel} the actual `Class Feature` data can be found under the key `data`.
 * `Class Feature` templates should only use form inputs with names beginning with `system.data.` and refrain from
 * interfering with {@link ClassFeatureTypeDataModel} fields.
 *
 * The minimal class feature is required to implement the following:
 * * `static defineSchema()`
 * * `static get template()`
 * * `static get translation()`
 */
export class ClassFeatureDataModel extends foundry.abstract.DataModel {
	/**
	 * Partial to be embedded in the class feature sheet.
	 *
	 * The template receives the complete Application data as context.
	 * The context will have the key `additionalData` containing the result of {@link getAdditionalData}
	 * as well as `enrichedHtml` containing the enriched content for any {@link foundry.data.fields.HTMLField HTMLFields}
	 * defined in the schema.
	 *
	 * The implementing module is expected to load the partial.
	 * @return string
	 */
	static get template() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a template');
	}

	/**
	 * Template to be embedded in the item lists of the actor sheet.
	 *
	 * The template receives an Object copy of the classFeature item and with additional keys `additionalData`
	 * containing the result of {@link getAdditionalData} and `item` containing the actual item instance as context.
	 *
	 * The implementing module is expected to load the partial.
	 * @return string
	 */
	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/feature-basic-preview.hbs';
	}

	/**
	 * The translation key for the `Class Feature`.
	 * @return string
	 */
	static get translation() {
		throw new Error('Subclasses of ClassFeatureDataModel must provide a translation key');
	}

	/**
	 * Callback for additional, possibly contextual, data for use during template rendering.
	 * @param model an instance of the model
	 * @return {any} arbitrary additional data that will be accessible to the template during rendering (at `additionalData`)
	 */
	static getAdditionalData(model) {
		return undefined;
	}

	/**
	 * Configuration for sheet tabs.
	 *
	 * The tab configurations of all registered `Class Features` are combined into a single list.
	 * To avoid clashing configurations it is highly recommended to choose a unique 'group'.
	 * @return {TabsConfiguration[]}
	 */
	static getTabConfigurations() {
		return [];
	}

	/**
	 * Callback for custom HTML event handlers.
	 * For convenience the jQuery instance is scoped to the element immediately containing the rendered template.
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

	/**
	 * Callback for additional data preparation. Called during {@link Item.prepareDerivedData}.
	 */
	prepareData() {}

	/**
	 * @return {FUItem|null} the {@link FUItem} this `DataModel` belongs to or `null`
	 */
	get item() {
		return this.parent?.parent ?? null;
	}

	/**
	 * @return {FUActor|null} the {@link FUActor} this item belongs to or `null`
	 */
	get actor() {
		return this.item?.actor ?? null;
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
