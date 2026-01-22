import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import FoundryUtils from '../../../../helpers/foundry-utils.mjs';

const durations = {
	instant: 'FU.ClassFeatureDanceDurationInstant',
	nextTurn: 'FU.ClassFeatureDanceDurationNextTurn',
};

/**
 * @extends RollableClassFeatureDataModel
 * @property {"instant", "nextTurn"} duration
 * @property {string} description
 */
export class DanceDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			duration: new StringField({ initial: 'instant', choices: Object.keys(durations) }),
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureDance';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/dancer/feature-dance-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/dancer/feature-dance-preview.hbs';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			durations,
		};
	}

	static async roll(model, item, isShift) {
		const data = {
			duration: durations[model.duration],
			description: await TextEditor.enrichHTML(model.description),
		};
		const speaker = ChatMessage.implementation.getSpeaker({ actor: item.actor });
		const chatMessage = {
			speaker,
			flavor: await FoundryUtils.renderTemplate('chat/chat-check-flavor-item-v2', { item: item }),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/dancer/feature-dance-chat-message.hbs', data),
			flags: {
				[SYSTEM]: { [Flags.ChatMessage.Item]: item },
			},
		};

		CommonEvents.skill(item.actor, item);
		ChatMessage.create(chatMessage);
	}
}
