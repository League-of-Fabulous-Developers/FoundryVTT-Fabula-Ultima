import { RollableOptionalFeatureDataModel } from '../optional-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';

/**
 * @extends RollableOptionalFeatureDataModel
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
export class ZeroPowerDataModel extends RollableOptionalFeatureDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, EmbeddedDataField } = foundry.data.fields;
		return {
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			zeroTrigger: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			zeroEffect: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
		};
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
		const data = {
			zeroTriggerTitle: model.zeroTrigger.value,
			zeroEffectTitle: model.zeroEffect.value,
			enrichedZeroTrigger: await TextEditor.enrichHTML(model.zeroTrigger.description),
			enrichedZeroEffect: await TextEditor.enrichHTML(model.zeroEffect.description),
			clockDataString,
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await renderTemplate('systems/projectfu/templates/optional/zeropower/feature-zeroPower-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}
}
