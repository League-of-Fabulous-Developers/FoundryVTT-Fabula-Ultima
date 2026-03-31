/**
 * @desc Used in system-provided to allow modules to extend specific sheets.
 */
export class SheetExtensions {
	/** @type {Record<HandlebarsTemplatePart>} **/
	#parts = {};
	/** @type {Record<ApplicationTab>} **/
	#tabs = {};
	/** @type {Record<string, function>} **/
	#prepareContext = {};

	/**
	 * @param {String} id
	 * @param {ApplicationTab} tab
	 * @param {HandlebarsTemplatePart} part
	 * @param {function}  prepareContext
	 * @remarks No need to repeat the id in tab and part.
	 */
	registerTab(id, tab, part, prepareContext) {
		this.#parts[id] = {
			id: id,
			...part,
		};
		this.#tabs[id] = {
			id: id,
			...tab,
		};
		this.#prepareContext[id] = prepareContext;
	}

	async prepareContext(options) {
		for (const id in this.#prepareContext) {
			await this.#prepareContext[id](options);
		}
	}

	prepareTabs(tabs) {
		for (const id in this.#tabs) {
			tabs[id] = this.#tabs[id];
		}
	}

	configureRenderParts(parts) {
		for (const id in this.#parts) {
			parts[id] = this.#parts[id];
		}
	}
}
