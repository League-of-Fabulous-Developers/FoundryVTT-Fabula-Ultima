import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { Pipeline } from '../../../pipelines/pipeline.mjs';
import { Flags } from '../../../helpers/flags.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';

const { StringField } = foundry.data.fields;

/**
 * @description Sends a message to chat
 * @property {String} message
 */
export class MessageRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'messageRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			message: new StringField({ required: true }),
		});
	}

	static get localization() {
		return 'FU.RuleActionMessage';
	}

	static get template() {
		return systemTemplatePath('effects/actions/message-rule-action');
	}

	#enrichedMessage;

	async renderContext(context) {
		this.#enrichedMessage = await FoundryUtils.enrichText(this.message, {
			relativeTo: context.actor,
		});
	}

	get enrichedMessage() {
		return this.#enrichedMessage;
	}

	async execute(context, selected) {
		console.log(`MESSAGE: ${this.message}`);
		const actor = context.character.actor;
		ChatMessage.create({
			flags: Pipeline.initializedFlags(Flags.ChatMessage.Opportunity, true),
			speaker: ChatMessage.getSpeaker({ actor }),
			content: this.message,
		});
	}
}
