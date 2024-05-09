import { onMarkTurnTaken } from './ui/combat.mjs';

import { SYSTEM } from './helpers/config.mjs';

export const MESSAGES = Object.freeze({
	ShowBanner: 'use',
	MarkTurnTaken: 'markTurnTaken',
});

export let SOCKET;

export function onSocketLibReady() {
	SOCKET = socketlib.registerSystem(SYSTEM);

	SOCKET.register(MESSAGES.ShowBanner, showBanner);
	SOCKET.register(MESSAGES.MarkTurnTaken, onMarkTurnTaken);
}

function showBanner(text) {
	text = `${text}`;
	ui.notifications.queue.push({
		message: text,
		type: 'projectfu-spellname',
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
	if (ui.notifications.rendered) ui.notifications.fetch();
}
