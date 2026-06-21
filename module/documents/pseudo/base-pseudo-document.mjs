import { PseudoDocumentCollectionField } from './pseudo-document-collection-field.mjs';

/**
 * This class is the pseudo document mirror to the core Document class.
 * It is maintained separately for easier synchronization with the core class.
 */
export class BasePseudoDocument extends foundry.abstract.DataModel {
	constructor(data, context) {
		super(data, context);
	}

	/**
	 * @override
	 */
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

	/**
	 * @override
	 */
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

	/** @override */
	*_initializationOrder() {
		const hierarchy = this.constructor.hierarchy;
		const hierarchicalFields = [];

		// Initialize non-hierarchical fields first
		for (const [name, field] of this.schema.entries()) {
			if (name in hierarchy) hierarchicalFields.push(field);
			else yield [name, field];
		}

		// Initialize hierarchical fields last
		for (const field of hierarchicalFields) {
			yield [field.name, field];
		}
	}

	static metadata = Object.freeze({
		coreTypes: [],
		hasTypeData: false,
		baseTypeAllowed: true,
		label: 'PseudoDocument',
	});

	static LOCALIZATION_PREFIXES = foundry.abstract.Document.LOCALIZATION_PREFIXES;

	static get database() {
		throw new Error("PseudoDocuments don't have a database");
	}

	static get implementation() {
		return this.metadata.implementation;
	}

	/**
	 * The base document definition that this document class extends from.
	 * @type {typeof BasePseudoDocument}
	 */
	static get baseDocument() {
		let cls;
		let parent = this;
		let parents = [this];
		while (parent) {
			cls = parent;
			parent = Object.getPrototypeOf(cls);
			if (parent === BasePseudoDocument) {
				return parents[0];
			}
			parents.unshift(cls);
		}
		throw new Error(`Base PseudoDocument class identification failed for "${this.documentName}"`);
	}

	/**
	 * The named collection to which this Document belongs.
	 * PseudoDocuments don't belong to any world-level collection
	 * @type {string}
	 */
	static get collectionName() {
		return null;
	}

	get collectionName() {
		return this.constructor.collectionName;
	}

	/**
	 * The canonical name of this Document type, for example "Item".
	 * @type {string}
	 */
	static get documentName() {
		throw new Error('PseudoDocuments must define their document name');
	}

	get documentName() {
		return this.constructor.documentName;
	}

	/**
	 * The allowed types which may exist for this Document class.
	 * @type {string[]}
	 */
	static get TYPES() {
		return Object.keys(game.model[this.documentName]);
	}

	/**
	 * Does this Document support additional subtypes?
	 * @type {boolean}
	 */
	static get hasTypeData() {
		return this.metadata.hasTypeData;
	}

	/**
	 * The Embedded Document hierarchy for this Document.
	 * @returns {Readonly<Record<string, EmbeddedCollectionField|EmbeddedDocumentField|PseudoDocumentCollectionField>>}
	 */
	static get hierarchy() {
		const hierarchy = {};
		for (const [fieldName, field] of this.schema.entries()) {
			if (field.constructor.hierarchical) hierarchy[fieldName] = field;
		}
		Object.defineProperty(this, 'hierarchy', { value: Object.freeze(hierarchy), writable: false });
		return hierarchy;
	}

	/**
	 * Identify the collection in a parent Document that this Document belongs to, if any.
	 * @param {string|null} [parentCollection]  An explicitly provided parent collection name.
	 * @returns {string|null}
	 * @internal
	 */
	_getParentCollection(parentCollection) {
		if (parentCollection) return parentCollection;
		return this.schema.parent.name;
	}

	/**
	 * The canonical identifier for this Document.
	 * @type {string|null}
	 */
	get id() {
		return this._id;
	}

	/**
	 * Always null.
	 * @returns {null}
	 */
	get compendium() {
		return null;
	}

	/**
	 * Always true.
	 * @returns {true}
	 */
	get isEmbedded() {
		return true;
	}

	/**
	 * Always false.
	 * @returns {false}
	 */
	get inCompendium() {
		return false;
	}

	/**
	 * A Universally Unique Identifier (uuid) for this PseudoDocument instance.
	 * @type {string}
	 */
	get uuid() {
		return [this.parentDocument.uuid, this.constructor.documentName, this.id].join('.');
	}

	/**
	 * Always true.
	 *
	 * @param {BaseUser} user The User being tested
	 * @returns {true} Does the User have a sufficient role to create?
	 */
	static canUserCreate(user) {
		return true;
	}

	/**
	 * Defers to the parent foundry document.
	 *
	 * This method returns the value recorded in Document ownership, regardless of the User's role, for example a
	 * GAMEMASTER user might still return a result of NONE if they are not explicitly denoted as having a level.
	 *
	 * To test whether a user has a certain capability over the document, testUserPermission should be used.
	 *
	 * @param {BaseUser} [user=game.user] The User being tested
	 * @returns {DocumentOwnershipNumber} A numeric permission level from {@link CONST.DOCUMENT_OWNERSHIP_LEVELS}
	 */
	getUserLevel(user) {
		user ||= game.user;
		return this.parentFoundryDocument.getUserLevel(user); // Embedded Documents
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
	 * Test whether a given User has permission to perform some action on this Document
	 * @param {BaseUser} user             The User attempting modification
	 * @param {string} action             The attempted action
	 * @param {object} [data]             Data involved in the attempted action
	 * @returns {boolean}                 Does the User have permission?
	 */
	canUserModify(user, action, data = {}) {
		return this.parentFoundryDocument.canUserModify(user, action, data);
	}

	/** @inheritDoc */
	static _preCleanData(data, options, _state) {
		super._preCleanData(data, options, _state);

		// Record document state
		_state.documentId ??= _state.source?._id;
		const { hasTypeData, baseTypeAllowed } = this.metadata;
		if (hasTypeData) {
			_state.documentType = foundry.data.operators.ForcedReplacement.get(data.type) ?? _state.source?.type;
			if (!_state.documentType && baseTypeAllowed) _state.documentType = CONST.BASE_DOCUMENT_TYPE;
			if (options.addTypes) data.type = _state.documentType;
		}
	}

	/**
	 * @param {object} [data={}]    Additional data which overrides current document data at the time of creation
	 * @param {DocumentConstructionContext & DocumentCloneOptions} [context]
	 *                                          Additional context options passed to the create method
	 * @returns {Document|Promise<Document>}    The cloned Document instance
	 */
	clone(data = {}, context = {}) {
		const { keepId = false, addSource = false, discardInvalidEmbedded = false, ...remaining } = context;
		context = { parent: this.parentDocument, ...remaining, strict: false };
		const source = this.toObject();
		if (discardInvalidEmbedded) this.#discardInvalidEmbedded(source);
		data = foundry.utils.mergeObject(source, data, { insertKeys: false, applyOperators: true, inplace: true });
		if (!keepId) delete data._id;
		if (addSource && data._stats) {
			data._stats.duplicateSource = this.uuid;
			data._stats.exportSource = null;
		}
		return new this.constructor(data, context);
	}

	/**
	 * @param {object} source    The DataModel source
	 */
	#discardInvalidEmbedded(source) {
		if (!source) return;
		for (const [name, field] of Object.entries(this.constructor.hierarchy)) {
			if (!source[name]) continue;
			if (field instanceof foundry.data.fields.EmbeddedDocumentField) {
				if (this[name]) this[name].#discardInvalidEmbedded(source[name]);
				continue;
			}
			const collection = this[name];
			const collectionData = source[name];
			let k = 0;
			for (const embeddedData of collectionData) {
				const id = embeddedData._id;
				if (collection.invalidDocumentIds.has(id)) continue;
				collectionData[k++] = embeddedData;
				if (embeddedData._tombstone) continue;
				const embedded = collection.get(id);
				if (embedded) embedded.#discardInvalidEmbedded(embeddedData);
			}
			collectionData.length = k;
		}
	}

	/**
	 * For Documents which include game system data, migrate the system data object to conform to its latest data model.
	 * The data model is defined by the template.json specification included by the game system.
	 * @returns {object}              The migrated system data object
	 */
	migrateSystemData() {
		if (!this.constructor.hasTypeData) {
			throw new Error(`The ${this.documentName} Document does not include a TypeDataField.`);
		}
		if (this.system instanceof foundry.abstract.DataModel && !(this.system.modelProvider instanceof foundry.packages.BaseSystem)) {
			throw new Error(`The ${this.documentName} Document does not have system-provided package data.`);
		}
		const model = game.model[this.documentName]?.[this.type] ?? {};
		return foundry.utils.mergeObject(model, this.system, {
			insertKeys: false,
			insertValues: true,
			enforceTypes: false,
			overwrite: true,
			inplace: false,
		});
	}

	toObject(source = true) {
		const data = super.toObject(source);
		return this.constructor.shimData(data);
	}

	/** @inheritDoc */
	_updateDiff(copy, changes, options, _state) {
		// Require full replacement of system data if the document type changes
		if (this.constructor.metadata.hasTypeData && 'type' in changes && !foundry.data.operators.ForcedReplacement.equals(changes.type, copy.type)) {
			if (!(changes.system instanceof foundry.data.operators.ForcedReplacement)) {
				throw new Error('The type of a Document may only be changed if the system field is also updated with a ' + 'ForcedReplacement operator.');
			}
		}
		return super._updateDiff(copy, changes, options, _state);
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
	static async createDocuments(data = [], { parent, ...options } = {}) {
		const { parentDocument, parentFoundryDocument } = this._resolveParents(parent);

		const collection = parentDocument.getEmbeddedCollection(this.documentName);
		const documentClass = collection.documentClass;

		const documents = [];
		for (let initialData of data) {
			initialData._id = foundry.utils.randomID();
			const document = collection.createDocument(initialData);
			let proceed = (await document._preCreate(initialData, options, game.user)) ?? true;
			proceed &&= options.noHook || Hooks.call(`preCreate${this.documentName}`, document, initialData, options, game.userId);
			if (proceed === false) continue;
			documents.push(document.toObject(true));
		}

		const operation = { ...options, data: documents, parentDocument };
		const proceed = await documentClass._preCreateOperation(documents, operation, game.user);
		if (proceed === false) {
			return [];
		}
		const preArgs = [documents, options, game.userId];
		parentDocument._dispatchDescendantDocumentEvents?.('preCreate', collection.name, preArgs);

		let { changeObject, nestedCollection } = this._gatherChangeData(parentDocument);
		nestedCollection.push(...documents);
		await parentFoundryDocument.update(changeObject);
		const newDocuments = data.map((value) => collection.get(value._id));
		setTimeout(() => {
			newDocuments.forEach((document) => {
				document._onCreate(data.find((value) => value._id === document.id) ?? {}, options, game.userId);
				Hooks.callAll(`create${this.documentName}`, document, options, game.userId);
			});
			const postArgs = [newDocuments, documents, options, game.userId];
			parentDocument._dispatchDescendantDocumentEvents?.('onCreate', collection.name, postArgs);
			documentClass._onCreateOperation(newDocuments, operation, game.user);
		});
		console.debug(
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
	static async updateDocuments(updates = [], { parent, ...options } = {}) {
		const { parentDocument, parentFoundryDocument } = this._resolveParents(parent);

		const collection = parentDocument.getEmbeddedCollection(this.documentName);
		const documentClass = collection.documentClass;

		const { changeObject, nestedCollection } = this._gatherChangeData(parentDocument);
		const documents = [];
		const changes = [];
		for (const update of updates) {
			const item = nestedCollection.find((item) => item._id === update._id);
			const expandedUpdate = foundry.utils.expandObject(update);
			console.debug(foundry.utils.duplicate(item), foundry.utils.duplicate(expandedUpdate), foundry.utils.diffObject(item, expandedUpdate, { deletionKeys: true }));
			const document = collection.get(item._id);
			let proceed = (await document._preUpdate(expandedUpdate, options, game.user)) ?? true;
			proceed &&= options.noHook || Hooks.call(`preUpdate${this.documentName}`, document, expandedUpdate, options, game.userId);
			if (proceed === false) continue;
			documents.push(document);
			changes.push(expandedUpdate);
			foundry.utils.mergeObject(item, expandedUpdate, {});
			console.debug(foundry.utils.duplicate(item), foundry.utils.duplicate(expandedUpdate), foundry.utils.diffObject(item, expandedUpdate, { deletionKeys: true }));
		}

		const operation = { ...options, updates: changes, parentDocument };
		const proceed = await documentClass._preUpdateOperation(documents, operation, game.user);
		if (proceed === false) {
			return [];
		}
		const preArgs = [changes, options, game.userId];
		parentDocument._dispatchDescendantDocumentEvents?.('preUpdate', collection.name, preArgs);

		await parentFoundryDocument.update(changeObject);
		const updated = updates.map((value) => collection.get(value._id));
		setTimeout(() => {
			updated.forEach((document) => {
				document._onUpdate(updates.find((value) => value._id === document.id) ?? {}, options, game.userId);
			});
			const postArgs = [updated, changes, options, game.userId];
			parentDocument._dispatchDescendantDocumentEvents?.('onUpdate', collection.name, postArgs);
			documentClass._onUpdateOperation(updated, operation, game.user);
		});
		console.debug('PseudoDocuments updated', updates, updated);
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
	static async deleteDocuments(ids = [], { parent, ...options } = {}) {
		const { parentDocument, parentFoundryDocument } = this._resolveParents(parent);

		const collection = parentDocument.getEmbeddedCollection(this.documentName);
		const documentClass = collection.documentClass;

		const documentsToDelete = [];
		const idsToDelete = [];
		for (let id of ids) {
			const document = collection.get(id);
			if (document) {
				let proceed = (await document._preDelete(options, game.user)) ?? true;
				proceed &&= options.noHook || Hooks.call(`preDelete${this.documentName}`, document, options, game.userId);
				if (proceed === false) continue;
				documentsToDelete.push(document);
				idsToDelete.push(document.id);
			}
		}

		const operation = { ...options, ids: idsToDelete, parentDocument };
		const proceed = await documentClass._preDeleteOperation(documentsToDelete, operation, game.user);
		if (proceed === false) {
			return [];
		}
		const preArgs = [idsToDelete, options, game.userId];
		parentDocument._dispatchDescendantDocumentEvents?.('preDelete', collection.name, preArgs);

		let { changeObject, nestedCollection } = this._gatherChangeData(parentDocument);
		nestedCollection.splice(0, nestedCollection.length, ...nestedCollection.filter((value) => !idsToDelete.includes(value._id)));
		await parentFoundryDocument.update(changeObject);
		setTimeout(() => {
			documentsToDelete.forEach((document) => document._onDelete(options, game.userId));
			const postArgs = [documentsToDelete, idsToDelete, options, game.userId];
			parentDocument._dispatchDescendantDocumentEvents?.('onDelete', collection.name, postArgs);
			documentClass._onDeleteOperation(documentsToDelete, operation, game.user);
		});
		console.debug('PseudoDocuments deleted', idsToDelete, documentsToDelete);
		return documentsToDelete;
	}

	/**
	 * Create a new Document using provided input data, saving it to the database.
	 * @see {@link Document.createDocuments}
	 * @param {object|Document|(object|Document)[]} [data={}] Initial data used to create this Document, or a Document
	 *                                                        instance to persist.
	 * @param {Partial<Omit<DatabaseCreateOperation, "data">>} [operation={}]  Parameters of the creation operation
	 * @returns {Promise<Document | Document[] | undefined>}        The created Document instance(s)
	 *
	 * @example Create a World-level Item
	 * ```js
	 * const data = [{name: "Special Sword", type: "weapon"}];
	 * const created = await Item.implementation.create(data);
	 * ```
	 *
	 * @example Create an Actor-owned Item
	 * ```js
	 * const data = [{name: "Special Sword", type: "weapon"}];
	 * const actor = game.actors.getName("My Hero");
	 * const created = await Item.implementation.create(data, {parent: actor});
	 * ```
	 *
	 * @example Create an Item in a Compendium pack
	 * ```js
	 * const data = [{name: "Special Sword", type: "weapon"}];
	 * const created = await Item.implementation.create(data, {pack: "mymodule.mypack"});
	 * ```
	 */
	static async create(data = {}, operation = {}) {
		const isArray = Array.isArray(data);
		const createData = isArray ? data : [data];
		const created = await this.implementation.createDocuments(createData, operation);
		return isArray ? created : created.shift();
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
		this.constructor.updateDocuments([data], { parent: this.parentDocument });
		return this;
	}

	/**
	 * Delete this PseudoDocument.
	 * @see PseudoDocument.deleteDocuments
	 * @param {Partial<Omit<DatabaseDeleteOperation, "ids">>} [operation={}]  Parameters of the deletion operation
	 * @returns {Promise<PseudoDocument>}       The deleted PseudoDocument instance
	 */
	async delete(operation = {}) {
		operation.parent = this.parentDocument;
		await this.constructor.deleteDocuments([this.id], operation);
		this.parentDocument.getEmbeddedCollection(this.documentName).delete(this.id);
		return this;
	}

	/**
	 * Get a World-level Document of this type by its id.
	 * @param {string} documentId         The Document ID
	 * @param {DatabaseGetOperation} [operation={}] Parameters of the get operation
	 * @returns {null}  The retrieved Document, or null
	 */
	static get(documentId, operation = {}) {
		return null;
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
	 * Update multiple embedded Document instances within a parent Document using provided differential data.
	 * @see {@link Document.updateDocuments}
	 * @param {string} embeddedName                     The name of the embedded Document type
	 * @param {object[]} updates                        An array of differential data objects, each used to update a
	 *                                                  single Document
	 * @param {DatabaseUpdateOperation} [operation={}]  Parameters of the database update workflow
	 * @returns {Promise<Document[]>}                   An array of updated Document instances
	 */
	async updateEmbeddedDocuments(embeddedName, updates = [], operation = {}) {
		const collection = this.getEmbeddedCollection(embeddedName); // Validation only
		operation.parent = this;
		const cls = collection.documentClass;
		return cls.updateDocuments(updates, operation);
	}

	/**
	 * Delete multiple embedded Document instances within a parent Document using provided string ids.
	 * @see {@link Document.deleteDocuments}
	 * @param {string} embeddedName                     The name of the embedded Document type
	 * @param {string[]} ids                            An array of string ids for each Document to be deleted
	 * @param {DatabaseDeleteOperation} [operation={}]  Parameters of the database deletion workflow
	 * @returns {Promise<Document[]>}                   An array of deleted Document instances
	 */
	async deleteEmbeddedDocuments(embeddedName, ids, operation = {}) {
		const collection = this.getEmbeddedCollection(embeddedName); // Validation only
		operation.parent = this;
		const cls = collection.documentClass;
		return cls.deleteDocuments(ids, operation);
	}

	/**
	 * Iterate over all embedded Documents that are hierarchical children of this Document.
	 * @param {string} [_parentPath]                      A parent field path already traversed
	 * @yields {[string, Document]}
	 */
	*traverseEmbeddedDocuments(_parentPath) {
		for (const [fieldName, field] of Object.entries(this.constructor.hierarchy)) {
			const fieldPath = _parentPath ? `${_parentPath}.${fieldName}` : fieldName;

			// Embedded document collection
			if (field instanceof PseudoDocumentCollectionField) {
				const collection = this[fieldName];
				for (const document of collection.values()) {
					yield [fieldPath, document];
					yield* document.traverseEmbeddedDocuments(fieldPath);
				}
			}
		}
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
	 * Pre-process a creation operation for a single Document instance. Pre-operation events only occur for the client
	 * which requested the operation.
	 *
	 * Modifications to the pending Document instance must be performed using {@link updateSource}.
	 *
	 * @param {object} data               The initial data object provided to the document creation request
	 * @param {object} options            Additional options which modify the creation request
	 * @param {BaseUser} user             The User requesting the document creation
	 * @returns {Promise<boolean|void>}   Return false to exclude this Document from the creation operation
	 * @protected
	 */
	async _preCreate(data, options, user) {}

	/**
	 * Post-process a creation operation for a single Document instance. Post-operation events occur for all connected
	 * clients.
	 *
	 * @param {object} data                         The initial data object provided to the document creation request
	 * @param {object} options                      Additional options which modify the creation request
	 * @param {string} userId                       The id of the User requesting the document update
	 * @protected
	 */
	_onCreate(data, options, userId) {}

	/**
	 * Pre-process a creation operation, potentially altering its instructions or input data. Pre-operation events only
	 * occur for the client which requested the operation.
	 *
	 * This batch-wise workflow occurs after individual {@link _preCreate} workflows and provides a final pre-flight check
	 * before a database operation occurs.
	 *
	 * Modifications to pending documents must mutate the documents array or alter individual document instances using
	 * {@link updateSource}.
	 *
	 * @param {Document[]} documents                Pending document instances to be created
	 * @param {DatabaseCreateOperation} operation   Parameters of the database creation operation
	 * @param {BaseUser} user                       The User requesting the creation operation
	 * @returns {Promise<boolean|void>}             Return false to cancel the creation operation entirely
	 * @protected
	 */
	static async _preCreateOperation(documents, operation, user) {}

	/**
	 * Post-process a creation operation, reacting to database changes which have occurred. Post-operation events occur
	 * for all connected clients.
	 *
	 * This batch-wise workflow occurs after individual {@link _onCreate} workflows.
	 *
	 * @param {Document[]} documents                The Document instances which were created
	 * @param {DatabaseCreateOperation} operation   Parameters of the database creation operation
	 * @param {BaseUser} user                       The User who performed the creation operation
	 * @returns {Promise<void>}
	 * @protected
	 */
	static async _onCreateOperation(documents, operation, user) {}

	/**
	 * Pre-process an update operation for a single Document instance. Pre-operation events only occur for the client
	 * which requested the operation.
	 *
	 * @param {object} changes            The candidate changes to the Document
	 * @param {object} options            Additional options which modify the update request
	 * @param {BaseUser} user             The User requesting the document update
	 * @returns {Promise<boolean|void>}   A return value of false indicates the update operation should be cancelled.
	 * @protected
	 */
	async _preUpdate(changes, options, user) {}

	/**
	 * Post-process an update operation for a single Document instance. Post-operation events occur for all connected
	 * clients.
	 *
	 * @param {object} changed            The differential data that was changed relative to the documents prior values
	 * @param {object} options            Additional options which modify the update request
	 * @param {string} userId             The id of the User requesting the document update
	 * @protected
	 */
	_onUpdate(changed, options, userId) {}

	/**
	 * Pre-process an update operation, potentially altering its instructions or input data. Pre-operation events only
	 * occur for the client which requested the operation.
	 *
	 * This batch-wise workflow occurs after individual {@link _preUpdate} workflows and provides a final pre-flight check
	 * before a database operation occurs.
	 *
	 * Modifications to the requested updates are performed by mutating the data array of the operation.
	 *
	 * @param {Document[]} documents                Document instances to be updated
	 * @param {DatabaseUpdateOperation} operation   Parameters of the database update operation
	 * @param {BaseUser} user                       The User requesting the update operation
	 * @returns {Promise<boolean|void>}             Return false to cancel the update operation entirely
	 * @protected
	 */
	static async _preUpdateOperation(documents, operation, user) {}

	/**
	 * Post-process an update operation, reacting to database changes which have occurred. Post-operation events occur
	 * for all connected clients.
	 *
	 * This batch-wise workflow occurs after individual {@link _onUpdate} workflows.
	 *
	 * @param {Document[]} documents                The Document instances which were updated
	 * @param {DatabaseUpdateOperation} operation   Parameters of the database update operation
	 * @param {BaseUser} user                       The User who performed the update operation
	 * @returns {Promise<void>}
	 * @protected
	 */
	static async _onUpdateOperation(documents, operation, user) {}

	/**
	 * Pre-process a deletion operation for a single Document instance. Pre-operation events only occur for the client
	 * which requested the operation.
	 *
	 * @param {object} options            Additional options which modify the deletion request
	 * @param {BaseUser} user             The User requesting the document deletion
	 * @returns {Promise<boolean|void>}   A return value of false indicates the deletion operation should be cancelled.
	 * @protected
	 */
	async _preDelete(options, user) {}

	/**
	 * Post-process a deletion operation for a single Document instance. Post-operation events occur for all connected
	 * clients.
	 *
	 * @param {object} options            Additional options which modify the deletion request
	 * @param {string} userId             The id of the User requesting the document update
	 * @protected
	 */
	_onDelete(options, userId) {}

	/**
	 * Pre-process a deletion operation, potentially altering its instructions or input data. Pre-operation events only
	 * occur for the client which requested the operation.
	 *
	 * This batch-wise workflow occurs after individual {@link _preDelete} workflows and provides a final pre-flight check
	 * before a database operation occurs.
	 *
	 * Modifications to the requested deletions are performed by mutating the operation object.
	 * {@link updateSource}.
	 *
	 * @param {Document[]} documents                Document instances to be deleted
	 * @param {DatabaseDeleteOperation} operation   Parameters of the database update operation
	 * @param {BaseUser} user                       The User requesting the deletion operation
	 * @returns {Promise<boolean|void>}             Return false to cancel the deletion operation entirely
	 * @protected
	 */
	static async _preDeleteOperation(documents, operation, user) {}

	/**
	 * Post-process a deletion operation, reacting to database changes which have occurred. Post-operation events occur
	 * for all connected clients.
	 *
	 * This batch-wise workflow occurs after individual {@link _onDelete} workflows.
	 *
	 * @param {Document[]} documents                The Document instances which were deleted
	 * @param {DatabaseDeleteOperation} operation   Parameters of the database deletion operation
	 * @param {BaseUser} user                       The User who performed the deletion operation
	 * @returns {Promise<void>}
	 * @protected
	 */
	static async _onDeleteOperation(documents, operation, user) {}

	/**
	 * A reusable helper for adding migration shims.
	 * @param {object} data                       The data object being shimmed
	 * @param {{[oldKey: string]: string}} shims  The mapping of old keys to new keys
	 * @param {object} [options]                  Options passed to {@link foundry.utils.logCompatibilityWarning}
	 * @param {string} [options.warning]          The deprecation message
	 * @param {any} [options.value]               The value of the shim
	 * @internal
	 */
	static _addDataFieldShims(data, shims, options) {
		for (const [oldKey, newKey] of Object.entries(shims)) {
			this._addDataFieldShim(data, oldKey, newKey, options);
		}
	}

	/* ---------------------------------------- */

	/**
	 * A reusable helper for adding a migration shim
	 * The value of the data can be transformed during the migration by an optional application function.
	 * @param {object} data               The data object being shimmed
	 * @param {string} oldKey             The old field name
	 * @param {string} newKey             The new field name
	 * @param {object} [options]          Options passed to {@link foundry.utils.logCompatibilityWarning}
	 * @param {string} [options.warning]  The deprecation message
	 * @param {any} [options.value]       The value of the shim
	 * @internal
	 */
	static _addDataFieldShim(data, oldKey, newKey, options = {}) {
		if (Object.hasOwn(data, oldKey)) return;
		let oldTarget = data;
		let oldTargetKey = oldKey;
		if (oldKey.includes('.')) {
			const parts = oldKey.split('.');
			oldTargetKey = parts.pop();
			oldTarget = foundry.utils.getProperty(data, parts.join('.'));
		}

		// Verify object
		if (!foundry.utils.isPlainObject(oldTarget) || !Object.isExtensible(oldTarget) || Object.hasOwn(oldTarget, oldTargetKey)) return;

		// Define the shim
		Object.defineProperty(oldTarget, oldTargetKey, {
			get: () => {
				if (options.warning) foundry.utils.logCompatibilityWarning(options.warning, options);
				else this._logDataFieldMigration(oldKey, newKey, options);
				return 'value' in options ? options.value : foundry.utils.getProperty(data, newKey);
			},
			set: (value) => {
				if (newKey) foundry.utils.setProperty(data, newKey, value);
			},
			configurable: true,
			enumerable: false,
		});
	}

	/* ---------------------------------------- */

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
		if (!foundry.utils.hasProperty(data, newKey) && foundry.utils.hasProperty(data, oldKey)) {
			let oldTarget = data;
			let oldTargetKey = oldKey;
			if (oldKey.includes('.')) {
				const parts = oldKey.split('.');
				oldTarget = foundry.utils.getProperty(data, parts.slice(0, -1).join('.'));
				oldTargetKey = parts.at(-1);
			}
			const oldProp = Object.getOwnPropertyDescriptor(data, oldTarget, oldTargetKey);
			if (oldProp && !oldProp.writable) return false;
			foundry.utils.setProperty(data, newKey, apply ? apply(data) : foundry.utils.getProperty(data, oldKey));
			foundry.utils.deleteProperty(data, oldKey);
			return true;
		}
		return false;
	}

	/* ---------------------------------------- */

	/**
	 * Log a compatbility warning for the data field migration.
	 * @param {string} oldKey       The old field name
	 * @param {string} newKey       The new field name
	 * @param {object} [options]    Options passed to {@link foundry.utils.logCompatibilityWarning}
	 * @internal
	 */
	static _logDataFieldMigration(oldKey, newKey, options = {}) {
		const oldPath = oldKey.replaceAll('.', '#');
		const newPath = newKey.replaceAll('.', '#');
		const msg = `You are accessing ${this.name}#${oldPath}, which has been migrated to ${this.name}#${newPath}.`;
		foundry.utils.logCompatibilityWarning(msg, options);
	}

	/**
	 * Clear the fields from the given Document data recursively.
	 * @param {object} data                                     The (partial) Document data
	 * @param {string[]} fieldNames                             The fields that are cleared
	 * @param {object} [options]
	 * @param {RecursiveFieldClearCallback} [options.callback]  A callback that is invoked on each field in order to clear
	 *                                                          it.
	 * @internal
	 */
	static _clearFieldsRecursively(data, fieldNames, options = {}) {
		if (fieldNames.length === 0) return;
		const { callback } = options;
		for (const fieldName of fieldNames) {
			if (typeof callback === 'function') callback(data, fieldName);
			else foundry.utils.deleteProperty(data, fieldName);
		}
		for (const [collectionName, field] of Object.entries(this.hierarchy)) {
			const collection = data[collectionName];
			if (!collection) continue;
			if (field instanceof foundry.data.fields.EmbeddedDocumentField) {
				field.model._clearFieldsRecursively(collection, fieldNames, options);
				continue;
			}
			for (const embeddedData of collection) {
				if (embeddedData._tombstone) continue;
				field.model._clearFieldsRecursively(embeddedData, fieldNames, options);
			}
		}
	}

	// --------------------------------
	// Actual PseudoDocument methods
	// --------------------------------

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
			if (current instanceof foundry.abstract.Document || current instanceof BasePseudoDocument) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * @param {BasePseudoDocument, PseudoDocumentEnabledTypeDataModel, foundry.abstract.Document} parent
	 * @return {{parentDocument: BasePseudoDocument|foundry.abstract.Document, parentFoundryDocument: foundry.abstract.Document}}
	 * @private
	 */
	static _resolveParents(parent) {
		let parentDocument = parent;
		if (parentDocument instanceof foundry.abstract.TypeDataModel) {
			parentDocument = parentDocument.parent;
		}
		let parentFoundryDocument = parentDocument;
		if (parentFoundryDocument instanceof BasePseudoDocument) {
			parentFoundryDocument = parentFoundryDocument.parentFoundryDocument;
		}

		if (!(parentFoundryDocument instanceof foundry.abstract.Document)) {
			throw new Error('PseudoDocument operations require a parent');
		}
		return { parentDocument, parentFoundryDocument };
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
			const embeddedCollection = current.getEmbeddedCollection(this.documentName);
			if (current !== embeddedCollection.model) {
				current = embeddedCollection.model;
			}
			traversalInstructions.push({ type: 'object', index: embeddedCollection.name });
		}

		while (current !== null && !(current instanceof foundry.abstract.Document)) {
			if (current instanceof BasePseudoDocument) {
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
		current = parent instanceof foundry.abstract.Document ? parent.toObject(true) : parent.parentFoundryDocument.toObject(true);

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
}
