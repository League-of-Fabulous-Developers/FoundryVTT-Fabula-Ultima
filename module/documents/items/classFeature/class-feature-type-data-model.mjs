import { RollableClassFeatureDataModel } from './class-feature-data-model.mjs';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { slugify } from '../../../util.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { RegistryDataField } from '../../../fields/registry-data-field.mjs';
import { ClassFeatureRegistry } from './class-feature-registry.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ClassFeatureTypeDataModel && !(item.system.data instanceof RollableClassFeatureDataModel)) {
		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

export class ClassFeatureTypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			summary: new SchemaField({ value: new StringField() }),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			featureType: new StringField({
				nullable: false,
				initial: () => CONFIG.FU.classFeatureRegistry.choices[0],
				choices: () => CONFIG.FU.classFeatureRegistry.choices,
			}),
			data: new RegistryDataField(ClassFeatureRegistry.instance, 'featureType'), //  new FeatureDataField('featureType'),
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
			return ChecksV2.display(this.parent.actor, this.parent);
		}
	}

	/**
	 * Renders a dialog to confirm the FUID change and if accepted updates the FUID on the item.
	 * @returns {Promise<string|undefined>} The generated FUID or undefined if no change was made.
	 */
	async regenerateFUID() {
		const html = `
			<div class="warning-message">
			<p>${game.i18n.localize('FU.FUID.ChangeWarning2')}</p>
			<p>${game.i18n.localize('FU.FUID.ChangeWarning3')}</p>
			</div>
			`;

		const confirmation = await Dialog.confirm({
			title: game.i18n.localize('FU.FUID.Regenerate'),
			content: html,
			defaultYes: false,
			options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		});

		if (!confirmation) return;

		const fuid = slugify(this.data.name);
		await this.update({ 'system.fuid': fuid });

		return fuid;
	}

	get onActorDrop() {
		let onActorDrop = this.data.onActorDrop;
		if (onActorDrop) {
			return onActorDrop.bind(this.data);
		}
		return undefined;
	}
}
