/**
 * @description Associates string identifiers with DataModel
 */
export class DataModelRegistry {
	/** @type {Map<String, DataModel>} */
	#types = new Map();
	/** @type {Map<String, DataModel>} */
	#qualifiedTypes = new Map();
	/** @type {Map<String, String>} */
	#typeQualification = new Map();

	/**
	 * @param {object} config
	 * @param {string} config.kind - Used in error messages (e.g. "Class Feature")
	 * @param {Function} config.baseClass - Required base class
	 */
	constructor({ kind, baseClass }) {
		this.kind = kind;
		this.baseClass = baseClass;
	}

	/**
	 * @returns {Object<String, DataModel>}
	 */
	get types() {
		return Object.fromEntries(this.#types);
	}

	/**
	 * @returns {Object<string, DataModel>}
	 */
	get qualifiedTypes() {
		return Object.fromEntries(this.#qualifiedTypes);
	}

	/**
	 * @returns {String[]}
	 */
	get choices() {
		return this.#types.keys().toArray();
	}

	/**
	 * @returns {String[]}
	 */
	get qualifiedChoices() {
		return this.#qualifiedTypes.keys().toArray();
	}

	/**
	 * @param {string} key
	 * @returns {any}
	 */
	byKey(key) {
		return this.#qualifiedTypes.get(key);
	}

	/**
	 * @param {string} key
	 * @returns {String}
	 */
	localize(key) {
		const schema = this.byKey(key);
		return schema.translation;
	}

	/**
	 * @param {String} type An unqualified type.
	 * @returns {String} A qualified type
	 */
	qualify(type) {
		return this.#typeQualification.get(type);
	}

	/**
	 * @returns {Record<string, string>}
	 * @remarks Fully qualified
	 */
	get entries() {
		return Object.entries(this.qualifiedTypes).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
	}

	/**
	 * @returns {Record<string, string>} The type to its localization.
	 */
	get localizedEntries() {
		return Object.entries(this.types).reduce((agg, [key, value]) => (agg[key] = value.translation ?? value.localization) && agg, {});
	}

	/**
	 * @param {string} module
	 * @param {string} type
	 * @param {Function} model
	 */
	register(module, type, model) {
		if (!module) {
			throw new Error(`The originating module must be specified`);
		}
		if (!type) {
			throw new Error(`The ${this.kind.toLowerCase()} type must be specified`);
		}

		const qualifiedType = `${module}.${type}`;

		if (!foundry.utils.isSubclass(model, this.baseClass)) {
			throw new Error(`${this.kind} ${qualifiedType} must be a subclass of ${this.baseClass.name}`);
		}

		try {
			model.template;
		} catch (cause) {
			throw new Error(`${this.kind} ${qualifiedType} must provide a template`, { cause });
		}

		try {
			model.translation;
		} catch (cause) {
			throw new Error(`${this.kind} ${qualifiedType} must provide a translation`, { cause });
		}

		if (this.#qualifiedTypes.has(qualifiedType)) {
			throw new Error(`${this.kind} ${qualifiedType} is already registered`);
		}

		this.#types.set(type, model);
		this.#qualifiedTypes.set(qualifiedType, model);
		this.#typeQualification.set(type, qualifiedType);
		return qualifiedType;
	}
}
