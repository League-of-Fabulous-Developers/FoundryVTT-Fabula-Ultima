import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends RollableClassFeatureDataModel
 * @property {string} trigger
 * @property {string} description
 */
export class PsychicGiftDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			trigger: new StringField(),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/esper/psychic-gift-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/esper/psychic-gift-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeaturePsychicGiftLabel';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}

	static async roll(model, item) {
		const actor = model.parent.parent.actor;
		if (!actor) {
			return;
		}
		const data = {
			trigger: model.trigger,
			description: await TextEditor.enrichHTML(model.description),
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/esper/feature-psychic-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}
}
