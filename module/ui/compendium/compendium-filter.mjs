/**
 * @typedef CompendiumFilterCategory
 * @property {String} label
 * @property {String} propertyPath
 * @property {FormSelectOption[]} options
 * @property {Set<String>} selected
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
		if (this.text) {
			const needle = this.text.toLowerCase();
			const textMatch = Object.values(entry).some((value) => {
				if (typeof value !== 'string') return false;
				return value.toLowerCase().includes(needle);
			});
			if (!textMatch) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @desc Clears the filter.
	 */
	clear() {
		this.setText('');
		this.filters = [];
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
		const category = this.#categories[key];
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
