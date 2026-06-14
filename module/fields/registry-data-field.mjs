/**
 * Subclass of {@link foundry.data.fields.ObjectField} that can embed a {@link DataModel}
 * while allowing the actual implementation found in a {@link DataModelRegistry} to be chosen at runtime.
 */
export class RegistryDataField extends foundry.data.fields.ObjectField {
	/**
	 * @type {string} name of the field that stores the type key in the containing DataModel
	 */
	#typeField;

	/**
	 * @type DataModelRegistry
	 */
	#registry;

	/**
	 * Does this field type contain other fields in a recursive structure?
	 * Examples of recursive fields are SchemaField, ArrayField, or TypeDataField
	 * Examples of non-recursive fields are StringField, NumberField, or ObjectField
	 * @type {boolean}
	 * @override
	 *  */
	static recursive = true;

	/**
	 * @param {DataModelRegistry} registry
	 * @param {string} [typeField = 'type'] Name of the field that stores the type key in the containing DataModel
	 * @param {DataFieldOptions} [options = {}]
	 */
	constructor(registry, typeField = 'type', options = {}) {
		options.nullable = true;
		options.required = false;
		super(options);
		this.#registry = registry;
		this.#typeField = typeField;
	}

	getInitialValue(source) {
		const initial = super.getInitialValue(source) || {};
		return this._cleanType(initial, { partial: false }, { documentType: source.type });
	}

	_cast(value) {
		if (typeof value.toObject === 'function') value = value.toObject();
		return foundry.utils.isPlainObject(value) ? value : {};
	}

	/**
	 * Export the current value of the field into a serializable object.
	 * @param {*} value                   The initialized value of the field
	 * @returns {*}                       An exported representation of the field
	 * @override
	 * */
	toObject(value) {
		if (!value) return value;
		return value.toObject(false);
	}

	/**
	 * Get the schema for the given type.
	 * @param {string} typeValue
	 * @returns {DataModel}
	 */
	#getRegistryModel(typeValue) {
		return this.#registry.byKey(typeValue);
	}

	/**
	 * Migrate this field's candidate source data.
	 * This workflow occurs as a component step of DataField#clean.
	 *
	 *
	 * @param {any} value                           Candidate source value for the field
	 * @param {Readonly<DataModelCleaningOptions>} [options]  Options for how the field is cleaned
	 * @param {DataModelUpdateState} [_state]       Internal state variables transacted during cleaning recursion.
	 * @returns {any}                               A migrated value suitable for cleaning
	 * @protected
	 */
	_migrate(value, options, _state) {
		value = super._migrate(value, options, _state);
		const sourceData = _state.modelSource;
		if (sourceData?.[this.#typeField] && value) {
			const type = sourceData[this.#typeField];
			const model = this.#registry.byKey(type);
			value = model.migrateDataSafe(value);
		}
		return value;
	}

	/**
	 * Recursively traverse a schema and retrieve a field specification by a given path/key
	 * @param {string[]} parts             The field path or property key if `source` is passed as an array of strings
	 *                                     (in reverse order)
	 * @param {object} [options]           Additional options
	 * @param {object} [options.source]    The source data of the field
	 * @param {object} [options.type]      The Document type of the parent field
	 * @returns {DataField|undefined}      The corresponding DataField definition for that field, or undefined
	 * @protected
	 */
	_getField(parts, { source } = {}) {
		if (!parts.length) return this;
		const model = this.#getRegistryModel(this.#getTypeValue(source));
		return model?.schema?._getField(parts, { source });
	}

	/**
	 * Apply any cleaning logic specific to this DataField type.
	 * @param {any} value         A candidate value that has been cast to the appropriate type
	 * @param {Readonly<DataModelCleaningOptions>} [options]  Options for how the field is cleaned
	 * @param {DataModelUpdateState} [_state] Internal state variables which are used during recursion
	 * @returns {any}             The cleaned value
	 * @protected
	 */
	_cleanType(value, options, _state) {
		const type = _state.documentType;

		// Use a defined DataModel
		const cls = this.#getRegistryModel(type);
		if (cls) return cls.cleanData(value, { ...options, copy: false }, _state);
		else super._cleanType(value, options, _state); // Clean as an object field
		if (options.partial) return value;

		// Use a defined template.json
		/** @deprecated since v14 until v16 */
		const template = game?.model[this.documentName]?.[type];
		if (template) {
			const insertKeys = type === CONST.BASE_DOCUMENT_TYPE || !game?.system?.strictDataCleaning;
			return foundry.utils.mergeObject(template, value, { insertKeys, inplace: false });
		}
		return value;
	}

	/**
	 * A default type-specific validator that can be overridden by child classes
	 * This method should validate only the value at the current hierarchy level, rather than validating recursively.
	 * This method should throw if any validation error occurred, even if resolved by fallback or dropping.
	 *
	 * @param {*} value                                  The candidate value
	 * @param {DataFieldValidationOptions} [options={}]  Options which affect validation behavior
	 * @returns {boolean|void}                           A boolean to indicate with certainty whether the value is valid
	 * @throws {Error}                                   An error with a specific reason the value is invalid
	 * @protected
	 */
	_validateType(value, options) {
		if (typeof value !== 'object') throw new Error('does not have a valid type');
		let typeValue = this.#getTypeValue(options.model);
		typeValue = foundry.data.operators.ForcedReplacement.get(typeValue);
		const model = this.#getRegistryModel(typeValue);
		if (!model) throw new Error('does not have a valid type');
		if (options.recursive === false) return;
		return model.schema.validate(value, options);
	}

	#getTypeValue(model) {
		return model?._source[this.parent.fieldPath]?.[this.#typeField] ?? model?._source?.[this.#typeField];
	}

	/* ---------------------------------------- */

	/**
	 * Initialize the original source data into a mutable copy for the DataModel instance.
	 * @param {unknown} value             The source value of the field
	 * @param {object} model              The DataModel instance that this field belongs to
	 * @param {object} [options]          Initialization options
	 * @returns {unknown}                 An initialized copy of the source data
	 */
	initialize(value, model, options = {}) {
		const cls = this.#getRegistryModel(this.#getTypeValue(model));
		return new cls(value, { parent: model, ...options, clean: false });
	}

	clean(value, options, _state) {
		if (!value) return this.getInitialValue({ type: this.#getTypeValue(options.model) });
		return super.clean(value, options, _state);
	}

	_validateRecursive(value, options) {
		const source = options.model?._source;
		const cls = this.#getRegistryModel(this.#getTypeValue(options.model));
		if (!cls) return;
		return cls.schema.validate(value, { ...options, source, strict: true });
	}

	_validateModel(changes, options = {}) {
		const cls = this.#getRegistryModel(this.#getTypeValue(options.model));
		return cls?.validateJoint(changes);
	}
}
