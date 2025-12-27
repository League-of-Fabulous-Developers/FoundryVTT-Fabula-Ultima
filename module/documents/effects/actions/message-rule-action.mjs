import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { Flags } from '../../../helpers/flags.mjs';
import { Pipeline } from '../../../pipelines/pipeline.mjs';

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

	async prepareRenderContext(context) {
		this.#enrichedMessage = await FoundryUtils.enrichText(this.message, {
			relativeTo: context.actor,
		});
	}

	get enrichedMessage() {
		return this.#enrichedMessage;
	}

	async execute(context, selected) {
		let flags = Pipeline.initializedFlags(Flags.ChatMessage.Item, context.item);
		if (context.check) {
			flags = Pipeline.setFlag(flags, Flags.ChatMessage.CheckV2, context.check);
		}
		if (context.eventType === FUHooks.RENDER_CHECK_EVENT) {
			/** @type RenderCheckEvent **/
			const rce = context.event;
			const actor = rce.source.actor !== context.character.actor ? context.item.parent : null;
			CommonSections.itemText(rce.renderData, this.message, actor, context.item, flags);
		} else {
			const actor = context.character.actor;
			const content = await FoundryUtils.renderTemplate('chat/partials/chat-item-text', {
				item: context.item,
				text: this.message,
			});
			ChatMessage.create({
				flags: flags,
				speaker: ChatMessage.getSpeaker({ actor }),
				content: content,
			});
		}
	}
}
