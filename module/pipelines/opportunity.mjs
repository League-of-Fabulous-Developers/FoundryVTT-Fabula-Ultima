import { FUHooks } from '../hooks.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';

/**
 * @param {OpportunityEvent} event
 */
function onOpportunity(event) {
	// Emit a message for the opposition
	if (event.fumble) {
		console.debug(`The opposition of ${event.actor.name} has gained an opportunity!`);
	}
	// Emit a message from self
	else {
		console.debug(`${event.actor} has gained an opportunity!`);
	}

	const actor = event.actor;
	const message = event.fumble ? 'FU.ChatFumbleApplyOpportunity' : 'FU.ChatApplyOpportunity';

	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		content: StringUtils.localize(message, {
			actor: actor.name,
		}),
	});
}

export const OpportunityHandler = Object.freeze({
	initialize: () => {
		Hooks.on(FUHooks.OPPORTUNITY_EVENT, onOpportunity);
	},
});
