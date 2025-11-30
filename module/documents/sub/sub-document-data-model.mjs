import { FU } from '../../helpers/config.mjs';

const { DocumentIdField, StringField } = foundry.data.fields;

/**
 * @typedef {Object} SubDocumentMetadata
 * @property {string} documentName   The document name of this pseudo-document.
 * @property {Object.<string,string>} embedded   Record of document names of pseudo-documents and the path to the collection.
 * @property {String} icon The font-awesome icon for this pseudo-document type
 * @property {DocumentSheet} [sheetClass]   The class used to render this pseudo-document. (optional)
 */

/**
 * A special subclass of data model that can be treated as a system-defined embedded document.
 * @property {String} id
 */
export class SubDocumentDataModel extends foundry.abstract.DataModel {
	/**
	 * @type {SubDocumentMetadata}
	 */
	static get metadata() {
		return {
			documentName: null,
			embedded: {},
			icon: '',
			sheetClass: null,
		};
	}

	/** @inheritdoc */
	static defineSchema() {
		return {
			_id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
			type: new StringField({
				required: true,
				blank: false,
				initial: this.TYPE,
				validate: (value) => value === this.TYPE,
			}),
		};
	}

	/** @inheritdoc */
	renderContext() {
		super.prepareDerivedData();
		if (!this.name) {
			this.name = game.i18n.localize(`TYPES.${this.documentName}.${this.type}`);
		}
	}

	/**
	 * The type of this sub-document subclass.
	 * @type {string}
	 * @abstract
	 */
	static get TYPE() {
		return '';
	}

	/**
	 * The subtypes of this sub-document.
	 * @type {Record<string, typeof SubDocumentDataModel>}
	 */
	static get TYPES() {
		const registry = FU.dataModelRegistries[this.metadata.documentName];
		return registry.types;
	}

	/**
	 * The id of this pseudo-document.
	 * @type {string}
	 */
	get id() {
		return this._id;
	}

	/**
	 * The uuid of this document.
	 * @type {string}
	 */
	get uuid() {
		let parent = this.parent;
		while (!(parent instanceof SubDocumentDataModel) && !(parent instanceof foundry.abstract.Document)) parent = parent.parent;
		return [parent.uuid, this.documentName, this.id].join('.');
	}

	/**
	 * The parent document of this pseudo-document.
	 * @type {Document}
	 */
	get document() {
		let parent = this;
		while (!(parent instanceof foundry.abstract.Document)) parent = parent.parent;
		return parent;
	}

	/**
	 * The document name of this pseudo document.
	 * @type {string}
	 */
	get documentName() {
		return this.constructor.metadata.documentName;
	}

	/**
	 * Does this pseudo-document exist in the document's source?
	 * @type {boolean}
	 */
	get isSource() {
		const docName = this.documentName;
		const fieldPath = this.parent.constructor.metadata.embedded[docName];
		const parent = this.parent instanceof foundry.abstract.TypeDataModel ? this.parent.parent : this.parent;
		const source = foundry.utils.getProperty(parent._source, fieldPath);
		if (foundry.utils.getType(source) !== 'Object') {
			throw new Error('Source is not an object!');
		}
		return this.id in source;
	}

	/**
	 * The property path to this pseudo document relative to its parent document.
	 * @type {string}
	 */
	get fieldPath() {
		// TODO: Needs to handle nested better
		const fp = this.schema.fieldPath;
		let path = fp.slice(0, fp.lastIndexOf('element') - 1);

		if (this.parent instanceof SubDocumentDataModel) {
			path = [this.parent.fieldPath, this.parent.id, path].join('.');
		}

		return path;
	}

	/**
	 * Delete this pseudo-document.
	 * @param {object} [operation]                      The context of the operation.
	 * @returns {Promise<foundry.abstract.Document>}    A promise that resolves to the updated document.
	 */
	async delete(operation = {}) {
		if (!this.isSource) throw new Error('You cannot delete a non-source pseudo-document!');
		Object.assign(operation, { pseudo: { operation: 'delete', type: this.constructor.documentName, uuid: this.uuid } });
		const update = { [`${this.fieldPath}.-=${this.id}`]: null };
		this.constructor._configureUpdates('delete', this.document, update, operation);
		return this.document.update(update, operation);
	}

	/**
	 * Update this pseudo-document.
	 * @param {object} [change]                         The change to perform.
	 * @param {object} [operation]                      The context of the operation.
	 * @returns {Promise<foundry.abstract.Document>}    A promise that resolves to the updated document.
	 */
	async update(change = {}, operation = {}) {
		if (!this.isSource) throw new Error('You cannot update a non-source pseudo-document!');
		const path = [this.fieldPath, this.id].join('.');
		const update = { [path]: change };
		this.constructor._configureUpdates('update', this.document, update, operation);
		return this.document.update(update, operation);
	}

	/**
	 * Allow for subclasses to configure the CRUD workflow.
	 * @param {"create"|"update"|"delete"} action     The operation.
	 * @param {foundry.abstract.Document} document    The parent document.
	 * @param {object} update                         The data used for the update.
	 * @param {object} operation                      The context of the operation.
	 */
	static _configureUpdates(action, document, update, operation) {}

	/**
	 * @param {object} [data]                                 The data used for the creation.
	 * @param {object} operation                              The context of the operation.
	 * @param {foundry.abstract.DataModel} operation.parent   The parent of this document.
	 * @returns {Promise<foundry.abstract.Document>}          A promise that resolves to the updated document.
	 */
	static async create(data = {}, { parent, ...operation } = {}) {
		if (!parent) {
			throw new Error('A parent document must be specified for the creation of a pseudo-document!');
		}
		const id = operation.keepId && foundry.data.validators.isValidId(data._id) ? data._id : foundry.utils.randomID();

		// Resolve the field path based on metadata
		let fieldPath;
		if (parent instanceof foundry.abstract.Document) {
			fieldPath = parent.system.constructor.metadata?.embedded?.[this.metadata.documentName];
		} else {
			if (parent.prototype) {
				fieldPath = parent.prototype.constructor.metadata?.embedded?.[this.metadata.documentName];
			} else {
				fieldPath = parent.constructor.metadata?.embedded?.[this.metadata.documentName];
			}
		}

		if (!fieldPath) {
			throw new Error(`A ${parent.documentName} of type '${parent.type}' does not support ${this.metadata.documentName}!`);
		}

		const update = { [`${fieldPath}.${id}`]: { ...data, _id: id } };
		this._configureUpdates('create', parent, update, operation);
		await parent.update(update, operation);
		return parent;
	}
}
