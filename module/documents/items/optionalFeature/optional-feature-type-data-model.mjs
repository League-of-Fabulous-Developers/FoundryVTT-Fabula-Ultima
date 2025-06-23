import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { RegistryDataField } from '../../../fields/registry-data-field.mjs';
import { RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { OptionalFeatureRegistry } from './optional-feature-registry.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof OptionalFeatureTypeDataModel) {
		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

/**
 * @description
 */
export class OptionalFeatureTypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			summary: new SchemaField({ value: new StringField() }),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),

			cost: new SchemaField({ value: new NumberField({ intial: 0, min: 0, integer: true, nullable: true }) }),
			quantity: new SchemaField({ value: new NumberField({ intial: 1, min: 0, integer: true, nullable: true }) }),
			optionalType: new StringField({
				nullable: false,
				initial: () => OptionalFeatureRegistry.instance?.choices[0],
				choices: () => OptionalFeatureRegistry.instance?.choices,
			}),
			data: new RegistryDataField(OptionalFeatureRegistry.instance, 'optionalType'),
		};
	}

	prepareDerivedData() {
		this.data?.prepareData();
	}

	/**
	 * For default item chat messages to pick up description.
	 * @return {*}
	 */
	get description() {
		return this.data.description;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.data instanceof RollableOptionalFeatureDataModel) {
			return this.data.constructor.roll(this.data, this.parent, modifiers.shift);
		} else {
			return ChecksV2.display(this.parent.actor, this.parent);
		}
	}
}
