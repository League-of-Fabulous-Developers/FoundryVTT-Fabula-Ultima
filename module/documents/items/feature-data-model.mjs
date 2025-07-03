export class FeatureDataModel extends foundry.abstract.DataModel {
	/**
	 * @return {string} Template path for sheet rendering.
	 */
	static get template() {
		throw new Error(`Subclasses of ${this.name} must provide a template`);
	}

	/**
	 * @return {string} Template path for preview rendering.
	 */
	static get previewTemplate() {
		throw new Error(`Subclasses of ${this.name} must provide a previewTemplate`);
	}

	/**
	 * @return {string} Template path for expanded view.
	 */
	static get expandTemplate() {
		throw new Error(`Subclasses of ${this.name} must provide an expandTemplate`);
	}

	/**
	 * @return {string} Translation key.
	 */
	static get translation() {
		throw new Error(`Subclasses of ${this.name} must provide a translation`);
	}

	/**
	 * @param {FeatureDataModel} model
	 * @return {any} Additional data to pass to templates.
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
	 * @param {HTMLElement} html
	 * @param {FUItem} item
	 * @param {*} sheet
	 */
	static activateListeners(html, item, sheet) {}

	/**
	 * Clean or adjust form update data.
	 * @param {object} data
	 * @param {FeatureDataModel} [model]
	 * @return {object}
	 */
	static processUpdateData(data, model) {
		return data;
	}

	/**
	 * Optional hook for derived data prep.
	 */
	prepareData() {}

	/**
	 * @return {FUItem|null}
	 */
	get item() {
		return this.parent?.parent ?? null;
	}

	/**
	 * @return {FUActor|null}
	 */
	get actor() {
		return this.item?.actor ?? null;
	}
}
