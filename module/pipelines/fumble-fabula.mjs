import { FUHooks } from '../hooks.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { PlayerListEnhancements } from '../helpers/player-list-enhancements.mjs';
import { AsyncHooks } from '../helpers/async-hooks.mjs';
import { Pipeline } from './pipeline.mjs';

/**
 * @param {RenderCheckEvent} event
 */
async function onRenderCheck(event) {
	const actor = event.sourceInfo.resolveActor();
	if (!event.check.fumble || actor?.type !== 'character') {
		return;
	}

	async function postChatMessage() {
		await ChatMessage.create({
			flags: Pipeline.initializedFlags(Flags.ChatMessage.FumbleFabula, true),
			speaker: ChatMessage.getSpeaker({ actor }),
			content: await FoundryUtils.renderTemplate('chat/chat-apply-fumble-fabula', {
				actor: actor,
			}),
		});
	}

	if (game.dice3d) {
		Hooks.once('diceSoNiceRollComplete', postChatMessage);
	} else {
		event.renderData.postRenderActions.push(postChatMessage);
	}
}

/**
 * @param {Document} message
 * @param {HTMLElement} element
 */
function onRenderChatMessage(message, element) {
	if (!message.getFlag(SYSTEM, Flags.ChatMessage.FumbleFabula)) {
		return;
	}

	Pipeline.handleClickRevert(message, element, 'gainFabulaPoint', async (dataset) => {
		const actor = await fromUuid(dataset.actor);
		if (actor?.type === 'character') {
			return PlayerListEnhancements.gainMetaCurrency(actor);
		}
	});
}

export const FumbleFabulaHandler = Object.freeze({
	initialize: () => {
		AsyncHooks.on(FUHooks.RENDER_CHECK_EVENT, onRenderCheck);
		Hooks.on('renderChatMessageHTML', onRenderChatMessage);
	},
});
