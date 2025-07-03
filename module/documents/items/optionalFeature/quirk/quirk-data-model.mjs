import { OptionalFeatureDataModel } from '../optional-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';
import { OptionalFeatureTypeDataModel } from '../optional-feature-type-data-model.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/** @type RenderCheckHook */
const onRenderCheck = (sections, check, actor, item) => {
	if (item?.system instanceof OptionalFeatureTypeDataModel && item.system.data instanceof QuirkDataModel) {
		/** @type QuirkDataModel */
		const quirk = item.system.data;
		if (quirk.hasResource.value) {
			CommonSections.resource(sections, quirk.rp, -1);
		}
		if (quirk.hasClock.value) {
			CommonSections.clock(sections, quirk.progress, -1);
		}
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends OptionalFeatureDataModel
 * @property {string} description
 * @property {boolean} hasClock.value
 * @property {boolean} hasResource.value
 * @property {ProgressDataModel} progress
 * @property {ProgressDataModel} rp
 */
export class QuirkDataModel extends OptionalFeatureDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'quirk' });
	}

	static defineSchema() {
		const { HTMLField, SchemaField, BooleanField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			description: new HTMLField(),
			hasClock: new SchemaField({ value: new BooleanField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
		});
	}

	static get template() {
		return 'systems/projectfu/templates/optional/quirk/feature-quirk-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/optional/quirk/feature-quirk-preview.hbs';
	}

	static get translation() {
		return 'FU.Quirk';
	}

	static async getAdditionalData(model) {
		const clockDataString = await this.getClockDataString(model);
		const resourceDataString = await this.getResourceDataString(model);
		return {
			enrichedDescription: await TextEditor.implementation.enrichHTML(model.description),
			clockDataString,
			resourceDataString,
		};
	}

	static async getResourceDataString(model) {
		const { rp, hasResource } = model;

		// Determine resource display status
		const resourceDisplay =
			hasResource?.value ?? true
				? await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/partials/chat-resource-details.hbs', {
						data: rp,
					})
				: '';

		// Create HTML content
		return `
		<div style="display: grid;">
			${resourceDisplay}
		</div>
		`;
	}

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
