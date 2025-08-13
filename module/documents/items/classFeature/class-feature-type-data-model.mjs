import { RollableClassFeatureDataModel } from './class-feature-data-model.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { RegistryDataField } from '../../../fields/registry-data-field.mjs';
import { ClassFeatureRegistry } from './class-feature-registry.mjs';
import { EmbeddedFeatureDataModel } from '../embedded-feature-data-model.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ClassFeatureTypeDataModel && !(item.system.data instanceof RollableClassFeatureDataModel)) {
		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

export class ClassFeatureTypeDataModel extends EmbeddedFeatureDataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			featureType: new StringField({
				nullable: false,
				initial: () => CONFIG.FU.classFeatureRegistry.choices[0],
				choices: () => CONFIG.FU.classFeatureRegistry.choices,
			}),
			data: new RegistryDataField(ClassFeatureRegistry.instance, 'featureType'), //  new FeatureDataField('featureType'),
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
}
