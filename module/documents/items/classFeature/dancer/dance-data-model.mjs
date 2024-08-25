import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';

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
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', item),
			content: await renderTemplate('systems/projectfu/templates/feature/dancer/feature-dance-chat-message.hbs', data),
			flags: {
				[SYSTEM]: { [Flags.ChatMessage.Item]: item },
			},
		};

		ChatMessage.create(chatMessage);
	}
}
