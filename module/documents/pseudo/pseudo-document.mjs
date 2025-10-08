import { PseudoDocumentCollectionField } from './pseudo-document-collection-field.mjs';

export class PseudoDocument extends foundry.abstract.DataModel {
	constructor(...args) {
		super(...args);

		/**
		 * A collection of Application instances which should be re-rendered whenever this document is updated.
		 * The keys of this object are the application ids and the values are Application instances. Each
		 * Application in this object will have its render method called by {@link Document#render}.
		 * @type {Record<string,Application|ApplicationV2>}
		 * @see {@link PseudoDocument#render}
		 */
		Object.defineProperty(this, 'apps', {
			value: {},
			writable: false,
			enumerable: false,
		});

		/**
		 * A cached reference to the FormApplication instance used to configure this Document.
		 * @type {FormApplication|null}
		 * @private
		 */
		Object.defineProperty(this, '_sheet', { value: null, writable: true, enumerable: false });
	}

	_configure({ parentCollection = null } = {}) {
		if (this.schema.fields['_id'] && (!Object.getOwnPropertyDescriptor(this, '_id') || this._id === null)) {
			const field = this.schema.fields['_id'];
			const sourceValue = this._source['_id'];
			const value = field.initialize(sourceValue, this, {});
			Object.defineProperty(this, '_id', { value, writable: true, configurable: true });
		}

		/**
		 * An immutable reverse-reference to the name of the collection that this Document exists in on its parent, if any.
		 * @type {string|null}
		 */
		Object.defineProperty(this, 'parentCollection', {
			value: this._getParentCollection(parentCollection),
			writable: false,
		});

		// Construct Embedded Collections
		const collections = {};
		for (const [fieldName, field] of Object.entries(this.constructor.schema.fields)) {
			if (field instanceof PseudoDocumentCollectionField) {
				const data = this._source[fieldName];
				const c = (collections[fieldName] = new field.constructor.implementation(fieldName, this, data));
				Object.defineProperty(this, fieldName, { value: c, writable: true });
			}
		}

		/**
		 * A mapping of embedded PseudoDocument collections which exist in this model.
		 * @type {Record<string, Collection>}
		 */
		Object.defineProperty(this, 'collections', { value: Object.seal(collections), writable: false });

		/**
		 * A mapping of embedded PseudoDocument collections which exist
		 */
		Object.defineProperty(this, 'nestedCollections', { value: {}, writable: false });
	}

	_initialize(options) {
		super._initialize(options);
		if (!game._documentsReady) return;
		if (this.parent?.collections[this.parentCollection]?._initialized === false) {
			return; // Skip documents in uninitialized embedded collections
		}
		Object.entries(this.collections).forEach(([fieldName, collection]) => {
			collection.updateSource(this._source[fieldName]);
		});
		setTimeout(() => this.render());
		this._safePrepareData();
	}

	static get metadata() {
		return Object.freeze({
			coreTypes: [],
			hasTypeData: false,
			label: 'PseudoDocument',
		});
	}

	static get TYPES() {
		return Object.keys(game.model[this.documentName]);
	}

	static get documentName() {
		throw new Error('PseudoDocuments must define their document name');
	}
	get documentName() {
		return this.constructor.documentName;
	}

	static get hasTypeData() {
		return this.metadata.hasTypeData;
	}

	static get schema() {
		if (this._schema) {
			return this._schema;
		}
		const base = this.baseDocument;
		// eslint-disable-next-line no-prototype-builtins
		if (!base.hasOwnProperty('_schema')) {
			const schema = new foundry.data.fields.SchemaField(Object.freeze(base.defineSchema()));
			Object.defineProperty(base, '_schema', { value: schema, writable: false });
		}
		Object.defineProperty(this, '_schema', { value: base._schema, writable: false });
		return base._schema;
	}

	static get baseDocument() {
		let cls;
		let parent = this;
		while (parent) {
			cls = parent;
			parent = Object.getPrototypeOf(cls);
			if (parent === PseudoDocument) {
				return cls;
			}
		}
		throw new Error(`Base PseudoDocument class identification failed for "${this.documentName}"`);
	}

	/**
	 * Gets the default new name for a Document
	 * @param {object} context                    The context for which to create the Document name.
	 * @param {string} [context.type]             The sub-type of the document
	 * @param {Document|null} [context.parent]    A parent document within which the created Document should belong
	 * @param {string|null} [context.pack]        A compendium pack within which the Document should be created
	 * @returns {string}
	 */
	static defaultName({ type, parent, pack } = {}) {
		const documentName = this.documentName;
		let baseNameKey = this.metadata.label;
		if (type && this.hasTypeData) {
			const typeNameKey = CONFIG[documentName].typeLabels?.[type];
			if (typeNameKey && game.i18n.has(typeNameKey)) baseNameKey = typeNameKey;
		}
		return game.i18n.localize(baseNameKey);
	}

	get id() {
		return this._id;
	}

	_getParentCollection(parentCollection) {
		if (parentCollection) return parentCollection;
		return this.schema.parent.name;
	}

	/**
	 * Return a reference to the parent Collection instance that contains this Document.
	 * @this {PseudoDocument}
	 * @returns {Collection|null}
	 */
	get collection() {
		return this.parent[this.parentCollection];
	}

	/**
	 * The Document this PseudoDocument belongs to. May be nested multiple layers deep.
	 * @return {null|foundry.abstract.Document}
	 */
	get parentFoundryDocument() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof foundry.abstract.Document) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * The Document or PseudoDocument this PseudoDocument is nested in.
	 * @return {null|foundry.abstract.Document|PseudoDocument}
	 */
	get parentDocument() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof foundry.abstract.Document || current instanceof PseudoDocument) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * @return {Actor|null}
	 */
	get actor() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof Actor) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * @return {Item|null}
	 */
	get item() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof Item) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * A Universally Unique Identifier (uuid) for this PseudoDocument instance.
	 * @type {string}
	 */
	get uuid() {
		return [this.parentDocument.uuid, this.constructor.documentName, this.id].join('.');
	}

	/**
	 * A boolean indicator for whether the current game User has ownership rights for this Document.
	 * Different Document types may have more specialized rules for what constitutes ownership.
	 * @type {boolean}
	 * @memberof ClientDocumentMixin#
	 */
	get isOwner() {
		return this.testUserPermission(game.user, 'OWNER');
	}

	get sheet() {
		if (!this._sheet) {
			const cls = this._getSheetClass();

			// Application V1 Document Sheets
			if (foundry.utils.isSubclass(cls, foundry.appv1.api.Application)) {
				this._sheet = new cls(this, { editable: this.isOwner });
			}

			// Application V2 Document Sheets
			else if (foundry.utils.isSubclass(cls, foundry.applications.api.DocumentSheetV2)) {
				this._sheet = new cls({ document: this });
			}

			// No valid sheet class
			else {
				this._sheet = null;
			}
		}
		return this._sheet;
	}

	get isEmbedded() {
		return true;
	}

	get isPseudoDocument() {
		return true;
	}

	/**
	 * Obtain the FormApplication class constructor which should be used to configure this Document.
	 * @returns {Function|null}
	 * @private
	 */
	_getSheetClass() {
		const cfg = CONFIG[this.documentName];
		const type = this.type ?? CONST.BASE_DOCUMENT_TYPE;
		const sheets = cfg.sheetClasses[type] || {};

		// Sheet selection overridden at the instance level
		const override = this.getFlag('core', 'sheetClass') ?? null;
		if (override !== null && override in sheets) return sheets[override].cls;

		// Default sheet selection for the type
		const classes = Object.values(sheets);
		// it's a foundry global
		// eslint-disable-next-line no-undef
		if (!classes.length) return BaseSheet;
		return (classes.find((s) => s.default) ?? classes.pop()).cls;
	}

	/**
	 * Handle clicking on a content link for this document.
	 * @param {MouseEvent} event    The triggering click event.
	 * @returns {any}
	 * @protected
	 */
	_onClickDocumentLink(event) {
		return this.sheet.render(true);
	}

	toObject(source = true) {
		const data = super.toObject(source);
		return this.constructor.shimData(data);
	}

	/**
	 * Get the value of a "flag" for this document
	 * See the setFlag method for more details on flags
	 *
	 * @param {string} scope        The flag scope which namespaces the key
	 * @param {string} key          The flag key
	 * @return {*}                  The flag value
	 */
	getFlag(scope, key) {
		const scopes = globalThis.CONFIG.DatabaseBackend.getFlagScopes();
		if (!scopes.includes(scope)) {
			throw new Error(`Flag scope "${scope}" is not valid or not currently active`);
		}

		if (!this.flags || !(scope in this.flags)) {
			return undefined;
		}
		return foundry.utils.getProperty(this.flags?.[scope], key);
	}

	/* -------------------------------------------- */

	/**
	 * Assign a "flag" to this document.
	 * Flags represent key-value type data which can be used to store flexible or arbitrary data required by either
	 * the core software, game systems, or user-created modules.
	 *
	 * Each flag should be set using a scope which provides a namespace for the flag to help prevent collisions.
	 *
	 * Flags set by the core software use the "core" scope.
	 * Flags set by game systems or modules should use the canonical name attribute for the module
	 * Flags set by an individual world should "world" as the scope.
	 *
	 * Flag values can assume almost any data type. Setting a flag value to null will delete that flag.
	 *
	 * @param {string} scope        The flag scope which namespaces the key
	 * @param {string} key          The flag key
	 * @param {*} value             The flag value
	 * @return {Promise<Document>}  A Promise resolving to the updated document
	 */
	async setFlag(scope, key, value) {
		const scopes = globalThis.CONFIG.DatabaseBackend.getFlagScopes();
		if (!scopes.includes(scope)) {
			throw new Error(`Flag scope "${scope}" is not valid or not currently active`);
		}
		return this.update({
			flags: {
				[scope]: {
					[key]: value,
				},
			},
		});
	}

	/**
	 * Remove a flag assigned to the document
	 * @param {string} scope        The flag scope which namespaces the key
	 * @param {string} key          The flag key
	 * @return {Promise<Document>}  The updated document instance
	 */
	async unsetFlag(scope, key) {
		const scopes = globalThis.CONFIG.DatabaseBackend.getFlagScopes();
		if (!scopes.includes(scope)) {
			throw new Error(`Flag scope "${scope}" is not valid or not currently active`);
		}
		const head = key.split('.');
		const tail = `-=${head.pop()}`;
		key = ['flags', scope, ...head, tail].join('.');
		return this.update({ [key]: null });
	}

	/**
	 * Update this Document using incremental data, saving it to the database.
	 * @see PseudoDocument.updateDocuments
	 * @param {object} [data={}]          Differential update data which modifies the existing values of this document
	 * @param {Partial<Omit<DatabaseUpdateOperation, "updates">>} [operation={}]  Parameters of the update operation
	 * @returns {Promise<PseudoDocument>}       The updated Document instance
	 */
	async update(data = {}, operation = {}) {
		data._id = this.id;
		this.constructor.updateDocuments([data], { parent: this.parent });
		return this;
	}

	/**
	 * Render all Application instances which are connected to this document by calling their respective
	 * @see Application#render
	 * @param {boolean} [force=false]     Force rendering
	 * @param {object} [context={}]       Optional context
	 * @memberof ClientDocumentMixin#
	 */
	render(force = false, context = {}) {
		for (let app of Object.values(this.apps)) {
			app.render(force, foundry.utils.deepClone(context));
		}
	}

	/**
	 * Create multiple Documents using provided input data.
	 * Data is provided as an array of objects where each individual object becomes one new Document.
	 *
	 * @param {Array<object|PseudoDocument>} data  An array of data objects or existing pseudo documents to persist.
	 * @param {Partial<{parent: PseudoDocument | EnablePseudoDocumentsMixin}>} operation={}  Parameters of the requested creation
	 *                                  operation
	 * @return {Promise<PseudoDocument[]>}
	 */
	static async createDocuments(data = [], { parent } = {}) {
		if (!parent) {
			throw new Error('PseudoDocument operations require a parent');
		}
		const collection = parent.getEmbeddedCollection(this.documentName);
		const documents = [];
		for (let initialData of data) {
			initialData._id = foundry.utils.randomID();
			const document = collection.createDocument(initialData);
			documents.push(document.toObject(true));
		}

		let { changeObject, nestedCollection } = this._gatherChangeData(parent);
		console.log(changeObject, nestedCollection);
		nestedCollection.push(...documents);
		await parent.parentFoundryDocument.update(changeObject);
		const newDocuments = data.map((value) => collection.get(value._id));
		console.log(
			'PseudoDocuments created',
			data,
			newDocuments,
			data.map((value, index) => value === newDocuments[index]),
		);
		return newDocuments;
	}

	/**
	 * Update multiple Document instances using provided differential data.
	 * Data is provided as an array of objects where each individual object updates one existing Document.
	 *
	 * @param {object[]} updates          An array of differential data objects, each used to update a single Document
	 * @param {Partial<{parent: PseudoDocument | EnablePseudoDocumentsMixin}>} operation={} Parameters of the database update
	 *                                    operation
	 * @return {Promise<PseudoDocument[]>}      An array of updated Document instances
	 */
	static async updateDocuments(updates = [], { parent } = {}) {
		if (!parent) {
			throw new Error('PseudoDocument operations require a parent');
		}

		const collection = parent.getEmbeddedCollection(this.documentName);

		let { changeObject, nestedCollection } = this._gatherChangeData(parent);
		for (const update of updates) {
			const item = nestedCollection.find((item) => item._id === update._id);
			const expandedUpdate = foundry.utils.expandObject(update);
			console.log(foundry.utils.duplicate(item), foundry.utils.duplicate(expandedUpdate), foundry.utils.diffObject(item, expandedUpdate, { deletionKeys: true }));
			foundry.utils.mergeObject(item, expandedUpdate, {});
			console.log(foundry.utils.duplicate(item), foundry.utils.duplicate(expandedUpdate), foundry.utils.diffObject(item, expandedUpdate, { deletionKeys: true }));
		}
		await parent.parentFoundryDocument.update(changeObject);
		const updated = updates.map((value) => collection.get(value._id));
		setTimeout(() => updated.forEach((document) => document.render(false, { renderContext: 'update', renderData: document })));
		console.log('PseudoDocuments updated', updates, updated);
		return updated;
	}

	/**
	 * Delete one or multiple existing Documents using an array of provided ids.
	 * Data is provided as an array of string ids for the documents to delete.
	 *
	 * @param {string[]} ids              An array of string ids for the documents to be deleted
	 * @param {Partial<{parent: PseudoDocument | EnablePseudoDocumentsMixin}>} operation={}  Parameters of the database deletion
	 *                                    operation
	 * @return {Promise<PseudoDocument>}      An array of deleted Document instances
	 */
	static async deleteDocuments(ids = [], { parent } = {}) {
		if (!parent) {
			throw new Error('PseudoDocument operations require a parent');
		}
		const collection = parent.getEmbeddedCollection(this.documentName);
		const deletedDocuments = ids.map((id) => collection.get(id)).filter((value) => !!value);
		let { changeObject, nestedCollection } = this._gatherChangeData(parent);
		nestedCollection.splice(0, nestedCollection.length, ...nestedCollection.filter((value) => !ids.includes(value._id)));
		await parent.parentFoundryDocument.update(changeObject);
		setTimeout(() => deletedDocuments.forEach((document) => document._onDelete()));
		console.log('PseudoDocuments deleted', ids, deletedDocuments);
		return deletedDocuments;
	}

	/**
	 * Delete this PseudoDocument.
	 * @see PseudoDocument.deleteDocuments
	 * @param {Partial<Omit<DatabaseDeleteOperation, "ids">>} [operation={}]  Parameters of the deletion operation
	 * @returns {Promise<PseudoDocument>}       The deleted PseudoDocument instance
	 */
	async delete(operation = {}) {
		operation.parent = this.parent;
		await this.constructor.deleteDocuments([this.id], operation);
		this.parent.getEmbeddedCollection(this.documentName).delete(this.id);
		return this;
	}

	/**
	 * @param {PseudoDocument | EnablePseudoDocumentsMixin} parent
	 * @private
	 */
	static _gatherChangeData(parent) {
		/**
		 * @type {{index: string | number, type: "object" | "array"}[]}
		 */
		const traversalInstructions = [];
		let current = parent;

		if (current.getEmbeddedCollection) {
			traversalInstructions.push({ type: 'object', index: current.getEmbeddedCollection(this.documentName).name });
		}

		while (current !== null && !(current instanceof foundry.abstract.Document)) {
			if (current instanceof PseudoDocument) {
				traversalInstructions.unshift({ type: 'array', index: current.id });
				traversalInstructions.unshift({ type: 'object', index: current.parentCollection });
			} else {
				traversalInstructions.unshift({ type: 'object', index: current.schema.name });
			}
			current = current.parent;
		}

		/**
		 * @type {{type: "object"|"array", index: string|number, value: any}[]}
		 */
		const traversalLog = [];
		current = parent.parentFoundryDocument.toObject(true);

		for (let { type, index } of traversalInstructions) {
			if (type === 'object') {
				current = current[index];
				traversalLog.push({ type, index, value: current });
			} else if (type === 'array') {
				const arrayIndex = current.findIndex((value) => value._id === index);
				current = current[arrayIndex];
				traversalLog.push({ type: 'array', index: arrayIndex, value: current });
			}
		}

		const firstArray = traversalLog.findIndex((value) => Array.isArray(value.value));

		const baseKey = traversalLog
			.slice(0, firstArray + 1)
			.map((value) => value.index)
			.join('.');
		const nestedCollection = traversalLog.findLast((value) => Array.isArray(value.value));
		return {
			changeObject: { [baseKey]: traversalLog[firstArray].value },
			nestedCollection: nestedCollection.value,
		};
	}

	/**
	 * A compatibility method that returns the appropriate name of a pseudo collection within this Document.
	 * @param {string} name    An existing collection name or a document name.
	 * @returns {string|null}  The provided collection name if it exists, the first available collection for the
	 *                         document name provided, or null if no appropriate embedded collection could be found.
	 */
	static getCollectionName(name) {
		if (name in this.schema.fields) return name;
		for (const [fieldName, field] of Object.entries(this.schema.fields)) {
			if (field instanceof PseudoDocumentCollectionField && (field.model.name === name || field.model.documentName === name)) return fieldName;
		}
		return null;
	}

	/**
	 * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
	 * @param {string} embeddedName   The name of the embedded Document type
	 * @return {PseudoDocumentCollection}   The Collection instance of embedded Documents of the requested type
	 */
	getEmbeddedCollection(embeddedName) {
		const collectionName = this.constructor.getCollectionName(embeddedName);
		if (!collectionName && this.system && this.system.getEmbeddedCollection) {
			return this.system.getEmbeddedCollection(embeddedName);
		}
		if (!collectionName) {
			throw new Error(`${embeddedName} is not a valid embedded Document within the ${this.constructor.name} Document`);
		}
		const field = this.constructor.schema.fields[collectionName];
		return field.getCollection(this);
	}

	/**
	 * Get an embedded document by its id from a named collection in the parent document.
	 * @param {string} embeddedName              The name of the embedded Document type
	 * @param {string} id                        The id of the child document to retrieve
	 * @param {object} [options]                 Additional options which modify how embedded documents are retrieved
	 * @param {boolean} [options.strict=false]   Throw an Error if the requested id does not exist. See Collection#get
	 * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Embedded Document.
	 * @return {PseudoDocument}                        The retrieved embedded Document instance, or undefined
	 * @throws If the embedded collection does not exist, or if strict is true and the Embedded Document could not be
	 *         found.
	 */
	getEmbeddedDocument(embeddedName, id, { invalid = false, strict = false } = {}) {
		const collection = this.getEmbeddedCollection(embeddedName);
		return collection.get(id, { invalid, strict });
	}

	/**
	 * Create multiple embedded Document instances within this parent Document using provided input data.
	 * @param {string} embeddedName                     The name of the embedded Document type
	 * @param {object[]} data                           An array of data objects used to create multiple documents
	 * @param {DatabaseUpdateOperation} [operation={}]  Parameters of the database update workflow
	 * @return {Promise<PseudoDocument[]>}                    An array of created Document instances
	 */
	async createEmbeddedDocuments(embeddedName, data = [], operation = {}) {
		const collection = this.getEmbeddedCollection(embeddedName); // Validation only
		operation.parent = this;
		const cls = collection.documentClass;
		return cls.createDocuments(data, operation);
	}

	/**
	 * Test whether a certain User has a requested permission level (or greater) over the Document
	 * @param {foundry.documents.BaseUser} user       The User being tested
	 * @param {string|number} permission      The permission level from DOCUMENT_OWNERSHIP_LEVELS to test
	 * @param {object} options                Additional options involved in the permission test
	 * @param {boolean} [options.exact=false]     Require the exact permission level requested?
	 * @return {boolean}                      Does the user have this permission level over the Document?
	 */
	testUserPermission(user, permission, { exact = false } = {}) {
		return this.parentFoundryDocument.testUserPermission(user, permission, { exact });
	}

	/**
	 * Safely prepare data for a Document, catching any errors.
	 * @internal
	 */
	_safePrepareData() {
		try {
			this.prepareData();
		} catch (err) {
			Hooks.onError('PseudoDocument#prepareData', err, {
				msg: `Failed data preparation for ${this.uuid}`,
				log: 'error',
				uuid: this.uuid,
			});
		}
	}

	/* -------------------------------------------- */

	/**
	 * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
	 * This method provides an opportunity for Document classes to define special data preparation logic.
	 * The work done by this method should be idempotent. There are situations in which prepareData may be called more
	 * than once.
	 * @memberof ClientDocumentMixin#
	 */
	prepareData() {
		const isTypeData = this.system instanceof foundry.abstract.TypeDataModel;
		if (isTypeData) this.system.prepareBaseData();
		this.prepareBaseData();
		this.prepareEmbeddedDocuments();
		if (isTypeData) this.system.prepareDerivedData();
		this.prepareDerivedData();
	}

	/* -------------------------------------------- */

	/**
	 * Prepare data related to this Document itself, before any embedded Documents or derived data is computed.
	 * @memberof ClientDocumentMixin#
	 */
	prepareBaseData() {}

	/* -------------------------------------------- */

	/**
	 * Prepare all embedded Document instances which exist within this primary Document.
	 * @memberof ClientDocumentMixin#
	 */
	prepareEmbeddedDocuments() {
		for (const collectionName of Object.keys(this.collections || {})) {
			for (let e of this.collections[collectionName]) {
				e._safePrepareData();
			}
		}
		for (const collectionName of Object.keys(this.nestedCollections || {})) {
			for (let e of this.nestedCollections[collectionName]) {
				e._safePrepareData();
			}
		}
	}

	/* -------------------------------------------- */

	/**
	 * Apply transformations or derivations to the values of the source data object.
	 * Compute data fields whose values are not stored to the database.
	 * @memberof ClientDocumentMixin#
	 */
	prepareDerivedData() {}

	_onDelete() {
		Object.values(this.apps).forEach((app) => app.close({ force: true }));
		Object.values(this.collections).forEach((collection) => collection.forEach((doc) => doc._onDelete()));
		Object.values(this.nestedCollections).forEach((collection) => collection.forEach((doc) => doc._onDelete()));
	}

	/**
	 * Serialize salient information about this Document when dragging it.
	 * @returns {object}  An object of drag data.
	 */
	toDragData() {
		const dragData = { type: this.documentName };
		if (this.id) dragData.uuid = this.uuid;
		else dragData.data = this.toObject();
		return dragData;
	}

	/**
	 * Define a simple migration from one field name to another.
	 * The value of the data can be transformed during the migration by an optional application function.
	 * @param {object} data     The data object being migrated
	 * @param {string} oldKey   The old field name
	 * @param {string} newKey   The new field name
	 * @param {(data: object) => any} [apply]  An application function, otherwise the old value is applied
	 * @returns {boolean}       Whether a migration was applied.
	 * @internal
	 */
	static _addDataFieldMigration(data, oldKey, newKey, apply) {
		const { hasProperty, getProperty, setProperty, deleteProperty } = foundry.utils;
		if (!hasProperty(data, newKey) && hasProperty(data, oldKey)) {
			let oldTarget = data;
			let oldTargetKey = oldKey;
			if (oldKey.includes('.')) {
				const parts = oldKey.split('.');
				oldTarget = getProperty(data, parts.slice(0, -1).join('.'));
				oldTargetKey = parts.at(-1);
			}
			const oldProp = Object.getOwnPropertyDescriptor(oldTarget, oldTargetKey);
			if (oldProp && !oldProp.writable) return false;
			setProperty(data, newKey, apply ? apply(data) : getProperty(data, oldKey));
			deleteProperty(data, oldKey);
			return true;
		}
		return false;
	}
}
