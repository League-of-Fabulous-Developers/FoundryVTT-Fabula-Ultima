/**
 * Subclass of {@link foundry.data.fields.ObjectField} that can embed a {@link ClassFeatureDataModel}
 * while allowing the actual implementation of {@link ClassFeatureDataModel} to be chosen at runtime.
 */
export class FeatureDataField extends foundry.data.fields.ObjectField {
	/**
	 * @type {string} name of the field that stores the type key in the containing DataModel
	 */
	#typeField;

	/**
	 * @param {string} [typeField = 'type'] name of the field that stores the type key in the containing DataModel
	 * @param {DataFieldOptions} [options = {}]
	 */
	constructor(typeField = 'type', options = {}) {
		super(options);
		this.#typeField = typeField;
	}

	/** @override */
	initialize(value, model, options = {}) {
		if (!value) return value;

		const type = model[this.#typeField];
		const featureType = CONFIG.FU.classFeatureRegistry.byKey(type);
		if (featureType) {
			return new featureType(value, { parent: model, ...options });
		} else {
			return value;
		}
	}

	/** @override */
	toObject(value) {
		if (!value) return value;
		if (value instanceof foundry.abstract.DataModel) {
			return value.toObject(false);
		} else {
			return foundry.utils.deepClone(value);
		}
	}

	/**
	 * Apply any cleaning logic specific to this DataField type.
	 * @param {*} value           The appropriately coerced value.
	 * @param {object} [options]  Additional options for how the field is cleaned.
	 * @returns {*}               The cleaned value.
	 * @protected
	 */
	_cleanType(value, options) {
		options.source = options.source || value;
		if (value[this.#typeField]) {
			const type = value[this.#typeField];
			const model = CONFIG.FU.classFeatureRegistry.byKey(type);

			if (model) {
				value = model.cleanData(value, options);
			}
		}
		return value;
	}

	/**
	 * Migrate this field's candidate source data.
	 * @param {object} sourceData   Candidate source data of the root model
	 * @param {any} fieldData       The value of this field within the source data
	 */
	migrateSource(sourceData, fieldData) {
		if (sourceData[this.#typeField] && fieldData) {
			const type = sourceData[this.#typeField];
			const model = CONFIG.FU.classFeatureRegistry.byKey(type);

			model.migrateDataSafe(fieldData);
		}
	}
}
