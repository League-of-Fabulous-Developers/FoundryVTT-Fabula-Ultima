import { Action } from './action.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';

const handleChatCommand = (chatLog, message, data) => {
	if (/^\/test$/i.test(message)) {
		/** @type ChatMessageData */
		const chatMessageData = {
			user: data.user,
			speaker: data.speaker,
			content: `<div><a data-some-action="someAction">Click to test some action!</a></div><div><a data-some-action="revertSomeAction">Click to revert some action!</a></div>`,
		};
		ChatMessage.create(chatMessageData);
		return false;
	}
};

const someAction = new Action(
	'someAction',
	(document, element, event) => {
		console.log('ActionHandler', this, document, element, event);
	},
	{
		dataAttribute: 'some-action',
		requireOwner: true,
		hasPermission: (document, element) => {
			console.log(this, document, element);
			return document.getFlag('core', 'someAction') === game.user.id;
		},
	},
);

const applyDamageAction = new Action(
	'applyDamage',
	(document, element, event) => {
		console.log(CheckConfiguration.inspect(document).getDamage());
	},
	{
		hasPermission: (document, element) => fromUuidSync(element.dataset.id).testUserPermission(game.user, 'OWNER'),
	},
);

const onRenderChatMessage = (message, html, messageData) => {
	someAction.attach(message, html);
	applyDamageAction.attach(message, html);
};

export const ActionTest = Object.freeze({
	initialize: () => {
		Hooks.on('chatMessage', handleChatCommand);
		Hooks.on('renderChatMessage', onRenderChatMessage);
	},
});
