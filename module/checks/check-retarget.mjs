import { SYSTEM } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { ChecksV2 } from './checks-v2.mjs';
import { getTargeted } from '../helpers/target-handler.mjs';

function addRetargetEntry(html, options) {
	options.unshift({
		name: 'FU.ChatContextRetarget',
		icon: '<i class="fas fa-bullseye"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const isCheck = ChecksV2.isCheck(message);
			if (isCheck) {
				const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
				return speakerActor?.type === 'character' && !CheckConfiguration.inspect(message).getCheck().fumble;
			} else {
				return false;
			}
		},
		callback: async (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const isCheck = ChecksV2.isCheck(message);
			if (isCheck) {
				const checkId = CheckConfiguration.inspect(message).getCheck().id;
				let shouldDelete = false;
				await ChecksV2.modifyCheck(checkId, (check, actor, item) => {
					const targets = getTargeted();
					const hasTargets = targets.length > 0;
					if (hasTargets) {
						CheckConfiguration.configure(check).setTargets(
							targets.map((actor) => ({
								uuid: actor.uuid,
								link: actor.link,
								name: actor.name,
							})),
						);
						shouldDelete = true;
					}
					return hasTargets;
				});
				if (shouldDelete) {
					// Delete the existing message
					await message.delete();
				}
			}
		},
	});
}

function initialize() {
	Hooks.on('getChatLogEntryContext', addRetargetEntry);
}

export const CheckRetarget = Object.freeze({
	initialize,
});
