import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';

/** @type RenderCheckHook */
const onRenderCheck = (sections, check, actor, item) => {
	if (item?.system?.data instanceof ToneDataModel) {
		const additionalData = ToneDataModel.getAdditionalData(item.system.data);
		CommonSections.description(
			sections,
			additionalData.then((data) => data.enrichedDescription),
			item.system.summary.value,
		);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends ClassFeatureDataModel
 * @property {string} description
 */
export class ToneDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureTone';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-tone-sheet.hbs';
	}

	static async getAdditionalData(model) {
		const rollData = {
			key: {
				type: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyDamageType'),
				status: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyStatus'),
				attribute: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyAttribute'),
				recovery: game.i18n.localize('FU.ClassFeatureToneDescriptionKeyRecovery'),
			},
			attribute: {
				dex: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeDex') }),
				ins: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeIns') }),
				mig: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeMig') }),
				wlp: game.i18n.format('FU.ClassFeatureToneDescriptionAttributeCurrent', { attribute: game.i18n.localize('FU.AttributeWlp') }),
			},
		};
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description, { rollData }),
			rollData: rollData,
		};
	}

	static roll(model, item) {
		Checks.display(item.actor, item);
	}
}
