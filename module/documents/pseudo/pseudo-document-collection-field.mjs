import { PseudoDocument } from './pseudo-document.mjs';
import PseudoDocumentCollection from './pseudo-document-collection.mjs';

export class PseudoDocumentCollectionField extends foundry.data.fields.ArrayField {
	/**
	 * @param {typeof PseudoDocument} [element] The type of PseudoItem which belongs to this embedded collection
	 * @param {DataFieldOptions} [options]  Options which configure the behavior of the field
	 * @param {DataFieldContext} [context]  Additional context which describes the field
	 */
	constructor(element, options = {}, context = {}) {
		super(element, options, context);
		this.readonly = true; // Pseudo collections cannot be immutable
	}

	/** @override */
	static _validateElementType(element) {
		if (foundry.utils.isSubclass(element, PseudoDocument)) return element;
		throw new Error('A PseudoDocumentCollectionField must specify a PseudoDocument subclass as its type');
	}

	/**
	 * A reference to the DataModel subclass of the embedded document element
	 * @type {typeof PseudoDocument}
	 */
	get model() {
		return this.element;
	}

	/**
	 * The DataSchema of the contained Document model.
	 * @type {SchemaField}
	 */
	get schema() {
		return this.model.schema;
	}

	static get implementation() {
		return PseudoDocumentCollection;
	}

	/** @inheritDoc */
	_cast(value) {
		if (foundry.utils.getType(value) !== 'Map') return super._cast(value);
		const arr = [];
		for (const [id, v] of value.entries()) {
			if (!('_id' in v)) v._id = id;
			arr.push(v);
		}
		return super._cast(arr);
	}

	/** @override */
	_cleanType(value, options) {
		return value.map((v) => this.schema.clean(v, { ...options, source: v }));
	}

	/** @override */
	_validateElements(value, options) {
		const collectionFailure = new foundry.data.validation.DataModelValidationFailure();
		for (const v of value) {
			const failure = this.schema.validate(v, { ...options, source: v });
			if (failure && !options.dropInvalidEmbedded) {
				collectionFailure.elements.push({ id: v._id, name: v.name, failure });
				collectionFailure.unresolved ||= failure.unresolved;
			}
		}
		if (collectionFailure.elements.length) return collectionFailure;
	}

	initialize(value, model, options = {}) {
		const collection = model.collections[this.name];
		collection.initialize(options);
		return collection;
	}

	/** @override */
	toObject(value) {
		return value.toObject(false);
	}

	/** @override */
	apply(fn, value = [], options = {}) {
		// Apply to this EmbeddedCollectionField
		const thisFn = typeof fn === 'string' ? this[fn] : fn;
		thisFn?.call(this, value, options);

		// Recursively apply to inner fields
		const results = [];
		if (!value.length && options.initializeArrays) value = [undefined];
		for (const v of value) {
			const r = this.schema.apply(fn, v, options);
			if (!options.filter || !foundry.utils.isEmpty(r)) results.push(r);
		}
		return results;
	}

	/**
	 * Migrate this field's candidate source data.
	 * @param {object} sourceData   Candidate source data of the root model
	 * @param {any} fieldData       The value of this field within the source data
	 */
	migrateSource(sourceData, fieldData) {
		if (fieldData instanceof Array) {
			for (const entry of fieldData) this.model.migrateDataSafe(entry);
		}
	}

	/* -------------------------------------------- */
	/*  Embedded Document Operations                */
	/* -------------------------------------------- */

	/**
	 * Return the embedded document(s) as a Collection.
	 * @param {foundry.abstract.Document, PseudoDocument} parent  The parent document.
	 * @returns {Collection}
	 */
	getCollection(parent) {
		return parent.collections[this.name];
	}
}
