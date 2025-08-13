import { OptionalFeatureDataModel } from '../optional-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';
import { OptionalFeatureTypeDataModel } from '../optional-feature-type-data-model.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/** @type RenderCheckHook */
const onRenderCheck = (sections, check, actor, item) => {
	if (item?.system instanceof OptionalFeatureTypeDataModel && item.system.data instanceof ZeroPowerDataModel) {
		console.log(sections);
		/** @type ZeroPowerDataModel */
		const zeroPower = item.system.data;
		if (zeroPower.hasClock.value) {
			CommonSections.clock(sections, zeroPower.progress, -1);
		}
		CommonSections.collapsibleDescription(sections, zeroPower.zeroTrigger.value ?? game.i18n.localize('FU.LimitTrigger'), zeroPower.zeroTrigger.description);
		CommonSections.collapsibleDescription(sections, zeroPower.zeroEffect.value ?? game.i18n.localize('FU.LimitEffect'), zeroPower.zeroEffect.description);
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends OptionalFeatureDataModel
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} zeroTrigger.value
 * @property {string} zeroTrigger.description
 * @property {string} zeroEffect.value
 * @property {string} zeroEffect.description
 * @property {string} source.value
 */
export class ZeroPowerDataModel extends OptionalFeatureDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, EmbeddedDataField, BooleanField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			hasClock: new SchemaField({ value: new BooleanField({ initial: true }) }),
			zeroTrigger: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			zeroEffect: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
		});
	}

	static get template() {
		return 'systems/projectfu/templates/optional/zeropower/feature-zeroPower-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/optional/zeropower/feature-zeroPower-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/optional/zeropower/feature-zeroPower-description.hbs';
	}

	static get translation() {
		return 'FU.Limit';
	}

	static async getAdditionalData(model) {
		const clockDataString = await this.getClockDataString(model);
		return {
			enrichedZeroTrigger: await TextEditor.enrichHTML(model.zeroTrigger.description),
			enrichedZeroEffect: await TextEditor.enrichHTML(model.zeroEffect.description),
			clockDataString,
		};
	}

	/**
	 * @param {ZeroPowerDataModel} model
	 * @returns {Promise<string>}
	 */
	static async getClockDataString(model) {
		const { progress, hasClock } = model;

		// Generate and reverse the progress array
		const progressArr = progress.progressArray;

		// Determine clock display status
		const clockDisplay =
			hasClock?.value ?? true
				? await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/partials/chat-clock-details.hbs', {
						arr: progressArr,
						data: progress,
					})
				: '';

		// Create HTML content
		return `
		<div style="display: grid;">
			${clockDisplay}
		</div>
		`;
	}
}
