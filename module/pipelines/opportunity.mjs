import { FUHooks } from '../hooks.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from './pipeline.mjs';

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
			message: message,
		}),
	});
}

/**
 * @param {FUActor} actor
 * @returns {Promise<void>}
 */
async function promptOpportunity(actor) {
	/** @type RollableTable **/
	const tableUuid = game.settings.get(SYSTEM, SETTINGS.opportunities);
	const table = await fromUuid(`RollTable.${tableUuid}`);
	if (table) {
		//console.debug(`Using table ${table}`);
		const elements = [...table.results.values()];
		console.debug(`Providing ${elements.length} choices from ${table.name}`);
		const selected = await FoundryUtils.promptChoice('FU.Opportunities', elements, (e) => e.description);
		console.debug(`Selected ${selected}`);

		const opportunity = selected.description;

		ChatMessage.create({
			speaker: ChatMessage.getSpeaker(),
			content: await FoundryUtils.renderTemplate('chat/chat-opportunity', {
				actor: actor,
				opportunity: opportunity,
			}),
		});
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

	Pipeline.handleClick(message, element, 'applyOpportunity', (dataset) => {
		const actorId = dataset.actor;
		/** @type FUActor **/
		const actor = fromUuidSync(`Actor.${actorId}`);
		if (actor) {
			return promptOpportunity(actor);
		}
	});
}

export const OpportunityHandler = Object.freeze({
	initialize: () => {
		Hooks.on(FUHooks.OPPORTUNITY_EVENT, onOpportunity);
		Hooks.on('renderChatMessageHTML', onRenderChatMessage);
	},
});
