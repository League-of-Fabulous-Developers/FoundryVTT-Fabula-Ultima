export class PseudoDocumentTypeDataField extends foundry.data.fields.ObjectField {
	/**
	 * @param {typeof PseudoDocument} document  The base document class which belongs in this field
	 * @param {DataFieldOptions} [options]    Options which configure the behavior of the field
	 * @param {DataFieldContext} [context]    Additional context which describes the field
	 */
	constructor(document, options = {}, context = {}) {
		super(options, context);
		/**
		 * The canonical document name of the document type which belongs in this field
		 * @type {typeof PseudoDocument}
		 */
		this.document = document;
	}

	/** @inheritdoc */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, { required: true });
	}

	/** @override */
	static recursive = true;

	/**
	 * A convenience accessor for the name of the document type associated with this TypeDataField
	 * @type {string}
	 */
	get documentName() {
		return this.document.documentName;
	}

	/**
	 * Get the DataModel definition that should be used for this type of document.
	 * @param {string} type              The Document instance type
	 * @returns {typeof DataModel|null}  The DataModel class or null
	 */
	getModelForType(type) {
		if (!type) return null;
		return globalThis.CONFIG?.[this.documentName]?.dataModels?.[type] ?? null;
	}

	/** @override */
	getInitialValue(data) {
		const cls = this.getModelForType(data.type);
		if (cls) return cls.cleanData();
		const template = game?.model[this.documentName]?.[data.type];
		if (template) return foundry.utils.deepClone(template);
		return {};
	}

	/** @override */
	_cleanType(value, options) {
		if (!(typeof value === 'object')) value = {};

		// Use a defined DataModel
		const type = options.source?.type;
		const cls = this.getModelForType(type);
		if (cls) return cls.cleanData(value, { ...options, source: value });
		if (options.partial) return value;

		// Use the defined template.json
		const template = this.getInitialValue(options.source);
		const insertKeys = !game?.system?.strictDataCleaning;
		return foundry.utils.mergeObject(template, value, { insertKeys, inplace: true });
	}

	/** @override */
	initialize(value, model, options = {}) {
		const cls = this.getModelForType(model._source.type);
		if (cls) {
			const instance = new cls(value, { parent: model, ...options });
			if (!('modelProvider' in instance))
				Object.defineProperty(instance, 'modelProvider', {
					value: this.constructor.getModelProvider(instance),
					writable: false,
				});
			return instance;
		}
		return foundry.utils.deepClone(value);
	}

	/** @inheritdoc */
	_validateType(data, options = {}) {
		const result = super._validateType(data, options);
		if (result !== undefined) return result;
		const cls = this.getModelForType(options.source?.type);
		const schema = cls?.schema;
		return schema?.validate(data, { ...options, source: data });
	}

	/* ---------------------------------------- */

	/** @override */
	_validateModel(changes, options = {}) {
		const cls = this.getModelForType(options.source?.type);
		return cls?.validateJoint(changes);
	}

	/* ---------------------------------------- */

	/** @override */
	toObject(value) {
		return value.toObject instanceof Function ? value.toObject(false) : foundry.utils.deepClone(value);
	}

	/**
	 * Migrate this field's candidate source data.
	 * @param {object} sourceData   Candidate source data of the root model
	 * @param {any} fieldData       The value of this field within the source data
	 */
	migrateSource(sourceData, fieldData) {
		const cls = this.getModelForType(sourceData.type);
		if (cls) cls.migrateDataSafe(fieldData);
	}
}
