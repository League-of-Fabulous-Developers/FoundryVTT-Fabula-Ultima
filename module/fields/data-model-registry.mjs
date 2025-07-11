/**
 * @description Associates string identifiers with DataModel
 */
export class DataModelRegistry {
	/** @type {Map<String, DataModel>} */
	#map = new Map();

	/**
	 * @param {object} config
	 * @param {string} config.kind - Used in error messages (e.g. "Class Feature")
	 * @param {Function} config.baseClass - Required base class
	 * @param {Function} config.rollableClass - Optional rollable subclass
	 */
	constructor({ kind, baseClass, rollableClass }) {
		this.kind = kind;
		this.baseClass = baseClass;
		this.rollableClass = rollableClass;
	}

	/**
	 * @param {string} module
	 * @param {string} type
	 * @param {Function} model
	 */
	register(module, type, model) {
		if (!module) throw new Error(`The originating module must be specified`);
		if (!type) throw new Error(`The ${this.kind.toLowerCase()} type must be specified`);

		const key = `${module}.${type}`;
		//const key = type;

		if (!foundry.utils.isSubclass(model, this.baseClass)) {
			throw new Error(`${this.kind} ${key} must be a subclass of ${this.baseClass.name}`);
		}

		try {
			model.template;
		} catch (cause) {
			throw new Error(`${this.kind} ${key} must provide a template`, { cause });
		}

		if (!model.previewTemplate) {
			throw new Error(`${this.kind} ${key} must provide a preview template`);
		}

		if (!model.expandTemplate) {
			throw new Error(`${this.kind} ${key} must provide an expand template`);
		}

		try {
			model.translation;
		} catch (cause) {
			throw new Error(`${this.kind} ${key} must provide a translation`, { cause });
		}

		if (this.rollableClass && foundry.utils.isSubclass(model, this.rollableClass) && !Object.hasOwn(model, 'roll')) {
			throw new Error(`Rollable ${this.kind} ${key} must override the roll() function`);
		}

		if (this.#map.has(key)) {
			throw new Error(`${this.kind} ${key} is already registered`);
		}

		this.#map.set(key, model);
		return key;
	}

	/**
	 * @returns {Object<string, DataModel>}
	 */
	get all() {
		return Object.fromEntries(this.#map);
	}

	/**
	 * @param {string} key
	 * @returns {any}
	 */
	byKey(key) {
		return this.#map.get(key);
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
	 * @returns {String[]}
	 */
	get choices() {
		return this.#map.keys().toArray();
	}

	/**
	 * @returns {Record<string, string>}
	 */
	get entries() {
		return Object.entries(this.all).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
	}
}
