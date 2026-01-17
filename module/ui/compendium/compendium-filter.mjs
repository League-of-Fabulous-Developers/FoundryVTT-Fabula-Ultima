export class CompendiumFilter {
	/**
	 * @type String
	 */
	#text;

	constructor() {
		this.#text = '';
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
	}

	get text() {
		return this.#text;
	}

	setText(text) {
		this.#text = text;
	}
}
