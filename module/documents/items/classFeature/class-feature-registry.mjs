import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './class-feature-data-model.mjs';

/**
 * Registry for `Class Features`.
 * `Class Features` are modelled through a subclass of either {@link ClassFeatureDataModel} or {@link RollableClassFeatureDataModel}.
 * Registered `Class Features` are eligible for selection as a subtype of the `classFeature` Item type implemented by the system.
 */
export class ClassFeatureRegistry {
	/**
	 * @type {Map<string, typeof ClassFeatureDataModel>}
	 */
	#features = new Map();

	/**
	 * @param {string} module the module that implements the `Class Feature`
	 * @param {string} type the identifier of the `Class Feature`
	 * @param {typeof ClassFeatureDataModel} model the `DataModel` of the `Class Feature`
	 */
	register(module, type, model) {
		if (!module) {
			throw new Error('The originating module must be specified');
		}

		if (!type) {
			throw new Error('The class classFeature type must be specified');
		}

		const key = `${module}.${type}`;

		if (!foundry.utils.isSubclass(model, ClassFeatureDataModel)) {
			throw new Error(`Class feature ${key} must be a subclass of ClassFeatureDataModel`);
		}

		try {
			model.template;
		} catch (cause) {
			throw new Error(`Class feature ${key} must provide a template`, { cause });
		}

		if (!model.previewTemplate) {
			throw new Error(`Class feature ${key} must provide a preview template`);
		}

		try {
			model.translation;
		} catch (cause) {
			throw new Error(`Class feature ${key} must provide a translation`, { cause });
		}

		if (foundry.utils.isSubclass(model, RollableClassFeatureDataModel) && !Object.hasOwn(model, 'roll')) {
			throw new Error(`Rollable class feature ${key} must override the roll() function`);
		}

		if (this.#features.has(key)) {
			throw new Error(`Class feature ${key} is already registered`);
		}

		this.#features.set(key, model);

		return key;
	}

	/**
	 * @return {Object<string, typeof ClassFeatureDataModel>}
	 */
	features() {
		return Object.fromEntries(this.#features);
	}

	/**
	 * @param {string} key
	 * @return ClassFeatureDataModel
	 */
	byKey(key) {
		return this.#features.get(key);
	}
}
