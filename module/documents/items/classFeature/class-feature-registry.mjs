import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './class-feature-data-model.mjs';

export class ClassFeatureRegistry {
	/**
	 * @type {Map<string, typeof ClassFeatureDataModel>}
	 */
	#features = new Map();

	/**
	 * @param {string} module the module that implements the class classFeature
	 * @param {string} type the identifier of the class classFeature
	 * @param {typeof ClassFeatureDataModel} model
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

		try {
			model.previewTemplate;
		} catch (cause) {
			throw new Error(`Class feature ${key} must provide a preview template`, { cause });
		}

		try {
			model.translation;
		} catch (cause) {
			throw new Error(`Class feature ${key} must provide a translation`, { cause });
		}

		if (model instanceof RollableClassFeatureDataModel && model.roll === RollableClassFeatureDataModel.roll) {
			throw new Error(`Class feature ${key} must override the roll() function`);
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
