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

	static get implementation() {
		return PseudoDocumentCollection;
	}

	static hierarchical = true;

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

	initialize(value, model, options = {}) {
		const collection = model.collections[this.name];
		collection.initialize(options);
		return collection;
	}

	/**
	 * Return the embedded document(s) as a Collection.
	 * @param {foundry.abstract.Document, PseudoDocument} parent  The parent document.
	 * @returns {Collection}
	 */
	getCollection(parent) {
		return parent.collections?.[this.name] || parent.nestedCollections?.[this.name];
	}

	/** @inheritDoc */
	_cast(value) {
		if (value instanceof Map) return super._cast(value);
		const arr = [];
		for (const [id, v] of value.entries()) {
			if (!('_id' in v)) v._id = id;
			arr.push(v);
		}
		return super._cast(arr);
	}

	/** @override */
	_cleanType(value, options, _state) {
		const sourceIdMap = {};
		if (_state.source) {
			for (const record of _state.source) sourceIdMap[record._id] = record;
		}
		const collection = _state.model?.getEmbeddedCollection(this.name) || null;
		for (let i = 0; i < value.length; i++) {
			const v = value[i];
			const source = sourceIdMap[v._id];
			const model = collection?.get(v._id) ?? null;

			// Propagate inner state. Values without matching source are being created as part of a parent update.
			const _innerState = { ..._state, source, modelSource: source, model, creation: _state.creation || !source };
			if (this.model.hasTypeData) {
				let documentType = foundry.data.operators.ForcedReplacement.get(v.type) ?? source?.type;
				if (!documentType && this.model.metadata.baseTypeAllowed) documentType = CONST.BASE_DOCUMENT_TYPE;
				_innerState.documentId = source?._id;
				_innerState.documentType = documentType;
			}
			value[i] = this._cleanElement(v, options, _innerState);
		}
		return value;
	}

	_cleanElement(value, options, _state) {
		if (!options.partial) value._id ||= foundry.utils.randomID(16);
		return this.model.cleanData(value, { ...options, copy: false }, _state);
	}

	/** @override */
	_validateRecursive(value, options) {
		const collectionFailure = new foundry.data.validation.DataModelValidationFailure('PseudoDocumentCollectionField#_validateRecursive', { fieldPath: this.fieldPath, unresolved: false });
		const collection = options.model?.[this.fieldPath];
		for (let i = value.length - 1; i >= 0; i--) {
			// Iterate backwards so we can splice as we go
			const v = value[i];
			const m = collection?.get(v._id);
			const validationOptions = { ...options, partial: false, model: m, strict: false };
			const failure = this.schema.validate(v, validationOptions);
			if (failure) {
				collectionFailure.elements.push({ id: i, failure });
				PseudoDocumentCollectionField._handleValidationFailure(this.schema, value, i, collectionFailure, failure, {
					model: options.model,
					fallback: false, // Embedded documents cannot fallback
					dropInvalidEmbedded: !!options.dropInvalidEmbedded,
				});
			}
		}

		// Throw for any failure (even if resolved)
		collectionFailure.unresolved = collectionFailure.elements.some((e) => e.failure.unresolved);
		if (!collectionFailure.empty) {
			collectionFailure.elements.reverse();
			throw collectionFailure;
		}
	}

	static _handleValidationFailure(field, value, index, parentFailure, fieldFailure, options) {
		foundry.data.fields.SchemaField._handleValidationFailure(field, value, index, parentFailure, fieldFailure, options);
		if (fieldFailure.unresolved && options.dropInvalidEmbedded) {
			// Do not drop elements from the source so that they can be included in the collection's invalid documents set
			// and later retrieved via getInvalid.
			fieldFailure.dropped = true;
			fieldFailure.unresolved = false;
		}
	}

	_updateDiff(key, value, options, state) {
		// * -> null
		const result = foundry.data.operators.ForcedReplacement.get(value);
		if (!result) return super._updateDiff(key, value, options, state);

		// Pre-validation of the requested value
		let failure = this.validate(result, { strict: false, phase: 'pre', partial: true });
		if (failure?.unresolved) {
			state.failure.fields[key] = failure;
			state.failure.unresolved = true;
			return; // Prevent assignment
		}

		// Otherwise create or diff individual array members
		const isReplacement = value instanceof foundry.data.operators.ForcedReplacement;
		const source = (state.source[key] ||= []);
		const newSource = isReplacement ? [] : source;
		const sourceMap = {};
		for (const obj of source.values()) sourceMap[obj._id] = obj;
		const diff = [];
		failure ||= new foundry.data.validation.DataModelValidationFailure('PseudoDocumentCollectionField#_updateDiff', { fieldPath: this.fieldPath });
		const collection = this.getCollection(state.model);

		// Recursive update and validation of embedded Documents
		const ctx = { source, newSource, isReplacement, diff, collection, state, failure };
		for (const v of result) {
			const existingSource = sourceMap[v._id];
			this._updateElement(v, existingSource, ctx);
		}
		if (!diff.length && !isReplacement) return; // No changes

		// Post-validation of the resulting value
		failure ||= this.validate(result, { strict: false, phase: 'post', partial: true });
		if (failure && !failure?.empty && failure.unresolved) {
			state.failure.fields[key] = failure;
			state.failure.unresolved = true;
			return; // Prevent assignment
		}

		// Assign results to diff
		state.diff[key] = isReplacement ? value : diff;
		if (isReplacement) state.source[key] = newSource;
	}

	/**
	 * Apply an embedded collection update for a single element of the requested value array. Each element is one of:
	 * an update to an existing record, the creation of a new record, or (for subclasses such as
	 * {@link EmbeddedCollectionDeltaField}) a tombstone marking a deletion. Subclasses may override this method to
	 * intercept element-level update behavior.
	 * @param {object} v                                The element being processed.
	 * @param {object|undefined} existingSource         The existing source record matched by `_id`, if any.
	 * @param {EmbeddedCollectionUpdateContext} ctx     Loop-local context shared across elements.
	 * @protected
	 */
	_updateElement(v, existingSource, ctx) {
		// Update an existing record
		if (existingSource) {
			const doc = ctx.collection.createDocument(existingSource);
			try {
				const d = doc.updateSource(v, { clean: false, modifiedTime: ctx.state.modifiedTime, user: ctx.state.user });
				if (!foundry.utils.isEmpty(d)) {
					d._id = v._id;
					ctx.diff.push(d);
				}
				if (ctx.isReplacement) ctx.newSource.push(existingSource);
			} catch (error) {
				if (error instanceof foundry.data.validation.DataModelValidationError) {
					ctx.failure.elements.push({ id: v._id, failure: error.getFailure() });
				} else throw new Error('Unexpected Error class', { cause: error });
			}
			return;
		}

		// Create a new record
		const createData = foundry.utils.applyDataOperators(v);
		if (!createData._id) createData._id = foundry.utils.randomID();
		try {
			const doc = ctx.collection.createDocument(createData, { strict: true, creation: true, modifiedTime: ctx.state.modifiedTime, user: ctx.state.user });
			ctx.diff.push(doc._source);
			ctx.newSource.push(doc._source);
		} catch (err) {
			ctx.failure.elements.push({ id: createData._id, failure: err });
		}
	}

	_updateCommit(source, key, value, diff, options) {
		const src = source[key];

		// Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
		if (!src || !value) {
			source[key] = value;
			return;
		}

		// Map the existing source objects
		const existing = {};
		for (const obj of src) existing[obj._id] = obj;
		const changed = {};
		for (const obj of diff) {
			if (!obj) continue;
			changed[obj._id] = obj;
		}

		// Reconstruct the source array, retaining object references
		src.length = 0;
		for (const obj of value) this._commitElement(obj, src, existing, changed, options);
	}

	/**
	 * Commit a single element into the destination source array.
	 * Subclasses may override this method to apply specialized logic for individual elements.
	 * @param {object} obj                            The element being committed
	 * @param {object[]} src                          The destination source array under construction
	 * @param {Record<string, object>} existing       Map of pre-update source records
	 * @param {Record<string, object>} changed        Map of diff entries
	 * @param {DataModelUpdateOptions} options        Update options
	 * @protected
	 */
	_commitElement(obj, src, existing, changed, options) {
		const prior = existing[obj._id];
		if (prior) {
			const d = changed[obj._id];
			if (d) this.schema._updateCommit({ _source: prior }, '_source', obj, d, options);
			src.push(prior);
			return;
		}
		src.push(obj);
	}

	/** @override */
	toObject(value) {
		return value.toObject(false);
	}

	/** @override */
	apply(fn, value = [], options = {}) {
		// Include this field in the options since it's not introspectable from the SchemaField
		options = { ...options, collection: this };

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
}
