import { DataModelRegistry } from './data-model-registry.mjs';

/**
 * @description Associates string identifiers with a feature DataModel
 */
export class FeatureDataModelRegistry extends DataModelRegistry {
	/**
	 * @param {object} config
	 * @param {string} config.kind - Used in error messages (e.g. "Class Feature")
	 * @param {Function} config.baseClass - Required base class
	 * @param {Function} config.rollableClass - Optional rollable subclass
	 */
	constructor({ kind, baseClass, rollableClass }) {
		super({ kind, baseClass });
		this.rollableClass = rollableClass;
	}

	/**
	 * @param {string} module
	 * @param {string} type
	 * @param {Function} model
	 */
	register(module, type, model) {
		const key = `${module}.${type}`;

		if (!model.previewTemplate) {
			throw new Error(`${this.kind} ${key} must provide a preview template`);
		}

		if (!model.expandTemplate) {
			throw new Error(`${this.kind} ${key} must provide an expand template`);
		}

		if (this.rollableClass && foundry.utils.isSubclass(model, this.rollableClass) && !Object.hasOwn(model, 'roll')) {
			throw new Error(`Rollable ${this.kind} ${key} must override the roll() function`);
		}

		return super.register(module, type, model);
	}
}
