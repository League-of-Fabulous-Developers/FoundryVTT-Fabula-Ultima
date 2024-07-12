import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';

/**
 * Registry for `Optional Features`.
 * `Optional Features` are modelled through a subclass of either {@link OptionalFeatureDataModel} or {@link RollableOptionalFeatureDataModel}.
 * Registered `Optional Features` are eligible for selection as a subtype of the `optionalFeature` Item type implemented by the system.
 */
export class OptionalFeatureRegistry {
	/**
	 * @type {Map<string, typeof OptionalFeatureDataModel>}
	 */
	#optionals = new Map();

	/**
	 * @param {string} module the module that implements the `Optional Feature`
	 * @param {string} type the identifier of the `Optional Feature`
	 * @param {typeof OptionalFeatureDataModel} model the `DataModel` of the `Optional Feature`
	 */
	register(module, type, model) {
		if (!module) {
			throw new Error('The originating module must be specified');
		}

		if (!type) {
			throw new Error('The optionalFeature type must be specified');
		}

		const key = `${module}.${type}`;

		if (!foundry.utils.isSubclass(model, OptionalFeatureDataModel)) {
			throw new Error(`Optional Feature ${key} must be a subclass of OptionalFeatureDataModel`);
		}

		try {
			model.template;
		} catch (cause) {
			throw new Error(`Optional Feature ${key} must provide a template`, { cause });
		}

		if (!model.previewTemplate) {
			throw new Error(`Optional Feature ${key} must provide a preview template`);
		}

		try {
			model.translation;
		} catch (cause) {
			throw new Error(`Optional Feature ${key} must provide a translation`, { cause });
		}

		if (foundry.utils.isSubclass(model, RollableOptionalFeatureDataModel) && !Object.hasOwn(model, 'roll')) {
			throw new Error(`Rollable Optional Feature ${key} must override the roll() function`);
		}

		if (this.#optionals.has(key)) {
			throw new Error(`Optional Feature ${key} is already registered`);
		}

		this.#optionals.set(key, model);

		return key;
	}

	/**
	 * @return {Object<string, typeof OptionalFeatureDataModel>}
	 */
	optionals() {
		return Object.fromEntries(this.#optionals);
	}

	/**
	 * @param {string} key
	 * @return OptionalFeatureDataModel
	 */
	byKey(key) {
		return this.#optionals.get(key);
	}
}
