export default class PseudoDocumentCollection extends foundry.utils.Collection {
	/**
	 * @param {string} name           The name of this collection in the parent Document.
	 * @param {DataModel} parent      The parent DataModel instance to which this collection belongs.
	 * @param {object[]} sourceArray  The source data array for the collection in the parent Document data.
	 */
	constructor(name, parent, sourceArray) {
		super();
		Object.defineProperties(this, {
			_source: { value: sourceArray, writable: false },
			documentClass: { value: parent.constructor.schema.fields[name].element, writable: false },
			name: { value: name, writable: false },
			model: { value: parent, writable: false },
		});
	}

	/**
	 * The Document implementation used to construct instances within this collection.
	 * @type {typeof PseudoDocument}
	 */
	documentClass;

	/**
	 * The name of this collection in the parent Document.
	 * @type {string}
	 */
	name;

	/**
	 * The parent DataModel to which this EmbeddedCollection instance belongs.
	 * @type {DataModel}
	 */
	model;

	/**
	 * Has this embedded collection been initialized as a one-time workflow?
	 * @type {boolean}
	 * @protected
	 */
	_initialized = false;

	/**
	 * The source data array from which the embedded collection is created
	 * @type {object[]}
	 * @private
	 */
	_source;

	/**
	 * Record the set of document ids where the Document was not initialized because of invalid source data
	 * @type {Set<string>}
	 */
	invalidDocumentIds = new Set();

	/* -------------------------------------------- */

	/**
	 * Instantiate a Document for inclusion in the Collection.
	 * @param {object} data       The Document data.
	 * @param {DocumentConstructionContext} [context]  Document creation context.
	 * @returns {PseudoDocument}
	 */
	createDocument(data, context = {}) {
		return new this.documentClass(data, {
			...context,
			parent: this.model,
			parentCollection: this.name,
		});
	}

	/* -------------------------------------------- */

	/**
	 * Initialize the EmbeddedCollection object by constructing its contained Document instances
	 * @param {DocumentConstructionContext} [options]  Initialization options.
	 */
	initialize(options = {}) {
		// Repeat initialization
		if (this._initialized) {
			for (let doc of this.values()) {
				const sourceDoc = this._source.find((srcDoc) => srcDoc._id === doc._id);
				if (!sourceDoc) {
					this.delete(doc._id, { modifySource: false });
					doc._onDelete();
				}
			}
			for (const src of this._source) {
				if (this.has(src._id)) {
					this.get(src._id).updateSource(src);
				} else {
					this._initializeDocument(src, options);
				}
			}
			return;
		}

		// First-time initialization
		this.clear();
		for (const d of this._source) {
			this._initializeDocument(d, options);
		}
		this._initialized = true;
	}

	/**
	 * @param {(foundry.abstract.DataModel | object)[]} data
	 * @param options
	 */
	updateSource(data, options = {}) {
		this._source.splice(0, this._source.length, ...data);
		this.initialize(options);
	}

	/* -------------------------------------------- */

	/**
	 * Initialize an embedded document and store it in the collection.
	 * @param {object} data                    The Document data.
	 * @param {DocumentConstructionContext} [context]  Context to configure Document initialization.
	 * @protected
	 */
	_initializeDocument(data, context) {
		if (!data._id) {
			data._id = foundry.utils.randomID(16);
		}
		let doc;
		try {
			doc = this.createDocument(data, context);
			this.set(doc.id, doc, { modifySource: false });
		} catch (err) {
			this._handleInvalidDocument(data._id, err, context);
		}
	}

	/* -------------------------------------------- */

	/**
	 * Log warnings or errors when a Document is found to be invalid.
	 * @param {string} id                      The invalid Document's ID.
	 * @param {Error} err                      The validation error.
	 * @param {object} [options]               Options to configure invalid Document handling.
	 * @param {boolean} [options.strict=true]  Whether to throw an error or only log a warning.
	 * @protected
	 */
	_handleInvalidDocument(id, err, { strict = true } = {}) {
		const docName = this.documentClass.documentName;
		const parent = this.model;
		this.invalidDocumentIds.add(id);

		// Wrap the error with more information
		const uuid = `${parent.uuid}.${docName}.${id}`;
		const msg = `Failed to initialize ${docName} [${uuid}]:\n${err.message}`;
		const error = new Error(msg, { cause: err });

		if (strict) {
			globalThis.logger.error(error);
		} else {
			globalThis.logger.warn(error);
		}
		if (globalThis.Hooks && strict) {
			Hooks.onError(`${this.constructor.name}#_initializeDocument`, error, { id, documentName: docName });
		}
	}

	/* -------------------------------------------- */

	/**
	 * Get an element from the EmbeddedCollection by its ID.
	 * @param {string} id                        The ID of the Embedded Document to retrieve.
	 * @param {object} [options]                 Additional options to configure retrieval.
	 * @param {boolean} [options.strict=false]   Throw an Error if the requested Embedded Document does not exist.
	 * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Embedded Document.
	 * @returns {PseudoDocument}
	 * @throws If strict is true and the Embedded Document cannot be found.
	 */
	get(id, { invalid = false, strict = false } = {}) {
		let result = super.get(id);
		if (!result && invalid) {
			result = this.getInvalid(id, { strict: false });
		}
		if (!result && strict) {
			throw new Error(`${this.constructor.documentName} id [${id}] does not exist in the ` + `${this.constructor.name} collection.`);
		}
		return result;
	}

	/* ---------------------------------------- */

	/**
	 * Add an item to the collection.
	 * @param {string} key                           The embedded Document ID.
	 * @param {Document} value                       The embedded Document instance.
	 * @param {object} [options]                     Additional options to the set operation.
	 * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
	 * */
	set(key, value, { modifySource = true, ...options } = {}) {
		if (modifySource) {
			this._set(key, value, options);
		}
		return super.set(key, value);
	}

	/* -------------------------------------------- */

	/**
	 * Modify the underlying source array to include the Document.
	 * @param {string} key      The Document ID key.
	 * @param {PseudoDocument} value  The Document.
	 * @protected
	 */
	_set(key, value) {
		if (this.has(key) || this.invalidDocumentIds.has(key)) {
			this._source.findSplice((d) => d._id === key, value._source);
		} else {
			this._source.push(value._source);
		}
	}

	/* ---------------------------------------- */

	/**
	 * @param {string} key                           The embedded Document ID.
	 * @param {object} [options]                     Additional options to the delete operation.
	 * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
	 * */
	delete(key, { modifySource = true, ...options } = {}) {
		if (modifySource) {
			this._delete(key, options);
		}
		return super.delete(key);
	}

	/* -------------------------------------------- */

	/**
	 * Remove the value from the underlying source array.
	 * @param {string} key        The Document ID key.
	 * @param {object} [options]  Additional options to configure deletion behavior.
	 * @protected
	 */
	_delete(key, options = {}) {
		if (this.has(key) || this.invalidDocumentIds.has(key)) {
			this._source.findSplice((d) => d._id === key);
		}
	}

	/* ---------------------------------------- */

	/**
	 * Obtain a temporary Document instance for a document id which currently has invalid source data.
	 * @param {string} id                      A document ID with invalid source data.
	 * @param {object} [options]               Additional options to configure retrieval.
	 * @param {boolean} [options.strict=true]  Throw an Error if the requested ID is not in the set of invalid IDs for
	 *                                         this collection.
	 * @returns {PseudoDocument}                     An in-memory instance for the invalid Document
	 * @throws If strict is true and the requested ID is not in the set of invalid IDs for this collection.
	 */
	getInvalid(id, { strict = true } = {}) {
		if (!this.invalidDocumentIds.has(id)) {
			if (strict) {
				throw new Error(`${this.constructor.documentName} id [${id}] is not in the set of invalid ids`);
			}
			return;
		}
		const data = this._source.find((d) => d._id === id);
		return this.documentClass.fromSource(foundry.utils.deepClone(data), { parent: this.model });
	}

	/* ---------------------------------------- */

	/**
	 * Convert the EmbeddedCollection to an array of simple objects.
	 * @param {boolean} [source=true]     Draw data for contained Documents from the underlying data source?
	 * @returns {object[]}                The extracted array of primitive objects
	 */
	toObject(source = true) {
		const arr = [];
		for (let doc of this.values()) {
			arr.push(doc.toObject(source));
		}
		return arr;
	}
}
