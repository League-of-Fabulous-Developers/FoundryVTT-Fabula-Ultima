import { Checks } from '../../../checks/checks.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { OptionalFeatureRegistry } from './optional-feature-registry.mjs';
import { EmbeddedFeatureDataModel } from '../embedded-feature-data-model.mjs';

Hooks.on(CheckHooks.renderCheck, (data, check, actor, item) => {
	if (item?.system instanceof OptionalFeatureTypeDataModel) {
		CommonSections.description(data.sections, item.system.description, item.system.summary.value);
	}
});

/**
 * @description
 */
export class OptionalFeatureTypeDataModel extends EmbeddedFeatureDataModel {
	static defineSchema() {
		const { SchemaField, NumberField, TypedSchemaField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			cost: new SchemaField({ value: new NumberField({ intial: 0, min: 0, integer: true, nullable: true }) }),
			quantity: new SchemaField({ value: new NumberField({ intial: 1, min: 0, integer: true, nullable: true }) }),
			data: new TypedSchemaField(OptionalFeatureRegistry.instance.qualifiedTypes, {
				initial: () => {
					const registry = OptionalFeatureRegistry.instance;
					const typeId = registry.qualifiedChoices.at(0);
					const typeModel = registry.qualifiedTypes[typeId];
					return new typeModel({});
				},
			}),
		});
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.data instanceof RollableOptionalFeatureDataModel) {
			return this.data.constructor.roll(this.data, this.parent, modifiers.shift);
		} else {
			return Checks.display(this.parent.actor, this.parent);
		}
	}

	static migrateData(source) {
		if (source.optionalType && source.data && !('type' in source.data)) {
			source.data.type = source.optionalType;
		}
		return source;
	}
}
