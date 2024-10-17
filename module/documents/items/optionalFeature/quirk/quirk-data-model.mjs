import { RollableOptionalFeatureDataModel } from '../optional-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';

/**
 * @extends RollableOptionalFeatureDataModel
 * @property {string} description
 * @property {boolean} hasClock.value
 * @property {boolean} hasResource.value
 * @property {ProgressDataModel} progress
 * @property {ProgressDataModel} rp
 */
export class QuirkDataModel extends RollableOptionalFeatureDataModel {
	static defineSchema() {
		const { HTMLField, SchemaField, BooleanField, EmbeddedDataField } = foundry.data.fields;
		return {
			description: new HTMLField(),
			hasClock: new SchemaField({ value: new BooleanField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
		};
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
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			clockDataString,
			resourceDataString,
		};
	}

	static async getResourceDataString(model) {
		const { rp, hasResource } = model;

		// Determine resource display status
		const resourceDisplay =
			hasResource?.value ?? true
				? await renderTemplate('systems/projectfu/templates/chat/partials/chat-resource-details.hbs', {
						data: rp,
					})
				: '';

		// Create HTML content
		const content = `
		<div style="display: grid;">
			${resourceDisplay}
		</div>
		`;
		return content;
	}

	static async getClockDataString(model) {
		const { progress, hasClock } = model;

		// Generate and reverse the progress array
		const progressArr = this.generateProgressArray(progress);

		// Determine clock display status
		const clockDisplay =
			hasClock?.value ?? true
				? await renderTemplate('systems/projectfu/templates/chat/partials/chat-clock-details.hbs', {
						arr: progressArr,
						data: progress,
					})
				: '';

		// Create HTML content
		const content = `
		<div style="display: grid;">
			${clockDisplay}
		</div>
		`;
		return content;
	}

	static generateProgressArray(progress) {
		return Array.from({ length: progress.max }, (_, i) => ({
			id: i + 1,
			checked: parseInt(progress.current) === i + 1,
		})).reverse();
	}

	static async roll(model, item) {
		const actor = model.parent.parent.actor;
		if (!actor) {
			return;
		}
		const clockDataString = await this.getClockDataString(model);
		const resourceDataString = await this.getResourceDataString(model);
		const data = {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			clockDataString,
			resourceDataString,
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await renderTemplate('systems/projectfu/templates/optional/quirk/feature-quirk-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}
}
