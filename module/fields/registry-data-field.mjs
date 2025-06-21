import { FoundryUtils } from '../helpers/foundry-utils.mjs';

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
		super(options);
		this.#typeField = typeField;
	}

	/**
	 * Initialize the original source data into a mutable copy for the DataModel instance.
	 * @param {*} value                   The source value of the field
	 * @param {Object} model              The DataModel instance that this field belongs to
	 * @param {object} [options]          Initialization options
	 * @returns {*}                       An initialized copy of the source data
	 * @override
	 *  */
	initialize(value, model, options = {}) {
		if (!value) return value;

		const schema = this.#getTypeSchema(model);
		const fields = schema._schema.fields;
		const changed = !FoundryUtils.haveSameKeys(value, fields);
		if (changed) {
			return new schema({ parent: model, ...options });
		} else {
			return value;
		}
	}

	/**
	 * Export the current value of the field into a serializable object.
	 * @param {*} value                   The initialized value of the field
	 * @returns {*}                       An exported representation of the field
	 * @override
	 * */
	toObject(value) {
		if (!value) return value;
		if (value instanceof foundry.abstract.DataModel) {
			return value.toObject(false);
		} else {
			return foundry.utils.deepClone(value);
		}
	}

	/**
	 * Get the schema for the given type.
	 * @param {DataModel} model
	 * @returns {SchemaField|void}
	 */
	#getTypeSchema(model) {
		const type = model[this.#typeField];
		return CONFIG.FU.optionalFeatureRegistry.byKey(type);
	}

	/**
	 * Migrate this field's candidate source data.
	 * @param {object} sourceData   Candidate source data of the root model
	 * @param {any} fieldData       The value of this field within the source data
	 */
	migrateSource(sourceData, fieldData) {
		if (sourceData[this.#typeField] && fieldData) {
			const type = sourceData[this.#typeField];
			const model = CONFIG.FU.optionalFeatureRegistry.byKey(type);
			model.migrateDataSafe(fieldData);
		}
	}
}
