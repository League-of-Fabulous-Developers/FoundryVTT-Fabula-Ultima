import { PseudoDocumentCollectionField } from './pseudo-document-collection-field.mjs';
import { PseudoDocument } from './pseudo-document.mjs';

export class PseudoDocumentEnabledTypeDataModel extends foundry.abstract.TypeDataModel {
	_configure() {
		// Construct Embedded Collections
		const collections = {};
		for (const [fieldName, field] of Object.entries(this.constructor.schema.fields)) {
			if (field instanceof PseudoDocumentCollectionField) {
				const data = this._source[fieldName];
				const collection = this.parent.nestedCollections[fieldName] ?? new field.constructor.implementation(fieldName, this, data);
				collections[fieldName] = collection;
				this.parent.nestedCollections[fieldName] = collection;
				Object.defineProperty(this, fieldName, { value: collection, writable: true });
			}
		}

		/**
		 * A mapping of embedded Document collections which exist in this model.
		 * @type {Record<string, Collection>}
		 */
		Object.defineProperty(this, 'collections', { value: Object.seal(collections), writable: false });
	}

	_initialize(options = {}) {
		super._initialize(options);
		Object.entries(this.collections).forEach(([fieldName, collection]) => {
			collection.updateSource(this._source[fieldName]);
		});
	}

	/**
	 * A compatibility method that returns the appropriate name of a pseudo collection within this Document.
	 * @param {string} name    An existing collection name or a document name.
	 * @returns {string|null}  The provided collection name if it exists, the first available collection for the
	 *                         document name provided, or null if no appropriate embedded collection could be found.
	 */
	static getCollectionName(name) {
		if (name in this.schema.fields) {
			return name;
		}
		for (const [fieldName, field] of Object.entries(this.schema.fields)) {
			if (field instanceof PseudoDocumentCollectionField && (field.model.name === name || field.model.documentName === name)) {
				return fieldName;
			}
		}
		return null;
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
	 * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
	 * @param {string} embeddedName   The name of the embedded Document type
	 * @return {PseudoDocumentCollection}   The Collection instance of embedded Documents of the requested type
	 */
	getEmbeddedCollection(embeddedName) {
		const collectionName = this.constructor.getCollectionName(embeddedName);
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
	 * @param {string} embeddedName                     The name of the embedded Document type
	 * @param {object[]} updates                        An array of differential data objects, each used to update a
	 *                                                  single Document
	 * @param {DatabaseUpdateOperation} [operation={}]  Parameters of the database update workflow
	 * @return {Promise<void>}                    An array of updated Document instances
	 */
	async updateEmbeddedDocuments(embeddedName, updates = [], operation = {}) {
		const collection = this.getEmbeddedCollection(embeddedName); // Validation only
		operation.parent = this;
		const cls = collection.documentClass;
		return cls.updateDocuments(updates, operation);
	}

	/**
	 * Delete multiple embedded Document instances within a parent Document using provided string ids.
	 * @see Document.deleteDocuments
	 * @param {string} embeddedName                     The name of the embedded Document type
	 * @param {string[]} ids                            An array of string ids for each Document to be deleted
	 * @param {DatabaseDeleteOperation} [operation={}]  Parameters of the database deletion workflow
	 * @return {Promise<Document[]>}                    An array of deleted Document instances
	 */
	async deleteEmbeddedDocuments(embeddedName, ids, operation = {}) {
		const collection = this.getEmbeddedCollection(embeddedName); // Validation only
		operation.parent = this;
		const cls = collection.documentClass;
		return cls.deleteDocuments(ids, operation);
	}
}

/**
 * @param foundry.abstract.Document
 * @return {typeof DocumentPseudoDocumentsMixin}
 */
export function EnablePseudoDocumentsMixin(Document) {
	if (!foundry.utils.isSubclass(Document, foundry.abstract.Document)) {
		throw new Error(`${Document.name} is not a Document`);
	}

	class DocumentPseudoDocumentsMixin extends Document {
		_configure(options = {}) {
			super._configure(options);

			Object.defineProperty(this, 'nestedCollections', { value: {}, writable: false });
		}

		prepareEmbeddedDocuments() {
			super.prepareEmbeddedDocuments();
			for (const collectionName of Object.keys(this.nestedCollections || {})) {
				for (const e of this.getEmbeddedCollection(collectionName)) {
					e._safePrepareData();
				}
			}
		}

		getEmbeddedCollection(embeddedName) {
			const collectionName = this.constructor.getCollectionName(embeddedName);
			if (!collectionName) {
				if (this.system && this.system.getEmbeddedCollection) {
					return this.system.getEmbeddedCollection(embeddedName);
				} else if (embeddedName in this.nestedCollections) {
					return this.nestedCollections[embeddedName];
				}
			}
			return super.getEmbeddedCollection(embeddedName);
		}

		getEmbeddedDocument(embeddedName, id, { invalid = false, strict = false } = {}) {
			const collection = this.getEmbeddedCollection(embeddedName);
			return collection.get(id, { invalid, strict });
		}

		async createEmbeddedDocuments(embeddedName, data = [], operation = {}) {
			const collection = this.getEmbeddedCollection(embeddedName); // Validation only
			if (foundry.utils.isSubclass(collection.documentClass, PseudoDocument)) {
				return this.system.createEmbeddedDocuments(embeddedName, data, operation);
			}
			return super.createEmbeddedDocuments(embeddedName, data, operation);
		}

		/**
		 * Update multiple embedded Document instances within a parent Document using provided differential data.
		 * @param {string} embeddedName                     The name of the embedded Document type
		 * @param {object[]} updates                        An array of differential data objects, each used to update a
		 *                                                  single Document
		 * @param {DatabaseUpdateOperation} [operation={}]  Parameters of the database update workflow
		 * @return {Promise<void>}                    An array of updated Document instances
		 */
		async updateEmbeddedDocuments(embeddedName, updates = [], operation = {}) {
			const collection = this.getEmbeddedCollection(embeddedName); // Validation only
			if (foundry.utils.isSubclass(collection.documentClass, PseudoDocument)) {
				return this.system.updateEmbeddedDocuments(embeddedName, updates, operation);
			}
			return super.updateEmbeddedDocuments(embeddedName, updates, operation);
		}

		/**
		 * Delete multiple embedded Document instances within a parent Document using provided string ids.
		 * @see Document.deleteDocuments
		 * @param {string} embeddedName                     The name of the embedded Document type
		 * @param {string[]} ids                            An array of string ids for each Document to be deleted
		 * @param {DatabaseDeleteOperation} [operation={}]  Parameters of the database deletion workflow
		 * @return {Promise<Document[]>}                    An array of deleted Document instances
		 */
		async deleteEmbeddedDocuments(embeddedName, ids, operation = {}) {
			const collection = this.getEmbeddedCollection(embeddedName); // Validation only
			if (foundry.utils.isSubclass(collection.documentClass, PseudoDocument)) {
				return this.system.deleteEmbeddedDocuments(embeddedName, ids, operation);
			}
			return super.deleteEmbeddedDocuments(embeddedName, ids, operation);
		}

		_onDelete(options, userId) {
			super._onDelete(options, userId);
			Object.values(this.nestedCollections).forEach((collection) => collection.forEach((doc) => doc._onDelete()));
		}
	}

	return DocumentPseudoDocumentsMixin;
}
