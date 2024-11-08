import { onMarkTurnTaken } from './ui/combat.mjs';
import { onTurnChanged, onRoundChanged } from './ui/combat.mjs';

import { SYSTEM } from './helpers/config.mjs';

export const MESSAGES = Object.freeze({
	ShowBanner: 'use',
	MarkTurnTaken: 'markTurnTaken',
	TurnChanged: 'turnChanged',
	RoundChanged: 'roundChanged',
});

export let SOCKET;

export function onSocketLibReady() {
	/* globals socketlib */
	SOCKET = socketlib.registerSystem(SYSTEM);

	SOCKET.register(MESSAGES.ShowBanner, showBanner);
	SOCKET.register(MESSAGES.MarkTurnTaken, onMarkTurnTaken);
	SOCKET.register(MESSAGES.TurnChanged, onTurnChanged);
	SOCKET.register(MESSAGES.RoundChanged, onRoundChanged);
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
