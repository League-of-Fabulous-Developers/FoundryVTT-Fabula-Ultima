import { PseudoDocument } from './pseudo-document.mjs';

/**
 * @param foundry.abstract.Document
 * @return {typeof DocumentPseudoDocumentsMixin}
 */
export function EnablePseudoDocumentsMixin(ClientDocument) {
	if (!foundry.utils.isSubclass(ClientDocument, foundry.abstract.Document)) {
		throw new Error(`${ClientDocument.name} is not a Document`);
	}

	class DocumentPseudoDocumentsMixin extends ClientDocument {
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
		 * @see ClientDocument.deleteDocuments
		 * @param {string} embeddedName                     The name of the embedded Document type
		 * @param {string[]} ids                            An array of string ids for each Document to be deleted
		 * @param {DatabaseDeleteOperation} [operation={}]  Parameters of the database deletion workflow
		 * @return {Promise<ClientDocument[]>}                    An array of deleted Document instances
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
