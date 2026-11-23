import { RollableClassFeatureDataModel } from './class-feature-data-model.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { ClassFeatureRegistry } from './class-feature-registry.mjs';
import { EmbeddedFeatureDataModel } from '../embedded-feature-data-model.mjs';

Hooks.on(CheckHooks.renderCheck, (data, check, actor, item) => {
	if (item?.system instanceof ClassFeatureTypeDataModel && !(item.system.data instanceof RollableClassFeatureDataModel)) {
		CommonSections.description(data.sections, item.system.description, item.system.summary.value);
	}
});

const registry = ClassFeatureRegistry.instance;

export class ClassFeatureTypeDataModel extends EmbeddedFeatureDataModel {
	static defineSchema() {
		const { TypedSchemaField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			data: new TypedSchemaField(registry.qualifiedTypes, {
				initial: () => {
					const typeId = registry.qualifiedChoices.at(0);
					const typeModel = registry.qualifiedTypes[typeId];
					return new typeModel({});
				},
			}),
		});
	}

	transferEffects() {
		return this.data?.transferEffects instanceof Function ? this.data?.transferEffects() : true;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.data instanceof RollableClassFeatureDataModel) {
			return this.data.constructor.roll(this.data, this.parent, modifiers.shift);
		} else {
			return Checks.display(this.parent.actor, this.parent);
		}
	}

	get onActorDrop() {
		let onActorDrop = this.data.onActorDrop;
		if (onActorDrop) {
			return onActorDrop.bind(this.data);
		}
		return undefined;
	}

	get cost() {
		return this.data.cost;
	}

	static migrateData(source) {
		source = super.migrateData(source);
		if (source.data) {
			const featureTypes = registry.qualifiedTypes;
			let type = source.data.type;
			if (!(type in featureTypes)) {
				type = source.featureType;
			}
			if (type) {
				const dataModel = featureTypes[type];
				if (dataModel) {
					source.data = dataModel.migrateData(source.data);
				}
			}
		}
		if (source.featureType && source.data && !('type' in source.data)) {
			source.data.type = source.featureType;
		}
		return source;
	}
}
