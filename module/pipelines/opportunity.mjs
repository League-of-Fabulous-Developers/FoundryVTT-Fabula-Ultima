import { FUHooks } from '../hooks.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from './pipeline.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';

/**
 * @param {OpportunityEvent} event
 */
async function onOpportunity(event) {
	// Emit a message for the opposition
	if (event.fumble) {
		console.debug(`The opposition of ${event.actor.name} has gained an opportunity!`);
	}
	// Emit a message from self
	else {
		console.debug(`${event.actor} has gained an opportunity!`);
	}

	const actor = event.actor;
	const message = event.fumble ? 'FU.ChatFumbleOpportunity' : 'FU.ChatOpportunity';

	ChatMessage.create({
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Opportunity, true),
		speaker: ChatMessage.getSpeaker({ actor }),
		content: await FoundryUtils.renderTemplate('chat/chat-apply-opportunity', {
			actor: actor,
			item: event.item,
			message: message,
			type: event.type,
		}),
	});
}

/**
 * @param {FUActor} actor
 * @param {String} type
 * @param {FUItem} item
 * @returns {Promise<void>}
 */
async function promptOpportunity(actor, type, item) {
	/** @type RollableTable **/
	const tableUuid = game.settings.get(SYSTEM, SETTINGS.opportunities);
	const table = await fromUuid(`RollTable.${tableUuid}`);
	if (table) {
		const elements = [...table.results.values()];
		console.debug(`Providing ${elements.length} choices from ${table.name}`);
		let choices = await Promise.all(elements.map(async (e) => await TextEditor.enrichHTML(e.description)));
		if (item.system.opportunity) {
			choices = choices.concat(item.system.opportunity);
		}
		const selected = await FoundryUtils.promptStringChoice('FU.Opportunities', choices);
		console.debug(`Selected opportunity: ${selected}`);

		ChatMessage.create({
			speaker: ChatMessage.getSpeaker(),
			content: await FoundryUtils.renderTemplate('chat/chat-opportunity', {
				actor: actor,
				opportunity: selected,
			}),
		});
	} else {
		ui.notifications.warn('FU.ChatOpportunitySettingMissing', { localize: true });
	}
}

/**
 * @param {Document} message
 * @param {HTMLElement} element
 */
function onRenderChatMessage(message, element) {
	if (!message.getFlag(SYSTEM, Flags.ChatMessage.Opportunity)) {
		return;
	}

	Pipeline.handleClick(message, element, 'applyOpportunity', async (dataset) => {
		const actorId = dataset.actor;
		/** @type FUActor **/
		const actor = await fromUuid(`${actorId}`);
		const type = dataset.type;
		const itemId = dataset.item;
		const item = await fromUuid(`${itemId}`);
		if (actor) {
			return promptOpportunity(actor, type, item);
		}
	});
}

export const OpportunityHandler = Object.freeze({
	initialize: () => {
		Hooks.on(FUHooks.OPPORTUNITY_EVENT, onOpportunity);
		Hooks.on('renderChatMessageHTML', onRenderChatMessage);
	},
});
