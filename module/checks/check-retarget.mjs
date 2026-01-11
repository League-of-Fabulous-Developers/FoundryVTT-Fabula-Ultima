import { FU, SYSTEM } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { Checks } from './checks.mjs';
import { getTargeted } from '../helpers/target-handler.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { Pipeline } from '../pipelines/pipeline.mjs';

function addRetargetEntry(application, menuItems) {
	menuItems.unshift({
		name: 'FU.ChatContextRetarget',
		icon: '<i class="fas fa-bullseye"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const isCheck = Checks.isCheck(message);
			if (isCheck) {
				const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
				return ['character', 'npc'].includes(speakerActor?.type) && !CheckConfiguration.inspect(message).getCheck().fumble;
			}
			return false;
		},
		callback: async (li) => {
			const messageId = li.dataset.messageId;
			await retarget(messageId);
		},
	});
}

function isValid(message) {
	// Updated to handle display "checks"
	const types = Object.keys(FU.checkTypes);
	return Checks.isCheck(message, types);
}

async function retarget(messageId) {
	/** @type ChatMessage | undefined */
	const message = game.messages.get(messageId);
	const isCheck = isValid(message);
	if (isCheck) {
		const checkId = CheckConfiguration.inspect(message).getCheck().id;
		let shouldDelete = false;
		await Checks.modifyCheck(checkId, (check, actor, item) => {
			/** @type Token[] */
			const targets = getTargeted(true);
			const hasTargets = targets.length > 0;
			if (hasTargets) {
				CheckConfiguration.configure(check).setTargets(targets.map((token) => Targeting.constructData(token.actor)));
				shouldDelete = true;
			}
			return hasTargets;
		});
		if (shouldDelete) {
			// Delete the existing message
			await message.delete();
		}
	}
}

function onRenderChatMessage(message, html) {
	if (!isValid(message)) {
		return;
	}

	Pipeline.handleClick(message, html, 'retarget', async (dataset) => {
		return retarget(message.id);
	});
}

function initialize() {
	Hooks.on('getChatMessageContextOptions', addRetargetEntry);
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
}

export const CheckRetarget = Object.freeze({
	initialize,
	retarget,
});
