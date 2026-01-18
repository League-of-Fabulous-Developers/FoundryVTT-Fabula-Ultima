/**
 * @typedef CompendiumFilterCategory
 * @property {String} label
 * @property {String} propertyPath
 * @property {FormSelectOption[]} options
 * @property {Set<String>} selected
 */

/**
 * @typedef CompendiumFilterInputOptions
 * @property {String} text
 * @property {{key: string, option: string}} filter
 */

/**
 * @desc Used for filtering the compendiums.
 */
export class CompendiumFilter {
	/**
	 * @type String
	 */
	#text;
	/**
	 * @type {Record<string, CompendiumFilterCategory>}
	 * @desc Matches against the document type;
	 */
	#categories;

	constructor() {
		this.#text = '';
		this.#categories = [];
		this.filter = this.filter.bind(this);
	}

	/**
	 * @param {CompendiumIndexEntry} entry
	 * @return {Boolean}
	 */
	filter(entry) {
		const textMatch = Object.values(entry).some((value) => {
			if (typeof value !== 'string') return false;
			if (this.text) {
				const needle = this.text.toLowerCase();
				if (!value.toLowerCase().includes(needle)) {
					return false;
				}
			}
			if (this.categories) {
				for (const category of Object.values(this.categories)) {
					if (category.selected?.size > 0) {
						const propertyValue = foundry.utils.getProperty(entry, category.propertyPath);
						if (!propertyValue || !category.selected.has(propertyValue)) {
							return false;
						}
					}
				}
			}
			return true;
		});
		return textMatch;
	}

	/**
	 * @desc Clears the filter.
	 */
	clear() {
		this.setText('');
		this.#categories = undefined;
	}

	get text() {
		return this.#text;
	}

	/**
	 * @param {Record<string, CompendiumFilterCategory>} categories Document types.
	 */
	setCategories(categories) {
		this.#categories = categories;
	}

	/**
	 * @returns {Record<string, CompendiumFilterCategory>}
	 */
	get categories() {
		return this.#categories;
	}

	setText(text) {
		this.#text = text;
	}

	/**
	 * @desc Updates an existing filter based from input.
	 * @param {String} key The id of the category.
	 * @param {String} option The value of the option being checked.
	 * @param {Boolean} checked
	 */
	toggle(key, option, checked) {
		if (!this.categories) {
			return;
		}
		const category = this.categories[key];
		if (!category.selected) {
			category.selected = new Set();
		}
		if (checked) {
			category.selected.add(option);
		} else {
			category.selected.delete(option);
		}
	}
}
