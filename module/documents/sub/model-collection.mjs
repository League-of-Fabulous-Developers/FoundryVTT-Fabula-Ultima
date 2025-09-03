/** @import DataModel from "@common/abstract/data.mjs" */

/**
 * Specialized collection type for stored data models.
 * @param {Array<string, DataModel>} entries    Array containing the data models to store.
 * @template {DataModel} Model The model class contained by this collection.
 * @extends {foundry.utils.Collection<string, Model>}
 */
export class ModelCollection extends foundry.utils.Collection {
	/* -------------------------------------------------- */
	/*  Properties                                        */
	/* -------------------------------------------------- */

	/**
	 * Pseudo-document base model.
	 * @type {typeof ds.data.pseudoDocuments.PseudoDocument}
	 */
	documentClass;

	/* -------------------------------------------------- */

	/**
	 * Pre-organized arrays of data models by type.
	 * @type {Map<string, Set<string>>}
	 */
	#types = new Map();

	/* -------------------------------------------------- */

	/**
	 * The data models that originate from this parent document.
	 * @type {Model[]}
	 */
	get sourceContents() {
		return this.filter((model) => model.isSource);
	}

	/* -------------------------------------------------- */

	/**
	 * A set of the un-initialized pseudo-documents.
	 * Stored safely for debugging purposes.
	 * @type {Set<object>}
	 */
	#invalid = new Set();

	/* -------------------------------------------------- */
	/*  Methods                                           */
	/* -------------------------------------------------- */

	/**
	 * Fetch an array of data models of a certain type.
	 * @param {string} type     The subtype of the data models.
	 * @returns {Model[]}   The data models of this type.
	 */
	getByType(type) {
		return Array.from(this.#types.get(type) ?? []).map((key) => this.get(key));
	}

	/* -------------------------------------------------- */

	/** @inheritdoc */
	set(key, value) {
		if (!this.#types.has(value.type)) this.#types.set(value.type, new Set());
		this.#types.get(value.type).add(key);
		return super.set(key, value);
	}

	/* -------------------------------------------------- */

	/**
	 * Store invalid pseudo-documents.
	 * @param {object} value    The un-initialized data model.
	 */
	setInvalid(value) {
		this.#invalid.add(value);
	}

	/* -------------------------------------------------- */

	/** @inheritdoc */
	delete(key) {
		this.#types.get(this.get(key)?.type)?.delete(key);
		return super.delete(key);
	}

	/* -------------------------------------------------- */

	/**
	 * Test the given predicate against every entry in the Collection.
	 * @param {function(*, number, ModelCollection): boolean} predicate   The predicate.
	 * @returns {boolean}
	 */
	every(predicate) {
		return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
	}

	/* -------------------------------------------------- */

	/**
	 * Convert the ModelCollection to an array of simple objects.
	 * @returns {object[]}    The extracted array of primitive objects.
	 */
	toObject() {
		return this.map((doc) => doc.toObject(true));
	}
}
